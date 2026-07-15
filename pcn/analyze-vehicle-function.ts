// ═══════════════════════════════════════════════════════════════════════════
// SUPABASE EDGE FUNCTION — KI-Proxy für die Fahrzeug-Fotoanalyse
//
// WARUM DAS NÖTIG IST
// Der Anthropic-API-Key darf niemals im Browser landen — er wäre im Quelltext
// für jeden lesbar und jeder könnte auf Kosten des Clubs Anfragen schicken.
// Diese Funktion läuft auf dem Server, hält den Key geheim und reicht nur
// das Ergebnis zurück.
//
// ── DEPLOYMENT ─────────────────────────────────────────────────────────────
// 1. API-Key hinterlegen (Supabase Dashboard → Edge Functions → Secrets):
//      ANTHROPIC_API_KEY = sk-ant-...
//
// 2. Funktion deployen (Terminal, im Projektordner):
//      npx supabase functions deploy analyze-vehicle --no-verify-jwt
//
// 3. In pcn_config.js eintragen:
//      aiProxyUrl: "https://xsyuhfleesstrchcwspg.supabase.co/functions/v1/analyze-vehicle"
//
// ── SCHUTZMASSNAHMEN ───────────────────────────────────────────────────────
// • Nur POST, nur von erlaubten Domains (CORS)
// • Bildgröße begrenzt (max. 5 MB) — verhindert Kostenexplosion
// • Einfaches Rate-Limit pro IP (10 Anfragen / Stunde)
// ═══════════════════════════════════════════════════════════════════════════

const ALLOWED_ORIGINS = [
  "https://qar.gallery",
  "https://www.qar.gallery",
  "http://localhost:3000",
];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const RATE_LIMIT = 10;                    // Anfragen
const RATE_WINDOW_MS = 60 * 60 * 1000;    // pro Stunde

// Einfaches In-Memory Rate-Limit (reicht für den Pilotbetrieb)
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (list.length >= RATE_LIMIT) return true;
  list.push(now);
  hits.set(ip, list);
  return false;
}

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Nur POST erlaubt" }), { status: 405, headers });
  }

  // Rate-Limit
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: "Zu viele Anfragen — bitte später erneut versuchen." }),
      { status: 429, headers },
    );
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY fehlt in den Secrets");
    return new Response(JSON.stringify({ error: "Server nicht konfiguriert" }), { status: 500, headers });
  }

  try {
    const body = await req.json();

    // Grobe Größenprüfung — verhindert Missbrauch und Kostenexplosion
    const approxBytes = JSON.stringify(body).length * 0.75;
    if (approxBytes > MAX_IMAGE_BYTES) {
      return new Response(
        JSON.stringify({ error: "Bild zu groß (max. 5 MB)" }),
        { status: 413, headers },
      );
    }

    // Weiterleiten an Anthropic — Key bleibt hier auf dem Server
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Anthropic-Fehler:", res.status, JSON.stringify(data).slice(0, 200));
      return new Response(
        JSON.stringify({ error: "Analyse fehlgeschlagen", detail: data?.error?.message }),
        { status: res.status, headers },
      );
    }

    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (e) {
    console.error("Proxy-Fehler:", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers });
  }
});
