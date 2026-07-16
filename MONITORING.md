# Überwachung & Datensicherung

Zwei Dinge, die vor dem Live-Betrieb stehen müssen.

## 1. Automatischer Health-Check (alle 12 Stunden)

Prüft mit echten Schreibvorgängen, ob die Plattform funktioniert — Fahrzeug
anlegen, Logbuch, Live-Status, Chat, Löschen. Findet Probleme, bevor Mitglieder
darüber stolpern. Läuft auf GitHub-Servern, kostenlos.

### Einrichtung (5 Minuten, einmalig)

**Secrets hinterlegen** — GitHub → Repo → Settings → Secrets and variables →
Actions → *New repository secret*:

| Name | Wert |
|---|---|
| `SUPABASE_URL` | `https://xsyuhfleesstrchcwspg.supabase.co` |
| `SUPABASE_ANON_KEY` | der `sb_publishable_...` Key aus `pcn_config.js` |

Das war's. Der Workflow läuft ab dem nächsten Termin (06:00 und 18:00 UTC).

### Was passiert bei einem Fehler

GitHub legt automatisch ein **Issue** an mit dem Fehlerbild und den nächsten
Schritten. Bei jedem weiteren Fehlschlag kommt ein Kommentar dazu — kein
Issue-Spam. Sobald der Check wieder grün ist, schließt sich das Issue von selbst.

Wer im Repo als Watcher eingetragen ist, bekommt eine E-Mail. Das ist die
Benachrichtigung, ohne dass wir einen eigenen Dienst brauchen.

### Manuell auslösen

GitHub → Actions → *Health-Check* → *Run workflow*. Nützlich nach jedem größeren
Deployment.

### Wichtig: das Repo ist öffentlich

Die Workflow-Logs kann jeder lesen. Das Skript gibt deshalb **niemals Daten aus** —
keine Namen, keine E-Mails, keine Kennzeichen, keine IDs. Nur „funktioniert" oder
„kaputt" und die Anzahl der Datensätze.

Wer den Testnutzer im Log sieht (`healthcheck-...@qar.invalid`): der wird bei
jedem Lauf neu angelegt und wieder gelöscht.

---

## 2. Datensicherung

**Supabase macht das bereits automatisch** — ein eigenes Backup-Skript wäre
schlechter als das, was ihr schon habt. Es muss nur eingeschaltet sein.

### Prüfen und aktivieren

Supabase Dashboard → **Database → Backups**

| Plan | Sicherung | Aufbewahrung |
|---|---|---|
| Free | täglich | 7 Tage |
| Pro (25 $/Monat) | täglich + Point-in-Time | 7 Tage, PITR bis 4 Wochen |

Für den Pilot mit 5 Personen reicht Free. **Vor dem Rollout auf 150 Mitglieder
sollte Pro stehen** — dann ist ein versehentliches Löschen nicht nur auf den
Vortag, sondern auf die Minute genau reparierbar.

### Wiederherstellung testen

Ein Backup, das nie zurückgespielt wurde, ist kein Backup. Einmal im Quartal:
Supabase → Backups → *Restore* auf eine Testinstanz. Dauert 10 Minuten und
beantwortet die Frage, ob es im Ernstfall wirklich klappt.

### Zusätzlich: Export vor jeder größeren Änderung

Vor Schema-Änderungen oder größeren Deployments:

```sql
-- In Supabase SQL Editor, Ergebnis als CSV herunterladen
SELECT * FROM users;
SELECT * FROM vehicles;
SELECT * FROM logbook;
```

Umständlich, aber die Versicherung gegen den Fall, dass beim Ausprobieren etwas
Grundlegendes kaputtgeht.

---

## Was das nicht ersetzt

Der Health-Check prüft die **Technik**, nicht die **Nutzung**. Er merkt nicht,
wenn niemand die App öffnet oder alle Akten leer bleiben. Dafür braucht es den
Blick ins Admin-Dashboard — der Onboarding-Fortschritt sagt mehr über den Erfolg
des Pilots als jeder grüne Haken.
