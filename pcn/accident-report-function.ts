// ═══════════════════════════════════════════════════════════════════════════
// SUPABASE EDGE FUNCTION — Unfallmeldung / Rechtliche Ersteinschätzung
//
// WARUM ÜBER EINE FUNKTION
// Die App spricht Supabase nur mit dem öffentlichen Schlüssel an (ohne
// Mitglieder-Login am Server). Eine normale Tabelle wäre damit für jeden
// lesbar — für Unfall- und Gesundheitsdaten ausgeschlossen. Deshalb sind
// accident_reports / accident_report_dispatches und der Bucket
// "accident-reports" für anon komplett gesperrt; nur diese Funktion
// (service_role) greift zu.
//
// AUTORISIERUNG PER FALL-TOKEN
// Die App erzeugt pro Fall ein zufälliges Token (32 Byte) und speichert es
// nur lokal. Der Server speichert davon nur den SHA-256-Hash. Lesen und
// Löschen eines Falls geht nur mit dem passenden Token.
//
// ── DEPLOYMENT ─────────────────────────────────────────────────────────────
//   npx supabase functions deploy accident-report --no-verify-jwt
//   (verify_jwt aus, weil die App keinen Nutzer-JWT mitschickt; die Funktion
//    autorisiert selbst über das Fall-Token)
//
// ── AKTIONEN (POST, JSON) ─────────────────────────────────────────────────
//   { action:"submit", token, report:{...}, photos:[dataUrl,...] } → { id }
//   { action:"get",    id, token }  → { report, dispatches, photos:[signedUrl] }
//   { action:"delete", id, token }  → { ok:true }   (Widerruf der Einwilligung)
//   { action:"list",   st }         → { cases:[{ report, dispatches, photos }] }
//
// MITGLIEDSKONTO
// Schickt die App das Sitzungs-Token der Anmeldung (st, ausgestellt von
// pcn-secure) mit, wird der Fall dem geprüften Mitglied zugeordnet
// (member_verified). Solche Fälle kann das Mitglied auf jedem Gerät mit
// "list" abrufen und mit st statt Fall-Token lesen/löschen.
//
// ── VERSAND ───────────────────────────────────────────────────────────────
// Neue Fälle bekommen eine Weiterleitung an debug Rechtsanwälte mit Status
// "queued". Der Mailversand ist noch nicht angebunden; er arbeitet später
// die queued-Einträge ab (Status → sent / failed).
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://qar.gallery",
  "https://www.qar.gallery",
  "http://localhost:3000",
];

const BUCKET = "accident-reports";
const MAX_BODY_BYTES = 20 * 1024 * 1024;  // 15 Fotos + Unterschrift + Text, base64
const MAX_PHOTOS = 20; // 15 Unfallfotos + Unterschrift, Skizze, 2 Unterschriften Unfallbericht
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const LAWYER_SLUG = "debug-anwaelte";
const ROLES = ["geschaedigter", "verursacher", "unklar"];
// Foto-Kategorien aus dem geführten Ablauf (Reihenfolge = Reihenfolge in der Unfallmappe)
const PHOTO_CATEGORIES = ["gegner", "unfallstelle", "unfallbericht", "schuldanerkenntnis", "unterschrift", "sonstiges",
  "eu_skizze", "eu_sig_a", "eu_sig_b"]; // eu_* = digital ausgefüllter Unfallbericht
const MAX_EU_JSON = 40000; // Zeichen — Formulardaten Ziff. 1–15 ohne Bilder

const LIMITS: Record<string, number> = { submit: 5, get: 60, delete: 10, list: 30 }; // pro Stunde/IP
const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();
function rateLimited(key: string, limit: number): boolean {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= limit) return true;
  list.push(now);
  hits.set(key, list);
  return false;
}

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, apikey, Authorization",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const str = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};
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
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", await getHmacKey(), new TextEncoder().encode(payload)));
  if (!safeEqual(sig, Array.from(mac).map((b) => b.toString(16).padStart(2, "0")).join(""))) return null;
  try {
    const { u, e } = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof u === "string" && typeof e === "number" && e > Date.now() ? u : null;
  } catch { return null; }
}

const isUuid = (v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
const validToken = (v: unknown) => typeof v === "string" && /^[A-Za-z0-9_-]{32,128}$/.test(v);

function decodeJpeg(dataUrl: unknown): Uint8Array | null {
  if (typeof dataUrl !== "string") return null;
  const m = dataUrl.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return null;
  const bin = atob(m[1]);
  if (bin.length > MAX_PHOTO_BYTES) return null;
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  if (out[0] !== 0xff || out[1] !== 0xd8) return null; // JPEG-Signatur
  return out;
}

Deno.serve(async (req: Request) => {
  const headers = corsHeaders(req.headers.get("origin"));
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return json({ error: "Nur POST erlaubt" }, 405);

  const len = Number(req.headers.get("content-length") || 0);
  if (len > MAX_BODY_BYTES) return json({ error: "Anfrage zu groß" }, 413);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Ungültiges JSON" }, 400); }
  const action = body?.action;
  if (!(action in LIMITS)) return json({ error: "Unbekannte Aktion" }, 400);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(`${action}:${ip}`, LIMITS[action])) {
    return json({ error: "Zu viele Anfragen — bitte später erneut versuchen." }, 429);
  }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const uid = await verifySession(body.st);
  // Fall inkl. kurzlebiger Foto-Links für die App aufbereiten
  const present = async (row: any) => {
    const { data: dispatches } = await db.from("accident_report_dispatches")
      .select("recipient_type,recipient_slug,status,sent_at,created_at").eq("report_id", row.id);
    // gleiche Reihenfolge wie photo_categories — fehlgeschlagene Links als null
    const photos: (string | null)[] = [];
    for (const path of row.photo_paths || []) {
      const { data } = await db.storage.from(BUCKET).createSignedUrl(path, 600);
      photos.push(data?.signedUrl || null);
    }
    const { access_token_hash: _h, photo_paths: _p, ...report } = row;
    return { report, dispatches: dispatches || [], photos };
  };

  try {
    // ── Alle Fälle des angemeldeten Mitglieds ───────────────────────────
    if (action === "list") {
      if (!uid) return json({ error: "Nicht angemeldet" }, 401);
      const { data: rows, error } = await db.from("accident_reports").select("*")
        .eq("member_id", uid).eq("member_verified", true).order("created_at", { ascending: false }).limit(50);
      if (error) throw new Error(error.message);
      const cases = [];
      for (const row of rows || []) cases.push(await present(row));
      return json({ cases });
    }

    // ── Fall anlegen ──────────────────────────────────────────────────────
    if (action === "submit") {
      const r = body.report || {};
      if (!validToken(body.token)) return json({ error: "Ungültiges Token" }, 400);
      const description = str(r.description, 10000);
      if (!description) return json({ error: "Unfallhergang fehlt" }, 400);
      if (r.consentGiven !== true || !str(r.consentText, 4000)) {
        return json({ error: "Einwilligung fehlt" }, 400);
      }
      const photosIn = Array.isArray(body.photos) ? body.photos : [];
      if (photosIn.length > MAX_PHOTOS) return json({ error: `Maximal ${MAX_PHOTOS} Fotos` }, 400);
      const photos: Uint8Array[] = [];
      const categories: string[] = [];
      for (const p of photosIn) {
        // Foto entweder als data-URL oder als { dataUrl, category }
        const bytes = decodeJpeg(typeof p === "string" ? p : p?.dataUrl);
        if (!bytes) return json({ error: "Foto ungültig oder zu groß (nur JPEG, max. 3 MB)" }, 400);
        photos.push(bytes);
        const cat = typeof p === "object" && PHOTO_CATEGORIES.includes(p?.category) ? p.category : "sonstiges";
        categories.push(cat);
      }

      const id = crypto.randomUUID();
      const paths: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const path = `${id}/foto-${i + 1}-${categories[i]}.jpg`;
        const { error } = await db.storage.from(BUCKET).upload(path, photos[i], { contentType: "image/jpeg" });
        if (error) {
          if (paths.length) await db.storage.from(BUCKET).remove(paths);
          throw new Error("Foto-Upload fehlgeschlagen: " + error.message);
        }
        paths.push(path);
      }

      const vehicleData: Record<string, string> = {};
      if (r.vehicleData && typeof r.vehicleData === "object") {
        for (const [k, v] of Object.entries(r.vehicleData).slice(0, 20)) {
          const sv = str(v, 200);
          if (sv) vehicleData[String(k).slice(0, 40)] = sv;
        }
      }
      const witnesses = (Array.isArray(r.witnesses) ? r.witnesses : []).slice(0, 10)
        .map((w: any) => ({ name: str(w?.name, 200), address: str(w?.address, 300), phone: str(w?.phone, 50) }))
        .filter((w: any) => w.name || w.address || w.phone);
      const fa = r.faultAdmission && typeof r.faultAdmission === "object" ? r.faultAdmission : null;
      const faultAdmission = fa && ["digital", "papier"].includes(fa.mode) ? {
        mode: fa.mode, name: str(fa.name, 200), text: str(fa.text, 2000),
        signedAt: str(fa.signedAt, 40),
      } : null;
      // Digitaler Unfallbericht: reine Formulardaten (Texte/Checkboxen), Bilder kommen als Fotos
      let euData: unknown = null;
      if (r.europeanReportData && typeof r.europeanReportData === "object" && !Array.isArray(r.europeanReportData)) {
        const raw = JSON.stringify(r.europeanReportData);
        if (raw.length > MAX_EU_JSON) return json({ error: "Unfallbericht zu umfangreich" }, 400);
        euData = JSON.parse(raw);
      }
      const date = typeof r.accidentDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.accidentDate) ? r.accidentDate : null;
      const consentAt = new Date().toISOString();

      const { error: insErr } = await db.from("accident_reports").insert({
        id,
        access_token_hash: await sha256Hex(body.token),
        source: str(r.source, 20) || "pcn",
        member_id: uid || str(r.memberId, 100),
        member_verified: !!uid,
        member_email: str(r.memberEmail, 200),
        member_name: str(r.memberName, 200),
        vehicle_id: str(r.vehicleId, 100),
        vehicle_data: vehicleData,
        accident_date: date,
        accident_location: str(r.accidentLocation, 300),
        own_role: ROLES.includes(r.ownRole) ? r.ownRole : "unklar",
        description,
        police_involved: r.policeInvolved === true,
        police_reference: str(r.policeReference, 200),
        injuries: r.injuries === true,
        injuries_description: str(r.injuriesDescription, 4000),
        other_party: {
          name: str(r.otherPartyName, 200),
          licensePlate: str(r.otherPartyLicensePlate, 50),
          insurance: str(r.otherPartyInsurance, 200),
        },
        callback_phone: str(r.callbackPhone, 50),
        callback_preferred_time: str(r.callbackPreferredTime, 200),
        notes: str(r.notes, 4000),
        photo_paths: paths,
        photo_categories: categories,
        witnesses,
        european_report: r.europeanReport === true,
        european_report_data: euData,
        fault_admission: faultAdmission,
        consent_text: str(r.consentText, 4000),
        consent_given_at: consentAt,
      });
      if (insErr) {
        if (paths.length) await db.storage.from(BUCKET).remove(paths);
        throw new Error("Speichern fehlgeschlagen: " + insErr.message);
      }

      const { error: dErr } = await db.from("accident_report_dispatches").insert({
        report_id: id, recipient_type: "lawyer", recipient_slug: LAWYER_SLUG, consent_given_at: consentAt,
      });
      if (dErr) console.error("Dispatch konnte nicht angelegt werden:", id, dErr.message);

      return json({ id, createdAt: consentAt });
    }

    // ── Lesen / Löschen: mit Fall-Token oder als angemeldeter Eigentümer ──
    if (!isUuid(body.id) || (!validToken(body.token) && !uid)) return json({ error: "Nicht gefunden" }, 404);
    const { data: row, error: selErr } = await db.from("accident_reports").select("*").eq("id", body.id).maybeSingle();
    if (selErr) throw new Error(selErr.message);
    const byToken = !!row && validToken(body.token) && safeEqual(row.access_token_hash, await sha256Hex(body.token));
    const byOwner = !!row && !!uid && row.member_verified === true && row.member_id === uid;
    if (!byToken && !byOwner) return json({ error: "Nicht gefunden" }, 404);

    if (action === "delete") {
      if (row.photo_paths?.length) await db.storage.from(BUCKET).remove(row.photo_paths);
      const { error } = await db.from("accident_reports").delete().eq("id", row.id);
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }

    // action === "get"
    return json(await present(row));
  } catch (e) {
    console.error("accident-report:", action, String((e as Error)?.message || e));
    return json({ error: "Serverfehler — bitte später erneut versuchen." }, 500);
  }
});
