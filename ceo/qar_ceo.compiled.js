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
    global.qar_ceo = mod.exports;
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
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0a0a0a;color:#F0F0F0;font-family:'Barlow',sans-serif;-webkit-font-smoothing:antialiased}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:99px}
  @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  .fade{animation:fadeIn .25s ease}
  .cond{font-family:'Barlow Condensed',sans-serif}
  .tag{display:inline-flex;align-items:center;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
  .btn{border:none;border-radius:8px;padding:9px 15px;font-weight:700;font-size:13px;cursor:pointer;font-family:'Barlow',sans-serif;transition:opacity .15s}
  .btn:hover{opacity:.82}.btn:active{opacity:.65}
  .inp{background:#161616;border:1px solid #222;border-radius:8px;padding:9px 12px;color:#F0F0F0;font-size:13px;width:100%;font-family:'Barlow',sans-serif}
  .inp:focus{outline:none;border-color:#D5001C}
  .card{background:#161616;border:1px solid #222;border-radius:12px;padding:18px}
`;

  // ═══════════════════════════════════════════════════════════════════════════
  // ZUGANGSSCHUTZ — gleiches Muster wie /dashboard, eigenes Passwort.
  // EHRLICHER HINWEIS: Sichtschutz, keine echte Sicherheit. Hält zufällige
  // Besucher fern, keinen entschlossenen Angreifer. Für echten Schutz:
  // Cloudflare Access oder Supabase Auth vorschalten.
  // ═══════════════════════════════════════════════════════════════════════════
  const PW_HASH = "ee0d991bd865fa4e8de352534750c370ca8e5de6ca9bd212abcf8682ecb95ba2";
  const AUTH_KEY = "qar_ceo_auth";
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
      }
      setBusy(false);
    };
    return /*#__PURE__*/React.createElement("div", {
      style: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20
      }
    }, /*#__PURE__*/React.createElement("style", null, css), /*#__PURE__*/React.createElement("div", {
      className: "card fade",
      style: {
        maxWidth: 340,
        width: "100%"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 24,
        fontWeight: 900,
        color: T.white,
        marginBottom: 4
      }
    }, "CEO Dashboard"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: T.muted,
        marginBottom: 20
      }
    }, "QAR.Gallery × PCN — nur für dich"), /*#__PURE__*/React.createElement("input", {
      className: "inp",
      type: "password",
      placeholder: "Passwort",
      value: pw,
      onChange: e => setPw(e.target.value),
      onKeyDown: e => e.key === "Enter" && submit(),
      style: {
        marginBottom: 10
      },
      autoFocus: true
    }), err && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: T.red,
        marginBottom: 10
      }
    }, err), /*#__PURE__*/React.createElement("button", {
      className: "btn",
      style: {
        width: "100%",
        background: T.red,
        color: "#fff"
      },
      onClick: submit,
      disabled: busy
    }, busy ? "…" : "Anmelden")));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INHALTE — aus den tatsächlichen Projekt-Dokumenten und dem Entwicklungs-
  // verlauf zusammengefasst (Aufgabenstand 20.7., Pilot-Readiness Juli,
  // DSGVO-Bewertung, Revenue-Strategie, heutiger Session-Stand). Wo ein
  // Datenpunkt auf Annahme statt Beleg beruht, ist das im Text vermerkt statt
  // verschwiegen.
  // ═══════════════════════════════════════════════════════════════════════════

  const STATUS_DONE = [{
    t: "Provenienz-Siegel zu 'Approval'-Banner umgestaltet",
    d: "Kleines Icon neben dem Modellnamen ersetzt durch einen dicken, farbigen Rahmen um die gesamte Eckdaten-Karte (Gold bei erfüllten Kriterien, Grau bei offenen), mit nahtlos angesetztem 'APPROVAL'-Banner und separatem Info-Symbol — Design vorab per Skizze mit dem Vorstand abgestimmt, dann umgesetzt",
    date: "Sep 2026"
  }, {
    t: "Plattform-Funktionen, Kalender & Live-Ausfahrt als einheitliche Dropdowns",
    d: "Drei bisher unterschiedlich gestaltete Dashboard-Bereiche (permanent sichtbare Listen bzw. Überschrift-mit-Trennlinie) auf ein gemeinsames, klappbares Kartendesign vereinheitlicht — Kopfzeile mit Icon/Titel/Zähler immer sichtbar, Inhalt erst nach Antippen",
    date: "Sep 2026"
  }, {
    t: "Typografie auf Inter umgestellt",
    d: "Bisherige Zwei-Familien-Lösung (Barlow + Barlow Condensed) durch eine einzige, für Bildschirme optimierte Google-Schriftart ersetzt (182 Textstellen), Überschriften-Schriftgrößen durchgängig vergrößert, Laufweite reduziert",
    date: "Sep 2026"
  }, {
    t: "ICE-Notfallzugang: Sichtbarkeit jetzt nutzergesteuert",
    d: "Der rote Notfall-Button war bislang immer sichtbar — jetzt standardmäßig ausgeblendet (Privacy-by-Default für Gesundheitsdaten, Art. 9 DSGVO), Eigentümer schaltet ihn bewusst frei. Bestehende Fahrzeuge isoliert getestet: kein Fahrzeug wurde durch das Update versehentlich sichtbar",
    date: "Sep 2026"
  }, {
    t: "Kalender-Integration (iCal-Abo, Einzelexport, Teilen)",
    d: "Neue öffentliche Supabase Edge Function liefert alle Events als Abo-Feed für Google/Apple/Outlook-Kalender, mit Schritt-für-Schritt-Anleitungsdialog; einzelne Events als .ics herunterladbar oder direkt zu Google Kalender hinzufügbar; Teilen-Funktion über native Geräte-Freigabe. Ein echter Datumsfehler (falsches Zeitformat) vor dem Deploy gefunden und mit einer echten iCalendar-Bibliothek gegen Produktivdaten verifiziert",
    date: "Sep 2026"
  }, {
    t: "Notfallprofile & Pannenhilfe zu einem Dropdown zusammengelegt",
    d: "Vorher zwei separate, immer sichtbare Boxen — jetzt ein gemeinsames, markant hervorgehobenes Dropdown mit eigenem rotem Kreuz-Icon statt generischem Emoji",
    date: "Sep 2026"
  }, {
    t: "Werkstatt-B2B-Prozess grundlegend vereinfacht",
    d: "Ursprünglich mit Admin-Freigabeprozess gebaut, auf ausdrücklichen Wunsch durch sofortige Selbstregistrierung ersetzt — Kontrolle liegt jetzt vollständig beim Fahrzeugeigentümer, der jeden Zugriff je Fahrzeug einzeln bestätigt (einmalig oder dauerhaft). Wettbewerbsschutz ergänzt: Werkstatt sieht ausschließlich eigene Logbucheinträge, keine anderer Werkstätten — direkt gegen die Datenbank mit mehreren Werkstätten getestet",
    date: "Sep 2026"
  }, {
    t: "Werkstatt-Registrierung: Handelsregisternummer als Pflichtfeld",
    d: "Alle Angaben im B2B-Antrag sind jetzt verpflichtend, inklusive neuer Handelsregisternummer — auch in der Admin-Prüfung sichtbar gemacht (später obsolet durch Vereinfachung auf Selbstregistrierung)",
    date: "Sep 2026"
  }, {
    t: "Fahrzeugübertragung: Benachrichtigungslücken geschlossen",
    d: "Käufer erfuhr bislang nicht aktiv, wenn der Verkäufer seinen Teil bestätigt hatte (kein Trigger für den finalen Bestätigungsdialog) — durch Nutzerrückmeldung entdeckt und behoben, symmetrisch zur bereits bestehenden Verkäufer-Benachrichtigung. Zusätzlich: roter Punkt direkt am betroffenen Fahrzeug in 'Meine Fahrzeuge' bei offenen Anträgen",
    date: "Sep 2026"
  }, {
    t: "Nachricht senden (Gast, öffentliche Akte): 5 Korrekturen",
    d: "Werkstattoption jetzt im Registrieren-Modus verlinkt; Hinweistext fetter und auffälliger; 'Was wird gespeichert?'-Link repariert (Dialog lag im unerreichbaren Teil des Codes); beide Zustimmungs-Häkchen jetzt Pflicht zum Senden; Passwort-Feld bei Anmelden ergänzt (vorher ungeschützte Nur-Email-Anmeldung)",
    date: "Sep 2026"
  }, {
    t: "Design-System: mehr Kontrast, Hintergründe, Boxen-Transparenz",
    d: "Von 3 auf 8 Hintergrundthemen erweitert (2 neue lizenzverifizierte Fotos, 3 reine Farbverläufe, 1 neues reines Schwarz-Theme), Karten-Hintergründe leicht transparent für sichtbaren Themen-Effekt. Dabei einen echten CSS-Stacking-Bug gefunden (Hintergrund legte sich über den Inhalt statt dahinter) — mit isoliertem Playwright-Test reproduziert und die Korrektur verifiziert",
    date: "Sep 2026"
  }, {
    t: "Großschreibung bei Überschriften entfernt",
    d: "App-weit 78 von 82 Stellen von Versalien auf normale Schreibweise umgestellt — bewusste Ausnahmen für Club-Code-Eingabefelder und wenige funktionale/dekorative Fälle beibehalten",
    date: "Sep 2026"
  }, {
    t: "Zentrales Benachrichtigungs-Icon im App-Header",
    d: "Neues Briefumschlag-Symbol im durchgängigen App-Header, bündelt ungelesene Nachrichten, Neuigkeiten, offene Übertragungs- und Werkstatt-Anfragen sowie Offline-Status an einer Stelle — dupliziert keine bestehende Logik, jeder Eintrag führt zur jeweils zuständigen Stelle",
    date: "Sep 2026"
  }, {
    t: "Fahrzeugfotos: Mehrfach-Upload & Obergrenze",
    d: "Bis zu 3 Bilder gleichzeitig aus der Fotobibliothek auswählbar und hochladbar (an beiden Upload-Stellen der Fahrzeugakte) — vorher nur einzeln. Zusätzlich maximale Bildanzahl auf 12 pro Fahrzeug begrenzt, mit klarer Fehlermeldung statt stillem Abschneiden",
    date: "Aug 2026"
  }, {
    t: "Zwei Standort-Karten-Bugs behoben",
    d: "Karte 'Zuletzt geparkt' blieb nach dem Speichern unsichtbar, bis man die Fahrzeugakte neu öffnete (fehlende State-Synchronisation gefunden und behoben); zusätzlich legte sich die Leaflet-Karte teils über andere Dialoge (bekanntes Leaflet-Verhalten, durch CSS-Isolation behoben)",
    date: "Aug 2026"
  }, {
    t: "Live-Ausfahrt: Routenplanungs-Anzeige-Bug behoben",
    d: "Nach dem Starten einer Ausfahrt mit vorab geplanter Route blieb das Adresseingabefeld dauerhaft über der Karte liegen statt nur während des Einzeichnens",
    date: "Aug 2026"
  }, {
    t: "Dokumentenablage in der Fahrzeugakte",
    d: "Rechnungen, Werkstattbelege, Fahrzeugschein können ohne sofortige KI-Auswertung abgelegt werden — Auswertung über 'KI auslesen'-Button jederzeit nachholbar, verknüpft sich automatisch mit dem entstehenden Logbuch-Eintrag. Mit Service-Logbuch zu einem gemeinsamen Dropdown 'Service & Dokumente' zusammengelegt",
    date: "Aug 2026"
  }, {
    t: "Login-Screen verbessert",
    d: "Standardansicht ist jetzt 'Anmelden' statt 'Registrieren', beim Wechsel zu Registrieren erscheint sofort ein Hinweistext zum benötigten Club-Code statt nur dem Platzhaltertext im leeren Feld",
    date: "Aug 2026"
  }, {
    t: "Admin-Console: direkter Link zur Fahrzeugakte",
    d: "Jedes Fahrzeug in der Mitgliederkarte führt jetzt direkt zur öffentlichen Fahrzeugakte, öffnet in neuem Tab — vorher nur reine Textanzeige ohne Verlinkung",
    date: "Aug 2026"
  }, {
    t: "UX-Überarbeitung: Layout, Abstände, Design-Konsistenz",
    d: "Systematische Bereinigung nach wachsender Komplexität — Farbpalette an recherchierte Porsche-Design-Werte angelehnt (jede Farbe mit echter WCAG-Kontrastprüfung, dabei einen bestehenden Kontrastfehler unter dem Mindeststandard gefunden und behoben), einheitliche Abstände zwischen Kategorien, Buttons konsequent unter statt neben Überschriften, Swipe-Bereiche (z.B. News) jetzt visuell als wischbar erkennbar, alle Popups mit funktionierendem Schließen-Button",
    date: "Aug 2026"
  }, {
    t: "Notfallakte: Bedienung nachgebessert",
    d: "Foto vergrößert sich jetzt direkt per Antippen (vorher nur indirekt über Umweg erreichbar — echter Anzeige-Bug durch falsche Ebenen-Reihenfolge behoben), Notfallkontakt-Telefonnummern jetzt auch als Text sichtbar statt nur im Anruf-Link verborgen",
    date: "Aug 2026"
  }, {
    t: "Live-Ausfahrt: Route bereits beim Erstellen planbar",
    d: "Start, beliebige Zwischenstopps und Ziel direkt beim Anlegen der Ausfahrt per Adresseingabe festlegbar (wie bei gängigen Kartenanbietern), inklusive Distanz/Fahrzeit/voraussichtlicher Ankunft als Zusammenfassung",
    date: "Aug 2026"
  }, {
    t: "Punktesystem: 1:1-Abgleich mit Admin-Console",
    d: "Admin-Console berechnet Punkte nicht mehr selbst nach, sondern liest ausschließlich den von der App berechneten und gespeicherten Gesamtwert — dadurch strukturell unmöglich, dass beide Ansichten je wieder auseinanderlaufen",
    date: "Aug 2026"
  }, {
    t: "Diverse Korrekturen aus Nutzung",
    d: "Demo-Test-Nutzer erschienen fälschlich in echten Einladungslisten (behoben), verwaiste Chat-Einträge in 'Meine Chats' wurden automatisch bereinigt, News-Archiv für bereits gelesene Beiträge ergänzt, Willkommens-Hinweis erscheint jetzt nur noch bei echter Erstanmeldung statt bei jedem Neustart",
    date: "Aug 2026"
  }, {
    t: "Punktesystem: komplett serverseitig",
    d: "QR-Scan, angesehene Akte, News gelesen, Geburtstag laufen nicht mehr über localStorage sondern über eine neue Datenbank-Tabelle — App und Admin-Console können strukturell nicht mehr auseinanderlaufen. Dabei einen echten Bug behoben: QR-Scan-Bestätigung landete fälschlich im Speicher des Eigentümers statt des Scanners",
    date: "Aug 2026"
  }, {
    t: "Live-Ausfahrt-Karte auf Leaflet umgestellt",
    d: "Vorheriger Kartenansatz zeigte nur einen Positionspin — jetzt echte Multi-Marker-Karte mit farblich unterschiedenen Teilnehmern, plus Routenplanung für den Organisator (Wegpunkte per Antippen oder Adresseingabe, Route via OSRM berechnet)",
    date: "Aug 2026"
  }, {
    t: "Notfall-Zugang (ICE)",
    d: "Rundes Symbol oben rechts in der Fahrzeugakte — Rettungskräfte bestätigen zunächst ihre Rolle, dann Zugang zu Blutgruppe, Allergien, Notfallkontakten über einen physisch verborgenen 4-stelligen Code",
    date: "Aug 2026"
  }, {
    t: "Pannenhilfe-Integration",
    d: "ADAC/AvD-Mitgliedsnummer im Profil, direkter Anruf-Button in der Fahrzeugakte mit recherchierten, verifizierten Notrufnummern",
    date: "Aug 2026"
  }, {
    t: "Fahrzeug-Eigentumsübertragung",
    d: "QAR-ID bleibt wie eine FIN lebenslang am Fahrzeug — zwei Wege (Direktübertragung per QR-Scan vor Ort, oder Antrag ohne gemeinsame Anwesenheit), beidseitige Zustimmung mit rechtlichem Opt-in-Text, automatische Nachrichten-Bereinigung",
    date: "Aug 2026"
  }, {
    t: "Standort-Themenreihe",
    d: "Diebstahl-Frühwarnung bei Fremd-Scans (48h-Löschfrist), privater Standort-Check-in, Live-Ausfahrt-Gruppen mit Positions-Teilen — alle bewusst unterschiedlich in Sichtbarkeit und Aufbewahrung gestaltet",
    date: "Aug 2026"
  }, {
    t: "Verkaufsbörse",
    d: "3 Kategorien, Fahrzeugauswahl, Preisfeld, Bild-Upload, bidirektionale Sync mit Live-Status",
    date: "Aug 2026"
  }, {
    t: "Persönlicher Hintergrund",
    d: "2 Foto-Themes (verifizierte Unsplash-Lizenz), 50% Deckkraft, überall nach Login sichtbar",
    date: "Aug 2026"
  }, {
    t: "KI-Fotoerkennung aktiviert",
    d: "Supabase Edge Function als Proxy eingerichtet, Fahrzeugschein- und Beleg-Scanner funktionieren jetzt tatsächlich",
    date: "Aug 2026"
  }, {
    t: "Dokumenten-Scanner",
    d: "Wartung/Reparatur/Rechnung/Versicherung fotografieren, KI liest Felder aus — Historie vor Registrierung digitalisierbar",
    date: "Aug 2026"
  }, {
    t: "Punktesystem überarbeitet",
    d: "911 Punkte für komplette Akte, Verdopplung bei Anlage direkt nach Registrierung",
    date: "Jul 2026"
  }, {
    t: "Event-Historie",
    d: "Filter + Zusammenfassung (besuchte Events, Punkte, genutztes Fahrzeug)",
    date: "Jul 2026"
  }, {
    t: "Datenschutz-Grundgerüst",
    d: "Privacy-by-Default, getrennte Einwilligungen (Kontakt/Marketing), AGB-Hinweis",
    date: "Jul 2026"
  }, {
    t: "Admin-Console Feature-Parität",
    d: "Lesehäkchen, Emoji-Reaktionen, Selbsttest für DB-Operationen",
    date: "Jul 2026"
  }, {
    t: "Sicherheit: Passwort-Hashing",
    d: "Upgrade von btoa auf PBKDF2+Salt",
    date: "Jul 2026"
  }, {
    t: "RLS-Policy-Bereinigung",
    d: "15 doppelte Policies entfernt, 9 fehlende FK-Indizes ergänzt",
    date: "Jul 2026"
  }];
  const STATUS_OPEN = [{
    t: "Backups einschalten",
    own: "Business",
    note: "Supabase-Dashboard-Einstellung, keine Entwicklungsarbeit"
  }, {
    t: "DSGVO-Anwalt beauftragen",
    own: "Business/Legal",
    note: "Interne Bewertung liegt vor (siehe Recht-Tab), keine rechtsverbindliche Prüfung — Notfall-Zugang ist seit Sep 2026 standardmäßig ausgeblendet (Nutzer schaltet ihn bewusst frei), das ändert aber nichts an der grundsätzlichen Prüfpflicht für Gesundheitsdaten, sobald aktiviert"
  }, {
    t: "Pilotvertrag unterschreiben",
    own: "Business",
    note: "Entwurf fertig (PCN_Pilotvertrag), wartet auf Unterschrift Club-Vorstand"
  }, {
    t: "Echte Authentifizierung",
    own: "Tech",
    note: "Aktuell Club-Code statt Supabase Auth — für Pilot vertretbar, vor Multi-Club-Rollout nötig"
  }, {
    t: "Punkte-Einlösung",
    own: "Tech + Business",
    note: "App und Admin-Console jetzt 1:1 synchron (Admin liest nur noch, rechnet nicht mehr selbst) — Einlösung selbst (wogegen, wie gebucht) noch nicht umgesetzt"
  }, {
    t: "Stripe-Zahlung aktivieren",
    own: "Business",
    note: "Vorbereitet, kein Payment Link — Beiträge laufen im Pilot per Überweisung, betrifft jetzt auch die 30-Tage-Probezeit nach Fahrzeugübertragung"
  }, {
    t: "Dashboard-Zugriff absichern",
    own: "Tech",
    note: "Aktuell Passwort-Hash im Quelltext (Sichtschutz) — für echten Schutz: Cloudflare Access"
  }, {
    t: "Werbe-KPI-Auswertung",
    own: "Tech",
    note: "QR-Scan-Rohdaten liegen jetzt strukturiert in point_events vor, Auswertungs-Ansicht in der Admin-Console fehlt noch"
  }, {
    t: "Anwaltliche Prüfung Übertragungstext",
    own: "Legal",
    note: "Rechtlicher Opt-in-Text für die Eigentumsübertragung ist als Arbeitsentwurf fertig, noch nicht anwaltlich geprüft"
  }, {
    t: "Werkstatt-B2B: rechtlicher Rahmen fehlt noch",
    own: "Legal",
    note: "Werkstätten registrieren sich seit Sep 2026 selbst und erhalten nach Freigabe durch den Fahrzeugeigentümer Schreibzugriff auf Teile der Fahrzeugakte — es gibt noch keine geprüften Nutzungsbedingungen oder Auftragsverarbeitungs-Regelung für diese neue B2B-Beziehung"
  }];
  const LEGAL_POINTS = [{
    sev: "high",
    t: "Notfall-Feature verarbeitet Gesundheitsdaten",
    d: "Blutgruppe, Allergien, Medikamente fallen unter Art. 9 DSGVO (besondere Kategorien) — physischer Code als Zugangsschranke ist ein plausibles, aber anwaltlich ungeprüftes Schutzkonzept. Seit Sep 2026 zusätzlich standardmäßig ausgeblendet (nutzergesteuerte Freigabe), was das Grundrisiko mindert, aber nicht ersetzt."
  }, {
    sev: "high",
    t: "Werkstatt-B2B: neue Drittpartei-Datenbeziehung ungeprüft",
    d: "Werkstätten registrieren sich seit Sep 2026 selbst und erhalten fahrzeugweise Schreibzugriff auf Teile der Fahrzeugakte, freigegeben vom Eigentümer — es fehlt noch eine geprüfte vertragliche Grundlage (Nutzungsbedingungen, ggf. Auftragsverarbeitung) für diese neue Konstellation zwischen Werkstatt, Eigentümer und Plattform."
  }, {
    sev: "medium",
    t: "Eigentumsübertragung berührt Vertragsverhältnis",
    d: "Mit der Übertragung entsteht ein neues Nutzungsverhältnis zum bisher unbeteiligten neuen Eigentümer — rechtlicher Opt-in-Text liegt vor, ist aber Arbeitsentwurf, keine geprüfte Fassung."
  }, {
    sev: "info",
    t: "Rollenverteilung DSGVO",
    d: "Club ist Verantwortlicher (Art. 4 Nr. 7), QAR.Gallery ist Auftragsverarbeiter (Art. 28) im B2B-Modell."
  }, {
    sev: "positive",
    t: "Privacy-by-Default umgesetzt",
    d: "Kennzeichen, FIN, Standort-Historie serverseitig standardmäßig verborgen — technisch umgesetzter Schutz, kein Lippenbekenntnis."
  }, {
    sev: "positive",
    t: "Keine öffentliche Suchfunktion",
    d: "Zugriff ausschließlich über physischen QR-Code oder geschlossene Mitglieder-Suche — kein Weg, Kennzeichen einzugeben und Akte zu finden."
  }, {
    sev: "medium",
    t: "Gesamtschuldnerische Haftung bleibt",
    d: "Art. 82 DSGVO: B2B-Struktur verschiebt Hauptlast zum Club, eliminiert aber nicht die Direkthaftung von QAR.Gallery bei softwareseitigen Ursachen."
  }, {
    sev: "medium",
    t: "Scan-Metadaten & Zweckbindung",
    d: "Aufklärungsnutzen bei Diebstahl ist real, rechtfertigt aber keine unbegrenzte Speicherung (Art. 5 Abs. 1 lit. b) — bewusst auf 48h begrenzt umgesetzt."
  }, {
    sev: "high",
    t: "Noch keine rechtsverbindliche Prüfung",
    d: "Interne Bewertung (QAR_Datenschutz_Risikobewertung.md) ist Arbeitsgrundlage, kein Rechtsgutachten — vor echtem Rollout: DSGVO-Anwalt beauftragen."
  }, {
    sev: "medium",
    t: "Zugangsschutz der Dashboards",
    d: "Sowohl /dashboard als auch /ceo nutzen Passwort-Hash im Quelltext — bewusster Sichtschutz für die Pilotphase, kein Ersatz für echte Zugriffskontrolle."
  }];
  const SALES_POINTS = [{
    t: "Kernthese",
    d: "Der Club ist die Tür, das Fahrzeug ist das Produkt. Zahlungsverhältnis eigentlich zwischen Plattform und Fahrzeugeigentümer, nicht nur dem Club."
  }, {
    t: "Marktteilnehmer-Fit-Analyse ausgearbeitet",
    d: "Ergänzt um Gebrauchtwagenhändler (stark, Herkunftsnachweis) und Fahrzeugfinanzierer wie Santander (stark, aber unbestätigt — recherchiert: Zulassungsbescheinigung Teil II als Sicherheit). Versicherungen (HUK) ehrlich als schwacher Fit neu bewertet, da deren Digitalfokus auf Telematik-Fahrverhalten liegt, nicht auf Fahrzeughistorie — Details im Investment-Dashboard."
  }, {
    t: "Stickyness als Burggraben",
    d: "180+ Datenpunkte pro aktivem Mitglied nach 12 Monaten (Logbuch, Fotos, Scans, Punkte) — nicht übertragbar, klebt am Nutzer. Geschätzte Wechselrate < 5% nach vollem Jahr Nutzung."
  }, {
    t: "Wachstumsschwungrad",
    d: "Club nutzt Plattform → Mitglieder pflegen Akten → QR-Scans bringen Neue → Datenbank wächst → Hersteller zahlen für Zielgruppen-Zugang → mehr Clubs."
  }, {
    t: "Aktueller Vertriebsstand",
    d: "Ein Pilot-Club (PCN), Vertrag in Vorbereitung, keine weiteren Clubs im aktiven Gespräch — Fokus liegt bewusst auf einem sauberen ersten Piloten vor Skalierung."
  }, {
    t: "Marketing über den QR-Code selbst",
    d: "Jeder QR-Code am Fahrzeug ist physischer, dauerhafter Werbeträger ohne laufende Kosten — wirkt direkt am faszinierenden Objekt."
  }];
  const JOURNAL = [{
    icon: "🏅",
    t: "Approval-Banner: neues Design für das Provenienz-Siegel",
    d: "Nach Rückmeldung, dass das bisherige kleine Icon zu unauffällig war: jetzt ein dicker, farbiger Rahmen um die gesamte Fahrzeugkarte mit eingebettetem 'APPROVAL'-Banner — Optik vorab per Skizze abgestimmt.",
    date: "Sep 2026"
  }, {
    icon: "📆",
    t: "Kalender-Integration eingeführt",
    d: "Events lassen sich jetzt als dauerhafter Abo-Feed in Google/Apple/Outlook-Kalender einbinden, einzeln exportieren oder per Link teilen. Ein echter Datumsfehler vor dem Go-Live gefunden und mit einer Prüfbibliothek gegen Produktivdaten verifiziert.",
    date: "Sep 2026"
  }, {
    icon: "🔧",
    t: "Werkstatt-B2B-Prozess vereinfacht",
    d: "Von einem Admin-Freigabeprozess auf sofortige Selbstregistrierung umgestellt, Kontrolle liegt jetzt beim Fahrzeugeigentümer je Fahrzeug. Wettbewerbsschutz ergänzt, damit Werkstätten sich gegenseitig nicht sehen können.",
    date: "Sep 2026"
  }, {
    icon: "✉️",
    t: "Zentrales Benachrichtigungs-Icon eingeführt",
    d: "Neues Symbol im App-Header bündelt Nachrichten, Neuigkeiten und offene Anfragen an einer Stelle, nach mehreren Korrekturrunden zur Position (App-Header statt Profil-Tab, rechts statt links vom Namen).",
    date: "Sep 2026"
  }];
  const T_ICON = {
    info: "ℹ️",
    positive: "✓",
    medium: "◐",
    high: "⚠️"
  };
  const T_COLOR = {
    info: T.blue,
    positive: T.green,
    medium: T.amber,
    high: T.red
  };
  function Section({
    title,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 28
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 12,
        color: T.muted,
        letterSpacing: 2,
        marginBottom: 12,
        textTransform: "uppercase"
      }
    }, title), children);
  }
  function Overview() {
    return /*#__PURE__*/React.createElement("div", {
      className: "fade"
    }, /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 26,
        fontWeight: 900,
        color: T.white,
        marginBottom: 4
      }
    }, "CEO / PRODUCT OWNER DASHBOARD"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: T.muted,
        marginBottom: 24,
        lineHeight: 1.7
      }
    }, "Zentrale Sicht auf Entwicklungsstand, offene Aufgaben, Recht, Investment und Vertrieb — für schnelle Einordnung und Entscheidungen."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
        gap: 10,
        marginBottom: 24
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "card",
      style: {
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 26,
        fontWeight: 900,
        color: T.green
      }
    }, STATUS_DONE.length), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: T.muted
      }
    }, "Kürzlich fertiggestellt")), /*#__PURE__*/React.createElement("div", {
      className: "card",
      style: {
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 26,
        fontWeight: 900,
        color: T.amber
      }
    }, STATUS_OPEN.length), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: T.muted
      }
    }, "Offene Aufgaben")), /*#__PURE__*/React.createElement("div", {
      className: "card",
      style: {
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 26,
        fontWeight: 900,
        color: T.red
      }
    }, LEGAL_POINTS.filter(l => l.sev === "high").length), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: T.muted
      }
    }, "Rechtlich kritisch")), /*#__PURE__*/React.createElement("div", {
      className: "card",
      style: {
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 26,
        fontWeight: 900,
        color: T.blue
      }
    }, "1"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: T.muted
      }
    }, "Aktiver Pilot-Club"))), /*#__PURE__*/React.createElement(Section, {
      title: "Neueste Einträge"
    }, JOURNAL.map((j, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "card",
      style: {
        marginBottom: 8,
        display: "flex",
        gap: 12,
        alignItems: "flex-start"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 18,
        flexShrink: 0
      }
    }, j.icon), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        gap: 8,
        marginBottom: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        fontSize: 13,
        color: T.white
      }
    }, j.t), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: T.muted,
        flexShrink: 0
      }
    }, j.date)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: T.muted,
        lineHeight: 1.6
      }
    }, j.d))))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: `${T.amber}0d`,
        border: `1px solid ${T.amber}44`,
        borderRadius: 10,
        padding: "12px 14px",
        fontSize: 12,
        color: "#ddb877",
        lineHeight: 1.6
      }
    }, "Ehrlicher Hinweis: Dieses Dashboard fasst den Stand aus Entwicklungssessions und vorhandenen Dokumenten zusammen — es ist keine Live-Verbindung zu Datenbank oder Vertragsstatus. Bei Unsicherheit: im Zweifel direkt nachprüfen, nicht nur hier vertrauen."));
  }
  function Tasks() {
    return /*#__PURE__*/React.createElement("div", {
      className: "fade"
    }, /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 22,
        fontWeight: 900,
        color: T.white,
        marginBottom: 4
      }
    }, "STAND DER ARBEITEN & OFFENE AUFGABEN"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: T.muted,
        marginBottom: 20,
        lineHeight: 1.7
      }
    }, "Was zuletzt fertiggestellt wurde, und was als Nächstes ansteht."), /*#__PURE__*/React.createElement(Section, {
      title: `Kürzlich fertiggestellt (${STATUS_DONE.length})`
    }, STATUS_DONE.map((s, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        background: `${T.green}0d`,
        border: `1px solid ${T.green}33`,
        borderRadius: 9,
        padding: "11px 13px",
        marginBottom: 7
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        gap: 8,
        marginBottom: 3
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        fontSize: 13,
        color: T.white
      }
    }, "✓ ", s.t), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: T.muted,
        flexShrink: 0
      }
    }, s.date)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: T.muted,
        lineHeight: 1.6
      }
    }, s.d)))), /*#__PURE__*/React.createElement(Section, {
      title: `Offen (${STATUS_OPEN.length})`
    }, STATUS_OPEN.map((s, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        background: `${T.amber}0d`,
        border: `1px solid ${T.amber}33`,
        borderRadius: 9,
        padding: "11px 13px",
        marginBottom: 7
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        alignItems: "center",
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "tag",
      style: {
        background: `${T.amber}22`,
        color: T.amber
      }
    }, s.own), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        fontSize: 13,
        color: T.white
      }
    }, s.t)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: T.muted,
        lineHeight: 1.6
      }
    }, s.note)))));
  }
  function Legal() {
    return /*#__PURE__*/React.createElement("div", {
      className: "fade"
    }, /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 22,
        fontWeight: 900,
        color: T.white,
        marginBottom: 4
      }
    }, "RECHTLICHES"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: T.muted,
        marginBottom: 6,
        lineHeight: 1.7
      }
    }, "Zusammengefasst aus der internen Datenschutz-Risikobewertung. Nicht rechtsverbindlich — Arbeitsgrundlage, kein Rechtsgutachten."), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: T.muted,
        marginBottom: 20,
        fontStyle: "italic"
      }
    }, "Quelle: QAR_Datenschutz_Risikobewertung.md"), LEGAL_POINTS.map((l, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        background: `${T_COLOR[l.sev]}0d`,
        border: `1px solid ${T_COLOR[l.sev]}33`,
        borderRadius: 9,
        padding: "12px 14px",
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        alignItems: "center",
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14
      }
    }, T_ICON[l.sev]), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        fontSize: 13,
        color: T.white
      }
    }, l.t)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: T.muted,
        lineHeight: 1.65
      }
    }, l.d))));
  }
  function Investment() {
    return /*#__PURE__*/React.createElement("div", {
      className: "fade"
    }, /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 22,
        fontWeight: 900,
        color: T.white,
        marginBottom: 4
      }
    }, "INVESTMENT-STRATEGIE"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: T.muted,
        marginBottom: 20,
        lineHeight: 1.7
      }
    }, "Kurzüberblick — für Marktsegmente, TAM/SAM/SOM und ARR-Szenarien siehe das ausführliche Investment-Dashboard."), SALES_POINTS.slice(0, 3).map((s, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "card",
      style: {
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 13,
        color: T.white,
        marginBottom: 4
      }
    }, s.t), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: T.muted,
        lineHeight: 1.65
      }
    }, s.d))), /*#__PURE__*/React.createElement("a", {
      href: "/dashboard/",
      style: {
        display: "block",
        textDecoration: "none",
        marginTop: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: `${T.red}15`,
        border: `1.5px solid ${T.red}55`,
        borderRadius: 11,
        padding: "16px 18px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 800,
        fontSize: 14,
        color: T.white,
        marginBottom: 2
      }
    }, "📊 Vollständiges Investment-Dashboard öffnen"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: T.muted
      }
    }, "Marktsegmente, TAM/SAM/SOM, ARR-Szenarien, Business Evaluation")), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 20,
        color: T.red
      }
    }, "→"))));
  }
  function Sales() {
    return /*#__PURE__*/React.createElement("div", {
      className: "fade"
    }, /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 22,
        fontWeight: 900,
        color: T.white,
        marginBottom: 4
      }
    }, "VERTRIEB & MARKETING"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: T.muted,
        marginBottom: 6,
        lineHeight: 1.7
      }
    }, "Zusammengefasst aus der Revenue-Strategie."), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: T.muted,
        marginBottom: 20,
        fontStyle: "italic"
      }
    }, "Quelle: PCN_Strategie_Revenue.html"), SALES_POINTS.map((s, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "card",
      style: {
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 13,
        color: T.white,
        marginBottom: 4
      }
    }, s.t), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: T.muted,
        lineHeight: 1.65
      }
    }, s.d))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: `${T.blue}0d`,
        border: `1px solid ${T.blue}33`,
        borderRadius: 10,
        padding: "12px 14px",
        marginTop: 12,
        fontSize: 12,
        color: "#8ab4f8",
        lineHeight: 1.6
      }
    }, "Ehrlich eingeordnet: Die Wechselraten- und Stickyness-Zahlen sind Schätzungen aus der Strategie-Dokumentation, keine gemessenen Werte — dafür fehlt bislang die Nutzungshistorie über einen vollen Jahreszyklus."));
  }
  const TABS = [{
    id: "overview",
    label: "Übersicht",
    icon: "🏠",
    Comp: Overview
  }, {
    id: "tasks",
    label: "Aufgaben",
    icon: "✅",
    Comp: Tasks
  }, {
    id: "legal",
    label: "Recht",
    icon: "⚖️",
    Comp: Legal
  }, {
    id: "investment",
    label: "Investment",
    icon: "💰",
    Comp: Investment
  }, {
    id: "sales",
    label: "Vertrieb & Marketing",
    icon: "📣",
    Comp: Sales
  }];
  function CEODashboard({
    onLogout
  }) {
    const [tab, setTab] = (0, _react.useState)("overview");
    const Active = TABS.find(t => t.id === tab)?.Comp || Overview;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        minHeight: "100vh",
        background: T.black
      }
    }, /*#__PURE__*/React.createElement("style", null, css), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#0f0f0f",
        borderBottom: `1px solid ${T.border}`,
        padding: "12px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "sticky",
        top: 0,
        zIndex: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "cond",
      style: {
        fontSize: 15,
        fontWeight: 900,
        color: T.white
      }
    }, "QAR", /*#__PURE__*/React.createElement("span", {
      style: {
        color: T.red
      }
    }, "."), "CEO"), /*#__PURE__*/React.createElement("button", {
      className: "btn",
      style: {
        background: "transparent",
        color: T.muted,
        border: `1px solid ${T.border}`
      },
      onClick: onLogout
    }, "Abmelden")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        padding: "10px 16px",
        overflowX: "auto",
        borderBottom: `1px solid ${T.border}`
      }
    }, TABS.map(t => /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => setTab(t.id),
      style: {
        flexShrink: 0,
        background: tab === t.id ? T.red : "transparent",
        color: tab === t.id ? "#fff" : T.muted,
        border: `1px solid ${tab === t.id ? T.red : T.border}`,
        borderRadius: 8,
        padding: "7px 13px",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "'Barlow',sans-serif",
        display: "flex",
        gap: 6,
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("span", null, t.icon), t.label))), /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 720,
        margin: "0 auto",
        padding: "20px 16px 60px"
      }
    }, /*#__PURE__*/React.createElement(Active, null)));
  }
  function App() {
    const [authed, setAuthed] = (0, _react.useState)(() => hasValidSession());
    const logout = () => {
      localStorage.removeItem(AUTH_KEY);
      setAuthed(false);
    };
    if (!authed) return /*#__PURE__*/React.createElement(LoginGate, {
      onOk: () => setAuthed(true)
    });
    return /*#__PURE__*/React.createElement(CEODashboard, {
      onLogout: logout
    });
  }
});
