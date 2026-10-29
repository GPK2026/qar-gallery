// ═══════════════════════════════════════════════════════════════════════════
// SUPABASE EDGE FUNCTION — workshop-access: Werkstatt-Zugänge zu Fahrzeugen
//
// Eine Werkstatt beantragt Zugang zu einem Fahrzeug, der Eigentümer bestätigt
// ("once" = ein Eintrag, "ongoing" = bis Widerruf) oder lehnt ab. Mit aktivem
// Zugang darf die Werkstatt über pcn-secure (logAdd) ins Logbuch schreiben.
//
// WARUM ÜBER EINE FUNKTION
// workshop_access war mit dem öffentlichen Schlüssel beschreibbar — eine
// Werkstatt hätte sich selbst freischalten können. Die Tabelle ist jetzt für
// anon gesperrt; Rollen werden hier über das Sitzungs-Token geprüft.
//
// ── DEPLOYMENT ─────────────────────────────────────────────────────────────
//   npx supabase functions deploy workshop-access --no-verify-jwt
//
// ── AKTIONEN (POST, JSON, immer mit st) ───────────────────────────────────
//   request          { vehicleId }                       → { id, ownerUserId }   (Werkstatt)
//   mine             {}                                  → { grants }            (Werkstatt)
//   markUsed         { grantId }                         → { ok }                (Werkstatt, nur "once")
//   pendingForOwner  {}                                  → { requests }          (Eigentümer)
//   activeForVehicle { vehicleId }                       → { grants }            (Eigentümer)
//   decide           { requestId, accept, scope }        → { vehicleId, workshopUserId, scope } | { declined }
//   revoke           { grantId }                         → { ok }                (Eigentümer)
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://qar.gallery", "https://www.qar.gallery", "http://localhost:3000"];
const LIMITS: Record<string, number> = {
  request: 60, mine: 600, markUsed: 120, pendingForOwner: 600, activeForVehicle: 600, decide: 120, revoke: 120,
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
  if (Number(req.headers.get("content-length") || 0) > 64 * 1024) return json({ error: "Anfrage zu groß" }, 413);

  let b: any;
  try { b = await req.json(); } catch { return json({ error: "Ungültiges JSON" }, 400); }
  const action = b?.action;
  if (!(action in LIMITS)) return json({ error: "Unbekannte Aktion" }, 400);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(`${action}:${ip}`, LIMITS[action])) return json({ error: "Zu viele Anfragen – bitte später erneut versuchen." }, 429);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const now = () => new Date().toISOString();

  try {
    const uid = await verifySession(b.st);
    if (!uid) return json({ error: "Sitzung abgelaufen – bitte einmal ab- und wieder anmelden.", code: "session" }, 401);
    const { data: me, error: meErr } = await db.from("users").select("id,role").eq("id", uid).maybeSingle();
    if (meErr) throw new Error(meErr.message);
    if (!me) return json({ error: "Konto nicht gefunden" }, 404);
    const vehicleOwner = async (vehicleId: string) => {
      const { data, error } = await db.from("vehicles").select("user_id").eq("id", vehicleId).maybeSingle();
      if (error) throw new Error(error.message);
      return data?.user_id || null;
    };
    const grantById = async (id: unknown) => {
      if (!isUuid(id)) return null;
      const { data, error } = await db.from("workshop_access").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    };

    // ── Werkstatt ──────────────────────────────────────────────────────────
    if (action === "request") {
      if (me.role !== "workshop") return json({ error: "Nur Werkstatt-Konten können Zugang beantragen" }, 403);
      const vehicleId = str(b.vehicleId, 100);
      if (!vehicleId) return json({ error: "Fahrzeug fehlt" }, 400);
      const ownerUserId = await vehicleOwner(vehicleId);
      if (!ownerUserId) return json({ error: "Fahrzeug nicht gefunden" }, 404);
      if (ownerUserId === uid) return json({ error: "Dies ist dein eigenes Fahrzeug" }, 400);
      const { data: existing } = await db.from("workshop_access").select("status")
        .eq("vehicle_id", vehicleId).eq("workshop_user_id", uid).in("status", ["pending", "active"]).limit(1);
      if (existing?.length) {
        return json({ error: existing[0].status === "active" ? "Du hast bereits Zugang zu diesem Fahrzeug" : "Es liegt bereits eine offene Anfrage vor" }, 409);
      }
      const { data, error } = await db.from("workshop_access").insert({
        vehicle_id: vehicleId, owner_user_id: ownerUserId, workshop_user_id: uid, status: "pending", requested_at: now(),
      }).select("id").single();
      if (error) throw new Error(error.message);
      return json({ id: data.id, ownerUserId });
    }

    if (action === "mine") {
      const { data, error } = await db.from("workshop_access").select("*").eq("workshop_user_id", uid).in("status", ["pending", "active"]);
      if (error) throw new Error(error.message);
      return json({ grants: (data || []).map((r: any) => ({
        id: r.id, vehicleId: r.vehicle_id, ownerUserId: r.owner_user_id, status: r.status, scope: r.scope, usedAt: r.used_at,
      })) });
    }

    if (action === "markUsed") {
      const g = await grantById(b.grantId);
      if (!g || g.workshop_user_id !== uid) return json({ error: "Zugang nicht gefunden" }, 404);
      if (g.scope !== "once") return json({ ok: true });
      if (g.status === "active") {
        const { error } = await db.from("workshop_access").update({ status: "revoked", used_at: now() }).eq("id", g.id);
        if (error) throw new Error(error.message);
      }
      return json({ ok: true });
    }

    // ── Eigentümer ─────────────────────────────────────────────────────────
    if (action === "pendingForOwner") {
      const { data, error } = await db.from("workshop_access").select("*").eq("owner_user_id", uid).eq("status", "pending");
      if (error) throw new Error(error.message);
      return json({ requests: (data || []).map((r: any) => ({
        id: r.id, vehicleId: r.vehicle_id, workshopUserId: r.workshop_user_id, requestedAt: r.requested_at,
      })) });
    }

    if (action === "activeForVehicle") {
      const vehicleId = str(b.vehicleId, 100);
      if (!vehicleId) return json({ error: "Fahrzeug fehlt" }, 400);
      if ((await vehicleOwner(vehicleId)) !== uid) return json({ grants: [] });
      const { data: grants, error } = await db.from("workshop_access").select("*").eq("vehicle_id", vehicleId).eq("status", "active");
      if (error) throw new Error(error.message);
      const ids = [...new Set((grants || []).map((g: any) => g.workshop_user_id))];
      const { data: ws } = ids.length ? await db.from("users").select("id,name,workshop_name").in("id", ids) : { data: [] as any[] };
      const nameBy = Object.fromEntries((ws || []).map((u: any) => [u.id, u.workshop_name || u.name]));
      return json({ grants: (grants || []).map((r: any) => ({
        id: r.id, workshopUserId: r.workshop_user_id, workshopName: nameBy[r.workshop_user_id] || "Werkstatt",
        scope: r.scope, decidedAt: r.decided_at, usedAt: r.used_at,
      })) });
    }

    if (action === "decide") {
      const g = await grantById(b.requestId);
      if (!g) return json({ error: "Anfrage nicht gefunden" }, 404);
      if (g.owner_user_id !== uid || (await vehicleOwner(g.vehicle_id)) !== uid) return json({ error: "Nur der Fahrzeugeigentümer kann entscheiden" }, 403);
      if (g.status !== "pending") return json({ error: "Diese Anfrage ist nicht mehr offen" }, 409);
      if (b.accept !== true) {
        const { error } = await db.from("workshop_access").update({ status: "declined", decided_at: now() }).eq("id", g.id);
        if (error) throw new Error(error.message);
        return json({ declined: true });
      }
      if (!["once", "ongoing"].includes(b.scope)) return json({ error: "Bitte Zugangsdauer wählen" }, 400);
      const { error } = await db.from("workshop_access").update({ status: "active", scope: b.scope, decided_at: now() }).eq("id", g.id);
      if (error) throw new Error(error.message);
      return json({ vehicleId: g.vehicle_id, workshopUserId: g.workshop_user_id, scope: b.scope });
    }

    if (action === "revoke") {
      const g = await grantById(b.grantId);
      if (!g) return json({ error: "Zugang nicht gefunden" }, 404);
      if (g.owner_user_id !== uid || (await vehicleOwner(g.vehicle_id)) !== uid) return json({ error: "Nur der Fahrzeugeigentümer kann widerrufen" }, 403);
      const { error } = await db.from("workshop_access").update({ status: "revoked", revoked_at: now() }).eq("id", g.id);
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }

    return json({ error: "Unbekannte Aktion" }, 400);
  } catch (e) {
    console.error("workshop-access:", action, String((e as Error)?.message || e));
    return json({ error: "Serverfehler – bitte später erneut versuchen." }, 500);
  }
});
