-- ═══════════════════════════════════════════════════════════════════════
-- FIX: Fehlende Spalten in der vehicles-Tabelle
--
-- Problem: Die App sendet beim Anlegen eines Fahrzeugs die Felder
--          "images" (Bildergalerie) und "phone" (Kontaktnummer).
--          Beide existieren nicht in der Tabelle → PGRST204
--          → "Fahrzeug hinzufügen" schlägt fehl.
--
-- Auch ergänzt: mapping-relevante Felder für die Fahrzeugakte.
-- ═══════════════════════════════════════════════════════════════════════

-- Bildergalerie (mehrere Fotos pro Fahrzeug)
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Kontakt-Telefonnummer (optional, per Privacy-Einstellung sichtbar)
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- ═══════════════════════════════════════════════════════════════════════
-- FIX 2: RLS-Policy für vehicles
--
-- Problem: "vehicles_owner_all" prüft auth.uid()::text = user_id.
--          Die App nutzt aber keine Supabase-Auth — auth.uid() ist NULL.
--          → Jeder INSERT/UPDATE wird blockiert, Fahrzeug anlegen scheitert.
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "vehicles_insert" ON vehicles;
CREATE POLICY "vehicles_insert" ON vehicles
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "vehicles_update" ON vehicles;
CREATE POLICY "vehicles_update" ON vehicles
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "vehicles_delete" ON vehicles;
CREATE POLICY "vehicles_delete" ON vehicles
  FOR DELETE USING (true);

-- Logbuch: gleiches Problem
DROP POLICY IF EXISTS "logbook_write" ON logbook;
CREATE POLICY "logbook_write" ON logbook
  FOR ALL USING (true) WITH CHECK (true);

-- Kontrolle: alle Spalten der vehicles-Tabelle anzeigen
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'vehicles'
ORDER BY ordinal_position;

-- Kontrolle: Policies auf vehicles
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('vehicles','logbook')
ORDER BY tablename, cmd;
