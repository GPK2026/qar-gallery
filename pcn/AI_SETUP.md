# KI-Fotoanalyse aktivieren

Die App kann Modell, Farbe und Kennzeichen aus einem Fahrzeugfoto erkennen.
Das Feature ist **standardmäßig deaktiviert**, weil es einen serverseitigen
Proxy braucht.

## Warum ein Proxy?

Der Anthropic-API-Key darf nicht in die App. Alles was im Browser läuft, ist
im Quelltext lesbar — jeder könnte den Key auslesen und auf Kosten des Clubs
Anfragen schicken. Der Proxy hält den Key auf dem Server.

## Einrichtung — 3 Schritte

### 1. API-Key besorgen und hinterlegen

- Key erstellen unter [console.anthropic.com](https://console.anthropic.com) → API Keys
- Im Supabase Dashboard: **Edge Functions → Secrets → New secret**
  - Name: `ANTHROPIC_API_KEY`
  - Wert: `sk-ant-...`

### 2. Edge Function deployen

Im Projektordner (einmalig Supabase CLI nötig):

```bash
npx supabase login
npx supabase link --project-ref xsyuhfleesstrchcwspg

mkdir -p supabase/functions/analyze-vehicle
cp analyze-vehicle-function.ts supabase/functions/analyze-vehicle/index.ts

npx supabase functions deploy analyze-vehicle --no-verify-jwt
```

Das `--no-verify-jwt` ist nötig, weil die App keine Supabase-Auth nutzt.

### 3. In der App aktivieren

In `pcn/pcn_config.js` die Zeile ausfüllen:

```js
aiProxyUrl: "https://xsyuhfleesstrchcwspg.supabase.co/functions/v1/analyze-vehicle",
```

Fertig. Die App erkennt automatisch, dass das Feature verfügbar ist, und
bietet die Analyse beim Fotoupload an.

## Kosten

Etwa **1–2 Cent pro analysiertem Foto**. Bei 150 Mitgliedern mit je einem
Fahrzeug: einmalig ca. 2–3 €. Laufend vernachlässigbar, solange nicht jedes
hochgeladene Bild analysiert wird.

Die Function begrenzt auf **10 Anfragen pro IP und Stunde** — schützt vor
Missbrauch und unerwarteten Rechnungen.

## Testen

Admin-Console → **System → 🔬 System-Selbsttest** zeigt, ob der Proxy erreichbar ist.

Nach ein paar echten Analysen: **System → ✨ KI-Fotoerkennung → Trefferquote
anzeigen**. Erst bei **≥80% über ≥20 Versuche** als Premium-Feature freigeben.

## Solange es nicht eingerichtet ist

Die App verhält sich sauber: Der Analyse-Button erscheint gar nicht erst,
Mitglieder füllen die Felder wie gewohnt manuell aus. Kein kaputter Zustand,
keine Fehlermeldung.
