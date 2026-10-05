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
const MAX_BODY_BYTES = 14 * 1024 * 1024;  // 10 Fotos à ~1 MB + Text, base64
const MAX_PHOTOS = 10;
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const LAWYER_SLUG = "debug-anwaelte";
const ROLES = ["geschaedigter", "verursacher", "unklar"];

const LIMITS: Record<string, number> = { submit: 5, get: 60, delete: 10 }; // pro Stunde/IP
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

  try {
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
      for (const p of photosIn) {
        const bytes = decodeJpeg(p);
        if (!bytes) return json({ error: "Foto ungültig oder zu groß (nur JPEG, max. 3 MB)" }, 400);
        photos.push(bytes);
      }

      const id = crypto.randomUUID();
      const paths: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const path = `${id}/foto-${i + 1}.jpg`;
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
      const date = typeof r.accidentDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.accidentDate) ? r.accidentDate : null;
      const consentAt = new Date().toISOString();

      const { error: insErr } = await db.from("accident_reports").insert({
        id,
        access_token_hash: await sha256Hex(body.token),
        source: str(r.source, 20) || "pcn",
        member_id: str(r.memberId, 100),
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

    // ── Lesen / Löschen: nur mit passendem Token ─────────────────────────
    if (!isUuid(body.id) || !validToken(body.token)) return json({ error: "Nicht gefunden" }, 404);
    const { data: row, error: selErr } = await db.from("accident_reports").select("*").eq("id", body.id).maybeSingle();
    if (selErr) throw new Error(selErr.message);
    if (!row || !safeEqual(row.access_token_hash, await sha256Hex(body.token))) {
      return json({ error: "Nicht gefunden" }, 404);
    }

    if (action === "delete") {
      if (row.photo_paths?.length) await db.storage.from(BUCKET).remove(row.photo_paths);
      const { error } = await db.from("accident_reports").delete().eq("id", row.id);
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }

    // action === "get"
    const { data: dispatches } = await db.from("accident_report_dispatches")
      .select("recipient_type,recipient_slug,status,sent_at,created_at").eq("report_id", row.id);
    const photos: string[] = [];
    for (const path of row.photo_paths || []) {
      const { data } = await db.storage.from(BUCKET).createSignedUrl(path, 600);
      if (data?.signedUrl) photos.push(data.signedUrl);
    }
    const { access_token_hash: _h, photo_paths: _p, ...report } = row;
    return json({ report, dispatches: dispatches || [], photos });
  } catch (e) {
    console.error("accident-report:", action, String((e as Error)?.message || e));
    return json({ error: "Serverfehler — bitte später erneut versuchen." }, 500);
  }
});
