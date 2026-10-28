// ═══════════════════════════════════════════════════════════════════════════
// SUPABASE EDGE FUNCTION — club-crm: Club-CRM für den Vorstand (Admin-Konsole)
//
// WARUM ÜBER EINE FUNKTION
// Notizen, Schlagworte, Phasen und Wiedervorlagen sind persönliche Daten über
// Menschen. Die Tabellen crm_people / crm_notes / crm_followups / crm_partners
// sind für den öffentlichen Schlüssel gesperrt; nur diese Funktion
// (service_role) greift zu.
//
// ZUGRIFF
// Nur mit Sitzungs-Token (st) von pcn-secure UND users.is_admin = true.
// is_admin ist per Trigger (users_protect_is_admin) nur serverseitig änderbar.
//
// ── DEPLOYMENT ─────────────────────────────────────────────────────────────
//   npx supabase functions deploy club-crm --no-verify-jwt
//
// ── AKTIONEN (POST, JSON, immer mit st) ───────────────────────────────────
//   overview      {}                                   → { people, partners, followups, stages }
//   person        { userId }                           → { person, notes, followups, timeline }
//   personUpdate  { userId, stage?, tags? }            → { ok }
//   partner       { partnerId }                        → { partner, notes, followups }
//   partnerSave   { partner }                          → { id }
//   partnerDelete { partnerId }                        → { ok }
//   noteAdd       { userId | partnerId, text }         → { note }
//   noteDelete    { noteId }                           → { ok }
//   followupAdd   { userId | partnerId, dueDate, text }→ { followup }
//   followupDone  { followupId, done }                 → { ok }
//   followupDelete{ followupId }                       → { ok }
//
// DATENSCHUTZ
// Notizen sachlich halten (keine Gesundheitsdaten o. Ä.). Wird ein Konto
// gelöscht, löschen die Fremdschlüssel (ON DELETE CASCADE) alle CRM-Daten mit.
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://qar.gallery", "https://www.qar.gallery", "http://localhost:3000"];
const STAGES = ["kontakt", "gast", "probe_event", "mitglied", "inaktiv", "werkstatt"];
const PARTNER_CATEGORIES = ["werkstatt", "versicherung", "kanzlei", "gutachter", "sponsor", "haendler", "sonstiges"];
const MAX_TAGS = 12;

const LIMITS: Record<string, number> = {
  overview: 600, person: 1200, personUpdate: 600, partner: 600, partnerSave: 300, partnerDelete: 60,
  noteAdd: 600, noteDelete: 120, followupAdd: 600, followupDone: 600, followupDelete: 120,
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
const cleanTags = (v: unknown) => [...new Set((Array.isArray(v) ? v : [])
  .map((t) => str(t, 40)?.toLowerCase()).filter(Boolean) as string[])].slice(0, MAX_TAGS);
const derivedStage = (u: any) =>
  u.role === "workshop" ? "werkstatt" : u.role === "guest" ? "gast" : u.paused ? "inaktiv" : "mitglied";

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
  if (Number(req.headers.get("content-length") || 0) > 256 * 1024) return json({ error: "Anfrage zu groß" }, 413);

  let b: any;
  try { b = await req.json(); } catch { return json({ error: "Ungültiges JSON" }, 400); }
  const action = b?.action;
  if (!(action in LIMITS)) return json({ error: "Unbekannte Aktion" }, 400);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(`${action}:${ip}`, LIMITS[action])) return json({ error: "Zu viele Anfragen – bitte später erneut versuchen." }, 429);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  try {
    // ── Nur Admins ──
    const uid = await verifySession(b.st);
    if (!uid) return json({ error: "Sitzung abgelaufen – bitte neu anmelden.", code: "session" }, 401);
    const { data: me, error: meErr } = await db.from("users").select("id,name,is_admin").eq("id", uid).maybeSingle();
    if (meErr) throw new Error(meErr.message);
    if (!me?.is_admin) return json({ error: "Kein Admin-Zugang", code: "forbidden" }, 403);

    const subject = () => {
      if (isUuid(b.userId)) return { user_id: b.userId, partner_id: null };
      if (isUuid(b.partnerId)) return { user_id: null, partner_id: b.partnerId };
      return null;
    };
    const authorNames = async (rows: any[]) => {
      const ids = [...new Set(rows.map((r) => r.author_id).filter(Boolean))];
      if (!ids.length) return {};
      const { data } = await db.from("users").select("id,name").in("id", ids);
      return Object.fromEntries((data || []).map((u: any) => [u.id, u.name]));
    };
    const mapNote = (n: any, names: any) => ({ id: n.id, text: n.text, author: names[n.author_id] || null, createdAt: n.created_at });
    const mapFollowup = (f: any, names: any) => ({
      id: f.id, userId: f.user_id, partnerId: f.partner_id, dueDate: f.due_date, text: f.text,
      doneAt: f.done_at, author: names[f.author_id] || null, createdAt: f.created_at,
    });

    if (action === "overview") {
      const [{ data: users, error: ue }, { data: crm }, { data: partners }, { data: fus }, { data: notes }] = await Promise.all([
        db.from("users").select("id,name,email,role,member_nr,city,phone,created_at,last_seen,beitrag_bezahlt,paused,converted_from_guest,marketing_consent_at,marketing_consent_withdrawn_at")
          .in("role", ["member", "guest", "workshop"]).order("name"),
        db.from("crm_people").select("user_id,stage,tags"),
        db.from("crm_partners").select("*").order("name"),
        db.from("crm_followups").select("*").is("done_at", null).order("due_date"),
        db.from("crm_notes").select("user_id,partner_id"),
      ]);
      if (ue) throw new Error(ue.message);
      const crmBy = Object.fromEntries((crm || []).map((c: any) => [c.user_id, c]));
      const nextFu: Record<string, any> = {};
      for (const f of fus || []) { const k = f.user_id || f.partner_id; if (!nextFu[k]) nextFu[k] = f; }
      const noteCount: Record<string, number> = {};
      for (const n of notes || []) { const k = n.user_id || n.partner_id; noteCount[k] = (noteCount[k] || 0) + 1; }
      const people = (users || []).map((u: any) => ({
        id: u.id, name: u.name, email: u.email, role: u.role, memberNr: u.member_nr, city: u.city, phone: u.phone,
        createdAt: u.created_at, lastSeen: u.last_seen, feePaid: !!u.beitrag_bezahlt,
        marketingConsent: !!u.marketing_consent_at && !u.marketing_consent_withdrawn_at,
        stage: crmBy[u.id]?.stage || derivedStage(u), stageSet: !!crmBy[u.id]?.stage, tags: crmBy[u.id]?.tags || [],
        nextFollowup: nextFu[u.id] ? { dueDate: nextFu[u.id].due_date, text: nextFu[u.id].text } : null,
        notes: noteCount[u.id] || 0,
      }));
      const names: Record<string, string> = Object.fromEntries((users || []).map((u: any) => [u.id, u.name]));
      const pnames: Record<string, string> = Object.fromEntries((partners || []).map((p: any) => [p.id, p.name]));
      return json({
        people,
        partners: (partners || []).map((p: any) => ({
          id: p.id, name: p.name, category: p.category, contactName: p.contact_name, email: p.email, phone: p.phone,
          website: p.website, address: p.address, tags: p.tags || [],
          nextFollowup: nextFu[p.id] ? { dueDate: nextFu[p.id].due_date, text: nextFu[p.id].text } : null,
          notes: noteCount[p.id] || 0,
        })),
        followups: (fus || []).map((f: any) => ({ ...mapFollowup(f, {}), subjectName: f.user_id ? names[f.user_id] : pnames[f.partner_id] })),
        stages: STAGES, partnerCategories: PARTNER_CATEGORIES,
      });
    }

    if (action === "person" || action === "personUpdate") {
      if (!isUuid(b.userId)) return json({ error: "Person fehlt" }, 400);
      const { data: u, error } = await db.from("users").select("id,name,email,role,member_nr,city,phone,created_at,last_seen,beitrag_bezahlt,beitrag_datum,paused,paused_at,converted_from_guest,guest_created_at,marketing_consent_at,marketing_consent_withdrawn_at,contact_consent_at")
        .eq("id", b.userId).maybeSingle();
      if (error) throw new Error(error.message);
      if (!u) return json({ error: "Person nicht gefunden" }, 404);
      if (action === "personUpdate") {
        const { data: cur } = await db.from("crm_people").select("stage,tags").eq("user_id", u.id).maybeSingle();
        const row: any = { user_id: u.id, stage: cur?.stage ?? null, tags: cur?.tags ?? [], updated_at: new Date().toISOString() };
        if ("stage" in b) row.stage = b.stage === null ? null : (STAGES.includes(b.stage) ? b.stage : row.stage);
        if ("tags" in b) row.tags = cleanTags(b.tags);
        const { error: e2 } = await db.from("crm_people").upsert(row);
        if (e2) throw new Error(e2.message);
        return json({ ok: true });
      }
      const [{ data: crm }, { data: notes }, { data: fus }, { data: veh }, { data: parts }] = await Promise.all([
        db.from("crm_people").select("stage,tags").eq("user_id", u.id).maybeSingle(),
        db.from("crm_notes").select("*").eq("user_id", u.id).order("created_at", { ascending: false }),
        db.from("crm_followups").select("*").eq("user_id", u.id).order("due_date"),
        db.from("vehicles").select("id,hersteller,modell,baujahr,created_at").eq("user_id", u.id),
        db.from("participants").select("event_id,status,registered_at").eq("user_id", u.id),
      ]);
      const evIds = [...new Set((parts || []).map((p: any) => p.event_id).filter(Boolean))];
      const { data: evs } = evIds.length ? await db.from("events").select("id,name,date").in("id", evIds) : { data: [] as any[] };
      const evBy = Object.fromEntries((evs || []).map((e: any) => [e.id, e]));
      const names = await authorNames([...(notes || []), ...(fus || [])]);
      // Kontaktverlauf: was das System über die Person weiß, chronologisch
      const timeline: any[] = [];
      if (u.guest_created_at) timeline.push({ at: u.guest_created_at, icon: "💬", text: "Als Gast/Kontakt erfasst" });
      if (u.created_at) timeline.push({ at: u.created_at, icon: "🆕", text: u.role === "guest" ? "Konto angelegt" : "Registriert" });
      if (u.converted_from_guest) timeline.push({ at: u.created_at, icon: "⬆️", text: "Vom Gast zum Mitglied" });
      if (u.beitrag_datum) timeline.push({ at: u.beitrag_datum, icon: "💳", text: "Beitrag bezahlt" });
      if (u.paused_at) timeline.push({ at: u.paused_at, icon: "⏸", text: "Mitgliedschaft pausiert" });
      if (u.marketing_consent_at) timeline.push({ at: u.marketing_consent_at, icon: "✉️", text: "Einwilligung Club-Infos" });
      if (u.marketing_consent_withdrawn_at) timeline.push({ at: u.marketing_consent_withdrawn_at, icon: "🚫", text: "Einwilligung Club-Infos widerrufen" });
      for (const v of veh || []) timeline.push({ at: v.created_at, icon: "🚗", text: `Fahrzeug angelegt: ${[v.hersteller, v.modell, v.baujahr].filter(Boolean).join(" ")}` });
      for (const p of parts || []) {
        const e = evBy[p.event_id];
        timeline.push({ at: p.registered_at, icon: "🏁", text: `Event-Anmeldung: ${e?.name || "Event"}${e?.date ? " (" + new Date(e.date).toLocaleDateString("de-DE") + ")" : ""}${p.status && p.status !== "confirmed" ? " · " + p.status : ""}` });
      }
      if (u.last_seen) timeline.push({ at: u.last_seen, icon: "👀", text: "Zuletzt aktiv" });
      timeline.sort((a, c) => String(c.at).localeCompare(String(a.at)));
      return json({
        person: {
          id: u.id, name: u.name, email: u.email, role: u.role, memberNr: u.member_nr, city: u.city, phone: u.phone,
          createdAt: u.created_at, lastSeen: u.last_seen, feePaid: !!u.beitrag_bezahlt, paused: !!u.paused,
          marketingConsent: !!u.marketing_consent_at && !u.marketing_consent_withdrawn_at,
          stage: crm?.stage || derivedStage(u), stageSet: !!crm?.stage, tags: crm?.tags || [],
          vehicles: (veh || []).length, events: (parts || []).length,
        },
        notes: (notes || []).map((n: any) => mapNote(n, names)),
        followups: (fus || []).map((f: any) => mapFollowup(f, names)),
        timeline: timeline.filter((t) => t.at).slice(0, 100),
      });
    }

    if (action === "partner") {
      if (!isUuid(b.partnerId)) return json({ error: "Partner fehlt" }, 400);
      const { data: p } = await db.from("crm_partners").select("*").eq("id", b.partnerId).maybeSingle();
      if (!p) return json({ error: "Partner nicht gefunden" }, 404);
      const [{ data: notes }, { data: fus }] = await Promise.all([
        db.from("crm_notes").select("*").eq("partner_id", p.id).order("created_at", { ascending: false }),
        db.from("crm_followups").select("*").eq("partner_id", p.id).order("due_date"),
      ]);
      const names = await authorNames([...(notes || []), ...(fus || [])]);
      return json({
        partner: { id: p.id, name: p.name, category: p.category, contactName: p.contact_name, email: p.email, phone: p.phone, website: p.website, address: p.address, tags: p.tags || [] },
        notes: (notes || []).map((n: any) => mapNote(n, names)),
        followups: (fus || []).map((f: any) => mapFollowup(f, names)),
      });
    }

    if (action === "partnerSave") {
      const p = b.partner || {};
      const name = str(p.name, 160);
      if (!name) return json({ error: "Name fehlt" }, 400);
      const row: any = {
        name, category: PARTNER_CATEGORIES.includes(p.category) ? p.category : "sonstiges",
        contact_name: str(p.contactName, 160), email: str(p.email, 200), phone: str(p.phone, 60),
        website: str(p.website, 300), address: str(p.address, 300), tags: cleanTags(p.tags), updated_at: new Date().toISOString(),
      };
      if (isUuid(p.id)) {
        const { data, error } = await db.from("crm_partners").update(row).eq("id", p.id).select("id");
        if (error) throw new Error(error.message);
        if (!data?.length) return json({ error: "Partner nicht gefunden" }, 404);
        return json({ id: p.id });
      }
      const { data, error } = await db.from("crm_partners").insert({ ...row, created_by: uid }).select("id").single();
      if (error) throw new Error(error.message);
      return json({ id: data.id });
    }

    if (action === "partnerDelete") {
      if (!isUuid(b.partnerId)) return json({ error: "Partner fehlt" }, 400);
      const { error } = await db.from("crm_partners").delete().eq("id", b.partnerId);
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }

    if (action === "noteAdd") {
      const s = subject();
      const text = str(b.text, 4000);
      if (!s) return json({ error: "Person oder Partner fehlt" }, 400);
      if (!text) return json({ error: "Notiz ist leer" }, 400);
      const { data, error } = await db.from("crm_notes").insert({ ...s, text, author_id: uid }).select("*").single();
      if (error) throw new Error(error.message);
      return json({ note: mapNote(data, { [uid]: me.name }) });
    }

    if (action === "followupAdd") {
      const s = subject();
      const text = str(b.text, 500);
      const due = typeof b.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.dueDate) ? b.dueDate : null;
      if (!s) return json({ error: "Person oder Partner fehlt" }, 400);
      if (!text || !due) return json({ error: "Datum und Text angeben" }, 400);
      const { data, error } = await db.from("crm_followups").insert({ ...s, due_date: due, text, author_id: uid }).select("*").single();
      if (error) throw new Error(error.message);
      return json({ followup: mapFollowup(data, { [uid]: me.name }) });
    }

    if (action === "noteDelete" || action === "followupDone" || action === "followupDelete") {
      const id = action === "noteDelete" ? b.noteId : b.followupId;
      if (!isUuid(id)) return json({ error: "Eintrag fehlt" }, 400);
      const table = action === "noteDelete" ? "crm_notes" : "crm_followups";
      const q = action === "followupDone"
        ? db.from(table).update({ done_at: b.done === false ? null : new Date().toISOString() }).eq("id", id).select("id")
        : db.from(table).delete().eq("id", id).select("id");
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      if (!data?.length) return json({ error: "Eintrag nicht gefunden" }, 404);
      return json({ ok: true });
    }

    return json({ error: "Unbekannte Aktion" }, 400);
  } catch (e) {
    console.error("club-crm:", action, String((e as Error)?.message || e));
    return json({ error: "Serverfehler – bitte später erneut versuchen." }, 500);
  }
});
