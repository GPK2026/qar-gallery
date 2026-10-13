// ═══════════════════════════════════════════════════════════════════════════
// SUPABASE EDGE FUNCTION — repair-briefing: Reparatur-Briefing für Werkstätten
//
// Der Eigentümer gibt ausgewählte Mängel per Link frei. Die Werkstatt öffnet
// den Link ohne Login (pcn/briefing.html), dokumentiert je Punkt das Ergebnis
// und kann zusätzlich Festgestelltes melden. Der Eigentümer übernimmt die
// Dokumentation auf Wunsch ins Logbuch.
//
// RECHTLICH BEWUSST SO GESTALTET
//   • Keine digitale Abnahme (§ 640 BGB): "Dokumentation abschließen" (Werkstatt)
//     und "ins Logbuch übernehmen" (Eigentümer) sind reine Dokumentation.
//     Die Abnahme erfolgt vor Ort nach Sichtprüfung.
//   • Zusätzlich Festgestelltes ist ein Hinweis, kein Auftrag. Der Eigentümer
//     kann es nur in seine Mängelliste übernehmen oder verwerfen.
//
// ZUGRIFF
//   • Eigentümer: Sitzungs-Token (st) von pcn-secure (gleicher HMAC-Schlüssel).
//   • Werkstatt: Link mit Zufalls-Token; gespeichert ist nur der SHA-256-Hash.
//     Link 30 Tage gültig, vom Eigentümer jederzeit zurückziehbar.
//
// ── DEPLOYMENT ─────────────────────────────────────────────────────────────
//   npx supabase functions deploy repair-briefing --no-verify-jwt
//
// ── AKTIONEN (POST, JSON) ─────────────────────────────────────────────────
//   Eigentümer (st):
//     create   { vehicleId, token, findingIds, message, contact, includeFin, recipientLabel } → { id, expiresAt }
//     list     { vehicleId }                    → { briefings }
//     detail   { briefingId }                   → { briefing }
//     revoke   { briefingId }                   → { ok }
//     extraDecide { briefingId, extraId, decision: "uebernehmen"|"verwerfen" } → { ok, findingId? }
//     transfer { briefingId, onSiteDate? }      → { ok, logbookId }
//   Werkstatt (id + token):
//     get      { id, token }                    → { briefing }
//     itemSave { id, token, findingId, result, note, parts, cost, photos, by } → { ok }
//     extraAdd { id, token, title, category, position, description, photos, by } → { ok, extraId }
//     extraDelete { id, token, extraId }        → { ok }
//     complete { id, token, by }                → { ok }
//     message  { id, token, ref, text, by }     → { ok }   (Rückfrage-Dialog, nur Klärung)
//     approvalRequest  { id, token, ref, title, estimate, by } → { ok, approvalId }
//     approvalWithdraw { id, token, approvalId, by } → { ok }
//     approvalAck      { id, token, approvalId, by } → { ok }  (Werkstatt bestätigt Empfang)
//   Eigentümer zusätzlich:
//     ownerMessage   { briefingId, ref, text }   → { ok }
//     approvalDecide { briefingId, approvalId, decision:"freigeben"|"ablehnen", limit, note } → { ok }
//     approvalRevoke { briefingId, approvalId }  → { ok }  (nur solange Werkstatt nicht bestätigt hat)
//
// BEAUFTRAGUNG
//   Verbindlich ist nur die ausdrückliche Freigabe des angemeldeten Eigentümers
//   mit Kostenrahmen (approvalDecide). Der Text der Freigabe wird beim Freigeben
//   eingefroren und unverändert gespeichert. Der Vertrag kommt zwischen
//   Eigentümer und Werkstatt zustande; QAR.Gallery übermittelt und dokumentiert.
//   Nachrichten im Dialog sind reine Klärung.
//   ref = Mängel-ID oder "x:<id>" für zusätzlich Festgestelltes.
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://qar.gallery", "https://www.qar.gallery", "http://localhost:3000"];
const MEDIA_BUCKET = "finding-media";
const BRIEFING_DAYS = 30;
const RESULTS = ["erledigt", "nicht_erledigt", "rueckfrage"];
const CATEGORIES = ["lack", "delle", "felge", "reifen", "glas", "innenraum", "technik", "sonstiges"];
const MAX_WORK_PHOTOS = 3;
const MAX_EXTRAS = 10;

const LIMITS: Record<string, number> = {
  create: 30, list: 240, detail: 240, revoke: 30, extraDecide: 60, transfer: 20,
  get: 600, itemSave: 240, extraAdd: 60, extraDelete: 60, complete: 20,
  message: 120, approvalRequest: 60, approvalWithdraw: 60, approvalAck: 60,
  ownerMessage: 120, approvalDecide: 60, approvalRevoke: 30,
};
const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();
function limited(key: string, limit: number) {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= limit) return true;
  list.push(now);
  hits.set(key, list);
  return false;
}

const hex = (b: ArrayBuffer | Uint8Array) =>
  Array.from(b instanceof Uint8Array ? b : new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
function safeEqual(a: string, b: string) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
const sha256Hex = async (s: string) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));

// Sitzungs-Token wie in pcn-secure (gleicher Schlüssel, gleiche Ableitung)
let hmacKey: CryptoKey | null = null;
async function getHmacKey() {
  if (hmacKey) return hmacKey;
  const base = Deno.env.get("PCN_SESSION_SECRET") || ("pcn-session-v1:" + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(base));
  hmacKey = await crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hmacKey;
}
async function verifySession(st: unknown): Promise<string | null> {
  if (typeof st !== "string" || st.length > 500 || !st.includes(".")) return null;
  const [payload, sig] = st.split(".");
  const mac = hex(await crypto.subtle.sign("HMAC", await getHmacKey(), new TextEncoder().encode(payload)));
  if (!safeEqual(sig, mac)) return null;
  try {
    const { u, e } = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof u === "string" && typeof e === "number" && e > Date.now() ? u : null;
  } catch { return null; }
}

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const isUuid = (v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
const validToken = (v: unknown) => typeof v === "string" && /^[A-Za-z0-9_-]{32,128}$/.test(v);
const jpegs = (list: unknown, max: number) => (Array.isArray(list) ? list : []).slice(0, max)
  .filter((p) => typeof p === "string" && /^data:image\/jpeg;base64,/.test(p) && p.length < 400_000);
const money = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? Math.max(0, Math.min(9_999_999, Math.round(n * 100) / 100)) : null;
};
const MAX_MESSAGES = 60;
const MAX_APPROVALS = 30;
const eur = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
// Freigabe-Text (beim Freigeben eingefroren) — Formulierung mit debug Rechtsanwälte abstimmen
const approvalText = (workshop: string, title: string, limit: number) =>
  `Ich beauftrage ${workshop} kostenpflichtig mit folgender Leistung: ${title}. ` +
  `Kostenrahmen bis maximal ${eur(limit)} inkl. MwSt. Darüber hinausgehende Kosten nur nach erneuter Freigabe.`;
const RESULT_LABEL: Record<string, string> = { erledigt: "erledigt", nicht_erledigt: "nicht erledigt", rueckfrage: "Rückfrage" };

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, apikey, Authorization",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return json({ error: "Nur POST erlaubt" }, 405);
  if (Number(req.headers.get("content-length") || 0) > 3 * 1024 * 1024) return json({ error: "Anfrage zu groß" }, 413);

  let b: any;
  try { b = await req.json(); } catch { return json({ error: "Ungültiges JSON" }, 400); }
  const action = b?.action;
  if (!(action in LIMITS)) return json({ error: "Unbekannte Aktion" }, 400);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(`${action}:${ip}`, LIMITS[action])) return json({ error: "Zu viele Anfragen – bitte später erneut versuchen." }, 429);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const vehicleOwner = async (vehicleId: string) => {
    const { data, error } = await db.from("vehicles").select("user_id").eq("id", vehicleId).maybeSingle();
    if (error) throw new Error("vehicles: " + error.message);
    return data?.user_id || null;
  };
  const videoUrls = async (videos: any[], seconds: number) => {
    const out = [];
    for (const v of videos || []) {
      const { data } = await db.storage.from(MEDIA_BUCKET).createSignedUrl(v.path, seconds);
      out.push({ ...v, url: data?.signedUrl || null });
    }
    return out;
  };
  const present = async (row: any, videoSeconds: number) => {
    const snap = row.snapshot || {};
    const findings = [];
    for (const f of snap.findings || []) findings.push({ ...f, videos: await videoUrls(f.videos || [], videoSeconds) });
    return {
      ...snap, findings, work: row.work || {}, createdAt: row.created_at, expiresAt: row.expires_at,
      completedAt: row.completed_at, completedBy: row.completed_by, logbookTransferredAt: row.logbook_transferred_at,
    };
  };
  const summary = (row: any) => {
    const items = row.work?.items || {};
    const ids = (row.snapshot?.findings || []).map((f: any) => f.id);
    const extras = row.work?.extras || [];
    return {
      total: ids.length,
      documented: ids.filter((id: string) => items[id]?.result).length,
      done: ids.filter((id: string) => items[id]?.result === "erledigt").length,
      questions: ids.filter((id: string) => items[id]?.result === "rueckfrage").length,
      extrasOpen: extras.filter((x: any) => !x.decision).length,
      approvalsOpen: (row.work?.approvals || []).filter((a: any) => a.status === "angefragt").length,
      approvalsGranted: (row.work?.approvals || []).filter((a: any) => a.status === "freigegeben").length,
      // Threads, deren letzte Nachricht von der Werkstatt kommt (= wartet auf Eigentümer)
      unanswered: Object.values(row.work?.threads || {}).filter((t: any) => t.length && t[t.length - 1].from === "werkstatt").length,
    };
  };
  // Werkstatt-Zugriff über Link: gültig, nicht zurückgezogen, nicht abgelaufen
  const byLink = async (forWrite: boolean) => {
    if (!isUuid(b.id) || !validToken(b.token)) return { err: json({ error: "Link ungültig" }, 404) };
    const { data: row, error } = await db.from("repair_briefings").select("*").eq("id", b.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row || !safeEqual(row.access_token_hash, await sha256Hex(b.token))) return { err: json({ error: "Link ungültig" }, 404) };
    if (row.revoked_at) return { err: json({ error: "Dieser Link wurde vom Eigentümer zurückgezogen" }, 410) };
    if (new Date(row.expires_at).getTime() < Date.now()) return { err: json({ error: "Dieser Link ist abgelaufen" }, 410) };
    if (forWrite && row.completed_at) return { err: json({ error: "Die Dokumentation ist bereits abgeschlossen" }, 409) };
    return { row };
  };
  const logEntry = (work: any, entry: Record<string, unknown>) => {
    work.log = [...(work.log || []), { at: new Date().toISOString(), ...entry }].slice(-200);
  };
  const validRef = (row: any, ref: unknown) => typeof ref === "string" && (
    (row.snapshot?.findings || []).some((f: any) => f.id === ref) ||
    (ref.startsWith("x:") && (row.work?.extras || []).some((x: any) => "x:" + x.id === ref)));
  const addMessage = (work: any, ref: string, msg: Record<string, unknown>) => {
    const threads = { ...(work.threads || {}) };
    const list = threads[ref] || [];
    if (list.length >= MAX_MESSAGES) return false;
    threads[ref] = [...list, { id: crypto.randomUUID(), at: new Date().toISOString(), ...msg }];
    work.threads = threads;
    return true;
  };
  const saveWork = async (id: string, work: any, extra: Record<string, unknown> = {}) => {
    const { error } = await db.from("repair_briefings").update({ work, ...extra }).eq("id", id);
    if (error) throw new Error(error.message);
  };

  try {
    // ════════════ Werkstatt (Link) ════════════
    if (action === "get") {
      const { row, err } = await byLink(false); if (err) return err;
      const nowIso = new Date().toISOString();
      if (b.poll === true) return json({ briefing: await present(row, 7200) });
      await db.from("repair_briefings").update({
        first_viewed_at: row.first_viewed_at || nowIso, last_viewed_at: nowIso, view_count: (row.view_count || 0) + 1,
      }).eq("id", row.id);
      return json({ briefing: await present(row, 7200) });
    }

    if (action === "itemSave") {
      const { row, err } = await byLink(true); if (err) return err;
      const ids = (row.snapshot?.findings || []).map((f: any) => f.id);
      if (!ids.includes(b.findingId)) return json({ error: "Punkt gehört nicht zu diesem Briefing" }, 400);
      if (!RESULTS.includes(b.result)) return json({ error: "Bitte ein Ergebnis wählen" }, 400);
      const by = str(b.by, 120);
      if (!by) return json({ error: "Bitte Namen des Bearbeiters angeben" }, 400);
      const note = str(b.note, 3000);
      if (b.result !== "erledigt" && !note) return json({ error: b.result === "rueckfrage" ? "Bitte die Rückfrage beschreiben" : "Bitte kurz begründen, warum nicht erledigt" }, 400);
      const work = { ...(row.work || {}) };
      work.items = { ...(work.items || {}), [b.findingId]: {
        result: b.result, note, parts: str(b.parts, 1000), cost: money(b.cost),
        photos: jpegs(b.photos, MAX_WORK_PHOTOS), by, at: new Date().toISOString(),
      } };
      logEntry(work, { by, action: "item", findingId: b.findingId, result: b.result });
      await saveWork(row.id, work);
      return json({ ok: true });
    }

    if (action === "extraAdd") {
      const { row, err } = await byLink(true); if (err) return err;
      const by = str(b.by, 120), title = str(b.title, 160);
      if (!by) return json({ error: "Bitte Namen des Bearbeiters angeben" }, 400);
      if (!title) return json({ error: "Bitte kurz beschreiben, was festgestellt wurde" }, 400);
      const work = { ...(row.work || {}) };
      if ((work.extras || []).length >= MAX_EXTRAS) return json({ error: `Maximal ${MAX_EXTRAS} zusätzliche Punkte` }, 400);
      const extraId = crypto.randomUUID();
      work.extras = [...(work.extras || []), {
        id: extraId, title, category: CATEGORIES.includes(b.category) ? b.category : "sonstiges",
        position: str(b.position, 60), description: str(b.description, 3000), photos: jpegs(b.photos, MAX_WORK_PHOTOS),
        by, at: new Date().toISOString(), decision: null,
      }];
      logEntry(work, { by, action: "extraAdd", extraId });
      await saveWork(row.id, work);
      return json({ ok: true, extraId });
    }

    if (action === "extraDelete") {
      const { row, err } = await byLink(true); if (err) return err;
      const work = { ...(row.work || {}) };
      const x = (work.extras || []).find((e: any) => e.id === b.extraId);
      if (!x) return json({ error: "Punkt nicht gefunden" }, 404);
      if (x.decision) return json({ error: "Der Eigentümer hat diesen Punkt bereits bearbeitet" }, 409);
      work.extras = work.extras.filter((e: any) => e.id !== b.extraId);
      logEntry(work, { by: str(b.by, 120), action: "extraDelete", extraId: b.extraId });
      await saveWork(row.id, work);
      return json({ ok: true });
    }

    if (action === "complete") {
      const { row, err } = await byLink(true); if (err) return err;
      const by = str(b.by, 120);
      if (!by) return json({ error: "Bitte Namen des Bearbeiters angeben" }, 400);
      const s = summary(row);
      if (s.documented < s.total) return json({ error: `Noch ${s.total - s.documented} Punkt(e) ohne Ergebnis` }, 400);
      if (s.questions > 0) return json({ error: "Offene Rückfragen bitte erst mit dem Eigentümer klären und den Punkt aktualisieren" }, 400);
      if (s.approvalsOpen > 0) return json({ error: "Offene Freigabe-Anfragen: bitte Entscheidung des Eigentümers abwarten oder Anfrage zurückziehen" }, 400);
      const work = { ...(row.work || {}) };
      logEntry(work, { by, action: "complete" });
      await saveWork(row.id, work, { completed_at: new Date().toISOString(), completed_by: by });
      return json({ ok: true });
    }

    if (action === "message") {
      const { row, err } = await byLink(true); if (err) return err;
      const by = str(b.by, 120), text = str(b.text, 2000);
      if (!by) return json({ error: "Bitte Namen des Bearbeiters angeben" }, 400);
      if (!text) return json({ error: "Nachricht ist leer" }, 400);
      if (!validRef(row, b.ref)) return json({ error: "Punkt gehört nicht zu diesem Briefing" }, 400);
      const work = { ...(row.work || {}) };
      if (!addMessage(work, b.ref, { from: "werkstatt", by, text })) return json({ error: "Zu viele Nachrichten zu diesem Punkt" }, 400);
      logEntry(work, { by, action: "message", ref: b.ref });
      await saveWork(row.id, work);
      return json({ ok: true });
    }

    if (action === "approvalRequest") {
      const { row, err } = await byLink(true); if (err) return err;
      const by = str(b.by, 120), title = str(b.title, 500);
      const estimate = money(b.estimate);
      if (!by) return json({ error: "Bitte Namen des Bearbeiters angeben" }, 400);
      if (!title) return json({ error: "Bitte die Leistung beschreiben" }, 400);
      if (!estimate || estimate <= 0) return json({ error: "Bitte die voraussichtlichen Kosten angeben" }, 400);
      if (!validRef(row, b.ref)) return json({ error: "Punkt gehört nicht zu diesem Briefing" }, 400);
      const work = { ...(row.work || {}) };
      if ((work.approvals || []).length >= MAX_APPROVALS) return json({ error: "Zu viele Freigabe-Anfragen" }, 400);
      const approvalId = crypto.randomUUID();
      work.approvals = [...(work.approvals || []), {
        id: approvalId, ref: b.ref, title, estimate, requestedBy: by, requestedAt: new Date().toISOString(), status: "angefragt",
      }];
      logEntry(work, { by, action: "approvalRequest", approvalId, ref: b.ref, estimate });
      await saveWork(row.id, work);
      return json({ ok: true, approvalId });
    }

    if (action === "approvalWithdraw" || action === "approvalAck") {
      const { row, err } = await byLink(true); if (err) return err;
      const by = str(b.by, 120);
      if (!by) return json({ error: "Bitte Namen des Bearbeiters angeben" }, 400);
      const work = { ...(row.work || {}) };
      const a = (work.approvals || []).find((x: any) => x.id === b.approvalId);
      if (!a) return json({ error: "Freigabe nicht gefunden" }, 404);
      if (action === "approvalWithdraw") {
        if (a.status !== "angefragt") return json({ error: "Nur offene Anfragen können zurückgezogen werden" }, 409);
        work.approvals = work.approvals.map((x: any) => x.id === a.id ? { ...x, status: "zurueckgezogen", decidedAt: new Date().toISOString() } : x);
      } else {
        if (a.status !== "freigegeben") return json({ error: "Diese Freigabe ist nicht (mehr) gültig" }, 409);
        if (a.ackAt) return json({ ok: true });
        work.approvals = work.approvals.map((x: any) => x.id === a.id ? { ...x, ackAt: new Date().toISOString(), ackBy: by } : x);
      }
      logEntry(work, { by, action, approvalId: a.id });
      await saveWork(row.id, work);
      return json({ ok: true });
    }

    // ════════════ Eigentümer (Sitzung) ════════════
    const userId = await verifySession(b.st);
    if (!userId) return json({ error: "Sitzung abgelaufen – bitte einmal ab- und wieder anmelden.", code: "session" }, 401);

    if (action === "create" || action === "list") {
      const vehicleId = str(b.vehicleId, 100);
      if (!vehicleId) return json({ error: "Fahrzeug fehlt" }, 400);
      if ((await vehicleOwner(vehicleId)) !== userId) return json({ error: "Nur der Eigentümer kann Briefings verwalten" }, 403);
      if (action === "list") {
        const { data, error } = await db.from("repair_briefings").select("*")
          .eq("vehicle_id", vehicleId).order("created_at", { ascending: false }).limit(50);
        if (error) throw new Error(error.message);
        return json({ briefings: (data || []).map((r: any) => ({
          id: r.id, recipientLabel: r.recipient_label, createdAt: r.created_at, expiresAt: r.expires_at,
          firstViewedAt: r.first_viewed_at, lastViewedAt: r.last_viewed_at, viewCount: r.view_count, revokedAt: r.revoked_at,
          completedAt: r.completed_at, completedBy: r.completed_by, logbookTransferredAt: r.logbook_transferred_at,
          findingTitles: (r.snapshot?.findings || []).map((f: any) => f.title), progress: summary(r),
        })) });
      }
      if (!validToken(b.token)) return json({ error: "Ungültiges Token" }, 400);
      const ids = (Array.isArray(b.findingIds) ? b.findingIds : []).filter(isUuid).slice(0, 20);
      if (!ids.length) return json({ error: "Bitte mindestens einen Punkt auswählen" }, 400);
      const { data: fs, error: fErr } = await db.from("vehicle_findings").select("*").eq("vehicle_id", vehicleId).in("id", ids);
      if (fErr) throw new Error(fErr.message);
      if (!fs?.length) return json({ error: "Keine Einträge gefunden" }, 404);
      const { data: v } = await db.from("vehicles").select("hersteller,modell,baujahr,kennzeichen,fin,kilometerstand").eq("id", vehicleId).maybeSingle();
      const { data: owner } = await db.from("users").select("name").eq("id", userId).maybeSingle();
      const c = b.contact || {};
      const order = new Map(ids.map((id: string, i: number) => [id, i]));
      const snapshot = {
        vehicle: {
          make: [v?.hersteller, v?.modell].filter(Boolean).join(" ") || null, year: v?.baujahr || null,
          plate: v?.kennzeichen || null, km: v?.kilometerstand || null, fin: b.includeFin === true ? (v?.fin || null) : null,
        },
        owner: { name: owner?.name || null, phone: str(c.phone, 50), email: str(c.email, 200), preferred: str(c.preferred, 300) },
        message: str(b.message, 4000),
        findings: [...fs].sort((x: any, y: any) => (order.get(x.id) ?? 0) - (order.get(y.id) ?? 0)).map((f: any) => ({
          id: f.id, category: f.category, title: f.title, position: f.position, description: f.description,
          foundAt: f.found_at, km: f.km, status: f.status, photos: f.photos || [], videos: f.videos || [],
        })),
      };
      const expiresAt = new Date(Date.now() + BRIEFING_DAYS * 864e5).toISOString();
      const { data: ins, error } = await db.from("repair_briefings").insert({
        vehicle_id: vehicleId, owner_user_id: userId, access_token_hash: await sha256Hex(b.token),
        snapshot, recipient_label: str(b.recipientLabel, 120), expires_at: expiresAt,
      }).select("id").single();
      if (error) throw new Error(error.message);
      return json({ id: ins.id, expiresAt });
    }

    // Ab hier: ein bestimmtes Briefing des Eigentümers
    if (!isUuid(b.briefingId)) return json({ error: "Briefing fehlt" }, 400);
    const { data: row, error: rErr } = await db.from("repair_briefings").select("*").eq("id", b.briefingId).maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!row) return json({ error: "Briefing nicht gefunden" }, 404);
    if ((await vehicleOwner(row.vehicle_id)) !== userId) return json({ error: "Nur der Eigentümer hat Zugriff" }, 403);

    if (action === "detail") return json({ briefing: { id: row.id, recipientLabel: row.recipient_label, ...(await present(row, 3600)) } });

    if (action === "ownerMessage" || action === "approvalDecide" || action === "approvalRevoke") {
      if (row.revoked_at) return json({ error: "Der Link ist zurückgezogen" }, 409);
      if (row.completed_at) return json({ error: "Die Werkstatt hat die Dokumentation bereits abgeschlossen" }, 409);
      const work = { ...(row.work || {}) };
      if (action === "ownerMessage") {
        const text = str(b.text, 2000);
        if (!text) return json({ error: "Nachricht ist leer" }, 400);
        if (!validRef(row, b.ref)) return json({ error: "Punkt gehört nicht zu diesem Briefing" }, 400);
        if (!addMessage(work, b.ref, { from: "eigentuemer", by: "Eigentümer", text })) return json({ error: "Zu viele Nachrichten zu diesem Punkt" }, 400);
        logEntry(work, { by: "Eigentümer", action: "message", ref: b.ref });
      } else {
        const a = (work.approvals || []).find((x: any) => x.id === b.approvalId);
        if (!a) return json({ error: "Freigabe nicht gefunden" }, 404);
        const nowIso = new Date().toISOString();
        if (action === "approvalDecide") {
          if (a.status !== "angefragt") return json({ error: "Über diese Anfrage wurde bereits entschieden" }, 409);
          if (b.decision === "freigeben") {
            const limit = money(b.limit);
            if (!limit || limit <= 0) return json({ error: "Bitte einen Kostenrahmen angeben" }, 400);
            const text = approvalText(row.recipient_label || "die Werkstatt", a.title, limit);
            work.approvals = work.approvals.map((x: any) => x.id === a.id
              ? { ...x, status: "freigegeben", limit, text, ownerNote: str(b.note, 1000), decidedAt: nowIso, decidedBy: userId } : x);
          } else if (b.decision === "ablehnen") {
            work.approvals = work.approvals.map((x: any) => x.id === a.id
              ? { ...x, status: "abgelehnt", ownerNote: str(b.note, 1000), decidedAt: nowIso, decidedBy: userId } : x);
          } else return json({ error: "Ungültige Entscheidung" }, 400);
          logEntry(work, { by: "Eigentümer", action: "approval_" + b.decision, approvalId: a.id, limit: money(b.limit) });
        } else {
          if (a.status !== "freigegeben") return json({ error: "Nur erteilte Freigaben können widerrufen werden" }, 409);
          if (a.ackAt) return json({ error: "Die Werkstatt hat die Freigabe bereits bestätigt — bitte direkt mit ihr sprechen" }, 409);
          work.approvals = work.approvals.map((x: any) => x.id === a.id ? { ...x, status: "widerrufen", revokedAt: nowIso } : x);
          logEntry(work, { by: "Eigentümer", action: "approvalRevoke", approvalId: a.id });
        }
      }
      await saveWork(row.id, work);
      return json({ ok: true });
    }

    if (action === "revoke") {
      const { error } = await db.from("repair_briefings").update({ revoked_at: new Date().toISOString() }).eq("id", row.id);
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }

    if (action === "extraDecide") {
      if (!["uebernehmen", "verwerfen"].includes(b.decision)) return json({ error: "Ungültige Entscheidung" }, 400);
      const work = { ...(row.work || {}) };
      const x = (work.extras || []).find((e: any) => e.id === b.extraId);
      if (!x) return json({ error: "Punkt nicht gefunden" }, 404);
      if (x.decision) return json({ error: "Bereits entschieden" }, 409);
      let findingId: string | null = null;
      if (b.decision === "uebernehmen") {
        // Übernahme in die eigene Mängelliste — ausdrücklich KEIN Auftrag
        const hint = `Hinweis von ${row.recipient_label || "Werkstatt"} (${x.by}) am ${new Date(x.at).toLocaleDateString("de-DE")}`;
        const { data: ins, error } = await db.from("vehicle_findings").insert({
          vehicle_id: row.vehicle_id, created_by_user_id: userId, category: x.category, title: x.title, position: x.position,
          description: [x.description, hint].filter(Boolean).join("\n\n"), found_at: new Date(x.at).toISOString().slice(0, 10),
          status: "offen", photos: x.photos || [], videos: [],
        }).select("id").single();
        if (error) throw new Error(error.message);
        findingId = ins.id;
      }
      work.extras = work.extras.map((e: any) => e.id === x.id ? { ...e, decision: b.decision, decidedAt: new Date().toISOString(), findingId } : e);
      logEntry(work, { by: "Eigentümer", action: "extraDecide", extraId: x.id, decision: b.decision });
      await saveWork(row.id, work);
      return json({ ok: true, findingId });
    }

    if (action === "transfer") {
      // Dokumentation ins Logbuch übernehmen — KEINE Abnahme im Sinne des § 640 BGB
      if (!row.completed_at) return json({ error: "Die Werkstatt hat die Dokumentation noch nicht abgeschlossen" }, 409);
      if (row.logbook_transferred_at) return json({ error: "Bereits ins Logbuch übernommen" }, 409);
      const onSite = typeof b.onSiteDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.onSiteDate) ? b.onSiteDate : null;
      const items = row.work?.items || {};
      const findings = row.snapshot?.findings || [];
      const workshop = row.recipient_label || "Werkstatt";
      const date = (onSite || row.completed_at).slice(0, 10);
      const lines = findings.map((f: any, i: number) => {
        const it = items[f.id] || {};
        return `${i + 1}. ${f.title}: ${RESULT_LABEL[it.result] || "–"}${it.note ? " — " + it.note : ""}${it.parts ? " (Teile: " + it.parts + ")" : ""}`;
      });
      const total = findings.reduce((s: number, f: any) => s + (items[f.id]?.cost || 0), 0);
      const granted = (row.work?.approvals || []).filter((a: any) => a.status === "freigegeben");
      const extraTitle = (ref: string) => {
        const f = findings.find((x: any) => x.id === ref); if (f) return f.title;
        const x = (row.work?.extras || []).find((e: any) => "x:" + e.id === ref); return x ? x.title + " (zusätzlich festgestellt)" : ref;
      };
      const threadLines = Object.entries(row.work?.threads || {}).flatMap(([ref, list]: any) => [
        `Rückfrage zu „${extraTitle(ref)}“:`,
        ...list.map((m: any) => `  ${new Date(m.at).toLocaleString("de-DE")} ${m.from === "werkstatt" ? "Werkstatt (" + m.by + ")" : "Eigentümer"}: ${m.text}`),
      ]);
      const notes = [
        `Werkstatt-Dokumentation (Reparatur-Briefing), abgeschlossen von ${row.completed_by} am ${new Date(row.completed_at).toLocaleDateString("de-DE")}.`,
        ...lines,
        ...(granted.length ? ["Freigaben des Eigentümers:", ...granted.map((a: any) =>
          `  ${a.title} — bis max. ${eur(a.limit)}, freigegeben am ${new Date(a.decidedAt).toLocaleString("de-DE")}${a.ackAt ? ", von der Werkstatt bestätigt" : ""}`)] : []),
        ...threadLines,
        onSite ? `Fahrzeug vor Ort geprüft am ${new Date(onSite).toLocaleDateString("de-DE")} (Angabe des Eigentümers).` : null,
      ].filter(Boolean).join("\n");
      const firstPhoto = findings.map((f: any) => (items[f.id]?.photos || [])[0]).find(Boolean) || null;
      const { data: lb, error: lbErr } = await db.from("logbook").insert({
        vehicle_id: row.vehicle_id, date, type: "Reparatur (Werkstatt dokumentiert)", km: null, notes: notes.slice(0, 8000),
        workshop, amount: total > 0 ? total : null, document_category: "reparatur", document_image: firstPhoto,
        source: "workshop_briefing", created_at: new Date().toISOString(),
      }).select("id").single();
      if (lbErr) throw new Error(lbErr.message);
      // erledigte Punkte in der Mängelliste auf "behoben" setzen
      for (const f of findings) {
        const it = items[f.id];
        if (it?.result !== "erledigt") continue;
        await db.from("vehicle_findings").update({
          status: "behoben", fixed_at: date, fix_note: [workshop, it.note].filter(Boolean).join(": ").slice(0, 1000),
          cost: it.cost ?? null, updated_at: new Date().toISOString(),
        }).eq("id", f.id).eq("vehicle_id", row.vehicle_id);
      }
      const work = { ...(row.work || {}) };
      logEntry(work, { by: "Eigentümer", action: "transfer", onSite });
      await saveWork(row.id, work, { logbook_transferred_at: new Date().toISOString() });
      return json({ ok: true, logbookId: lb.id });
    }

    return json({ error: "Unbekannte Aktion" }, 400);
  } catch (e) {
    console.error("repair-briefing:", action, String((e as Error)?.message || e));
    return json({ error: "Serverfehler – bitte später erneut versuchen." }, 500);
  }
});
