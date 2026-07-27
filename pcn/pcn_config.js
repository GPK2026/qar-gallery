// PCN Configuration — Supabase connection
// This file contains credentials. Do not commit to public repositories.
window.PCN_CONFIG = {
  supabaseUrl: "https://xsyuhfleesstrchcwspg.supabase.co",
  supabaseKey: "sb_publishable_xmmKWwXaQliEBAOIFPM8ig_srQP3zED",

  // ── KI-Fotoanalyse (Fahrzeugfoto, Fahrzeugschein, Belege) ───────────────
  // Edge Function "ai-proxy" ist bereits deployed (Stand 27. Juli 2026).
  // Solange der API-Schlüssel noch nicht als Secret hinterlegt ist, zeigt
  // die App den "Noch nicht aktiviert"-Hinweis, statt zu crashen.
  //
  // Verbleibender Schritt (nur noch dieser eine):
  //   Supabase Dashboard → Edge Functions → Secrets:
  //   ANTHROPIC_API_KEY = <euer Anthropic-API-Schlüssel>
  //
  // Der API-Key gehört NIEMALS in diese Datei — sie ist im Browser lesbar.
  aiProxyUrl: "https://xsyuhfleesstrchcwspg.supabase.co/functions/v1/ai-proxy",

  // Stripe Payment Link für Mitgliedsbeiträge (optional)
  STRIPE_LINK: "",
};
