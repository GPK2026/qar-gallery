# Supabase Setup — QAR.Gallery / PCN

## Schritt 1: Account anlegen (2 Min)
→ https://supabase.com
→ "Start your project"
→ Mit GitHub einloggen (du hast GitHub bereits)
→ New Project:
   - Name: qar-gallery
   - Database Password: sicher speichern!
   - Region: **eu-central-1 (Frankfurt)** ← wichtig für DSGVO
   - Plan: Free

## Schritt 2: Datenbank einrichten (1 Min)
→ Supabase Dashboard → SQL Editor → New Query
→ Inhalt von `supabase_schema.sql` einfügen → Run

## Schritt 3: API Keys kopieren (30 Sek)
→ Supabase Dashboard → Settings → API
→ Kopiere:
   - Project URL (z.B. https://xxxx.supabase.co)
   - anon / public Key (beginnt mit eyJ...)

## Schritt 4: In App eintragen (1 Min)
In `pcn/pcn_storage.js` Zeilen 10-13 ändern:

```js
const BACKEND       = "supabase";           // ← ändern
const SUPABASE_URL  = "https://xxxx.supabase.co";  // ← eintragen
const SUPABASE_KEY  = "eyJ...";             // ← eintragen
```

→ Datei speichern → zu GitHub hochladen → fertig!

## Was Supabase dann kann
- Echte PostgreSQL Datenbank in Frankfurt
- Automatisches Backup
- Real-time subscriptions (für Messenger)
- Row Level Security (Datenschutz)
- 50.000 Zeilen kostenlos
- Dashboard zum Anschauen aller Daten
