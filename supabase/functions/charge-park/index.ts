// ════════════════════════════════════════════════════════════════════════
// SUPABASE EDGE FUNCTION — Parken & Laden (Kennzeichen ↔ Ladevorgang)
//
// Ziel: „Wer lädt, darf parken. Wer nicht lädt, fällt unter die normale
// Parkraumbewirtschaftung.“ Ohne zusätzliche Kameras: Der Parkraumbetreiber
// erfasst Kennzeichen ohnehin (Einfahrt/Kassenautomat). Es fehlt nur die
// Verknüpfung Kennzeichen ↔ echter Ladevorgang am Ladepunkt.
//
// Kunde (Kunden-App, ohne Login):  site · claim · claim_status
// Ladebackend (x-api-key):         session_event   (Start/Stopp je EVSE)
// Parkraumbetreiber (x-api-key):   check           (Kennzeichen → frei / gebührenpflichtig + freie Zeitfenster)
// Dashboard (Admin-Token):         p_overview · p_sites_save · p_resolve · p_session · p_keys · p_lookup
// ════════════════════════════════════════════════════════════════════════
import { createClient } from "npm:@supabase/supabase-js@2";

const ORIGINS = ["https://qar.gallery", "https://www.qar.gallery", "http://localhost:3000", "http://localhost:8765"];
const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
const sha256 = async (s: string) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
function safeEq(a: string, b: string) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
const keys: Record<string, CryptoKey> = {};
async function hmac(scope: string, s: string) {
  if (!keys[scope]) keys[scope] = await crypto.subtle.importKey("raw", await crypto.subtle.digest("SHA-256", enc.encode(scope + ":" + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", keys[scope], enc.encode(s)));
}
async function readToken(scope: string, t: unknown) {
  if (typeof t !== "string" || !t.includes(".") || t.length > 400) return null;
  const [p, s] = t.split(".");
  if (!safeEq(s, await hmac(scope, p))) return null;
  try { const o = JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/"))); return o.e > Date.now() ? o : null; } catch { return null; }
}
const hits = new Map<string, number[]>();
function limited(key: string, n: number, win = 3600_000) {
  const now = Date.now(); const l = (hits.get(key) || []).filter((t) => now - t < win);
  if (l.length >= n) return true; l.push(now); hits.set(key, l); return false;
}
const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const ID_RE = /^[A-Za-z0-9._-]{1,40}$/;
const MIN = 60_000;
const iso = (t: number) => new Date(t).toISOString();
const clampInt = (v: unknown, lo: number, hi: number, d: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };

// Kennzeichen normalisieren: Großbuchstaben, ohne Leer-/Bindestriche. DE: 1–3 Buchstaben Ort, 1–2 Buchstaben, 1–4 Ziffern, optional E/H.
function normPlate(v: unknown, foreign = false) {
  const p = String(v ?? "").toUpperCase().replace(/[\s\-–·.:]/g, "").replace(/[^A-Z0-9ÄÖÜ]/g, "");
  if (foreign) return /^[A-Z0-9ÄÖÜ]{2,12}$/.test(p) ? p : null;
  if (/^[A-ZÄÖÜ]{1,3}(DEMO|TEST)[1-9][0-9]{0,3}$/.test(p)) return p; // Demo-Kennzeichen
  return /^[A-ZÄÖÜ]{1,3}[A-Z]{1,2}[1-9][0-9]{0,3}[EH]?$/.test(p) ? p : null;
}
const isDemoPlate = (p: string) => /DEMO|TEST/.test(p);
const maskPlate = (p: string) => p.length <= 4 ? p : p.slice(0, p.length - 3) + "•••";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const H = { "Access-Control-Allow-Origin": origin && ORIGINS.includes(origin) ? origin : ORIGINS[0], "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, apikey, Authorization, x-api-key", "Content-Type": "application/json", "Cache-Control": "no-store", Vary: "Origin" };
  const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: H });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: H });
  if (req.method !== "POST") return json({ error: "Nur POST erlaubt" }, 405);
  let body: any; try { body = await req.json(); } catch { return json({ error: "Ungültiges JSON" }, 400); }
  const action = String(body?.action || "");
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(`all:${ip}`, 3000)) return json({ error: "Zu viele Anfragen" }, 429);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const cfgRows = (await db.from("charge_support_config").select("key,value").in("key", ["PARK_PARTNER_KEY_HASH", "PARK_BACKEND_KEY_HASH", "PARK_RETENTION_DAYS"])).data || [];
  const cfg = (k: string) => cfgRows.find((r: any) => r.key === k)?.value || "";
  const sim = !!(body.sim && await readToken("charge-sim-v1", body.sim));

  // Aufbewahrung: Kennzeichen & Abfragen nach X Tagen löschen (Datensparsamkeit)
  const keepDays = Math.max(1, +cfg("PARK_RETENTION_DAYS") || 30);
  if (Math.random() < 0.05) {
    const cut = iso(Date.now() - keepDays * 86400_000);
    await db.from("charge_park_claims").delete().lt("claimed_at", cut);
    await db.from("charge_park_checks").delete().lt("at", cut);
  }

  const loadSite = async (stationRef: string) => {
    if (!ID_RE.test(stationRef || "")) return null;
    const { data: st } = await db.from("charge_stations").select("id,project_id,name,address,connectors,chargers,active").or(`id.eq.${stationRef},project_id.eq.${stationRef}`).limit(1);
    const s = st?.[0]; if (!s) return null;
    const { data: site } = await db.from("charge_park_sites").select("*").eq("station_id", s.id).maybeSingle();
    return { st: s, site: site || { station_id: s.id, enabled: false, grace_min: 15, max_min: 60, after_min: 15, claim_window_min: 20, proof: "zeit", bay_max: {} } };
  };
  const bayMax = (site: any, cp: number) => clampInt(site?.bay_max?.[String(cp)], 5, 24 * 60, site?.max_min || 60);
  const cpLabel = (st: any, n: number) => { const c = (st.connectors || []).find((x: any) => x.n === n); if (!c) return `LP ${n}`;
    const ch = (st.chargers || []).find((x: any) => x.n === c.charger); const idx = (st.connectors || []).filter((x: any) => x.charger === c.charger).findIndex((x: any) => x.n === n) + 1;
    return `${ch?.label || "Charger " + c.charger} · LP ${idx}`; };

  // Freies Zeitfenster eines Ladevorgangs: ab Ladebeginn bis min(Ladeende + Nachlauf, Ladebeginn + max. Parkdauer am Ladeplatz)
  const freeWindow = (s: any, site: any) => {
    const start = Date.parse(s.started_at), max = bayMax(site, s.connector) * MIN, after = (site?.after_min ?? 15) * MIN;
    const end = s.ended_at ? Date.parse(s.ended_at) : null;
    const limit = start + max;
    // aktiv: frei bis zur max. Parkdauer · beendet: frei bis Ladeende (höchstens max. Parkdauer) + Nachlaufzeit
    const to = end ? Math.min(end, limit) + after : limit;
    return { from: iso(start), to: iso(to), charging_until: end ? iso(end) : null, max_until: iso(limit), active: s.status === "aktiv" };
  };
  // Bewertet eine Zuordnung zum Zeitpunkt t
  const judge = (c: any, s: any, site: any, t: number) => {
    if (c.status === "konflikt") return { status: "pruefung", label: "In Prüfung – Ladepunkt war bereits einem anderen Kennzeichen zugeordnet" };
    if (c.status === "abgelehnt") return { status: "gebuehrenpflichtig", label: "Zuordnung abgelehnt" };
    if (!s) {
      const graceEnd = Date.parse(c.claimed_at) + (site?.grace_min ?? 15) * MIN;
      return t <= graceEnd ? { status: "karenz", label: "Vorgemerkt – Ladevorgang muss bis " + new Date(graceEnd).toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" }) + " Uhr starten", until: iso(graceEnd) }
        : { status: "gebuehrenpflichtig", label: "Kein Ladevorgang innerhalb der Karenzzeit gestartet" };
    }
    const w = freeWindow(s, site), to = Date.parse(w.to);
    if (t < Date.parse(w.from)) return { status: "karenz", label: "Ladevorgang beginnt", until: w.from, window: w };
    if (t <= to) return { status: "frei", label: s.status === "aktiv" ? "Lädt – Parken frei" : "Ladevorgang beendet – Nachlaufzeit", until: w.to, window: w,
      over_max_soon: s.status === "aktiv" && Date.parse(w.max_until) - t < 10 * MIN };
    return { status: s.status === "aktiv" ? "ueberschritten" : "gebuehrenpflichtig", label: s.status === "aktiv" ? "Max. Parkdauer am Ladeplatz überschritten (lädt noch)" : "Freie Zeit abgelaufen – reguläre Parkgebühren", window: w };
  };

  // Ordnet vorgemerkte Kennzeichen einer neu gestarteten Ladesitzung zu
  async function linkPending(sess: any, site: any) {
    const graceFrom = iso(Date.parse(sess.started_at) - (site?.grace_min ?? 15) * MIN);
    const { data: pend } = await db.from("charge_park_claims").select("*").eq("station_id", sess.station_id).eq("connector", sess.connector)
      .eq("status", "vorgemerkt").is("session_id", null).gte("claimed_at", graceFrom).lte("claimed_at", sess.started_at).order("claimed_at", { ascending: false });
    if (!pend?.length) return;
    const [first, ...rest] = pend;
    await db.from("charge_park_claims").update({ session_id: sess.id, status: rest.length ? "konflikt" : "frei", linked_at: new Date().toISOString(),
      reason: rest.length ? `Mehrere Kennzeichen für denselben Ladevorgang vorgemerkt` : null }).eq("id", first.id);
    for (const r of rest) await db.from("charge_park_claims").update({ session_id: sess.id, status: "konflikt", reason: "Mehrere Kennzeichen für denselben Ladevorgang vorgemerkt" }).eq("id", r.id);
  }

  try {
    // ───────── Kunde ─────────
    if (action === "site") {
      const x = await loadSite(String(body.station || ""));
      if (!x || !x.st.active) return json({ enabled: false });
      const { site, st } = x;
      return json({ enabled: !!site.enabled, grace_min: site.grace_min, max_min: site.max_min, after_min: site.after_min, note: site.note || null,
        bays: (st.connectors || []).map((c: any) => ({ n: c.n, label: cpLabel(st, c.n), max_min: bayMax(site, c.n), evse: c.evse || null })) });
    }

    if (action === "claim") {
      if (limited(`claim:${ip}`, 30)) return json({ error: "Zu viele Versuche – bitte später erneut." }, 429);
      const x = await loadSite(String(body.station || ""));
      if (!x || !x.st.active || !x.site.enabled) return json({ error: "An diesem Standort ist das Parken während des Ladens nicht freigeschaltet." }, 400);
      const { st, site } = x;
      const cp = Number(body.connector);
      if (!(st.connectors || []).some((c: any) => c.n === cp)) return json({ error: "Bitte den Ladepunkt wählen, an dem Sie laden." }, 400);
      const plate = normPlate(body.plate, !!body.foreign);
      if (!plate) return json({ error: body.foreign ? "Kennzeichen ungültig (2–12 Zeichen)." : "Kennzeichen ungültig – bitte z. B. „B-AB 1234“ eingeben." }, 400);
      const demo = isDemoPlate(plate) || sim;
      const now = Date.now();
      // Bereits aktive Zuordnung dieses Kennzeichens am Standort? → zurückgeben statt doppelt anlegen
      const { data: mine } = await db.from("charge_park_claims").select("*").eq("station_id", st.id).eq("plate", plate).in("status", ["vorgemerkt", "frei", "konflikt"]).gte("claimed_at", iso(now - 12 * 3600_000)).order("claimed_at", { ascending: false }).limit(1);
      if (mine?.[0] && mine[0].connector === cp) {
        const s0 = mine[0].session_id ? (await db.from("charge_sessions").select("*").eq("id", mine[0].session_id).maybeSingle()).data : null;
        const j0 = judge(mine[0], s0, site, now);
        if (j0.status !== "gebuehrenpflichtig") return json({ ok: true, id: mine[0].id, plate, bay: cpLabel(st, cp), ...j0 });
      }
      // Laufende Ladesitzung an diesem Ladepunkt?
      const winFrom = iso(now - (site.claim_window_min ?? 20) * MIN);
      const { data: sess } = await db.from("charge_sessions").select("*").eq("station_id", st.id).eq("connector", cp).eq("status", "aktiv").order("started_at", { ascending: false }).limit(1);
      const s = sess?.[0] || null;
      let status = "vorgemerkt", session_id: string | null = null, reason: string | null = null;
      if (s) {
        if (s.started_at < winFrom) { reason = `Ladevorgang läuft bereits seit mehr als ${site.claim_window_min} Min. – Kennzeichen bitte direkt nach dem Ladestart eintragen.`; status = "konflikt"; session_id = s.id; }
        else {
          const { data: other } = await db.from("charge_park_claims").select("id,plate").eq("session_id", s.id).neq("plate", plate).in("status", ["frei", "konflikt"]);
          session_id = s.id;
          if (other?.length) { status = "konflikt"; reason = "Ladevorgang ist bereits einem anderen Kennzeichen zugeordnet"; }
          else status = "frei";
        }
      }
      const geo = body.geo && Number.isFinite(+body.geo.lat) ? { lat: +(+body.geo.lat).toFixed(5), lng: +(+body.geo.lng).toFixed(5), acc: Math.round(+body.geo.acc || 0) } : null;
      const { data: c, error } = await db.from("charge_park_claims").insert({ is_sim: sim, station_id: st.id, connector: cp, plate, plate_demo: demo, session_id, status, linked_at: session_id ? new Date().toISOString() : null,
        reason, source: "app", sid: str(body.sid, 60), geo }).select("*").single();
      if (error) throw new Error(error.message);
      return json({ ok: true, id: c.id, plate, bay: cpLabel(st, cp), ...judge(c, s, site, now) });
    }

    if (action === "claim_status") {
      const id = str(body.id, 40); if (!id || !/^[0-9a-f-]{36}$/.test(id)) return json({ error: "Unbekannt" }, 400);
      const { data: c } = await db.from("charge_park_claims").select("*").eq("id", id).maybeSingle();
      if (!c) return json({ error: "Nicht gefunden" }, 404);
      const x = await loadSite(c.station_id);
      const s = c.session_id ? (await db.from("charge_sessions").select("*").eq("id", c.session_id).maybeSingle()).data : null;
      return json({ ok: true, id: c.id, plate: c.plate, bay: x ? cpLabel(x.st, c.connector) : `LP ${c.connector}`, ...judge(c, s, x?.site, Date.now()) });
    }

    // ───────── Schnittstellen mit API-Schlüssel ─────────
    const apiKey = req.headers.get("x-api-key") || String(body.api_key || "");
    const keyOk = async (cfgKey: string) => { const h = cfg(cfgKey); return !!h && !!apiKey && safeEq(h, await sha256(apiKey)); };

    if (action === "session_event") {
      if (!(await keyOk("PARK_BACKEND_KEY_HASH")) && !sim) return json({ error: "Nicht erlaubt" }, 401);
      // Zuordnung über EVSE-ID oder Standort + Ladepunkt
      let stationId = str(body.station, 40), cp = Number(body.connector) || null;
      const evse = str(body.evse, 60);
      if (evse && (!stationId || !cp)) {
        const norm = evse.toUpperCase().replace(/[^A-Z0-9]/g, "");
        const { data: sts } = await db.from("charge_stations").select("id,connectors").eq("active", true);
        for (const st of sts || []) { const c = (st.connectors || []).find((x: any) => String(x.evse || "").toUpperCase().replace(/[^A-Z0-9]/g, "") === norm); if (c) { stationId = st.id; cp = c.n; break; } }
      }
      const x = stationId ? await loadSite(stationId) : null;
      if (!x || !cp) return json({ error: "Ladepunkt unbekannt (EVSE-ID oder station + connector)" }, 404);
      const ext = str(body.session_id, 80) || str(body.ext_id, 80);
      const ev = String(body.event || body.status || "").toLowerCase();
      const at = typeof body.at === "string" && !isNaN(Date.parse(body.at)) ? new Date(body.at).toISOString() : new Date().toISOString();
      const kwh = Number.isFinite(+body.kwh) ? +(+body.kwh).toFixed(3) : null;
      const auth = str(body.auth_hint, 12);
      const { data: ex } = ext ? await db.from("charge_sessions").select("*").eq("ext_id", ext).maybeSingle() : { data: null as any };
      if (/start|aktiv|charging|begin/.test(ev)) {
        if (ex) return json({ ok: true, id: ex.id, already: true });
        // offene Sitzung am selben Ladepunkt sauber beenden
        await db.from("charge_sessions").update({ status: "beendet", ended_at: at, updated_at: new Date().toISOString() }).eq("station_id", x.st.id).eq("connector", cp).eq("status", "aktiv");
        const { data: s, error } = await db.from("charge_sessions").insert({ is_sim: sim, ext_id: ext, station_id: x.st.id, connector: cp, evse, status: "aktiv", started_at: at, kwh, auth_hint: auth, source: sim ? "simulation" : "backend" }).select("*").single();
        if (error) throw new Error(error.message);
        await linkPending(s, x.site);
        return json({ ok: true, id: s.id });
      }
      if (/stop|end|beendet|finish/.test(ev)) {
        let target = ex;
        if (!target) { const { data } = await db.from("charge_sessions").select("*").eq("station_id", x.st.id).eq("connector", cp).eq("status", "aktiv").order("started_at", { ascending: false }).limit(1); target = data?.[0]; }
        if (!target) return json({ ok: true, none: true });
        await db.from("charge_sessions").update({ status: "beendet", ended_at: at, kwh: kwh ?? target.kwh, updated_at: new Date().toISOString() }).eq("id", target.id);
        return json({ ok: true, id: target.id });
      }
      if (/meter|update/.test(ev) && ex) { await db.from("charge_sessions").update({ kwh, updated_at: new Date().toISOString() }).eq("id", ex.id); return json({ ok: true }); }
      return json({ error: "event: start | stop | update" }, 400);
    }

    if (action === "check") {
      if (!(await keyOk("PARK_PARTNER_KEY_HASH"))) return json({ error: "Nicht erlaubt" }, 401);
      if (limited(`check:${apiKey.slice(0, 8)}`, 20000)) return json({ error: "Zu viele Anfragen" }, 429);
      const plates: string[] = (Array.isArray(body.plates) ? body.plates : [body.plate]).slice(0, 200);
      const t = typeof body.at === "string" && !isNaN(Date.parse(body.at)) ? Date.parse(body.at) : Date.now();
      const since = typeof body.since === "string" && !isNaN(Date.parse(body.since)) ? Date.parse(body.since) : t - 12 * 3600_000;
      const stationRef = str(body.station, 40);
      const st0 = stationRef ? await loadSite(stationRef) : null;
      const results = [];
      for (const raw of plates) {
        const plate = normPlate(raw) || normPlate(raw, true);
        if (!plate) { results.push({ plate: raw, status: "ungueltig" }); continue; }
        let q = db.from("charge_park_claims").select("*").eq("plate", plate).gte("claimed_at", iso(since - 15 * MIN)).lte("claimed_at", iso(t)).order("claimed_at", { ascending: false }).limit(10);
        if (st0) q = q.eq("station_id", st0.st.id);
        const { data: cl } = await q;
        const periods: any[] = []; let best: any = null;
        for (const c of cl || []) {
          const x = st0 || await loadSite(c.station_id);
          const s = c.session_id ? (await db.from("charge_sessions").select("*").eq("id", c.session_id).maybeSingle()).data : null;
          const j: any = judge(c, s, x?.site, t);
          if (j.window && c.status === "frei") periods.push({ from: j.window.from, to: j.window.to, charging_until: j.window.charging_until, station: x?.st.project_id || c.station_id, bay: x ? cpLabel(x.st, c.connector) : c.connector, connector: c.connector, kwh: s?.kwh ?? null });
          const rank = { frei: 5, karenz: 4, pruefung: 3, ueberschritten: 2, gebuehrenpflichtig: 1 } as any;
          if (!best || (rank[j.status] || 0) > (rank[best.status] || 0)) best = { ...j, connector: c.connector, bay: x ? cpLabel(x.st, c.connector) : null, station: x?.st.project_id || c.station_id, demo: c.plate_demo };
        }
        const r = best ? { plate, status: best.status, label: best.label, until: best.until || null, station: best.station, bay: best.bay, connector: best.connector, free_periods: periods, demo: best.demo || undefined }
          : { plate, status: "kein_ladevorgang", label: "Kein Ladevorgang zugeordnet – reguläre Parkraumbewirtschaftung", free_periods: [] };
        results.push(r);
        await db.from("charge_park_checks").insert({ plate, station_id: st0?.st.id || null, result: r.status, detail: { at: iso(t), periods: periods.length }, caller: "partner" });
      }
      return json(Array.isArray(body.plates) ? { at: iso(t), results } : { at: iso(t), ...results[0] });
    }

    // ───────── Dashboard ─────────
    if (!action.startsWith("p_")) return json({ error: "Unbekannte Aktion" }, 400);
    if (!(await readToken("charge-admin-v1", body.token))) return json({ error: "Bitte neu anmelden" }, 401);

    if (action === "p_overview") {
      const days = clampInt(body.days, 1, 60, 7), from = iso(Date.now() - days * 86400_000);
      const simQ = (q: any) => body.sim_show ? q : q.eq("is_sim", false);
      const [{ data: sites }, { data: sts }, { data: sess }, { data: cl }, { data: chk }] = await Promise.all([
        db.from("charge_park_sites").select("*"),
        db.from("charge_stations").select("id,project_id,name,connectors,chargers,active").eq("active", true).order("project_id"),
        simQ(db.from("charge_sessions").select("*").gte("started_at", from).order("started_at", { ascending: false }).limit(1000)),
        simQ(db.from("charge_park_claims").select("*").gte("claimed_at", from).order("claimed_at", { ascending: false }).limit(1000)),
        db.from("charge_park_checks").select("result,at").gte("at", from).limit(10000)]);
      const siteOf = (id: string) => (sites || []).find((s: any) => s.station_id === id);
      const claims = (cl || []).map((c: any) => { const s = (sess || []).find((x: any) => x.id === c.session_id) || null; const st = (sts || []).find((x: any) => x.id === c.station_id);
        return { ...c, bay: st ? cpLabel(st, c.connector) : `LP ${c.connector}`, project: st?.project_id || c.station_id, session: s, now: judge(c, s, siteOf(c.station_id), Date.now()) }; });
      const linked = new Set(claims.filter((c: any) => c.session_id && c.status === "frei").map((c: any) => c.session_id));
      return json({ days, sites: sites || [], stations: (sts || []).map((s: any) => ({ id: s.id, project_id: s.project_id, name: s.name, bays: (s.connectors || []).map((c: any) => ({ n: c.n, label: cpLabel(s, c.n), evse: c.evse || null })) })),
        sessions: (sess || []).map((s: any) => ({ ...s, linked: linked.has(s.id), bay: (() => { const st = (sts || []).find((x: any) => x.id === s.station_id); return st ? cpLabel(st, s.connector) : `LP ${s.connector}`; })() })),
        claims, checks: { total: (chk || []).length, frei: (chk || []).filter((c: any) => c.result === "frei").length, kein: (chk || []).filter((c: any) => c.result === "kein_ladevorgang").length },
        keys: { partner: !!cfg("PARK_PARTNER_KEY_HASH"), backend: !!cfg("PARK_BACKEND_KEY_HASH") }, retention_days: keepDays });
    }
    if (action === "p_sites_save") {
      const s = body.site || {}; const id = str(s.station_id, 40); if (!id || !ID_RE.test(id)) return json({ error: "Standort fehlt" }, 400);
      const bm: Record<string, number> = {}; for (const [k, v] of Object.entries(s.bay_max || {})) if (/^\d{1,3}$/.test(k) && v !== "" && v != null) bm[k] = clampInt(v, 5, 1440, 60);
      const row = { station_id: id, enabled: !!s.enabled, grace_min: clampInt(s.grace_min, 0, 120, 15), max_min: clampInt(s.max_min, 5, 1440, 60), after_min: clampInt(s.after_min, 0, 120, 15),
        claim_window_min: clampInt(s.claim_window_min, 2, 120, 20), proof: ["zeit", "karte"].includes(s.proof) ? s.proof : "zeit", bay_max: bm, note: str(s.note, 300), updated_at: new Date().toISOString() };
      const { error } = await db.from("charge_park_sites").upsert(row); if (error) throw new Error(error.message);
      return json({ ok: true });
    }
    if (action === "p_resolve") {
      const { data: c } = await db.from("charge_park_claims").select("*").eq("id", str(body.id, 40)).maybeSingle();
      if (!c) return json({ error: "Nicht gefunden" }, 404);
      const ok = !!body.approve;
      await db.from("charge_park_claims").update({ status: ok ? "frei" : "abgelehnt", resolved_by: "Dashboard", resolved_at: new Date().toISOString(), reason: str(body.note, 300) || c.reason }).eq("id", c.id);
      if (ok && c.session_id) await db.from("charge_park_claims").update({ status: "abgelehnt", resolved_by: "Dashboard", resolved_at: new Date().toISOString(), reason: "Zugunsten " + maskPlate(c.plate) + " entschieden" })
        .eq("session_id", c.session_id).neq("id", c.id).in("status", ["frei", "konflikt"]);
      return json({ ok: true });
    }
    if (action === "p_session") { // Demo/Test: Ladevorgang am Ladepunkt starten/stoppen (immer als DEMO markiert)
      const x = await loadSite(String(body.station || "")); const cp = Number(body.connector);
      if (!x || !(x.st.connectors || []).some((c: any) => c.n === cp)) return json({ error: "Ladepunkt unbekannt" }, 400);
      if (body.stop) { await db.from("charge_sessions").update({ status: "beendet", ended_at: new Date().toISOString(), kwh: +(Math.random() * 30 + 5).toFixed(2) }).eq("station_id", x.st.id).eq("connector", cp).eq("status", "aktiv"); return json({ ok: true }); }
      await db.from("charge_sessions").update({ status: "beendet", ended_at: new Date().toISOString() }).eq("station_id", x.st.id).eq("connector", cp).eq("status", "aktiv");
      const { data: s, error } = await db.from("charge_sessions").insert({ is_sim: true, ext_id: "DEMO-" + crypto.randomUUID().slice(0, 8), station_id: x.st.id, connector: cp, status: "aktiv", started_at: new Date().toISOString(), source: "demo" }).select("*").single();
      if (error) throw new Error(error.message);
      await linkPending(s, x.site);
      return json({ ok: true, id: s.id });
    }
    if (action === "p_keys") { // neuen Schlüssel erzeugen → Klartext nur einmal zurück
      const which = body.which === "backend" ? "PARK_BACKEND_KEY_HASH" : "PARK_PARTNER_KEY_HASH";
      const key = (body.which === "backend" ? "hcb_" : "hcp_") + hex(crypto.getRandomValues(new Uint8Array(24)).buffer);
      await db.from("charge_support_config").upsert({ key: which, value: await sha256(key), updated_at: new Date().toISOString() });
      return json({ ok: true, key });
    }
    if (action === "p_lookup") {
      const plate = normPlate(body.plate) || normPlate(body.plate, true); if (!plate) return json({ error: "Kennzeichen ungültig" }, 400);
      const { data: cl } = await db.from("charge_park_claims").select("*").eq("plate", plate).order("claimed_at", { ascending: false }).limit(20);
      const out = [];
      for (const c of cl || []) { const x = await loadSite(c.station_id); const s = c.session_id ? (await db.from("charge_sessions").select("*").eq("id", c.session_id).maybeSingle()).data : null;
        out.push({ ...c, bay: x ? cpLabel(x.st, c.connector) : c.connector, project: x?.st.project_id, session: s, now: judge(c, s, x?.site, Date.now()) }); }
      const { data: ck } = await db.from("charge_park_checks").select("at,result,caller").eq("plate", plate).order("at", { ascending: false }).limit(20);
      return json({ plate, claims: out, checks: ck || [] });
    }
    return json({ error: "Unbekannte Aktion" }, 400);
  } catch (e) {
    console.error("charge-park:", action, String((e as any)?.message || e));
    return json({ error: "Serverfehler" }, 500);
  }
});
