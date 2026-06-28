# QAR.Gallery

**Digitale Fahrzeugakte & Veranstaltungsplattform**

Eine Progressive Web App für Fahrzeugdokumentation, Oldtimer-Events und die Vernetzung von Fahrzeugbesitzern, Werkstätten, Versicherern und Veranstaltern.

---

## Live Demo

→ **[https://DEIN-USERNAME.github.io/qar-gallery](https://DEIN-USERNAME.github.io/qar-gallery)**

Demo-Accounts (Passwort überall: `demo`):

| Rolle | E-Mail |
|---|---|
| 👤 Privatperson | demo@qar.gallery |
| 🚛 Flottenmanager | demo-fleet@qar.gallery |
| 🔧 Werkstatt | demo-ws@qar.gallery |
| 🛡️ Versicherer | demo-ins@qar.gallery |
| 🏁 Veranstalter | demo-event@qar.gallery |

---

## Features

- **Digitale Fahrzeugakte** — Logbuch, Rechnungen, TÜV, Dokumente, km-Verlauf
- **QR-Code pro Fahrzeug** — öffentliche Profilseite mit konfigurierbarem Datenschutz
- **QAR.Events** — Oldtimer-Ausfahrten, Rallyes, Fahrsicherheitstraining verwalten
- **Selbstanmeldung per UID** — Fahrzeuge per QR-Scan oder ID-Eingabe anmelden
- **Marktwert-Analyse** — KI-gestützte Bewertung anhand der Fahrzeugakte
- **Multi-Rollen** — Privatpersonen, Werkstätten, Versicherer, Flottenmanager, Veranstalter
- **PWA** — installierbar auf iOS & Android

---

## Fahrzeug-ID System

Jedes Fahrzeug erhält eine opake, nicht erratbare QAR-ID:

```
QAR-XXXXXXXX  (8 Zeichen, Charset ohne O/I/0/1)
```

Die FIN (Fahrgestellnummer) wird **niemals** im QR-Code oder der öffentlichen URL exponiert.
Sie bleibt intern gespeichert und ist nur für Besitzer und freigegebene Partner sichtbar.

---

## Technologie

| Layer | Tech |
|---|---|
| Framework | React 18 (CDN, kein Build-Schritt) |
| JSX | Babel Standalone |
| Charts | Recharts |
| PDF | jsPDF |
| KI | Anthropic Claude API |
| Persistenz | localStorage |
| Deployment | GitHub Pages / Netlify / Vercel |

---

## Lokale Entwicklung

```bash
# Kein npm install nötig — direkt öffnen:
open index.html

# Oder mit lokalem Server (empfohlen wegen CORS):
npx serve .
# → http://localhost:3000
```

---

## Deployment auf GitHub Pages

1. Repository als `qar-gallery` anlegen
2. Diese Dateien pushen:
   - `index.html`
   - `QARGallery.jsx`
   - `manifest.json`
   - `README.md`
3. Settings → Pages → Source: `main` branch, `/ (root)`
4. Warten (~2 Min) → `https://USERNAME.github.io/qar-gallery`

---

## Projektstruktur

```
qar-gallery/
├── index.html          ← Entry point (GitHub Pages)
├── QARGallery.jsx      ← Gesamte App (~7.800 Zeilen)
├── manifest.json       ← PWA Manifest
└── README.md
```

---

## Roadmap

- [ ] Echtes Backend (Supabase)
- [ ] Push-Notifications (TÜV-Erinnerungen)
- [ ] Fahrzeugschein-Scan (Claude Vision API)
- [ ] Echter QR-Scanner (Camera API)
- [ ] Stripe-Integration (Zahlungen)
- [ ] Mehrsprachigkeit (DE/EN)

---

*Entwickelt mit Claude Sonnet 4.6 · Anthropic*
