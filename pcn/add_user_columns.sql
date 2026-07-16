-- ═══════════════════════════════════════════════════════════════════════
-- FEHLENDE SPALTEN in der users-Tabelle
--
-- Die App schreibt und liest Felder, die es nie gab:
--
--   pw_hash   → Passwort wird NICHT gespeichert. Die Registrierung hat einen
--               Fallback, der das Feld wegwirft. Ergebnis: jeder kann sich mit
--               jedem beliebigen Passwort anmelden.
--   avatar    → Profilbild geht beim Speichern verloren
--   city      → Wohnort geht verloren
--   bio       → Kurzbeschreibung geht verloren
--   phone     → Telefonnummer geht verloren
--
-- Beliebig oft ausführbar.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE users ADD COLUMN IF NOT EXISTS pw_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city    TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio     TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone   TEXT;


-- ═══════════════════════════════════════════════════════════════════════
-- WICHTIG — bestehende Accounts
--
-- Wer sich vor dieser Migration registriert hat, hat KEIN gespeichertes
-- Passwort. Diese Accounts können sich weiterhin mit jedem beliebigen
-- Passwort anmelden, bis sie eines setzen.
--
-- Für den Pilot mit 5 Personen: unkritisch, aber bewusst hinnehmen.
-- Vor dem Rollout: Supabase Auth einführen (siehe Roadmap).
-- ═══════════════════════════════════════════════════════════════════════

-- Kontrolle: wer hat ein Passwort?
SELECT name, email,
       CASE WHEN pw_hash IS NULL OR pw_hash = '' THEN 'KEIN Passwort'
            ELSE 'gesetzt' END AS passwort
FROM users
ORDER BY created_at DESC;
