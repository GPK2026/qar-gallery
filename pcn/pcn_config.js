// PCN Configuration — Supabase connection
// This file contains credentials. Do not commit to public repositories.
window.PCN_CONFIG = {
  supabaseUrl: "https://xsyuhfleesstrchcwspg.supabase.co",
  supabaseKey: "sb_publishable_xmmKWwXaQliEBAOIFPM8ig_srQP3zED",

  // ── KI-Fotoanalyse (optional) ──────────────────────────────────────────
  // Solange leer, ist das Feature deaktiviert und wird in der App
  // nicht angeboten. Erst aktivieren, wenn die Edge Function deployed ist:
  //   1. Supabase → Edge Functions → Secrets: ANTHROPIC_API_KEY setzen
  //   2. npx supabase functions deploy analyze-vehicle --no-verify-jwt
  //   3. Diese Zeile eintragen:
  //      aiProxyUrl: "https://xsyuhfleesstrchcwspg.supabase.co/functions/v1/analyze-vehicle",
  //
  // Der API-Key gehört NIEMALS in diese Datei — sie ist im Browser lesbar.
  aiProxyUrl: "",

  // Stripe Payment Link für Mitgliedsbeiträge (optional)
  STRIPE_LINK: "",
};
