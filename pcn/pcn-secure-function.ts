// ═══════════════════════════════════════════════════════════════════════════
// SUPABASE EDGE FUNCTION — pcn-secure: Login, Passwörter, Notfallprofile
//
// WARUM
// Die App spricht Supabase nur mit dem öffentlichen Schlüssel an. Alles, was
// dieser Schlüssel lesen darf, kann jeder lesen. Deshalb liegen
//   • Passwort-Hashes in public.user_credentials
//   • Notfallprofile/-kontakte (Gesundheitsdaten) in emergency_profiles/_contacts
// gesperrt für anon; nur diese Funktion (service_role) greift darauf zu.
//
// SITZUNGS-TOKEN
// Login/Registrierung liefern ein signiertes Token (HMAC-SHA256, 30 Tage).
// Aktionen für Eigentümer (Notfallprofile, Passwort ändern) prüfen es.
// Schlüssel wird aus SUPABASE_SERVICE_ROLE_KEY abgeleitet — kein extra Secret.
// Optional: PCN_SESSION_SECRET setzen, um ihn unabhängig zu rotieren.
//
// ── DEPLOYMENT ─────────────────────────────────────────────────────────────
//   npx supabase functions deploy pcn-secure --no-verify-jwt
//
// ── AKTIONEN (POST, JSON) ─────────────────────────────────────────────────
//   login            { email, password }                       → { user, st }
//   register         { name, email, clubCode, password? }      → { user, st }
//   registerWorkshop { workshopName, workshopAddress, contactName, email,
//                      password, phone, tradeRegisterNumber }   → { user, st }
//   changePassword   { st, newPassword }                       → { ok }
//   emergencyList    { st, vehicleId }                         → { profiles }
//   emergencySave    { st, vehicleId, profile }                → { id }
//   emergencyDelete  { st, profileId }                         → { ok }
//   emergencyByCode  { vehicleId, code }                       → { profiles }
//   findingsList     { st, vehicleId }                         → { findings }
//   findingSave      { st, vehicleId, finding }                → { id }
//   findingDelete    { st, findingId }                         → { ok }
//   (Mängel & Feststellungen am eigenen Fahrzeug — nur Eigentümer)
//   findingVideoUploadUrl { st, vehicleId, contentType, size } → { path, signedUrl }
//   briefingCreate   { st, vehicleId, token, findingIds, message, contact,
//                      includeFin, recipientLabel }            → { id, expiresAt }
//   briefingList     { st, vehicleId }                         → { briefings }
//   briefingRevoke   { st, briefingId }                        → { ok }
//   briefingGet      { id, token }   (Werkstatt, ohne Login)   → { briefing }
//   (Reparatur-Briefing: Link mit Zufalls-Token, Server kennt nur den Hash)
//   docList          { st, vehicleId }                         → { documents }
//   docUpload        { st, vehicleId, category, image, label } → { id }
//   docMarkAnalyzed  { st, documentId, logbookEntryId }        → { ok }
//   docDelete        { st, documentId }                        → { ok }
//   (Dokumentenablage der Fahrzeugakte — nur Eigentümer; Tabelle für anon gesperrt)
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://qar.gallery", "https://www.qar.gallery", "http://localhost:3000"];
const CLUB_CODE = Deno.env.get("PCN_CLUB_CODE") || "PCN2026";
const PBKDF2_ITERATIONS = 100000; // identisch mit pcn_storage.js
const SESSION_DAYS = 30;
const FINDING_CATEGORIES = ["lack", "delle", "felge", "reifen", "glas", "innenraum", "technik", "sonstiges"];
const FINDING_PHOTOS = 4;
const FINDING_VIDEOS = 2;
const MEDIA_BUCKET = "finding-media";
const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const BRIEFING_DAYS = 30;

// Spalten, die an die App zurückgehen (nie Hashes/Codes)
const USER_COLS = "id,name,email,role,member_nr,avatar,city,bio,phone,beitrag_bezahlt,beitrag_datum,geburtstag,is_admin,bg_theme,welcome_seen,adac_member_nr,avd_member_nr,created_at,workshop_name,workshop_address";

// ── Rate-Limits (In-Memory pro Instanz, reicht für den Pilotbetrieb) ────────
const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();
function limited(key: string, limit: number): boolean {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= limit) return true;
  list.push(now);
  hits.set(key, list);
  return false;
}
const LIMITS: Record<string, number> = {
  login: 30, register: 10, registerWorkshop: 5, changePassword: 10,
  emergencyList: 120, emergencySave: 60, emergencyDelete: 30, emergencyByCode: 15,
  findingsList: 240, findingSave: 120, findingDelete: 60, findingVideoUploadUrl: 40,
  briefingCreate: 30, briefingList: 120, briefingRevoke: 30, briefingGet: 120,
  docList: 240, docUpload: 60, docMarkAnalyzed: 120, docDelete: 60,
};

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, apikey, Authorization",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
}

// ── Krypto ────────────────────────────────────────────────────────────────
const hex = (b: ArrayBuffer | Uint8Array) =>
  Array.from(b instanceof Uint8Array ? b : new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
async function pbkdf2(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" }, key, 256));
}
async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return hex(salt) + ":" + (await pbkdf2(password, salt));
}
async function verifyPassword(password: string, stored: string) {
  if (!stored || !stored.includes(":")) return false;
  const [saltHex, expected] = stored.split(":");
  const salt = new Uint8Array((saltHex.match(/.{2}/g) || []).map((b) => parseInt(b, 16)));
  return safeEqual(await pbkdf2(password, salt), expected);
}

let hmacKey: CryptoKey | null = null;
async function getHmacKey() {
  if (hmacKey) return hmacKey;
  const base = Deno.env.get("PCN_SESSION_SECRET") || ("pcn-session-v1:" + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(base));
  hmacKey = await crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hmacKey;
}
const b64url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s: string) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));
async function sign(payload: string) {
  return hex(await crypto.subtle.sign("HMAC", await getHmacKey(), new TextEncoder().encode(payload)));
}
async function issueToken(userId: string) {
  const payload = b64url(JSON.stringify({ u: userId, e: Date.now() + SESSION_DAYS * 864e5 }));
  return payload + "." + (await sign(payload));
}
async function verifyToken(st: unknown): Promise<string | null> {
  if (typeof st !== "string" || st.length > 500 || !st.includes(".")) return null;
  const [payload, sig] = st.split(".");
  if (!safeEqual(sig, await sign(payload))) return null;
  try {
    const { u, e } = JSON.parse(unb64url(payload));
    return typeof u === "string" && typeof e === "number" && e > Date.now() ? u : null;
  } catch { return null; }
}

async function sha256Hex(s: string) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
}
const validToken = (v: unknown) => typeof v === "string" && /^[A-Za-z0-9_-]{32,128}$/.test(v);
const isUuid = (v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

// ── Eingaben ──────────────────────────────────────────────────────────────
const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const email = (v: unknown) => {
  const s = str(v, 200)?.toLowerCase() || null;
  return s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null;
};
const SESSION_ERR = "Sitzung abgelaufen – bitte einmal ab- und wieder anmelden.";

Deno.serve(async (req: Request) => {
  const headers = cors(req.headers.get("origin"));
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return json({ error: "Nur POST erlaubt" }, 405);
  if (Number(req.headers.get("content-length") || 0) > 2 * 1024 * 1024) return json({ error: "Anfrage zu groß" }, 413);

  let b: any;
  try { b = await req.json(); } catch { return json({ error: "Ungültiges JSON" }, 400); }
  const action = b?.action;
  if (!(action in LIMITS)) return json({ error: "Unbekannte Aktion" }, 400);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(`${action}:${ip}`, LIMITS[action])) return json({ error: "Zu viele Versuche – bitte später erneut versuchen." }, 429);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const getUserByEmail = async (mail: string) => {
    // Groß-/Kleinschreibung egal; LIKE-Platzhalter (% _ \\) maskieren
    const pattern = mail.replace(/[\\%_]/g, (c) => "\\" + c);
    const { data, error } = await db.from("users").select(USER_COLS).ilike("email", pattern).limit(1);
    if (error) throw new Error(error.message);
    return data?.[0] || null;
  };
  const getCredential = async (userId: string): Promise<string | null> => {
    // Lesefehler NIE als "kein Passwort" werten — sonst würde das erste
    // Login ein neues Passwort setzen (Kontoübernahme).
    const { data, error } = await db.from("user_credentials").select("pw_hash").eq("user_id", userId).maybeSingle();
    if (error) throw new Error("user_credentials: " + error.message);
    return data?.pw_hash || null;
  };
  const setCredential = async (userId: string, password: string) => {
    const { error } = await db.from("user_credentials")
      .upsert({ user_id: userId, pw_hash: await hashPassword(password), updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
  };
  const vehicleOwner = async (vehicleId: string) => {
    const { data, error } = await db.from("vehicles").select("user_id").eq("id", vehicleId).maybeSingle();
    if (error) throw new Error("vehicles: " + error.message);
    return data?.user_id || null;
  };
  const loadProfiles = async (vehicleId: string, withCode: boolean) => {
    const { data: profiles, error } = await db.from("emergency_profiles").select("*").eq("vehicle_id", vehicleId);
    if (error) throw new Error(error.message);
    const ids = (profiles || []).map((p: any) => p.id);
    const byProfile: Record<string, any[]> = {};
    if (ids.length) {
      const { data: contacts } = await db.from("emergency_contacts").select("*").in("emergency_profile_id", ids).order("sort_order");
      for (const c of contacts || []) {
        (byProfile[c.emergency_profile_id] ??= []).push({ id: c.id, name: c.name, relationship: c.relationship, phone: c.phone });
      }
    }
    return (profiles || []).map((p: any) => ({
      ...(withCode ? { id: p.id, accessCode: p.access_code } : {}),
      name: p.name, photoUrl: p.photo_url, birthDate: p.birth_date, bloodType: p.blood_type,
      allergies: p.allergies, medications: p.medications, conditions: p.conditions,
      contacts: byProfile[p.id] || [],
    }));
  };

  // Videos eines Eintrags: nur Pfade im Ordner des Fahrzeugs
  const cleanVideos = (vehicleId: string, list: unknown) =>
    (Array.isArray(list) ? list : []).slice(0, FINDING_VIDEOS)
      .filter((v: any) => v && typeof v.path === "string" && v.path.startsWith(vehicleId + "/") &&
        /^[^/]+\/[0-9a-f-]{36}\.(mp4|mov|webm)$/i.test(v.path))
      .map((v: any) => ({ path: v.path, name: str(v.name, 120), size: Number(v.size) || null, type: str(v.type, 40) }));
  const withVideoUrls = async (videos: any[], seconds: number) => {
    const out = [];
    for (const v of videos || []) {
      const { data } = await db.storage.from(MEDIA_BUCKET).createSignedUrl(v.path, seconds);
      out.push({ ...v, url: data?.signedUrl || null });
    }
    return out;
  };
  const removeVideos = async (paths: string[]) => {
    if (paths.length) await db.storage.from(MEDIA_BUCKET).remove(paths);
  };

  try {
    // ── Reparatur-Briefing abrufen (Werkstatt, ohne Login, nur mit Link-Token) ──
    if (action === "briefingGet") {
      if (!isUuid(b.id) || !validToken(b.token)) return json({ error: "Link ungültig" }, 404);
      const { data: row, error } = await db.from("repair_briefings").select("*").eq("id", b.id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!row || !safeEqual(row.access_token_hash, await sha256Hex(b.token))) return json({ error: "Link ungültig" }, 404);
      if (row.revoked_at) return json({ error: "Dieser Link wurde vom Eigentümer zurückgezogen" }, 410);
      if (new Date(row.expires_at).getTime() < Date.now()) return json({ error: "Dieser Link ist abgelaufen" }, 410);
      const nowIso = new Date().toISOString();
      await db.from("repair_briefings").update({
        first_viewed_at: row.first_viewed_at || nowIso, last_viewed_at: nowIso, view_count: (row.view_count || 0) + 1,
      }).eq("id", row.id);
      const snap = row.snapshot || {};
      const findings = [];
      for (const f of snap.findings || []) findings.push({ ...f, videos: await withVideoUrls(f.videos || [], 7200) });
      return json({ briefing: { ...snap, findings, createdAt: row.created_at, expiresAt: row.expires_at } });
    }

    // ── Login ────────────────────────────────────────────────────────────
    if (action === "login") {
      const mail = email(b.email);
      const pw = typeof b.password === "string" ? b.password : "";
      if (!mail || !pw) return json({ error: "E-Mail und Passwort eingeben" }, 400);
      if (limited(`login-mail:${mail}`, 10)) return json({ error: "Zu viele Versuche – bitte später erneut versuchen." }, 429);
      const u = await getUserByEmail(mail);
      if (!u) return json({ error: "Kein Account mit dieser E-Mail" }, 404);
      const stored = await getCredential(u.id);
      if (stored) {
        if (!(await verifyPassword(pw, stored))) return json({ error: "Falsches Passwort" }, 401);
      } else {
        // Konto ohne Passwort (z. B. über Kontaktformular angelegt): erstes Login setzt es.
        if (u.role === "guest") return json({ error: "Für dieses Konto ist kein Passwort-Login eingerichtet" }, 401);
        if (pw.length < 6) return json({ error: "Passwort: mindestens 6 Zeichen" }, 400);
        await setCredential(u.id, pw);
      }
      await db.from("users").update({ last_seen: new Date().toISOString() }).eq("id", u.id);
      return json({ user: u, st: await issueToken(u.id) });
    }

    // ── Mitglied registrieren (inkl. Gast → Mitglied) ───────────────────
    if (action === "register") {
      const mail = email(b.email), name = str(b.name, 120);
      if (!mail || !name) return json({ error: "Name und gültige E-Mail angeben" }, 400);
      if (String(b.clubCode || "").trim().toUpperCase() !== CLUB_CODE) return json({ error: "Falscher Club-Code" }, 403);
      const pw = typeof b.password === "string" && b.password ? b.password : null;
      if (pw && pw.length < 6) return json({ error: "Passwort: mindestens 6 Zeichen" }, 400);
      const memberNr = "PCN-" + Math.floor(1000 + Math.random() * 8999);
      const existing = await getUserByEmail(mail);
      let user;
      if (existing) {
        if (existing.role !== "guest") return json({ error: "E-Mail bereits registriert" }, 409);
        const { data, error } = await db.from("users")
          .update({ name, club_code: CLUB_CODE, role: "member", member_nr: memberNr, converted_from_guest: true })
          .eq("id", existing.id).select(USER_COLS).single();
        if (error) throw new Error(error.message);
        user = data;
      } else {
        const { data, error } = await db.from("users")
          .insert({ name, email: mail, club_code: CLUB_CODE, role: "member", member_nr: memberNr })
          .select(USER_COLS).single();
        if (error) throw new Error(error.message);
        user = data;
      }
      if (pw) await setCredential(user.id, pw);
      return json({ user, st: await issueToken(user.id) });
    }

    // ── Werkstatt registrieren ───────────────────────────────────────────
    if (action === "registerWorkshop") {
      const mail = email(b.email), name = str(b.contactName, 120);
      const pw = typeof b.password === "string" ? b.password : "";
      if (!mail || !name || pw.length < 6) return json({ error: "Name, E-Mail und Passwort (mind. 6 Zeichen) angeben" }, 400);
      if (await getUserByEmail(mail)) return json({ error: "Diese E-Mail ist bereits registriert" }, 409);
      const { data: user, error } = await db.from("users").insert({
        name, email: mail, role: "workshop",
        workshop_name: str(b.workshopName, 200), workshop_address: str(b.workshopAddress, 300),
        phone: str(b.phone, 50), trade_register_number: str(b.tradeRegisterNumber, 100),
        created_at: new Date().toISOString(),
      }).select(USER_COLS).single();
      if (error) throw new Error(error.message);
      await setCredential(user.id, pw);
      return json({ user, st: await issueToken(user.id) });
    }

    // ── Ab hier: gültige Sitzung nötig (außer Notfall-Zugang per Code) ──
    if (action === "emergencyByCode") {
      const vehicleId = str(b.vehicleId, 100), code = String(b.code || "").trim();
      if (!vehicleId || !/^\d{4}$/.test(code)) return json({ error: "Ungültiger Code" }, 400);
      // 4-stellige Codes: Raten pro Fahrzeug zusätzlich begrenzen
      if (limited(`ice:${vehicleId}`, 20)) return json({ error: "Zu viele Versuche – bitte später erneut versuchen." }, 429);
      const { data: match } = await db.from("emergency_profiles").select("id").eq("vehicle_id", vehicleId).eq("access_code", code).limit(1);
      if (!match?.length) return json({ error: "Falscher Code" }, 403);
      const profiles = (await loadProfiles(vehicleId, true)).filter((p: any) => p.accessCode === code)
        .map(({ id: _i, accessCode: _c, ...rest }: any) => rest);
      return json({ profiles });
    }

    const userId = await verifyToken(b.st);
    if (!userId) return json({ error: SESSION_ERR, code: "session" }, 401);

    if (action === "changePassword") {
      const pw = typeof b.newPassword === "string" ? b.newPassword : "";
      if (pw.length < 6) return json({ error: "Mindestens 6 Zeichen" }, 400);
      await setCredential(userId, pw);
      return json({ ok: true });
    }

    if (action === "emergencyList" || action === "emergencySave") {
      const vehicleId = str(b.vehicleId, 100);
      if (!vehicleId) return json({ error: "Fahrzeug fehlt" }, 400);
      if ((await vehicleOwner(vehicleId)) !== userId) return json({ error: "Nur der Eigentümer kann Notfallprofile verwalten" }, 403);

      if (action === "emergencyList") return json({ profiles: await loadProfiles(vehicleId, true) });

      const p = b.profile || {};
      const name = str(p.name, 120);
      const accessCode = String(p.accessCode || "").trim();
      if (!name) return json({ error: "Name eingeben" }, 400);
      if (!/^\d{4}$/.test(accessCode)) return json({ error: "4-stelliger Code erforderlich" }, 400);
      const photo = typeof p.photoUrl === "string" && p.photoUrl.length < 1_500_000 ? p.photoUrl : null;
      const row = {
        vehicle_id: vehicleId, created_by_user_id: userId, name, photo_url: photo,
        birth_date: str(p.birthDate, 10), blood_type: str(p.bloodType, 20), allergies: str(p.allergies, 2000),
        medications: str(p.medications, 2000), conditions: str(p.conditions, 2000),
        access_code: accessCode, updated_at: new Date().toISOString(),
      };
      let profileId: string | null = typeof p.id === "string" ? p.id : null;
      if (profileId) {
        const { data, error } = await db.from("emergency_profiles").update(row)
          .eq("id", profileId).eq("vehicle_id", vehicleId).select("id");
        if (error) throw new Error(error.message);
        if (!data?.length) return json({ error: "Profil nicht gefunden" }, 404);
      } else {
        const { data, error } = await db.from("emergency_profiles")
          .insert({ ...row, created_at: new Date().toISOString() }).select("id").single();
        if (error) throw new Error(error.message);
        profileId = data.id;
      }
      await db.from("emergency_contacts").delete().eq("emergency_profile_id", profileId);
      const contacts = (Array.isArray(p.contacts) ? p.contacts : []).slice(0, 10)
        .map((c: any, i: number) => ({
          emergency_profile_id: profileId, name: str(c?.name, 120), relationship: str(c?.relationship, 60),
          phone: str(c?.phone, 50), sort_order: i,
        }))
        .filter((c: any) => c.name && c.phone);
      if (contacts.length) {
        const { error } = await db.from("emergency_contacts").insert(contacts);
        if (error) throw new Error(error.message);
      }
      return json({ id: profileId });
    }

    // ── Mängel & Feststellungen ─────────────────────────────────────────
    if (action === "findingsList" || action === "findingSave") {
      const vehicleId = str(b.vehicleId, 100);
      if (!vehicleId) return json({ error: "Fahrzeug fehlt" }, 400);
      if ((await vehicleOwner(vehicleId)) !== userId) return json({ error: "Nur der Eigentümer kann Mängel verwalten" }, 403);
      if (action === "findingsList") {
        const { data, error } = await db.from("vehicle_findings").select("*").eq("vehicle_id", vehicleId).order("created_at", { ascending: false });
        if (error) throw new Error(error.message);
        const findings = [];
        for (const f of data || []) findings.push({
          id: f.id, category: f.category, title: f.title, position: f.position, description: f.description,
          foundAt: f.found_at, km: f.km, status: f.status, fixedAt: f.fixed_at, fixNote: f.fix_note,
          cost: f.cost, photos: f.photos || [], videos: await withVideoUrls(f.videos || [], 3600), createdAt: f.created_at,
        });
        return json({ findings });
      }
      const f = b.finding || {};
      const title = str(f.title, 160);
      if (!title) return json({ error: "Bitte kurz beschreiben, was festgestellt wurde" }, 400);
      const date = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
      const photos = (Array.isArray(f.photos) ? f.photos : []).slice(0, FINDING_PHOTOS)
        .filter((p: unknown) => typeof p === "string" && /^data:image\/jpeg;base64,/.test(p) && p.length < 400_000);
      const km = Number.isFinite(Number(f.km)) && f.km !== "" && f.km !== null ? Math.max(0, Math.min(9_999_999, Math.round(Number(f.km)))) : null;
      const cost = Number.isFinite(Number(f.cost)) && f.cost !== "" && f.cost !== null ? Math.max(0, Math.min(9_999_999, Number(f.cost))) : null;
      const row = {
        vehicle_id: vehicleId, created_by_user_id: userId,
        category: FINDING_CATEGORIES.includes(f.category) ? f.category : "sonstiges",
        title, position: str(f.position, 60), description: str(f.description, 4000),
        found_at: date(f.foundAt), km, status: ["offen", "beobachten", "behoben"].includes(f.status) ? f.status : "offen",
        fixed_at: date(f.fixedAt), fix_note: str(f.fixNote, 1000), cost, photos,
        videos: cleanVideos(vehicleId, f.videos),
        updated_at: new Date().toISOString(),
      };
      if (typeof f.id === "string" && f.id) {
        const { data: old } = await db.from("vehicle_findings").select("videos").eq("id", f.id).eq("vehicle_id", vehicleId).maybeSingle();
        const { data, error } = await db.from("vehicle_findings").update(row).eq("id", f.id).eq("vehicle_id", vehicleId).select("id");
        if (error) throw new Error(error.message);
        if (!data?.length) return json({ error: "Eintrag nicht gefunden" }, 404);
        // entfernte Videos auch aus dem Speicher löschen (nicht, wenn sie in einem Briefing stecken)
        const keep = new Set(row.videos.map((v: any) => v.path));
        const dropped = ((old?.videos as any[]) || []).map((v: any) => v.path).filter((p: string) => !keep.has(p));
        if (dropped.length) {
          const { data: briefs } = await db.from("repair_briefings").select("snapshot").eq("vehicle_id", vehicleId).is("revoked_at", null);
          const used = new Set((briefs || []).flatMap((x: any) => (x.snapshot?.findings || []).flatMap((ff: any) => (ff.videos || []).map((v: any) => v.path))));
          await removeVideos(dropped.filter((p: string) => !used.has(p)));
        }
        return json({ id: f.id });
      }
      const { data, error } = await db.from("vehicle_findings").insert(row).select("id").single();
      if (error) throw new Error(error.message);
      return json({ id: data.id });
    }

    if (action === "findingDelete") {
      const findingId = str(b.findingId, 100);
      if (!findingId) return json({ error: "Eintrag fehlt" }, 400);
      const { data: fd, error: fe } = await db.from("vehicle_findings").select("vehicle_id,videos").eq("id", findingId).maybeSingle();
      if (fe) throw new Error(fe.message);
      if (!fd) return json({ error: "Eintrag nicht gefunden" }, 404);
      if ((await vehicleOwner(fd.vehicle_id)) !== userId) return json({ error: "Nur der Eigentümer kann Mängel löschen" }, 403);
      const { error } = await db.from("vehicle_findings").delete().eq("id", findingId);
      if (error) throw new Error(error.message);
      const { data: briefs } = await db.from("repair_briefings").select("snapshot").eq("vehicle_id", fd.vehicle_id).is("revoked_at", null);
      const used = new Set((briefs || []).flatMap((x: any) => (x.snapshot?.findings || []).flatMap((ff: any) => (ff.videos || []).map((v: any) => v.path))));
      await removeVideos(((fd.videos as any[]) || []).map((v: any) => v.path).filter((p: string) => !used.has(p)));
      return json({ ok: true });
    }

    // ── Dokumentenablage (Belege der Fahrzeugakte) — nur der Eigentümer.
    // Die Tabelle ist für den öffentlichen Schlüssel gesperrt; Zugriff nur hier.
    if (action === "docList" || action === "docUpload") {
      const vehicleId = str(b.vehicleId, 100);
      if (!vehicleId) return json({ error: "Fahrzeug fehlt" }, 400);
      if ((await vehicleOwner(vehicleId)) !== userId) return json({ error: "Nur der Eigentümer hat Zugriff auf die Dokumente" }, 403);
      if (action === "docList") {
        const { data, error } = await db.from("vehicle_documents").select("*").eq("vehicle_id", vehicleId).order("created_at", { ascending: false });
        if (error) throw new Error(error.message);
        return json({ documents: (data || []).map((r: any) => ({
          id: r.id, vehicleId: r.vehicle_id, category: r.category, image: r.image, label: r.label,
          analyzedAt: r.analyzed_at, logbookEntryId: r.logbook_entry_id, createdAt: r.created_at,
        })) });
      }
      const image = typeof b.image === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(b.image) && b.image.length < 1_500_000 ? b.image : null;
      if (!image) return json({ error: "Bild fehlt oder ist zu groß" }, 400);
      const { data, error } = await db.from("vehicle_documents").insert({
        vehicle_id: vehicleId, owner_user_id: userId, category: str(b.category, 40) || "sonstiges",
        image, label: str(b.label, 160), created_at: new Date().toISOString(),
      }).select("id").single();
      if (error) throw new Error(error.message);
      return json({ id: data.id });
    }

    if (action === "docMarkAnalyzed" || action === "docDelete") {
      if (!isUuid(b.documentId)) return json({ error: "Dokument fehlt" }, 400);
      const { data: doc, error: de } = await db.from("vehicle_documents").select("vehicle_id").eq("id", b.documentId).maybeSingle();
      if (de) throw new Error(de.message);
      if (!doc) return json({ error: "Dokument nicht gefunden" }, 404);
      if ((await vehicleOwner(doc.vehicle_id)) !== userId) return json({ error: "Nur der Eigentümer kann Dokumente bearbeiten" }, 403);
      const q = action === "docDelete"
        ? db.from("vehicle_documents").delete().eq("id", b.documentId)
        : db.from("vehicle_documents").update({ analyzed_at: new Date().toISOString(), logbook_entry_id: str(b.logbookEntryId, 100) }).eq("id", b.documentId);
      const { error } = await q;
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }

    // ── Video-Upload: signierte Upload-URL in den Fahrzeug-Ordner ──────────
    if (action === "findingVideoUploadUrl") {
      const vehicleId = str(b.vehicleId, 100);
      if (!vehicleId) return json({ error: "Fahrzeug fehlt" }, 400);
      if ((await vehicleOwner(vehicleId)) !== userId) return json({ error: "Nur der Eigentümer kann Videos hochladen" }, 403);
      const ext = VIDEO_TYPES[String(b.contentType || "")];
      if (!ext) return json({ error: "Videoformat nicht unterstützt (MP4, MOV, WebM)" }, 400);
      if (!(Number(b.size) > 0) || Number(b.size) > MAX_VIDEO_BYTES) return json({ error: "Video zu groß — maximal 50 MB (ca. 30 Sekunden)" }, 400);
      const path = `${vehicleId}/${crypto.randomUUID()}.${ext}`;
      const { data, error } = await db.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
      if (error) throw new Error(error.message);
      return json({ path, signedUrl: data.signedUrl });
    }

    // ── Reparatur-Briefing (Eigentümer) ───────────────────────────────────
    if (action === "briefingCreate" || action === "briefingList") {
      const vehicleId = str(b.vehicleId, 100);
      if (!vehicleId) return json({ error: "Fahrzeug fehlt" }, 400);
      if ((await vehicleOwner(vehicleId)) !== userId) return json({ error: "Nur der Eigentümer kann Briefings verwalten" }, 403);
      if (action === "briefingList") {
        const { data, error } = await db.from("repair_briefings")
          .select("id,recipient_label,created_at,expires_at,first_viewed_at,last_viewed_at,view_count,revoked_at,snapshot")
          .eq("vehicle_id", vehicleId).order("created_at", { ascending: false }).limit(50);
        if (error) throw new Error(error.message);
        return json({ briefings: (data || []).map((r: any) => ({
          id: r.id, recipientLabel: r.recipient_label, createdAt: r.created_at, expiresAt: r.expires_at,
          firstViewedAt: r.first_viewed_at, lastViewedAt: r.last_viewed_at, viewCount: r.view_count, revokedAt: r.revoked_at,
          findingTitles: (r.snapshot?.findings || []).map((f: any) => f.title),
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

    if (action === "briefingRevoke") {
      if (!isUuid(b.briefingId)) return json({ error: "Briefing fehlt" }, 400);
      const { data: r } = await db.from("repair_briefings").select("vehicle_id").eq("id", b.briefingId).maybeSingle();
      if (!r) return json({ error: "Briefing nicht gefunden" }, 404);
      if ((await vehicleOwner(r.vehicle_id)) !== userId) return json({ error: "Nur der Eigentümer kann den Link zurückziehen" }, 403);
      const { error } = await db.from("repair_briefings").update({ revoked_at: new Date().toISOString() }).eq("id", b.briefingId);
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }

    if (action === "emergencyDelete") {
      const profileId = str(b.profileId, 100);
      if (!profileId) return json({ error: "Profil fehlt" }, 400);
      const { data: prof } = await db.from("emergency_profiles").select("vehicle_id").eq("id", profileId).maybeSingle();
      if (!prof) return json({ error: "Profil nicht gefunden" }, 404);
      if ((await vehicleOwner(prof.vehicle_id)) !== userId) return json({ error: "Nur der Eigentümer kann Notfallprofile löschen" }, 403);
      await db.from("emergency_contacts").delete().eq("emergency_profile_id", profileId);
      const { error } = await db.from("emergency_profiles").delete().eq("id", profileId);
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }

    return json({ error: "Unbekannte Aktion" }, 400);
  } catch (e) {
    console.error("pcn-secure:", action, String((e as Error)?.message || e));
    return json({ error: "Serverfehler – bitte später erneut versuchen." }, 500);
  }
});
