-- ═══════════════════════════════════════════════════════════════════════
-- FEHLENDE SPALTE: guest_source
--
-- Wurde am 19.07.2026 im Code eingeführt, um Kontaktanfragen (Personen, die
-- nur eine Fahrzeug-Nachricht schicken) von "echten" wartenden App-Gästen
-- zu unterscheiden — beide teilten sich bislang denselben role="guest"-Wert.
--
-- Ohne diese Spalte schlägt jede neue Kontaktaufnahme fehl:
--   PGRST204 "Could not find the 'guest_source' column"
--
-- Beliebig oft ausführbar.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE users ADD COLUMN IF NOT EXISTS guest_source TEXT;

-- Kontrolle: wer hat welche guest_source?
SELECT name, email, role, guest_source, contact_consent_at
FROM users
WHERE role = 'guest'
ORDER BY created_at DESC;
