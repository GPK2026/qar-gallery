-- ═══════════════════════════════════════════════════════════════════════
-- DIAGNOSE: Warum ist der gesetzte Live-Status in der öffentlichen
-- Vorschau nicht sichtbar?
--
-- Die öffentliche Ansicht liest AUSSCHLIESSLICH aus der Datenbank
-- (vehicle_status-Tabelle), nicht aus dem Browser-Zwischenspeicher.
-- Diese Abfrage zeigt, ob der zuletzt gesetzte Status dort überhaupt
-- ankommt.
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Existiert die Tabelle überhaupt, und mit welchen Spalten?
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'vehicle_status'
ORDER BY ordinal_position;

-- 2. Was steht aktuell drin? (falls leer: das Schreiben schlägt fehl)
SELECT vs.*, v.hersteller, v.modell
FROM vehicle_status vs
LEFT JOIN vehicles v ON v.id = vs.vehicle_id
ORDER BY vs.set_at DESC
LIMIT 10;

-- 3. Sind die nötigen Zugriffsregeln (RLS Policies) vorhanden?
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'vehicle_status';
