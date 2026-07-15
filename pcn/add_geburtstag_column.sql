-- ═══════════════════════════════════════════════════════════════
-- MIGRATION: Geburtstag für Dringlichkeiten-Erkennung
-- Ermöglicht Geburtstags-Hinweise im Admin-Dashboard
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS geburtstag DATE;

-- Optional: read_at für Nachrichten (Dringlichkeit "ungelesene Nachrichten")
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Kontrolle
SELECT id, name, geburtstag FROM users ORDER BY created_at DESC LIMIT 10;
