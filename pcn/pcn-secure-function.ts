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
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://qar.gallery", "https://www.qar.gallery", "http://localhost:3000"];
const CLUB_CODE = Deno.env.get("PCN_CLUB_CODE") || "PCN2026";
const PBKDF2_ITERATIONS = 100000; // identisch mit pcn_storage.js
const SESSION_DAYS = 30;

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
    const { data } = await db.from("user_credentials").select("pw_hash").eq("user_id", userId).maybeSingle();
    return data?.pw_hash || null;
  };
  const setCredential = async (userId: string, password: string) => {
    const { error } = await db.from("user_credentials")
      .upsert({ user_id: userId, pw_hash: await hashPassword(password), updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
  };
  const vehicleOwner = async (vehicleId: string) => {
    const { data } = await db.from("vehicles").select("user_id").eq("id", vehicleId).maybeSingle();
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

  try {
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
