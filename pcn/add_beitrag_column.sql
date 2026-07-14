-- ═══════════════════════════════════════════════════════════════
-- MIGRATION: Beitragsstatus-Spalte zur users-Tabelle hinzufügen
-- Behebt PGRST204-Fehler beim Beitrag-Toggle im Admin-Dashboard
-- ═══════════════════════════════════════════════════════════════

-- Spalte hinzufügen (idempotent — schlägt nicht fehl wenn bereits vorhanden)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS beitrag_bezahlt BOOLEAN DEFAULT FALSE;

-- Optional: Zeitpunkt der letzten Beitragszahlung (für Historie/Quittung)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS beitrag_datum TIMESTAMPTZ;

-- Bestehende Mitglieder auf "offen" setzen (Default greift nur bei neuen Zeilen)
UPDATE users SET beitrag_bezahlt = FALSE WHERE beitrag_bezahlt IS NULL;

-- Kontrolle
SELECT id, name, role, beitrag_bezahlt FROM users ORDER BY created_at DESC;
