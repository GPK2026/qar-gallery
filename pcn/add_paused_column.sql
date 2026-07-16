-- ═══════════════════════════════════════════════════════════════════════
-- Account pausieren statt löschen
--
-- Sinnvoller als Löschen: Die Daten bleiben erhalten, nur die öffentliche
-- Sichtbarkeit endet. Fahrzeuge verschwinden aus der Community, QR-Scans
-- zeigen nichts an — der Zugang bleibt bestehen.
--
-- Typische Fälle: Mitglied pausiert die Mitgliedschaft, Fahrzeug verkauft,
-- längere Abwesenheit. Echtes Löschen (DSGVO Art. 17) bleibt die Ausnahme.
--
-- Beliebig oft ausführbar.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS paused BOOLEAN DEFAULT FALSE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;

-- Kontrolle
SELECT name, email, role, paused, paused_at
FROM users
ORDER BY created_at DESC;
