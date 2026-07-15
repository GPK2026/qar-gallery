-- ═══════════════════════════════════════════════════════════════════════
-- Founder-Dashboard: Speichertabelle
--
-- Hält KPIs, Journal-Einträge und Fortschritt geräteübergreifend.
-- Ohne diese Tabelle fällt das Dashboard auf localStorage zurück —
-- funktioniert dann, aber nur auf dem jeweiligen Gerät.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS dashboard_state (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE dashboard_state ENABLE ROW LEVEL SECURITY;

-- Hinweis zur Sicherheit:
-- Diese Policies erlauben Zugriff für jeden mit dem anon key.
-- Der Schutz liegt allein im Passwort-Gate der Seite — das ist
-- Sichtschutz, keine echte Absicherung. Wer den anon key kennt,
-- kommt per API direkt an die Daten.
--
-- Für echten Schutz vor sensiblen Inhalten (Investoren-Assessments,
-- Bewertungen): Cloudflare Access vorschalten oder Supabase Auth
-- mit echtem Login nutzen.

DROP POLICY IF EXISTS "dashboard_read" ON dashboard_state;
CREATE POLICY "dashboard_read" ON dashboard_state
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "dashboard_write" ON dashboard_state;
CREATE POLICY "dashboard_write" ON dashboard_state
  FOR ALL USING (true) WITH CHECK (true);

-- Kontrolle
SELECT key, updated_at, pg_column_size(value) AS bytes
FROM dashboard_state;
