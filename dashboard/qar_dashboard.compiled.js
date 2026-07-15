(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(["exports", "react"], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports, require("react"));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports, global.React);
    global.qar_dashboard = mod.exports;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : this, function (_exports, _react) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = App;
  const T = {
    black: "#0a0a0a",
    dark: "#111111",
    card: "#161616",
    border: "#222222",
    red: "#D5001C",
    gold: "#C8A96E",
    white: "#F0F0F0",
    muted: "#555555",
    green: "#16A34A",
    amber: "#D97706",
    blue: "#2563EB",
    purple: "#7C3AED",
    cyan: "#0891B2"
  };
  const css = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0a0a0a;color:#F0F0F0;font-family:'Barlow',sans-serif;-webkit-font-smoothing:antialiased}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:99px}
  @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  .fade{animation:fadeIn .25s ease}
  .cond{font-family:'Barlow Condensed',sans-serif}
  .mono{font-family:'JetBrains Mono',monospace}
  .tag{display:inline-flex;align-items:center;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
  .btn{border:none;border-radius:8px;padding:9px 15px;font-weight:700;font-size:13px;cursor:pointer;font-family:'Barlow',sans-serif;transition:opacity .15s}
  .btn:hover{opacity:.82}.btn:active{opacity:.65}
  .inp{background:#161616;border:1px solid #222;border-radius:8px;padding:9px 12px;color:#F0F0F0;font-size:13px;width:100%;font-family:'Barlow',sans-serif}
  .inp:focus{outline:none;border-color:#D5001C}
  .card{background:#161616;border:1px solid #222;border-radius:12px;padding:18px}
  select.inp option{background:#111;color:#F0F0F0}
  textarea.inp{resize:vertical}
  table{border-collapse:collapse;width:100%}
  th,td{text-align:left;padding:9px 12px;border-bottom:1px solid #222;font-size:12px}
  th{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#444;background:#111}
`;
  const SK = "qar_dash_v4";

  // ── Persistenz: Supabase (geräteübergreifend) mit localStorage-Fallback ──
  // window.storage gibt es nur in Claude-Artifacts — auf qar.gallery brauchen
  // wir eine echte Quelle. Tabelle: dashboard_state (key TEXT PK, value JSONB)
  const CFG = () => typeof window !== "undefined" && window.PCN_CONFIG || {};
  const sbHeaders = () => ({
    "apikey": CFG().supabaseKey || "",
    "Authorization": "Bearer " + (CFG().supabaseKey || ""),
    "Content-Type": "application/json"
  });
  async function load() {
    const cfg = CFG();
    // 1. Supabase versuchen
    if (cfg.supabaseUrl && cfg.supabaseKey) {
      try {
        const r = await fetch(`${cfg.supabaseUrl}/rest/v1/dashboard_state?key=eq.${SK}&select=value`, {
          headers: sbHeaders()
        });
        if (r.ok) {
          const rows = await r.json();
          if (rows?.[0]?.value) {
            try {
              localStorage.setItem(SK, JSON.stringify(rows[0].value));
            } catch (e) {}
            return rows[0].value;
          }
        }
      } catch (e) {
        console.warn("Dashboard: Supabase nicht erreichbar, nutze lokalen Stand", e);
      }
    }
    // 2. Lokaler Fallback
    try {
      const l = localStorage.getItem(SK);
      if (l) return JSON.parse(l);
    } catch (e) {}
    // 3. Artifact-Umgebung
    try {
      if (window.storage) {
        const r = await window.storage.get(SK);
        if (r?.value) return JSON.parse(r.value);
      }
    } catch (e) {}
    return null;
  }
  async function persist(s) {
    // Immer lokal — sofort und offline verfügbar
    try {
      localStorage.setItem(SK, JSON.stringify(s));
    } catch (e) {}
    const cfg = CFG();
    if (cfg.supabaseUrl && cfg.supabaseKey) {
      try {
        await fetch(`${cfg.supabaseUrl}/rest/v1/dashboard_state?on_conflict=key`, {
          method: "POST",
          headers: {
            ...sbHeaders(),
            "Prefer": "resolution=merge-duplicates"
          },
          body: JSON.stringify({
            key: SK,
            value: s,
            updated_at: new Date().toISOString()
          })
        });
      } catch (e) {
        console.warn("Dashboard: Speichern in Supabase fehlgeschlagen", e);
      }
    }
    try {
      if (window.storage) await window.storage.set(SK, JSON.stringify(s));
    } catch (e) {}
  }
  const INITIAL = {
    kpis: {
      clubs: 0,
      clubs_t: 5,
      vehicles: 7,
      vehicles_t: 500,
      mrr: 0,
      mrr_t: 1500,
      scans: 0,
      scans_t: 100,
      conv: 0,
      conv_t: 15,
      readiness: 8.2
    },
    dd_status: {},
    goals_done: {},
    journal: [{
      id: "J_20260716",
      date: "16. Juli 2026 · 01:30 Uhr",
      type: "milestone",
      title: "Pilot-Readiness: Demo-fähig, zwei Blocker vor Echtbetrieb",
      text: "STAND VOR DER VORSTANDS-DEMO BEIM PCN\n\nFERTIG UND GETESTET:\n✅ Fahrzeugakte, QR-Scan, öffentliche Seite mit Privacy pro Feld\n✅ Events: Kalender-first, Anmeldung, Bestätigung durch Vorstand\n✅ Chat: Direktnachrichten, anonyme QR-Anfragen, Club-Kanal, Admin-Mitteilungen\n✅ Punktesystem: Kurs 911:3, permanenter Zähler im Header mit +X Animation\n✅ Live-Status mit Countdown-Ticker (30s), Dauer wird immer abgefragt\n✅ Admin: Dringlichkeiten-Erkennung (Gäste, Beiträge, Geburtstage, unvollst. Akten)\n✅ Admin: Mitglieder-Dropdowns mit Handlungsbedarf + Smart-Reminder\n✅ Admin: Nachrichten-Tab — Vorstand kann Chats LESEN (fehlte komplett)\n✅ Admin: System-Selbsttest prüft alle DB-Operationen mit echten Schreibvorgängen\n\n⚠️ BLOCKER 1 — DATENBANK-RECHTE:\nSystematisches RLS-Audit ergab: 9 von 21 Policies blockieren lautlos.\nUrsache: Policies prüfen auth.uid(), App nutzt aber Custom-Sessions → immer NULL.\nBetroffen: Live-Status, Logbuch, Event-Anmeldung, Anmeldung bestätigen, Profil speichern.\nFIX: fix_all_rls_policies.sql — 2 Minuten. MUSS vor der Demo laufen.\n\n⚠️ BLOCKER 2 — DSGVO:\nUnverändert offen. Kennzeichen + Geburtstag sind personenbezogene Daten.\nBraucht: Datenschutzerklärung, Einwilligung im Registrierungsflow, AV-Vertrag PCN↔QAR.\n\nDEMO-EMPFEHLUNG:\nSQL vorher ausführen → Vorstand kann live selbst ein Fahrzeug anlegen.\nZeigen: Demo-Account, QR-Scan, Fahrzeugakte, Admin-Dashboard, Reminder.\nNICHT zeigen: Fotoerkennung (deaktiviert), Stripe (kein Link), Punkte-Einlösung (kein Ledger).\n\nDIE WICHTIGSTE FRAGE FÜR DEN TERMIN:\nWer im Vorstand übernimmt das Onboarding? Eine gepflegte Akte kostet 30–60 Min.\nOhne aktive Begleitung bleiben Akten leer — dann funktioniert weder QR noch Community\nnoch Stickyness. Hebt darauf niemand die Hand, ist das ein wichtigeres Signal\nals jede Funktionsdemo."
    }, {
      id: "J_20260716B",
      date: "16. Juli 2026 · 00:45 Uhr",
      type: "risk",
      title: "Lehre: Vier Bugs, eine Ursache — RLS-Policies für falsches Auth-Modell",
      text: "WAS PASSIERT IST:\nÜber mehrere Stunden traten scheinbar unabhängige Fehler auf:\n• Beitrags-Toggle im Admin schlug fehl (PGRST204)\n• Chats ließen sich nicht löschen (kein Fehler, passierte nur nichts)\n• Admin-Reminder kamen nie an (Erfolgsmeldung, aber nichts in der DB)\n• Fahrzeug anlegen funktionierte nicht\n\nGEMEINSAME URSACHE:\nDie RLS-Policies wurden für Supabase-Auth geschrieben und prüfen auth.uid() = user_id.\nDie App nutzt aber eigene Sessions (localStorage + anon key) → auth.uid() ist IMMER NULL.\nPostgres blockiert dann lautlos: 204 No Content statt Fehler. Der Code sah korrekt aus\nund tat trotzdem nichts.\n\nZWEITE URSACHE (parallel):\nFehlende Spalten (beitrag_bezahlt, images, phone) → PGRST204 beim INSERT.\nUngültige UUIDs: 'admin-{uuid}' und 'c1ub0000-...' — u ist kein Hex-Zeichen → 22P02.\n\nWAS ICH DARAUS GELERNT HABE:\n1. Fehler nie mit catch(e){} verschlucken. Jeder dieser Bugs war stundenlang unsichtbar,\n   weil der Fehlertext weggeworfen wurde.\n2. Löschungen VERIFIZIEREN. RLS blockiert mit 204 = Erfolg. Ohne Rückfrage merkt man nichts.\n3. Nicht einzeln nachziehen, sondern systematisch prüfen. Nach dem vierten Bug habe ich ein\n   Audit über ALLE Policies gemacht — und fünf weitere kaputte Funktionen gefunden,\n   die noch niemandem aufgefallen waren.\n\nKONSEQUENZ:\nSystem-Selbsttest in der Admin-Console gebaut. Testet jede DB-Operation mit echten\nSchreibvorgängen und räumt auf. Findet solche Probleme künftig VOR den Mitgliedern.\n\nSICHERHEITS-SCHULD (bewusst eingegangen):\nDie neuen Policies vertrauen der App-Schicht, nicht der DB (USING true).\nFür den Pilot vertretbar: geschlossene Community, Zugang nur per Club-Code.\nVOR ROLLOUT auf weitere Clubs: echte Supabase-Auth. Steht als Roadmap im SQL."
    }, {
      id: "J_20260715",
      date: "15. Juli 2026 · 23:50 Uhr",
      type: "decision",
      title: "KI-Fotoerkennung: gebaut, getestet, deaktiviert",
      text: "IDEE: Foto hochladen → Modell, Farbe, Kennzeichen automatisch erkennen.\nZiel war die größte Onboarding-Hürde: 30–60 Min Dateneingabe pro Fahrzeugakte.\n\nWAS SCHIEFGING:\nIch habe den API-Call gebaut wie in einem Claude-Artifact — fetch('api.anthropic.com')\nohne Key. Das funktioniert NUR dort, weil ein Proxy die Auth übernimmt.\nAuf qar.gallery: HTTP 401 'x-api-key header is required'. Das Feature konnte nie funktionieren.\n\nZWISCHENDIAGNOSE WAR EINE NEBELKERZE:\nIch hatte zuerst die Bildkompression als Ursache identifiziert (600px/72% → Kennzeichen\nunlesbar) und eine Hi-Res-Variante gebaut. Stimmte auch — war aber nicht DAS Problem.\nLehre: erst prüfen ob der Call überhaupt durchgeht, dann optimieren.\n\nENTSCHEIDUNG:\nFeature sauber hinter Feature-Flag deaktiviert. Erscheint gar nicht erst in der App,\nsolange kein Proxy konfiguriert ist. Kein kaputter Button, keine Fehlermeldung.\n\nVORBEREITET FÜR SPÄTER:\n• analyze-vehicle-function.ts — Supabase Edge Function als sicherer Proxy\n  (API-Key serverseitig, Rate-Limit 10/h/IP, max 5MB gegen Kostenexplosion)\n• AI_SETUP.md — Schritt-für-Schritt-Anleitung, ~20 Min Aufwand\n• Reifeprüfung im Admin: misst Trefferquote, Freigabe als Premium erst ab 80%/20 Versuche\n\nWARUM NICHT JETZT:\nNice-to-have, kein Kernfeature. Ein KI-Feature das mal klappt und mal nicht ist als\nBezahlfeature toxisch — der Ärger landet beim Vorstand, nicht bei uns.\nKosten: ~1-2 ct/Foto, bei 150 Mitgliedern einmalig ~3 €. Nicht der Blocker."
    }, {
      id: "SEED_J3",
      date: "3. Juli 2026 · 18:15 Uhr",
      type: "decision",
      title: "Entscheidung: Share-Links künftig via qar.codes",
      text: "KONTEXT: Beim Teilen der öffentlichen Fahrzeugakte aus der App ist qar.codes/v/[ID] die bessere URL als qar.gallery/pcn/?v=[ID].\n\nGRÜNDE:\n• Kürzer (28 vs 36+ Zeichen) — wichtig für QR-Code-Qualität auf Aufklebern bei Regen/Dreck\n• Markenunabhängig — funktioniert für Porsche, BMW, Versicherung, ADAC identisch  \n• Professioneller beim Teilen via WhatsApp/E-Mail — sieht aus wie eigenständige Plattform\n• Partner-Isolation: neuer Partner = neue Routing-Regel, kein neuer Aufkleber je nötig\n\nTECHNISCHE UMSETZUNG:\nCloudflare Worker auf qar.codes deployen.\n301 Redirect: qar.codes/v/[QAR-ID] → qar.gallery/pcn/?v=[QAR-ID]\nAufwand: ~2 Stunden. Kosten: €0 (Cloudflare Free Tier bis 100k Requests/Tag)\n\nTIMING: Nach erstem unterzeichneten Pilotvertrag — nicht blockierend für MVP.\n\nBIS DAHIN: Share-Links laufen direkt auf qar.gallery/pcn/?v=[ID]. Funktioniert, ist nur nicht optimal für die Marke."
    }, {
      id: "SEED_J2",
      date: "3. Juli 2026 · 16:44 Uhr",
      type: "investor",
      title: "Advisor Assessment: Würde ich jetzt investieren?",
      text: "KURZANTWORT: Ja — mit zwei nicht-verhandelbaren Bedingungen.\n\nWAS ÜBERZEUGT:\nDer physische QR-Aufkleber schafft strukturellen Lock-in der sich nicht durch eine bessere App brechen lässt. Das Produkt funktioniert nachweislich — QR-Code scannbar, Chat live, Supabase-Backend stabil. Kein Slide-Deck. Die bestätigten Pilotkunden mit 12-Monats-Commitment sind das stärkste Signal: das sind Entscheider die zahlen wollen, nicht Absichtsbekundungen. Der RWA-Token-Ansatz löst ein echtes strukturelles Problem im Fahrzeugmarkt — nicht weil Blockchain cool ist, sondern weil Unveränderlichkeit und Transfer-Nachweisbarkeit genau das liefern was fehlt.\n\nBEDINGUNG 1: Supabase Auth + RLS müssen vor Geldfluss live sein. Mit aktuellem Auth-Stand und einem echten Kundenvertrag wäre ich als Investor rechtlich exponiert falls Kundendaten kompromittiert werden.\n\nBEDINGUNG 2: Unterzeichneter Pilotvertrag auf dem Tisch — nicht mündliche Zusage. Der Unterschied zwischen \"bereit zu unterzeichnen\" und \"unterzeichnet\" ist der Unterschied zwischen Absicht und Realität.\n\nKONDITIONEN:\n• Pre-Seed jetzt: €150–300k für 8–12% Equity @ €1.5–2.5M pre-money\n• Seed in 3 Wochen (nach Verträgen + Auth-Fix): €400–750k für 10–15%\n\nHAUPTRISIKO: Single Founder. Alles — Produkt, Strategie, BizDev, Investor Relations — kommt von einer Person. Vor Seed-Runde: technischer Co-Founder oder CTO-as-a-Service als Bedingung. Nicht weil du es nicht kannst — sondern weil Investoren einzelne Gründer als existenzielles Risiko bewerten.\n\nFAZIT: Ja, investieren. Aber nicht heute — in drei Wochen, nach unterzeichneten Verträgen und Auth-Fix."
    }, {
      id: "SEED_J1",
      date: "3. Juli 2026 · 16:30 Uhr",
      type: "decision",
      title: "Architektur-Entscheidung: QAR.gallery vs. QAR.codes",
      text: "KERNPRINZIP: QAR.gallery ist die Plattform (wo Daten leben). QAR.codes ist das Interface (wie Daten abgerufen werden). Kein Datum liegt auf QAR.codes — nur Routing-Logik.\n\nDATENFLUSS:\nScan → qar.codes/v/QAR-ID (<1ms Cloudflare Edge)\n  → Browser ohne Token      → Redirect → qar.gallery/public/[ID]\n  → Werkstatt-Token         → qar.gallery/api/v1/vehicle/[ID]?view=workshop\n  → Versicherungs-API-Key   → qar.gallery/api/v1/vehicle/[ID]?view=insurance\n  → Gutachter-Zertifikat    → qar.gallery/api/v1/vehicle/[ID]?view=expert\n  → Händler-Partner-Token   → qar.gallery/api/v1/vehicle/[ID]?view=dealer\nAlle Daten kommen IMMER aus QAR.gallery. QAR.codes speichert nichts.\n\nWARUM DIESE TRENNUNG — 3 KONKRETE GRÜNDE:\n\n1. QR-CODE-QUALITÄT: \"qar.codes/v/QAR-X7K2M9P4\" = 28 Zeichen. \"qar.gallery/pcn/?v=QAR-X7K2M9P4\" = 36+ Zeichen. Bei einem Aufkleber auf einer Windschutzscheibe bei Regen und Dreck ist das der Unterschied zwischen funktioniert und funktioniert nicht.\n\n2. MARKENUNABHÄNGIGKEIT: QAR.codes ist neutral — für Porsche-Club, BMW-Händler, Versicherung identisch. Der physische Aufkleber trägt nie einen Club-Namen. Die Plattform kann sich entwickeln, der Aufkleber bleibt identisch.\n\n3. PARTNER-ISOLATION: Neuer Partner (AutoScout24, HUK, ADAC) = neue Routing-Regel in Cloudflare Workers, 5 Minuten Aufwand, kein neuer Aufkleber, kein Nutzer merkt etwas.\n\nTECHNISCHE UMSETZUNG:\n• QAR.codes: Cloudflare Workers, <1ms Latenz, kostenlos bis 100k Requests/Tag\n• Kein eigener Server, kein eigenes Hosting nötig\n• Kontext-Erkennung via HTTP-Header (Authorization, X-Partner-ID, User-Agent)\n• QAR.gallery: Supabase + React App, alle Daten, alle Logik, alle APIs"
    }, {
      id: "J_20260708",
      date: "8. Juli 2026 · 21:20 Uhr",
      type: "milestone",
      title: "Wochensprint abgeschlossen — MVP ready for Pilot",
      text: "HEUTE FERTIGGESTELLT:\n✅ ICS-Export für Events + Erinnerungen (Apple, Google, Outlook) mit 24h-Alarm\n✅ Nachrichten-Zeitstempel (Heute/Gestern/Datum · Uhrzeit)\n✅ Chats löschbar + persistent (localStorage, kommen nicht zurück)\n✅ Fahrzeug bearbeitbar + löschbar (alle Felder inkl. Marktwert, FIN)\n✅ Gast-Modus eingeschränkt (nur Chats-Tab + Fahrzeugakte)\n✅ Demo-Fahrzeuge in Supabase — Live-Status cross-device funktioniert\n✅ Status-Banner: Zeitstempel + Countdown + Rot-Urgency bei <5 Min\n✅ 5s Live-Sync: Fahrzeugdaten + Privacy-Änderungen auf öffentlicher Seite\n✅ Galerie-Thumbnails direkt unter Hero, Swipe-Funktion, Lightbox\n✅ 911 GTS Demo-Bilder von Prestige Imports (9 Fotos konsistent)\n✅ Öffentliche Seite: QR-Code anzeigen, Teilen-Bereich ganz unten\n✅ Duplicate-Thread-Fix, kein Spam mehr im Chat-Tab\n\nMVP-STATUS: Alle Core-Features funktionieren cross-device.\nDemo ready für Pilotpräsentation beim PCN.\n\nNÄCHSTE WOCHE (Prio):\n• Pilotvertrag PCN unterzeichnen ⚠️\n• DSGVO-Anwalt beauftragen ⚠️  \n• PostHog Key + Stripe Payment Link (je 10-30 Min)\n• qar.codes Cloudflare Worker (nach Pilotvertrag)\n• 2. Pilotclub identifizieren"
    }]
  };
  const MISSION = "Jeden Fahrzeug-Moment digital erlebbar machen — vom ersten Scan bis zum letzten Eigentümerwechsel.";
  const VISION = "Die globale Infrastruktur für verifizierte Fahrzeugidentitäten werden: unveränderlich, markenunabhängig, für jeden Kontext.";
  const POSITIONING = "QAR ist nicht ein weiteres Auto-Portal. QAR ist die Schicht unter allen Auto-Portalen.";
  const QAR_CODES = {
    role: "Universeller physischer Einstiegspunkt — kurz, scanoptimiert, kontextsensitiv. Cloudflare Edge Router <1ms.",
    routing: [["Consumer", "Fahrzeugseite (App)", T.green], ["Werkstatt", "Technische Akte (Auth-Token)", T.amber], ["Versicherung", "Strukturiertes JSON (API-Key)", T.blue], ["Gutachter", "Vollständige Historie (zertifiziert)", T.purple], ["Händler", "RWA Token + Werthistorie", T.gold]],
    vs: "QAR.gallery = Plattform (wo Daten leben) · QAR.codes = Interface (wie Daten abgerufen werden). Neuer Partner = neue Routing-Regel, kein neuer QR-Aufkleber."
  };
  const LAYERS = [{
    layer: "Layer 4",
    name: "Marktplätze & Partner",
    color: T.purple,
    items: ["AutoScout24", "Mobile.de", "Banken/Leasing", "Versicherungen"],
    flow: "Lesen verifizierte Daten per API. Zahlen pro Datenpunkt/Transaktion."
  }, {
    layer: "Layer 3",
    name: "QAR Token / RWA",
    color: T.gold,
    items: ["EVM-Chain (Polygon/Base)", "Account Abstraction", "Token = Ownership", "Transfer bei Verkauf"],
    flow: "On-Chain-Historie. Kein Wallet für Nutzer nötig."
  }, {
    layer: "Layer 2",
    name: "Verifikations-Netzwerk",
    color: T.amber,
    items: ["TÜV / DEKRA", "Werkstätten", "Gutachter", "Versicherungen"],
    flow: "Nur akkreditierte Partner signieren Einträge. Macht Daten werthaltig."
  }, {
    layer: "Layer 1",
    name: "QAR.Gallery + QAR.codes",
    color: T.red,
    items: ["Consumer App", "Club-Features", "QR-Sticker", "Edge Router"],
    flow: "Consumer-Touchpoint. Erzeugt Daten, schafft Netzwerkeffekte."
  }];
  const MARKET_SEGS = [{
    name: "Club SaaS",
    phase: 1,
    color: T.red,
    model: "White-Label SaaS",
    price: "€99–799/Mo",
    timeline: "2026",
    tam_de: "35 Clubs",
    tam_eu: "180 Clubs",
    size_de: "€2.2M",
    size_eu: "€12M",
    size_g: "€80M",
    pen: "15%"
  }, {
    name: "Consumer App",
    phase: 2,
    color: T.amber,
    model: "Freemium + €4.99/Mo",
    price: "€4.99/Mo",
    timeline: "2027",
    tam_de: "48M Fzg",
    tam_eu: "280M Fzg",
    size_de: "€240M",
    size_eu: "€1.4B",
    size_g: "€7B",
    pen: "1–3%"
  }, {
    name: "B2B Distribution",
    phase: 2,
    color: T.gold,
    model: "Revenue-Share + API",
    price: "€0.10–2/Call",
    timeline: "2027",
    tam_de: "Werkst./Vers.",
    tam_eu: "Pan-EU",
    size_de: "€50M",
    size_eu: "€300M",
    size_g: "€2B",
    pen: "5–10%"
  }, {
    name: "Verified Network",
    phase: 3,
    color: T.green,
    model: "€2–5/Eintrag",
    price: "€2–5/Eintrag",
    timeline: "2027–28",
    tam_de: "TÜV/Gutachter",
    tam_eu: "EU",
    size_de: "€80M",
    size_eu: "€500M",
    size_g: "€3B",
    pen: "verifiz. Eintr."
  }, {
    name: "RWA + Marktplatz",
    phase: 4,
    color: T.purple,
    model: "Token Mint + Provision",
    price: "€15–50 + 0.5–1%",
    timeline: "2028+",
    tam_de: "€180B Markt",
    tam_eu: "€1T",
    size_de: "€500M+",
    size_eu: "€3B+",
    size_g: "€20B+",
    pen: "0.3–1%"
  }];
  const SCENARIOS = [{
    name: "Konservativ",
    c: T.muted,
    y1: "€18k",
    y2: "€120k",
    y3: "€480k",
    y5: "€2.4M",
    note: "5 Clubs, 500 Consumer"
  }, {
    name: "Base Case",
    c: T.amber,
    y1: "€36k",
    y2: "€320k",
    y3: "€1.8M",
    y5: "€12M",
    note: "15 Clubs, 2 B2B-Partner"
  }, {
    name: "Optimistisch",
    c: T.green,
    y1: "€90k",
    y2: "€800k",
    y3: "€6M",
    y5: "€50M",
    note: "30 Clubs, ADAC-Deal"
  }, {
    name: "Metaplattform",
    c: T.purple,
    y1: "€90k",
    y2: "€1.2M",
    y3: "€15M",
    y5: "€200M+",
    note: "RWA live, 500k Fahrzeuge"
  }];
  const REVENUE = [{
    id: "R1",
    ph: 1,
    name: "Club SaaS",
    type: "Recurring",
    c: T.red,
    price: "€99–799/Mo",
    margin: "85%",
    y1: "€6k–48k",
    y3: "€120k–480k",
    y5: "€600k–2.4M",
    trigger: "Vertragsabschluss",
    desc: "White-Label App pro Club. Preistier nach Mitgliederzahl."
  }, {
    id: "R2",
    ph: 2,
    name: "Consumer Premium",
    type: "Recurring",
    c: T.amber,
    price: "€4.99/Mo",
    margin: "90%",
    y1: "€0",
    y3: "€30k–300k",
    y5: "€300k–3M",
    trigger: "Erste 1.000 Nutzer",
    desc: "Freemium gratis. Premium: KI-Marktwert, Gutachten, erweiterte Galerie."
  }, {
    id: "R3",
    ph: 2,
    name: "QR-Sticker",
    type: "Einmalig",
    c: T.cyan,
    price: "€3–8/Stk",
    margin: "60%",
    y1: "€3k–8k",
    y3: "€30k–200k",
    y5: "€150k–1M",
    trigger: "Werkstatt-Partner",
    desc: "Physischer QR-Aufkleber. Vertrieb via Werkstätten, Versicherungen, Post."
  }, {
    id: "R4",
    ph: 2,
    name: "B2B API-Lizenz",
    type: "Transaktional",
    c: T.gold,
    price: "€0.10–2/Call",
    margin: "95%",
    y1: "€0",
    y3: "€20k–200k",
    y5: "€120k–2.4M",
    trigger: "Erster Unternehmensvertrag",
    desc: "REST-API für Versicherungen, Händler, Leasinggesellschaften."
  }, {
    id: "R5",
    ph: 3,
    name: "Verifikations-Fee",
    type: "Transaktional",
    c: T.green,
    price: "€2–5/Eintrag",
    margin: "80%",
    y1: "€0",
    y3: "€20k–500k",
    y5: "€120k–5M",
    trigger: "TÜV/Werkstatt-Integration",
    desc: "Jeder verifizierte Eintrag von akkreditiertem Partner. QAR nimmt 70%."
  }, {
    id: "R6",
    ph: 3,
    name: "Gutachten-Provision",
    type: "Transaktional",
    c: "#22C55E",
    price: "5–15%",
    margin: "70%",
    y1: "€0",
    y3: "€10k–100k",
    y5: "€100k–1M",
    trigger: "Gutachter-Netzwerk",
    desc: "Digitale Gutachten in der Akte. Provision bei Vermittlung."
  }, {
    id: "R7",
    ph: 4,
    name: "Token Mint-Fee",
    type: "Einmalig",
    c: T.purple,
    price: "€15–50/Fzg",
    margin: "75%",
    y1: "€0",
    y3: "€0",
    y5: "€150k–50M",
    trigger: "Blockchain live",
    desc: "Einmalige Gebühr beim Tokenisieren. Premium-NFT mit Verifikations-Badge."
  }, {
    id: "R8",
    ph: 4,
    name: "Marktplatz-Provision",
    type: "Transaktional",
    c: "#A855F7",
    price: "0.5–1%",
    margin: "85%",
    y1: "€0",
    y3: "€0",
    y5: "€1M–200M",
    trigger: "Autohandel-Partner",
    desc: "Provision bei Fahrzeugverkauf über QAR-verifizierten Datensatz."
  }];
  const DD_BIZ = [{
    id: "B1",
    cat: "Vision",
    sev: "positive",
    finding: "QAR = permanenter digitaler Zwilling. Infrastruktur unter allen Auto-Portalen. RWA-Token bei Eigentümerwechsel.",
    status: "validated"
  }, {
    id: "B2",
    cat: "Markt",
    sev: "positive",
    finding: "48M Fahrzeuge DE. €180B Jahresmarkt. 3% Penetration = €200–500M Revenue-Potential DE allein.",
    status: "validated"
  }, {
    id: "B3",
    cat: "QAR.codes",
    sev: "positive",
    finding: "Kontextsensitiver Edge-Router: gleicher QR-Code, verschiedene Antworten je Aufrufer. Neue Partner = neue Routing-Regel.",
    status: "validated"
  }, {
    id: "B4",
    cat: "Flywheel",
    sev: "positive",
    finding: "Physischer Aufkleber = struktureller Moat. Einmal geklebt, immer QAR. Netzwerkeffekt wächst mit jedem Fahrzeug.",
    status: "validated"
  }, {
    id: "B5",
    cat: "Pilotkunden",
    sev: "positive",
    finding: "Mehrere Club-Entscheider bereit für 12-Monats-Pilotvertrag.",
    status: "validated"
  }, {
    id: "B6",
    cat: "Wettbewerb",
    sev: "positive",
    finding: "Carfax/Carvertical: statische Reports. QAR: lebendiger Token. Kein direkter Wettbewerber mit RWA-Ansatz.",
    status: "noted"
  }, {
    id: "B7",
    cat: "RISIKO",
    sev: "critical",
    finding: "Noch kein unterzeichneter Vertrag. Kein Unternehmen ohne signierten Pilotvertrag diese Woche.",
    status: "open"
  }, {
    id: "B8",
    cat: "RISIKO",
    sev: "critical",
    finding: "DSGVO: Fahrzeughalter + Chat + Versicherungsdaten = komplex. Anwalt sofort beauftragen.",
    status: "open"
  }, {
    id: "B9",
    cat: "RISIKO",
    sev: "medium",
    finding: "MiCA/RWA: Token-Regulatorik in EU noch unklar. Erstgespräch Rechtsanwalt für digitale Assets.",
    status: "open"
  }, {
    id: "B10",
    cat: "Metriken",
    sev: "medium",
    finding: "Keine Nutzungsdaten. PostHog sofort einbinden. Funnel-Daten = Pflicht für Investor-Pitch.",
    status: "open"
  }, {
    id: "B11",
    cat: "Pricing",
    sev: "medium",
    finding: "Kein definiertes Pricing-Dokument. Basic €99 / Pro €299 / Enterprise €799 empfohlen.",
    status: "open"
  }];
  const DD_TECH = [{
    id: "T1",
    cat: "Auth",
    sev: "critical",
    finding: "Kein echtes Auth — Login per E-Mail ohne Token, Session in localStorage. Für geschlossene Pilot-Community mit Club-Code vertretbar, VOR 2. Club zwingend auf Supabase Auth umstellen.",
    status: "open"
  }, {
    id: "T2",
    cat: "RLS",
    sev: "critical",
    finding: "BEWUSSTE SCHULD: Policies nutzen USING(true) — die DB vertraut der App-Schicht. Ursprüngliche auth.uid()-Policies blockierten alles (App nutzt Custom-Sessions → auth.uid() = NULL). 9 von 21 Policies waren lautlos kaputt: Live-Status, Logbuch, Event-Anmeldung, Profil. Fix liegt bereit (fix_all_rls_policies.sql), echte Absicherung erst mit Supabase Auth.",
    status: "progress"
  }, {
    id: "T3",
    cat: "Security",
    sev: "high",
    finding: "Kein Error Monitoring. Kein Rate-Limiting. Input-Sanitization: escapeHtml() im Admin-Chat vorhanden, App-Seite noch offen.",
    status: "open"
  }, {
    id: "T10",
    cat: "Fehlerkultur",
    sev: "high",
    finding: "BEHOBEN, aber lehrreich: catch(e){} verschluckte Fehler an mehreren Stellen — 4 Bugs blieben stundenlang unsichtbar. RLS blockiert mit 204 = Erfolg, ohne Verifikation merkt man nichts. Konsequenz: Löschungen werden jetzt verifiziert, Fehler durchgereicht.",
    status: "resolved"
  }, {
    id: "T11",
    cat: "Diagnose",
    sev: "positive",
    finding: "System-Selbsttest in der Admin-Console: prüft alle DB-Operationen mit echten Schreibvorgängen und räumt auf. Übersetzt Fehlercodes (42501 → RLS-Policy blockiert). Findet Probleme vor den Mitgliedern.",
    status: "resolved"
  }, {
    id: "T12",
    cat: "Schema",
    sev: "medium",
    finding: "Wiederkehrendes Muster: App sendet Felder die es in der DB nicht gibt (beitrag_bezahlt, images, phone, geburtstag) → PGRST204. saveVehicle hat jetzt Retry-Logik die unbekannte Spalten entfernt. Schema und Code sollten systematisch abgeglichen werden.",
    status: "progress"
  }, {
    id: "T4",
    cat: "qar.codes",
    sev: "medium",
    finding: "Cloudflare Worker auf qar.codes: 301 Redirect qar.codes/v/[QAR-ID] → qar.gallery/pcn/?v=[QAR-ID]. ~2h Aufwand, nach Pilotvertrag. Nicht blockierend — Share-Links funktionieren aktuell direkt.",
    status: "open"
  }, {
    id: "T5",
    cat: "Realtime",
    sev: "medium",
    finding: "5s-Polling statt Supabase WebSocket. Skaliert nicht. 1 Tag Aufwand.",
    status: "open"
  }, {
    id: "T6",
    cat: "Architektur",
    sev: "medium",
    finding: "5.400-Zeilen JSX-Monolith (446 KB) + 137 KB Admin-HTML. Funktioniert, aber jede Änderung erfordert Vollkompilierung. Für Scale: Vite + TypeScript + Module.",
    status: "open"
  }, {
    id: "T7",
    cat: "Testing",
    sev: "medium",
    finding: "Zero Tests. Jeder Deploy ist riskant. Vitest + GitHub Actions.",
    status: "open"
  }, {
    id: "T8",
    cat: "Blockchain",
    sev: "info",
    finding: "Phase 4: ERC-4337 Account Abstraction. Nutzer brauchen kein Wallet. Polygon/Base.",
    status: "noted"
  }, {
    id: "T13",
    cat: "KI-Analyse",
    sev: "info",
    finding: "Fotoerkennung (Modell/Farbe/Kennzeichen) gebaut, aber deaktiviert: Direktaufruf der Anthropic-API aus dem Browser unmöglich (401, Key darf nicht in den Client). Edge-Function-Proxy liegt fertig bereit (analyze-vehicle-function.ts + AI_SETUP.md, ~20 Min). Reifeprüfung eingebaut — Freigabe als Premium erst ab 80% Trefferquote.",
    status: "noted"
  }, {
    id: "T9",
    cat: "Security",
    sev: "resolved",
    finding: "API Key rotiert, aus Code entfernt, .gitignore gesetzt.",
    status: "resolved"
  }];
  const WEEKS = [{
    w: 1,
    dates: "30.6–6.7",
    theme: "Fundament & Vertragsabschluss",
    goals: [{
      id: "G1",
      text: "Pilotvertrag PCN unterzeichnen (12 Mo, Pricing festlegen)",
      own: "Business"
    }, {
      id: "G2",
      text: "Supabase Magic Link Auth einbauen",
      own: "Tech"
    }, {
      id: "G3",
      text: "RLS Policies korrekt konfigurieren",
      own: "Tech"
    }, {
      id: "G4",
      text: "Sentry Error Monitoring einbinden",
      own: "Tech"
    }, {
      id: "G5",
      text: "DSGVO-Erstprüfung: Anwalt beauftragen",
      own: "Legal"
    }, {
      id: "G6",
      text: "2. Pilotclub identifizieren und Gespräch führen",
      own: "Business"
    }]
  }, {
    w: 2,
    dates: "7.–13.7",
    theme: "Analytics & Revenue",
    goals: [{
      id: "G7",
      text: "PostHog Analytics: QR-Scan → Gast → Mitglied Funnel live",
      own: "Tech"
    }, {
      id: "G8",
      text: "Stripe Beitragszahlung im Profil live",
      own: "Tech"
    }, {
      id: "G9",
      text: "qar.codes: Cloudflare Worker einrichten (NACH Pilotvertrag) — qar.codes/v/[ID] → qar.gallery/pcn/?v=[ID], dann Share-Links in App umstellen",
      own: "Tech"
    }, {
      id: "G10",
      text: "2. Pilotvertrag unterzeichnen",
      own: "Business"
    }, {
      id: "G11",
      text: "QR-Sticker Hersteller anfragen, Muster bestellen",
      own: "Business"
    }, {
      id: "G12",
      text: "Input Sanitization / XSS-Fix im Chat",
      own: "Tech"
    }]
  }, {
    w: 3,
    dates: "14.–20.7",
    theme: "Demo-Readiness & Stabilität",
    goals: [{
      id: "G13",
      text: "🔴 fix_all_rls_policies.sql in Supabase ausführen — BLOCKER vor Demo (9 Policies blockieren Live-Status, Logbuch, Anmeldung, Profil)",
      own: "Tech"
    }, {
      id: "G14",
      text: "🔴 Live-Demo beim PCN-Vorstand — Ziel: grundsätzliches Ja zum Pilot, kein Vertrag",
      own: "Business"
    }, {
      id: "G15",
      text: "🔴 DSGVO-Anwalt beauftragen — Datenschutzerklärung, Einwilligung, AV-Vertrag",
      own: "Legal"
    }, {
      id: "G16",
      text: "Onboarding-Verantwortlichen im Vorstand benennen lassen (kritischste Frage im Termin)",
      own: "Business"
    }, {
      id: "G17",
      text: "Pilotvertrag auf einer Seite formulieren",
      own: "Business"
    }, {
      id: "G18",
      text: "QR-Sticker Muster bestellen (für Pilotgruppe 5–10 Fahrzeuge)",
      own: "Business"
    }]
  }, {
    w: "3b",
    dates: "Erledigt in W3",
    theme: "Ungeplant, aber nötig",
    goals: [{
      id: "D1",
      text: "✅ RLS-Vollaudit: 9 blockierte Policies gefunden (nur 4 waren bekannt)",
      own: "Tech"
    }, {
      id: "D2",
      text: "✅ System-Selbsttest in Admin — testet alle DB-Operationen mit echten Writes",
      own: "Tech"
    }, {
      id: "D3",
      text: "✅ Admin-Nachrichten-Tab: Vorstand konnte Chats nicht lesen — jetzt möglich",
      own: "Tech"
    }, {
      id: "D4",
      text: "✅ Club-Kanal an echte DB angebunden (war komplett hardcoded)",
      own: "Tech"
    }, {
      id: "D5",
      text: "✅ Dringlichkeiten-Dashboard: Gäste, Beiträge, Geburtstage, unvollst. Akten",
      own: "Tech"
    }, {
      id: "D6",
      text: "✅ Punktesystem überarbeitet: Kurs 911:3, Marktplatz-Modell, permanenter Zähler",
      own: "Business"
    }, {
      id: "D7",
      text: "✅ KI-Fotoerkennung: gebaut, als undurchführbar erkannt, sauber deaktiviert",
      own: "Tech"
    }]
  }, {
    w: 4,
    dates: "21.–27.7",
    theme: "Pilotstart klein",
    goals: [{
      id: "G19",
      text: "Pilotgruppe 5–10 Mitglieder — nicht alle 150 auf einmal",
      own: "Business"
    }, {
      id: "G20",
      text: "Onboarding-Session mit Pilotgruppe: Akten gemeinsam anlegen",
      own: "Business"
    }, {
      id: "G21",
      text: "QR-Aufkleber für Pilotgruppe produzieren und anbringen",
      own: "Business"
    }, {
      id: "G22",
      text: "PostHog Analytics: QR-Scan → Gast → Mitglied Funnel",
      own: "Tech"
    }, {
      id: "G23",
      text: "Feedback der Pilotgruppe einsammeln, Fehler beheben",
      own: "Tech"
    }]
  }, {
    w: 5,
    dates: "28.7–10.8",
    theme: "Rollout & Skalierung",
    goals: [{
      id: "G24",
      text: "Rollout auf alle 150 Mitglieder (wenn Pilotgruppe zufrieden)",
      own: "Business"
    }, {
      id: "G25",
      text: "Vorstellung beim Clubabend + Onboarding-Aktion",
      own: "Business"
    }, {
      id: "G26",
      text: "Supabase Auth statt Custom-Sessions — vor 2. Club Pflicht",
      own: "Tech"
    }, {
      id: "G27",
      text: "2. Pilotclub identifizieren (Empfehlung durch PCN)",
      own: "Business"
    }, {
      id: "G28",
      text: "Porsche Zentrum Koblenz: Sponsorgespräch",
      own: "Business"
    }, {
      id: "G29",
      text: "30-Tage KPIs: DAU, Retention, Akten-Vollständigkeit",
      own: "Business"
    }]
  }];
  const pct = (a, b) => Math.min(100, Math.round(a / Math.max(b, 1) * 100));
  const OC = {
    Tech: T.blue,
    Business: T.red,
    Legal: T.amber
  };
  const SEV = {
    critical: {
      bg: "#D5001C18",
      border: "#D5001C55",
      tx: "#D5001C",
      lb: "Kritisch"
    },
    high: {
      bg: "#D9770618",
      border: "#D9770655",
      tx: "#D97706",
      lb: "Hoch"
    },
    medium: {
      bg: "#ffffff0a",
      border: "#ffffff18",
      tx: "#666",
      lb: "Mittel"
    },
    low: {
      bg: "#ffffff06",
      border: "#ffffff0f",
      tx: "#444",
      lb: "Niedrig"
    },
    positive: {
      bg: "#16A34A18",
      border: "#16A34A55",
      tx: "#16A34A",
      lb: "Positiv"
    },
    info: {
      bg: "#2563EB18",
      border: "#2563EB44",
      tx: "#2563EB",
      lb: "Info"
    },
    resolved: {
      bg: "#ffffff05",
      border: "#ffffff0d",
      tx: "#444",
      lb: "Behoben"
    }
  };
  const STAT = {
    open: {
      lb: "Offen",
      c: "#D97706"
    },
    progress: {
      lb: "In Arbeit",
      c: "#2563EB"
    },
    done: {
      lb: "Erledigt",
      c: "#16A34A"
    },
    blocked: {
      lb: "Blockiert",
      c: "#D5001C"
    },
    noted: {
      lb: "Notiert",
      c: "#555"
    },
    validated: {
      lb: "Validiert",
      c: "#16A34A"
    },
    resolved: {
      lb: "Behoben",
      c: "#16A34A"
    }
  };
  const JICONS = {
    update: "📊",
    milestone: "🏆",
    risk: "⚠️",
    decision: "📋",
    investor: "💼",
    partner: "🤝"
  };
  function Bar({
    label,
    value,
    target,
    unit = "",
    color = T.red
  }) {
    const p = pct(value, target);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 11
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 3
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: T.muted
      }
    }, label), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: T.white
      }
    }, unit, typeof value === "number" ? value.toLocaleString("de-DE") : value, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: T.muted,
        fontWeight: 400
      }
    }, "/ ", unit, typeof target === "number" ? target.toLocaleString("de-DE") : target))), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 4,
        background: T.border,
        borderRadius: 99,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: "100%",
        width: `${p}%`,
        background: color,
        borderRadius: 99,
        transition: "width .5s ease"
      }
    })));
  }
  function DDRow({
    item,
    onToggle
  }) {
    const s = SEV[item.sev] || SEV.medium,
      st = STAT[item.status] || STAT.open;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 9,
        padding: "11px 13px",
        marginBottom: 7
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 10,
        alignItems: "flex-start"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 5,
        flexWrap: "wrap",
        marginBottom: 5
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "tag",
      style: {
        background: `${s.tx}22`,
        color: s.tx
      }
    }, s.lb), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: T.muted
      }
    }, item.cat), /*#__PURE__*/React.createElement("span", {
      className: "tag",
      style: {
        background: `${st.c}18`,
        color: st.c
      }
    }, st.lb)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: ["resolved", "validated", "noted"].includes(item.status) ? T.muted : T.white,
        lineHeight: 1.6
      }
    }, item.finding)), /*#__PURE__*/React.createElement("select", {
      value: item.status,
      onChange: e => onToggle(item.id, e.target.value),
      className: "inp",
      style: {
        width: 106,
        flexShrink: 0,
        fontSize: 11,
        padding: "4px 6px"
      }
    }, Object.entries(STAT).map(([k, v]) => /*#__PURE__*/React.createElement("option", {
      key: k,
      value: k
    }, v.lb)))));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ZUGANGSSCHUTZ
  //
  // EHRLICHER HINWEIS: Das ist ein Sichtschutz, keine echte Sicherheit.
  // Der Hash steht im Quelltext — wer ihn findet und knackt, kommt rein.
  // Es hält zufällige Besucher fern, keinen entschlossenen Angreifer.
  // Für echten Schutz: Cloudflare Access oder Supabase Auth vorschalten.
  // ═══════════════════════════════════════════════════════════════════════════
  const PW_HASH = "0f219b7e60539f805c39a2d041acafc81a5c61d56e4a40ddd29a6a71a3379601";
  const AUTH_KEY = "qar_dash_auth";
  const SESSION_HOURS = 12;
  async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }
  function hasValidSession() {
    try {
      const s = JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
      if (!s?.until) return false;
      if (Date.now() > s.until) {
        localStorage.removeItem(AUTH_KEY);
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }
  function LoginGate({
    onOk
  }) {
    const [pw, setPw] = (0, _react.useState)("");
    const [err, setErr] = (0, _react.useState)("");
    const [busy, setBusy] = (0, _react.useState)(false);
    const submit = async () => {
      if (!pw.trim()) return;
      setBusy(true);
      setErr("");
      const h = await sha256(pw.trim());
      if (h === PW_HASH) {
        localStorage.setItem(AUTH_KEY, JSON.stringify({
          until: Date.now() + SESSION_HOURS * 3600 * 1000
        }));
        onOk();
      } else {
        setErr("Falsches Passwort");
        setPw("");
        // Kleine Verzögerung gegen Brute-Force per Skript
        await new Promise(r => setTimeout(r, 600));
      }
      setBusy(false);
    };
    return /*#__PURE__*/React.createElement("div", {
      style: {
        minHeight: "100vh",
        background: T.black,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        fontFamily: "'Barlow',sans-serif"
      }
    }, /*#__PURE__*/React.createElement("style", null, css), /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%",
        maxWidth: 360
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        marginBottom: 28
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 34,
        fontWeight: 900,
        color: T.white,
        letterSpacing: -.5
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: T.red
      }
    }, "QAR"), ".GALLERY"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: T.muted,
        letterSpacing: 2,
        textTransform: "uppercase",
        marginTop: 2
      }
    }, "Founder Dashboard")), /*#__PURE__*/React.createElement("div", {
      className: "card",
      style: {
        padding: 22
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: T.muted,
        marginBottom: 14,
        lineHeight: 1.6
      }
    }, "Interner Bereich — Strategie, KPIs und Journal."), /*#__PURE__*/React.createElement("input", {
      className: "inp",
      type: "password",
      placeholder: "Passwort",
      value: pw,
      onChange: e => {
        setPw(e.target.value);
        setErr("");
      },
      onKeyDown: e => {
        if (e.key === "Enter") submit();
      },
      autoFocus: true,
      style: {
        marginBottom: err ? 6 : 12,
        borderColor: err ? T.red : undefined
      }
    }), err && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: T.red,
        marginBottom: 10
      }
    }, err), /*#__PURE__*/React.createElement("button", {
      className: "btn",
      onClick: submit,
      disabled: busy || !pw.trim(),
      style: {
        width: "100%",
        background: T.red,
        color: "#fff",
        opacity: busy || !pw.trim() ? .5 : 1,
        padding: "12px"
      }
    }, busy ? "Prüfe…" : "Anmelden"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#333",
        marginTop: 12,
        lineHeight: 1.5,
        textAlign: "center"
      }
    }, "Sitzung bleibt ", SESSION_HOURS, " Stunden aktiv")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#2a2a2a",
        textAlign: "center",
        marginTop: 18,
        lineHeight: 1.6
      }
    }, "Zugangsschutz auf Browser-Ebene — kein Ersatz für echte Authentifizierung.")));
  }
  function Dashboard({
    onLogout
  }) {
    const [data, setData] = (0, _react.useState)(null);
    const [tab, setTab] = (0, _react.useState)("overview");
    const [kpiEdit, setKpiEdit] = (0, _react.useState)(false);
    const [kpiD, setKpiD] = (0, _react.useState)({});
    const [ji, setJi] = (0, _react.useState)({
      title: "",
      text: "",
      type: "update"
    });
    const [saving, setSaving] = (0, _react.useState)(false);
    (0, _react.useEffect)(() => {
      load().then(d => {
        if (!d) {
          setData(INITIAL);
          return;
        }
        // Migration: inject seed entries if not present
        const existingIds = (d.journal || []).map(e => e.id);
        const missing = INITIAL.journal.filter(e => !existingIds.includes(e.id));
        if (missing.length > 0) {
          const merged = {
            ...d,
            journal: [...missing, ...(d.journal || [])]
          };
          setData(merged);
          persist(merged);
        } else {
          setData(d);
        }
      });
    }, []);
    const save = async nd => {
      setSaving(true);
      setData(nd);
      await persist(nd);
      setTimeout(() => setSaving(false), 600);
    };
    const updDD = (id, status) => save({
      ...data,
      dd_status: {
        ...data.dd_status,
        [id]: status
      }
    });
    const toggleG = id => save({
      ...data,
      goals_done: {
        ...data.goals_done,
        [id]: !data.goals_done[id]
      }
    });
    const saveKPIs = () => {
      save({
        ...data,
        kpis: {
          ...data.kpis,
          ...kpiD
        }
      });
      setKpiEdit(false);
    };
    const addJ = () => {
      if (!ji.title.trim()) return;
      const e = {
        id: "J" + Date.now(),
        date: new Date().toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }),
        ...ji
      };
      save({
        ...data,
        journal: [e, ...data.journal]
      });
      setJi({
        title: "",
        text: "",
        type: "update"
      });
    };
    if (!data) return /*#__PURE__*/React.createElement("div", {
      style: {
        minHeight: "100vh",
        background: T.black,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement("style", null, css), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        color: T.muted
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 28,
        animation: "pulse 1.5s infinite"
      }
    }, "⚡"), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        fontSize: 13
      }
    }, "Lade…")));
    const {
      kpis,
      dd_status,
      goals_done,
      journal
    } = data;
    const allG = WEEKS.flatMap(w => w.goals);
    const doneG = allG.filter(g => goals_done[g.id]).length;
    const critOpen = [...DD_BIZ, ...DD_TECH].filter(i => i.sev === "critical" && (dd_status[i.id] || i.status) === "open").length;
    const TABS = [{
      id: "overview",
      lb: "Übersicht"
    }, {
      id: "vision",
      lb: "Vision & Mission"
    }, {
      id: "architecture",
      lb: "🗺 Architektur"
    }, {
      id: "market",
      lb: "Marktanalyse"
    }, {
      id: "revenue",
      lb: "Revenue Streams"
    }, {
      id: "roadmap",
      lb: "Roadmap"
    }, {
      id: "dd_biz",
      lb: "Business DD"
    }, {
      id: "dd_tech",
      lb: "Tech DD"
    }, {
      id: "journal",
      lb: "Journal"
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        minHeight: "100vh",
        background: T.black,
        paddingBottom: 60
      }
    }, /*#__PURE__*/React.createElement("style", null, css), /*#__PURE__*/React.createElement("div", {
      style: {
        background: T.dark,
        borderBottom: `3px solid ${T.red}`,
        padding: "11px 20px",
        position: "sticky",
        top: 0,
        zIndex: 100
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 1060,
        margin: "0 auto",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 19,
        fontWeight: 900,
        color: T.white
      }
    }, "QAR.GALLERY ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: T.red
      }
    }, "·"), " STRATEGIC COMMAND"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: T.muted
      }
    }, "Metaplattform · Digitaler Fahrzeugzwilling · Pre-Seed")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 7,
        alignItems: "center"
      }
    }, saving && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: T.muted,
        animation: "pulse 1s infinite"
      }
    }, "💾"), critOpen > 0 && /*#__PURE__*/React.createElement("span", {
      className: "tag",
      style: {
        background: `${T.red}22`,
        color: T.red
      }
    }, critOpen, " kritisch"), /*#__PURE__*/React.createElement("span", {
      className: "tag",
      style: {
        background: `${T.green}22`,
        color: T.green
      }
    }, doneG, "/", allG.length, " Ziele"), onLogout && /*#__PURE__*/React.createElement("button", {
      onClick: onLogout,
      title: "Abmelden",
      style: {
        background: "none",
        border: `1px solid ${T.border}`,
        borderRadius: 6,
        padding: "4px 9px",
        color: T.muted,
        fontSize: 11,
        cursor: "pointer",
        fontFamily: "'Barlow',sans-serif",
        fontWeight: 600
      }
    }, "Abmelden")))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: T.dark,
        borderBottom: `1px solid ${T.border}`,
        overflowX: "auto"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 1060,
        margin: "0 auto",
        display: "flex",
        minWidth: "max-content"
      }
    }, TABS.map(t => /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => setTab(t.id),
      style: {
        background: "none",
        border: "none",
        borderBottom: `2px solid ${tab === t.id ? T.red : "transparent"}`,
        padding: "10px 13px",
        color: tab === t.id ? T.white : T.muted,
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 700,
        fontFamily: "'Barlow',sans-serif",
        transition: "all .15s",
        whiteSpace: "nowrap"
      }
    }, t.lb)))), /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 1060,
        margin: "0 auto",
        padding: "20px"
      },
      className: "fade"
    }, tab === "overview" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "linear-gradient(135deg,#160404,#1e0606,#160a16)",
        border: `1px solid ${T.red}44`,
        borderRadius: 16,
        padding: "22px",
        marginBottom: 18
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 14,
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: T.muted,
        textTransform: "uppercase",
        letterSpacing: 2,
        marginBottom: 6
      }
    }, "Investment Readiness"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "baseline",
        gap: 8,
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "cond",
      style: {
        fontSize: 64,
        fontWeight: 900,
        color: T.red,
        lineHeight: 1
      }
    }, kpis.readiness), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 20,
        color: T.muted
      }
    }, "/10"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: T.gold,
        marginLeft: 4
      }
    }, "↑ von 4/10")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: T.muted
      }
    }, "Pilotkunden bestätigt · Metaplattform-Vision definiert · QAR.codes als Edge-Router")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 7
      }
    }, [["✅ Pilotkunden", "Bereit", T.green], ["⚠️ Auth", "Kritisch", T.red], ["⚠️ DSGVO", "Prüfung", T.amber], ["🔮 RWA Token", "Vision", T.purple], ["📝 Verträge", "In Vorb.", T.blue], ["❌ Tests", "Keine", T.red]].map(([l, v, c]) => /*#__PURE__*/React.createElement("div", {
      key: l,
      style: {
        background: "rgba(0,0,0,.4)",
        borderRadius: 8,
        padding: "8px 10px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: T.muted
      }
    }, l), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: c,
        marginTop: 2
      }
    }, v))))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: 8
      }
    }, [["Clubs", "0", "Ziel: 5", T.red], ["Fahrzeuge", "2", "Ziel: 500", T.blue], ["MRR", "€0", "Ziel: €1.5k", T.gold], ["QR-Scans", "0/Wo", "Ziel: 100/Wo", T.green]].map(([l, v, t, c]) => /*#__PURE__*/React.createElement("div", {
      key: l,
      style: {
        background: "rgba(0,0,0,.3)",
        borderRadius: 10,
        padding: "10px",
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 22,
        fontWeight: 900,
        color: c
      }
    }, v), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: T.muted,
        marginTop: 1
      }
    }, l), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: "#444"
      }
    }, t))))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 14,
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "card"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: T.muted,
        textTransform: "uppercase",
        letterSpacing: 1
      }
    }, "KPIs"), /*#__PURE__*/React.createElement("button", {
      className: "btn",
      onClick: () => {
        setKpiD({
          ...kpis
        });
        setKpiEdit(true);
      },
      style: {
        background: T.card,
        color: T.muted,
        border: `1px solid ${T.border}`,
        fontSize: 10,
        padding: "4px 9px"
      }
    }, "✏️ Update")), /*#__PURE__*/React.createElement(Bar, {
      label: "Clubs mit Vertrag",
      value: kpis.clubs,
      target: kpis.clubs_t,
      color: T.green
    }), /*#__PURE__*/React.createElement(Bar, {
      label: "Fahrzeuge",
      value: kpis.vehicles,
      target: kpis.vehicles_t,
      color: T.blue
    }), /*#__PURE__*/React.createElement(Bar, {
      label: "MRR (€)",
      value: kpis.mrr,
      target: kpis.mrr_t,
      unit: "€",
      color: T.gold
    }), /*#__PURE__*/React.createElement(Bar, {
      label: "QR-Scans/Wo",
      value: kpis.scans,
      target: kpis.scans_t,
      color: T.red
    }), /*#__PURE__*/React.createElement(Bar, {
      label: "Gast→Mitglied %",
      value: kpis.conv,
      target: kpis.conv_t,
      color: T.purple
    })), /*#__PURE__*/React.createElement("div", {
      className: "card"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: T.muted,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 12
      }
    }, "ARR Szenarien — Jahr 5"), SCENARIOS.map(s => /*#__PURE__*/React.createElement("div", {
      key: s.name,
      style: {
        display: "flex",
        gap: 10,
        alignItems: "center",
        padding: "7px 0",
        borderBottom: `1px solid ${T.border}`
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 3,
        height: 32,
        background: s.c,
        borderRadius: 99,
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: T.white
      }
    }, s.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: T.muted
      }
    }, s.note)), /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 16,
        fontWeight: 900,
        color: s.c,
        flexShrink: 0
      }
    }, s.y5))))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 14
      }
    }, [["Business", DD_BIZ, "dd_biz"], ["Tech", DD_TECH, "dd_tech"]].map(([l, items, tid]) => {
      const open = items.filter(i => (dd_status[i.id] || i.status) === "open");
      const crit = open.filter(i => i.sev === "critical");
      return /*#__PURE__*/React.createElement("div", {
        key: l,
        className: "card",
        style: {
          cursor: "pointer"
        },
        onClick: () => setTab(tid)
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          color: T.muted,
          marginBottom: 6
        }
      }, l, " DD"), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 12,
          alignItems: "baseline"
        }
      }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
        className: "cond",
        style: {
          fontSize: 32,
          fontWeight: 900,
          color: crit.length ? T.red : T.white
        }
      }, open.length), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12,
          color: T.muted,
          marginLeft: 3
        }
      }, "offen")), crit.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
        className: "cond",
        style: {
          fontSize: 20,
          fontWeight: 900,
          color: T.red
        }
      }, crit.length), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          color: T.red,
          marginLeft: 2
        }
      }, "kritisch"))), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: T.muted,
          marginTop: 6
        }
      }, "Details →"));
    }))), tab === "vision" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "linear-gradient(135deg,#0a0a0a,#160a16)",
        border: `1px solid ${T.purple}44`,
        borderRadius: 16,
        padding: "26px",
        marginBottom: 20
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 11,
        color: T.purple,
        textTransform: "uppercase",
        letterSpacing: 3,
        marginBottom: 14
      }
    }, "Mission & Vision"), /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 18
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: T.muted,
        marginBottom: 5,
        textTransform: "uppercase",
        letterSpacing: 1
      }
    }, "Mission"), /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 22,
        fontWeight: 800,
        color: T.white,
        lineHeight: 1.3
      }
    }, MISSION)), /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 18
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: T.muted,
        marginBottom: 5,
        textTransform: "uppercase",
        letterSpacing: 1
      }
    }, "Vision"), /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 22,
        fontWeight: 800,
        color: T.gold,
        lineHeight: 1.3
      }
    }, VISION)), /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: `1px solid ${T.border}`,
        paddingTop: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: T.muted,
        marginBottom: 5,
        textTransform: "uppercase",
        letterSpacing: 1
      }
    }, "Positionierung"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 17,
        fontWeight: 700,
        color: T.red,
        lineHeight: 1.5,
        fontStyle: "italic"
      }
    }, "„", POSITIONING, "\""))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
        marginBottom: 24
      }
    }, [["🔍", "Transparenz", "Jeder Eintrag nachvollziehbar. Keine versteckte Fahrzeughistorie."], ["🔒", "Vertrauen", "Verifizierte Daten durch akkreditierte Partner."], ["⚡", "Einfachheit", "Web3-Infrastruktur unsichtbar. Scannen, fertig."], ["🌐", "Offenheit", "API-first. Partner nutzen QAR-Daten mit Halter-Erlaubnis."]].map(([icon, title, text]) => /*#__PURE__*/React.createElement("div", {
      key: title,
      className: "card"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 26,
        marginBottom: 8
      }
    }, icon), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 800,
        fontSize: 15,
        color: T.white,
        marginBottom: 5
      }
    }, title), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: T.muted,
        lineHeight: 1.6
      }
    }, text)))), /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 12,
        color: T.muted,
        letterSpacing: 2,
        marginBottom: 10
      }
    }, "QAR.CODES — STRATEGISCHE ROLLE"), /*#__PURE__*/React.createElement("div", {
      style: {
        background: T.card,
        border: `1px solid ${T.cyan}44`,
        borderRadius: 14,
        padding: "20px",
        marginBottom: 20
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 800,
        fontSize: 15,
        color: T.white,
        marginBottom: 6
      }
    }, QAR_CODES.role), /*#__PURE__*/React.createElement("div", {
      style: {
        background: T.dark,
        borderRadius: 10,
        padding: "14px",
        marginBottom: 14,
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 11,
        lineHeight: 2
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: T.cyan
      }
    }, "qar.codes/v/QAR-R4T8W3NX"), QAR_CODES.routing.map(([ctx, dest, c]) => /*#__PURE__*/React.createElement("div", {
      key: ctx,
      style: {
        paddingLeft: 16
      }
    }, "├── ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#888"
      }
    }, ctx.padEnd(15)), "→ ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: c
      }
    }, dest)))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: T.muted,
        lineHeight: 1.7
      }
    }, QAR_CODES.vs)), /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 12,
        color: T.muted,
        letterSpacing: 2,
        marginBottom: 10
      }
    }, "METAPLATTFORM ARCHITEKTUR"), LAYERS.map((l, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        background: T.card,
        border: `1px solid ${l.color}33`,
        borderRadius: 11,
        padding: "13px 15px",
        marginBottom: 9,
        display: "flex",
        gap: 12,
        alignItems: "flex-start"
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "tag",
      style: {
        background: `${l.color}22`,
        color: l.color,
        flexShrink: 0
      }
    }, l.layer), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 800,
        fontSize: 14,
        color: T.white,
        marginBottom: 3
      }
    }, l.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: T.muted,
        marginBottom: 7
      }
    }, l.flow), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 5,
        flexWrap: "wrap"
      }
    }, l.items.map((it, j) => /*#__PURE__*/React.createElement("span", {
      key: j,
      style: {
        background: T.dark,
        border: `1px solid ${T.border}`,
        borderRadius: 5,
        padding: "2px 7px",
        fontSize: 10,
        color: "#777"
      }
    }, it))))))), tab === "architecture" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 22,
        fontWeight: 900,
        color: T.white,
        marginBottom: 4
      }
    }, "SYSTEM ARCHITEKTUR & DATENFLUSS"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: T.muted,
        marginBottom: 24,
        lineHeight: 1.7
      }
    }, "Wo liegen welche Daten, warum — und wie fließen sie beim QR-Scan."), /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 11,
        color: T.muted,
        letterSpacing: 2,
        marginBottom: 12
      }
    }, "DOMAIN-ARCHITEKTUR"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        gap: 0,
        alignItems: "center",
        marginBottom: 28
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: `${T.cyan}12`,
        border: `2px solid ${T.cyan}66`,
        borderRadius: 14,
        padding: "20px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "cond mono",
      style: {
        fontSize: 22,
        fontWeight: 900,
        color: T.cyan,
        marginBottom: 8
      }
    }, "QAR.codes"), /*#__PURE__*/React.createElement("div", {
      className: "tag",
      style: {
        background: `${T.cyan}22`,
        color: T.cyan,
        marginBottom: 12
      }
    }, "Edge Router"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: T.muted,
        lineHeight: 1.8,
        marginBottom: 12
      }
    }, "Cloudflare Workers", /*#__PURE__*/React.createElement("br", null), "<1ms Latenz weltweit", /*#__PURE__*/React.createElement("br", null), "Kein eigener Server", /*#__PURE__*/React.createElement("br", null), "Kein Datenspeicher"), /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: `1px solid ${T.cyan}33`,
        paddingTop: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: T.muted,
        marginBottom: 6
      }
    }, "ENTHÄLT"), ["Routing-Logik", "Kontext-Erkennung", "Token-Validierung", "Redirect-Regeln", "Partner-Konfiguration"].map(i => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        gap: 6,
        alignItems: "center",
        marginBottom: 3
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 5,
        height: 5,
        borderRadius: "50%",
        background: T.cyan,
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: "#888"
      }
    }, i)))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 10,
        padding: "8px",
        background: `${T.cyan}0f`,
        borderRadius: 8,
        fontSize: 10,
        color: T.cyan
      }
    }, "qar.codes/v/QAR-XXXXXXXX", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
      style: {
        color: T.muted
      }
    }, "28 Zeichen · optimal scanbar"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0 16px",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: T.muted,
        textAlign: "center",
        whiteSpace: "nowrap"
      }
    }, "alle Daten"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 28,
        color: T.border
      }
    }, "⟷"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: T.muted,
        textAlign: "center",
        whiteSpace: "nowrap"
      }
    }, "kein Storage")), /*#__PURE__*/React.createElement("div", {
      style: {
        background: `${T.red}0f`,
        border: `2px solid ${T.red}55`,
        borderRadius: 14,
        padding: "20px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "cond mono",
      style: {
        fontSize: 22,
        fontWeight: 900,
        color: T.red,
        marginBottom: 8
      }
    }, "QAR.gallery"), /*#__PURE__*/React.createElement("div", {
      className: "tag",
      style: {
        background: `${T.red}22`,
        color: T.red,
        marginBottom: 12
      }
    }, "Plattform & Daten"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: T.muted,
        lineHeight: 1.8,
        marginBottom: 12
      }
    }, "Supabase (PostgreSQL)", /*#__PURE__*/React.createElement("br", null), "GitHub Pages (App)", /*#__PURE__*/React.createElement("br", null), "React Frontend", /*#__PURE__*/React.createElement("br", null), "REST API"), /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: `1px solid ${T.red}33`,
        paddingTop: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: T.muted,
        marginBottom: 6
      }
    }, "ENTHÄLT"), ["Nutzerkonten & Auth", "Fahrzeugakten", "Logbuch / Historie", "Club-Features", "Chat / Threads", "Medien / Bilder", "API-Endpunkte", "Admin-Panel"].map(i => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        gap: 6,
        alignItems: "center",
        marginBottom: 3
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 5,
        height: 5,
        borderRadius: "50%",
        background: T.red,
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: "#888"
      }
    }, i)))))), /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 11,
        color: T.muted,
        letterSpacing: 2,
        marginBottom: 12
      }
    }, "DATENFLUSS BEIM QR-SCAN"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: T.card,
        border: `2px solid ${T.border}`,
        borderRadius: 12,
        padding: "14px 20px",
        textAlign: "center",
        width: "100%",
        maxWidth: 320
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 24,
        marginBottom: 4
      }
    }, "📷"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 800,
        fontSize: 15,
        color: T.white
      }
    }, "QR-Code Scan"), /*#__PURE__*/React.createElement("div", {
      className: "mono",
      style: {
        fontSize: 11,
        color: T.muted,
        marginTop: 4
      }
    }, "qar.codes/v/QAR-R4T8W3NX")), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 2,
        height: 20,
        background: T.border
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: T.muted
      }
    }, "HTTP Request"), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 2,
        height: 20,
        background: T.border
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: `${T.cyan}12`,
        border: `2px solid ${T.cyan}66`,
        borderRadius: 12,
        padding: "14px 20px",
        width: "100%",
        maxWidth: 440
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 800,
        fontSize: 14,
        color: T.cyan
      }
    }, "⚡ Cloudflare Edge Worker"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: T.muted,
        marginTop: 2
      }
    }, "qar.codes · <1ms · weltweit")), /*#__PURE__*/React.createElement("span", {
      className: "tag",
      style: {
        background: `${T.cyan}22`,
        color: T.cyan
      }
    }, "QAR.codes")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: T.muted,
        lineHeight: 1.6
      }
    }, "Liest HTTP-Header: ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: T.white
      }
    }, "Authorization · X-Partner-ID · User-Agent"), /*#__PURE__*/React.createElement("br", null), "Entscheidet Kontext → leitet weiter")), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 2,
        height: 16,
        background: T.border
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        background: `${T.border}44`,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        padding: "10px 14px",
        marginBottom: 12,
        textAlign: "center",
        fontSize: 12,
        color: T.muted
      }
    }, "🔀 Kontexterkennung — wer fragt an?"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(5,1fr)",
        gap: 8,
        marginBottom: 4
      }
    }, [{
      ctx: "Browser",
      icon: "👤",
      label: "Consumer",
      dest: "Fahrzeugseite",
      color: T.green,
      view: "public"
    }, {
      ctx: "Werkstatt-Token",
      icon: "🔧",
      label: "Werkstatt",
      dest: "Technische Akte",
      color: T.amber,
      view: "workshop"
    }, {
      ctx: "Versicherungs-Key",
      icon: "🏢",
      label: "Versicherung",
      dest: "Strukturiertes JSON",
      color: T.blue,
      view: "insurance"
    }, {
      ctx: "Gutachter-Zert.",
      icon: "📋",
      label: "Gutachter",
      dest: "Vollst. Historie",
      color: T.purple,
      view: "expert"
    }, {
      ctx: "Händler-Token",
      icon: "🏎️",
      label: "Händler",
      dest: "RWA + Wert",
      color: T.gold,
      view: "dealer"
    }].map(p => /*#__PURE__*/React.createElement("div", {
      key: p.ctx,
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 2,
        height: 16,
        background: T.border
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        background: T.card,
        border: `1.5px solid ${p.color}55`,
        borderRadius: 10,
        padding: "10px 8px",
        width: "100%",
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        marginBottom: 4
      }
    }, p.icon), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 11,
        color: p.color,
        marginBottom: 2
      }
    }, p.label), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: T.muted,
        lineHeight: 1.4
      }
    }, p.dest), /*#__PURE__*/React.createElement("div", {
      className: "mono",
      style: {
        fontSize: 8,
        color: "#444",
        marginTop: 4
      }
    }, "?view=", p.view))))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "center",
        gap: 0,
        marginBottom: 0
      }
    }, [T.green, T.amber, T.blue, T.purple, T.gold].map((c, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 2,
        height: 20,
        background: c
      }
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: `${T.red}0f`,
        border: `2px solid ${T.red}55`,
        borderRadius: 12,
        padding: "14px 20px",
        width: "100%"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 800,
        fontSize: 14,
        color: T.red
      }
    }, "🗄 QAR.gallery API"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: T.muted,
        marginTop: 2
      }
    }, "Supabase · PostgreSQL · REST")), /*#__PURE__*/React.createElement("span", {
      className: "tag",
      style: {
        background: `${T.red}22`,
        color: T.red
      }
    }, "QAR.gallery")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(5,1fr)",
        gap: 6
      }
    }, [{
      label: "Public View",
      cols: ["Modell", "Baujahr", "Fotos", "Events", "Status"],
      c: T.green
    }, {
      label: "Workshop",
      cols: ["Logbuch", "Service", "Technisch", "FIN", "Logbuch"],
      c: T.amber
    }, {
      label: "Insurance",
      cols: ["Halter", "Schäden", "TÜV", "Wert", "Vollkasko"],
      c: T.blue
    }, {
      label: "Expert",
      cols: ["Alle Daten", "Signaturen", "Blockchain", "Gutachten", "Zertifikat"],
      c: T.purple
    }, {
      label: "Dealer",
      cols: ["RWA-Token", "Werthistorie", "Eigentümer", "Vollständig", "Verifiziert"],
      c: T.gold
    }].map(v => /*#__PURE__*/React.createElement("div", {
      key: v.label,
      style: {
        background: T.dark,
        borderRadius: 8,
        padding: "8px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: v.c,
        marginBottom: 5
      }
    }, v.label), v.cols.map(col => /*#__PURE__*/React.createElement("div", {
      key: col,
      style: {
        fontSize: 8,
        color: "#555",
        marginBottom: 2,
        display: "flex",
        gap: 3,
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 3,
        height: 3,
        borderRadius: "50%",
        background: v.c,
        flexShrink: 0
      }
    }), col)))))), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 2,
        height: 20,
        background: T.border
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: 28
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: T.card,
        border: `1px solid ${T.green}44`,
        borderRadius: 12,
        padding: "14px 20px",
        width: "100%",
        maxWidth: 380,
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 800,
        fontSize: 14,
        color: T.green,
        marginBottom: 4
      }
    }, "✓ Response an Aufrufer"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: T.muted
      }
    }, "HTML · JSON · RWA-Link — je nach Kontext"))), /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 11,
        color: T.muted,
        letterSpacing: 2,
        marginBottom: 10
      }
    }, "DATEN: WAS LIEGT WO UND WARUM"), /*#__PURE__*/React.createElement("div", {
      style: {
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 20
      }
    }, /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Datenkategorie"), /*#__PURE__*/React.createElement("th", null, "Liegt auf"), /*#__PURE__*/React.createElement("th", null, "Warum dort"), /*#__PURE__*/React.createElement("th", null, "Wer kann zugreifen"))), /*#__PURE__*/React.createElement("tbody", null, [["Nutzerkonten, Auth", "QAR.gallery (Supabase)", "Datenbank mit RLS — nur eigene Daten sichtbar", "Nur der Nutzer selbst"], ["Fahrzeugakte, Logbuch", "QAR.gallery (Supabase)", "Relationale Daten, verknüpft mit Nutzer + Events", "Nutzer + verifizierte Partner (je View)"], ["Fotos / Medien", "QAR.gallery (Supabase Storage)", "CDN-fähig, direkt mit Fahrzeug verknüpft", "Je nach pub_gallery Setting"], ["QR-Code-URL", "QAR.codes (nur Routing)", "Kurz, neutral, markenunabhängig — kein Datenspeicher", "Öffentlich (jeder kann scannen)"], ["Routing-Regeln", "QAR.codes (Cloudflare KV)", "Edge-nah, <1ms, kein Server-Roundtrip", "Nur QAR.codes Worker"], ["Partner-Tokens", "QAR.gallery (Supabase)", "Sicher verwaltet, rotierbar, auditierbar", "Nur QAR-Admin + Partner selbst"], ["RWA-Token (Phase 4)", "Blockchain (Polygon/Base)", "Unveränderlich, transferierbar, kein Single Point of Failure", "Öffentlich verifizierbar"], ["Session / Auth-Token", "Browser (localStorage)", "Client-seitig für Performance", "Nur der Browser des Nutzers"]].map(([cat, where, why, who]) => /*#__PURE__*/React.createElement("tr", {
      key: cat
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        color: T.white,
        fontWeight: 600
      }
    }, cat), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
      className: "tag",
      style: {
        background: where.includes("codes") ? `${T.cyan}22` : where.includes("Blockchain") ? `${T.purple}22` : `${T.red}22`,
        color: where.includes("codes") ? T.cyan : where.includes("Blockchain") ? T.purple : T.red
      }
    }, where.split(" ")[0] + " " + where.split(" ")[1])), /*#__PURE__*/React.createElement("td", {
      style: {
        color: T.muted
      }
    }, why), /*#__PURE__*/React.createElement("td", {
      style: {
        color: "#666"
      }
    }, who)))))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "linear-gradient(135deg,#0a0f16,#0a160f)",
        border: `1px solid ${T.cyan}44`,
        borderRadius: 12,
        padding: "16px 18px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 800,
        fontSize: 14,
        color: T.white,
        marginBottom: 6
      }
    }, "💡 Das zentrale Designprinzip"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: T.muted,
        lineHeight: 1.8
      }
    }, /*#__PURE__*/React.createElement("strong", {
      style: {
        color: T.cyan
      }
    }, "QAR.codes"), " kennt keine Daten — es kennt nur Kontext.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("strong", {
      style: {
        color: T.red
      }
    }, "QAR.gallery"), " kennt keine Aufrufer — es kennt nur Daten.", /*#__PURE__*/React.createElement("br", null), "Die Intelligenz liegt im Routing. Das macht das System erweiterbar ohne je einen QR-Aufkleber zu ersetzen."))), tab === "market" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 22,
        fontWeight: 900,
        color: T.white,
        marginBottom: 4
      }
    }, "BUSINESS EVALUATION"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: T.muted,
        marginBottom: 20,
        lineHeight: 1.7
      }
    }, "Simulierte Marktbewertung basierend auf quantitativen Marktdaten, Segment-TAMs und Phasenpotentialen."), /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 12,
        color: T.muted,
        letterSpacing: 2,
        marginBottom: 10
      }
    }, "MARKTSEGMENTE"), MARKET_SEGS.map((seg, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        background: T.card,
        border: `1px solid ${seg.color}33`,
        borderRadius: 11,
        padding: "14px 16px",
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 7,
        alignItems: "center",
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "tag",
      style: {
        background: `${seg.color}22`,
        color: seg.color
      }
    }, "Phase ", seg.phase), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: T.muted
      }
    }, seg.timeline, " · ", seg.price)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 800,
        fontSize: 15,
        color: T.white
      }
    }, seg.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: T.muted,
        marginTop: 2
      }
    }, seg.model, " · Penetration: ", seg.pen)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 10
      }
    }, [["DE", seg.size_de], ["EU", seg.size_eu], ["Global", seg.size_g]].map(([l, v]) => /*#__PURE__*/React.createElement("div", {
      key: l,
      style: {
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: T.muted
      }
    }, l), /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 15,
        fontWeight: 900,
        color: seg.color
      }
    }, v), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: "#444"
      }
    }, "SAM"))))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 7,
        flexWrap: "wrap"
      }
    }, [seg.tam_de, seg.tam_eu].map((t, j) => /*#__PURE__*/React.createElement("span", {
      key: j,
      style: {
        background: T.dark,
        border: `1px solid ${T.border}`,
        borderRadius: 5,
        padding: "2px 8px",
        fontSize: 10,
        color: "#777"
      }
    }, "TAM: ", t))))), /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 12,
        color: T.muted,
        letterSpacing: 2,
        margin: "22px 0 10px"
      }
    }, "ARR-SZENARIEN (€)"), /*#__PURE__*/React.createElement("div", {
      style: {
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 20
      }
    }, /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Szenario"), /*#__PURE__*/React.createElement("th", null, "Jahr 1"), /*#__PURE__*/React.createElement("th", null, "Jahr 2"), /*#__PURE__*/React.createElement("th", null, "Jahr 3"), /*#__PURE__*/React.createElement("th", null, "Jahr 5"), /*#__PURE__*/React.createElement("th", null, "Annahmen"))), /*#__PURE__*/React.createElement("tbody", null, SCENARIOS.map(s => /*#__PURE__*/React.createElement("tr", {
      key: s.name
    }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        color: s.c
      }
    }, s.name)), /*#__PURE__*/React.createElement("td", {
      className: "mono",
      style: {
        color: T.white
      }
    }, s.y1), /*#__PURE__*/React.createElement("td", {
      className: "mono",
      style: {
        color: T.white
      }
    }, s.y2), /*#__PURE__*/React.createElement("td", {
      className: "mono",
      style: {
        color: T.white
      }
    }, s.y3), /*#__PURE__*/React.createElement("td", {
      className: "mono",
      style: {
        fontWeight: 800,
        color: s.c,
        fontSize: 13
      }
    }, s.y5), /*#__PURE__*/React.createElement("td", {
      style: {
        color: T.muted
      }
    }, s.note)))))), /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 12,
        color: T.muted,
        letterSpacing: 2,
        marginBottom: 10
      }
    }, "BEWERTUNGSSIMULATION (SaaS/Platform Multiples)"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: 9,
        marginBottom: 14
      }
    }, [{
      s: "Seed 2026",
      arr: "€36k–90k",
      mult: "15–20x",
      val: "€540k–1.8M",
      c: T.red
    }, {
      s: "Series A 2027",
      arr: "€320k–800k",
      mult: "20–30x",
      val: "€6M–24M",
      c: T.amber
    }, {
      s: "Series B 2028",
      arr: "€1.8M–6M",
      mult: "25–40x",
      val: "€45M–240M",
      c: T.gold
    }, {
      s: "Exit/IPO 2030",
      arr: "€12M–200M+",
      mult: "30–50x",
      val: "€360M–10B",
      c: T.purple
    }].map(v => /*#__PURE__*/React.createElement("div", {
      key: v.s,
      style: {
        background: T.card,
        border: `1px solid ${v.c}33`,
        borderRadius: 11,
        padding: "12px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: T.muted,
        marginBottom: 5
      }
    }, v.s), /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 12,
        fontWeight: 800,
        color: v.c,
        marginBottom: 4
      }
    }, "ARR: ", v.arr), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: T.muted,
        marginBottom: 6
      }
    }, v.mult, " Multiple"), /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: `1px solid ${T.border}`,
        paddingTop: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: T.muted
      }
    }, "Bewertung"), /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 14,
        fontWeight: 900,
        color: T.white
      }
    }, v.val))))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: `${T.amber}0f`,
        border: `1px solid ${T.amber}33`,
        borderRadius: 9,
        padding: "11px 13px",
        fontSize: 11,
        color: T.muted,
        lineHeight: 1.7
      }
    }, "⚠️ Simulation auf Basis branchenüblicher Multiples. Keine Finanzberatung. Durch zertifizierten Advisor verifizieren lassen.")), tab === "revenue" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 22,
        fontWeight: 900,
        color: T.white,
        marginBottom: 4
      }
    }, "REVENUE STREAMS"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: T.muted,
        marginBottom: 20
      }
    }, "8 Einnahme-Ströme über 4 Phasen — von Recurring SaaS bis RWA-Provision."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: 8,
        marginBottom: 20
      }
    }, [{
      p: "Phase 1",
      n: "Club SaaS",
      t: "1 Stream",
      v: "€6k–48k/J",
      c: T.red
    }, {
      p: "Phase 2",
      n: "Consumer+B2B",
      t: "3 Streams",
      v: "€33k–256k/J",
      c: T.amber
    }, {
      p: "Phase 3",
      n: "Verified Net",
      t: "2 Streams",
      v: "€50k–800k/J",
      c: T.green
    }, {
      p: "Phase 4",
      n: "RWA+Markt.",
      t: "2 Streams",
      v: "€150k–250M+/J",
      c: T.purple
    }].map(x => /*#__PURE__*/React.createElement("div", {
      key: x.p,
      style: {
        background: T.card,
        border: `1px solid ${x.c}44`,
        borderRadius: 11,
        padding: "12px"
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "tag",
      style: {
        background: `${x.c}22`,
        color: x.c,
        marginBottom: 6,
        display: "inline-flex"
      }
    }, x.p), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 12,
        color: T.white,
        margin: "5px 0 3px"
      }
    }, x.n), /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 13,
        fontWeight: 800,
        color: x.c
      }
    }, x.v), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: T.muted,
        marginTop: 2
      }
    }, x.t)))), REVENUE.map(rs => /*#__PURE__*/React.createElement("div", {
      key: rs.id,
      style: {
        background: T.card,
        border: `1px solid ${rs.c}33`,
        borderRadius: 11,
        padding: "14px 16px",
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 9
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        alignItems: "center",
        marginBottom: 5
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "tag",
      style: {
        background: `${rs.c}22`,
        color: rs.c
      }
    }, "Phase ", rs.ph), /*#__PURE__*/React.createElement("span", {
      className: "tag",
      style: {
        background: `${T.border}22`,
        color: T.muted
      }
    }, rs.type), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: T.muted
      }
    }, "Margin ", rs.margin, " · Trigger: ", rs.trigger)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 800,
        fontSize: 16,
        color: T.white,
        marginBottom: 2
      }
    }, rs.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: T.muted
      }
    }, rs.desc)), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "right",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 20,
        fontWeight: 900,
        color: rs.c
      }
    }, rs.price))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gap: 7,
        borderTop: `1px solid ${T.border}`,
        paddingTop: 9
      }
    }, [["Jahr 1", rs.y1], ["Jahr 3", rs.y3], ["Jahr 5", rs.y5]].map(([l, v]) => /*#__PURE__*/React.createElement("div", {
      key: l,
      style: {
        background: T.dark,
        borderRadius: 7,
        padding: "7px",
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: T.muted
      }
    }, l), /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 13,
        fontWeight: 800,
        color: rs.c
      }
    }, v)))))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "linear-gradient(135deg,#100a18,#0a100a)",
        border: `1px solid ${T.purple}44`,
        borderRadius: 14,
        padding: "20px",
        marginTop: 20
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 15,
        fontWeight: 900,
        color: T.white,
        marginBottom: 14
      }
    }, "KUMULIERTES POTENTIAL (alle 8 Streams)"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: 10
      }
    }, [["Jahr 1", "€9k–56k", T.red], ["Jahr 2", "€100k–450k", T.amber], ["Jahr 3", "€200k–2M", T.gold], ["Jahr 5", "€600k–250M+", T.purple]].map(([y, v, c]) => /*#__PURE__*/React.createElement("div", {
      key: y,
      style: {
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: T.muted,
        marginBottom: 3
      }
    }, y, " ARR"), /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 18,
        fontWeight: 900,
        color: c
      }
    }, v), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: "#444",
        marginTop: 2
      }
    }, "konservativ – metaplattform")))))), tab === "roadmap" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "11px 13px",
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 9,
        marginBottom: 16,
        fontSize: 13,
        color: T.muted,
        lineHeight: 1.7
      }
    }, /*#__PURE__*/React.createElement("strong", {
      style: {
        color: T.white
      }
    }, "Wöchentlicher Review:"), " Schreib jeden Montag „Wöchentlicher Review\" in diese Konversation. Ich analysiere Fortschritt, identifiziere Blocker und priorisiere die neue Woche."), WEEKS.map(w => {
      const done = w.goals.filter(g => goals_done[g.id]).length;
      const p = pct(done, w.goals.length);
      return /*#__PURE__*/React.createElement("div", {
        key: w.w,
        className: "card",
        style: {
          marginBottom: 12,
          border: w.w === 3 ? `1px solid ${T.red}55` : w.w === "3b" ? `1px solid ${T.green}33` : `1px solid ${T.border}`,
          opacity: w.w === "3b" ? .85 : 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 9
        }
      }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 7,
          alignItems: "center",
          marginBottom: 2
        }
      }, /*#__PURE__*/React.createElement("span", {
        className: "cond",
        style: {
          fontSize: 17,
          fontWeight: 900,
          color: w.w === "3b" ? T.green : T.white
        }
      }, w.w === "3b" ? "ZUSÄTZLICH" : `WOCHE ${w.w}`), w.w === 3 && /*#__PURE__*/React.createElement("span", {
        className: "tag",
        style: {
          background: `${T.red}22`,
          color: T.red
        }
      }, "← Aktuell"), w.w === "3b" && /*#__PURE__*/React.createElement("span", {
        className: "tag",
        style: {
          background: `${T.green}22`,
          color: T.green
        }
      }, "ungeplant")), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          color: T.muted
        }
      }, w.dates), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          color: T.gold,
          fontWeight: 600,
          marginTop: 1
        }
      }, w.theme)), /*#__PURE__*/React.createElement("div", {
        style: {
          textAlign: "right"
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "cond",
        style: {
          fontSize: 24,
          fontWeight: 900,
          color: p === 100 ? T.green : T.white
        }
      }, done, "/", w.goals.length), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          color: T.muted
        }
      }, "erledigt"))), /*#__PURE__*/React.createElement("div", {
        style: {
          height: 3,
          background: T.border,
          borderRadius: 99,
          overflow: "hidden",
          marginBottom: 10
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          height: "100%",
          width: `${p}%`,
          background: p === 100 ? T.green : T.red,
          borderRadius: 99,
          transition: "width .4s"
        }
      })), w.goals.map(g => /*#__PURE__*/React.createElement("div", {
        key: g.id,
        style: {
          display: "flex",
          gap: 9,
          alignItems: "center",
          padding: "7px 0",
          borderBottom: `1px solid ${T.border}`
        }
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => toggleG(g.id),
        style: {
          width: 20,
          height: 20,
          borderRadius: 5,
          border: `2px solid ${goals_done[g.id] ? T.green : T.border}`,
          background: goals_done[g.id] ? T.green : "transparent",
          cursor: "pointer",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 10,
          fontWeight: 700
        }
      }, goals_done[g.id] ? "✓" : ""), /*#__PURE__*/React.createElement("span", {
        style: {
          flex: 1,
          fontSize: 12,
          color: goals_done[g.id] ? T.muted : T.white,
          textDecoration: goals_done[g.id] ? "line-through" : "none",
          lineHeight: 1.4
        }
      }, g.text), /*#__PURE__*/React.createElement("span", {
        className: "tag",
        style: {
          background: `${OC[g.own] || T.border}22`,
          color: OC[g.own] || T.muted,
          flexShrink: 0
        }
      }, g.own))));
    })), tab === "dd_biz" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 21,
        fontWeight: 900,
        color: T.white,
        marginBottom: 4
      }
    }, "Business Due Diligence"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: T.muted,
        marginBottom: 16
      }
    }, "Status aktualisieren wenn ein Punkt bearbeitet wurde."), DD_BIZ.map(item => /*#__PURE__*/React.createElement(DDRow, {
      key: item.id,
      item: {
        ...item,
        status: dd_status[item.id] || item.status
      },
      onToggle: updDD
    }))), tab === "dd_tech" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 21,
        fontWeight: 900,
        color: T.white,
        marginBottom: 4
      }
    }, "Tech Due Diligence"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: T.muted,
        marginBottom: 16
      }
    }, "Technische Risiken — priorisiert nach Produktions-Impact."), DD_TECH.map(item => /*#__PURE__*/React.createElement(DDRow, {
      key: item.id,
      item: {
        ...item,
        status: dd_status[item.id] || item.status
      },
      onToggle: updDD
    }))), tab === "journal" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 21,
        fontWeight: 900,
        color: T.white,
        marginBottom: 14
      }
    }, "Wöchentliches Journal"), /*#__PURE__*/React.createElement("div", {
      className: "card",
      style: {
        marginBottom: 18,
        border: `1px solid ${T.red}33`
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        color: T.white,
        marginBottom: 10
      }
    }, "+ Neuer Eintrag"), /*#__PURE__*/React.createElement("select", {
      className: "inp",
      value: ji.type,
      onChange: e => setJi(p => ({
        ...p,
        type: e.target.value
      })),
      style: {
        marginBottom: 7
      }
    }, Object.entries(JICONS).map(([v, ic]) => /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, ic, " ", v))), /*#__PURE__*/React.createElement("input", {
      className: "inp",
      placeholder: "Titel…",
      value: ji.title,
      onChange: e => setJi(p => ({
        ...p,
        title: e.target.value
      })),
      style: {
        marginBottom: 7
      }
    }), /*#__PURE__*/React.createElement("textarea", {
      className: "inp",
      rows: 3,
      placeholder: "Was ist passiert? Fortschritte, Entscheidungen, Blocker?",
      value: ji.text,
      onChange: e => setJi(p => ({
        ...p,
        text: e.target.value
      })),
      style: {
        marginBottom: 10
      }
    }), /*#__PURE__*/React.createElement("button", {
      className: "btn",
      onClick: addJ,
      style: {
        background: T.red,
        color: "#fff"
      }
    }, "Speichern")), journal.length === 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        padding: "36px",
        color: T.muted
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 28,
        marginBottom: 7
      }
    }, "📓"), "Starte mit dem ersten Wochen-Update.") : journal.map(e => /*#__PURE__*/React.createElement("div", {
      key: e.id,
      className: "card",
      style: {
        marginBottom: 9
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 7
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 7,
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16
      }
    }, JICONS[e.type] || "📝"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        fontSize: 13,
        color: T.white
      }
    }, e.title)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: T.muted
      }
    }, e.date)), e.text && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: T.muted,
        lineHeight: 1.7
      }
    }, e.text))))), kpiEdit && /*#__PURE__*/React.createElement("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.92)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20
      },
      onClick: e => e.target === e.currentTarget && setKpiEdit(false)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: T.dark,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: 22,
        maxWidth: 400,
        width: "100%",
        maxHeight: "88vh",
        overflowY: "auto"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 18,
        fontWeight: 800,
        color: T.white,
        marginBottom: 14
      }
    }, "KPIs aktualisieren"), [["clubs", "Clubs mit Vertrag", 1], ["vehicles", "Fahrzeuge", 1], ["mrr", "MRR (€)", 1], ["scans", "QR-Scans/Woche", 1], ["conv", "Gast→Mitglied %", 0.1], ["readiness", "Investment Readiness /10", 0.5]].map(([k, l, step]) => /*#__PURE__*/React.createElement("div", {
      key: k,
      style: {
        marginBottom: 9
      }
    }, /*#__PURE__*/React.createElement("label", {
      style: {
        fontSize: 11,
        color: T.muted,
        display: "block",
        marginBottom: 3
      }
    }, l), /*#__PURE__*/React.createElement("input", {
      className: "inp",
      type: "number",
      step: step,
      value: kpiD[k] !== undefined ? kpiD[k] : kpis[k],
      onChange: e => setKpiD(p => ({
        ...p,
        [k]: parseFloat(e.target.value) || 0
      }))
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        marginTop: 14
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn",
      onClick: () => setKpiEdit(false),
      style: {
        flex: 1,
        background: T.card,
        color: T.muted,
        border: `1px solid ${T.border}`
      }
    }, "Abbrechen"), /*#__PURE__*/React.createElement("button", {
      className: "btn",
      onClick: saveKPIs,
      style: {
        flex: 1,
        background: T.red,
        color: "#fff"
      }
    }, "Speichern ✓")))));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EINSTIEGSPUNKT — Login-Gate vor dem Dashboard
  // ═══════════════════════════════════════════════════════════════════════════
  function App() {
    const [authed, setAuthed] = (0, _react.useState)(() => hasValidSession());

    // Sitzung läuft nach 12h ab — prüfen wenn Tab wieder aktiv wird
    (0, _react.useEffect)(() => {
      const check = () => {
        if (!hasValidSession()) setAuthed(false);
      };
      const iv = setInterval(check, 60000);
      document.addEventListener("visibilitychange", check);
      return () => {
        clearInterval(iv);
        document.removeEventListener("visibilitychange", check);
      };
    }, []);
    const logout = () => {
      localStorage.removeItem(AUTH_KEY);
      setAuthed(false);
    };
    if (!authed) return /*#__PURE__*/React.createElement(LoginGate, {
      onOk: () => setAuthed(true)
    });
    return /*#__PURE__*/React.createElement(Dashboard, {
      onLogout: logout
    });
  }
});
