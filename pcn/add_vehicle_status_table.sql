-- ═══════════════════════════════════════════════════════════════════════
-- FEHLENDE TABELLE: vehicle_status (Live-Status)
--
-- Der Live-Status — "Bin in Box 14", "Suche Mitfahrer" — hat bisher keine
-- Datenbank-Tabelle. Er funktionierte nur lokal im Browser und war für
-- andere Mitglieder beim QR-Scan nie sichtbar.
--
-- Das ist genau die Funktion, an der wir Countdown und Dauer-Abfrage
-- gebaut haben. Sie war nie mit der Datenbank verbunden.
--
-- Beliebig oft ausführbar.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vehicle_status (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id  TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  icon        TEXT,
  text        TEXT NOT NULL,
  expires_at  TIMESTAMPTZ,           -- NULL = dauerhaft
  set_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Ein Status pro Fahrzeug — Upsert in der App verlässt sich darauf
CREATE UNIQUE INDEX IF NOT EXISTS vehicle_status_vehicle_uniq
  ON vehicle_status (vehicle_id);

-- Schnelles Aussortieren abgelaufener Status
CREATE INDEX IF NOT EXISTS vehicle_status_expires
  ON vehicle_status (expires_at);

ALTER TABLE vehicle_status ENABLE ROW LEVEL SECURITY;

-- Lesen: jeder — der Live-Status ist beim QR-Scan öffentlich sichtbar,
-- das ist der Sinn der Funktion ("Bin am Stand C7")
DROP POLICY IF EXISTS "status_read" ON vehicle_status;
CREATE POLICY "status_read" ON vehicle_status
  FOR SELECT USING (true);

-- Schreiben: über die App-Schicht abgesichert (wie alle anderen Tabellen)
DROP POLICY IF EXISTS "status_owner_write" ON vehicle_status;
DROP POLICY IF EXISTS "status_write" ON vehicle_status;
CREATE POLICY "status_write" ON vehicle_status
  FOR ALL USING (true) WITH CHECK (true);


-- ── Kontrolle ──────────────────────────────────────────────────────────
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'vehicle_status'
ORDER BY ordinal_position;
