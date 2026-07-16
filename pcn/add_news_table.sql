-- ═══════════════════════════════════════════════════════════════════════
-- FEHLENDE TABELLE: news (Newsletter & Club-Beiträge)
--
-- Der Admin schreibt Newsletter und Artikel in diese Tabelle, die App liest
-- sie für den Club-Feed. Die Tabelle wurde nie angelegt — beide Seiten haben
-- ihre Fehler mit .catch(()=>{}) verschluckt.
--
-- Folge: Newsletter wurden nie gespeichert und sind in der App nie erschienen.
-- Der Vorstand sah "✓ veröffentlicht", die Mitglieder sahen nichts.
--
-- Beliebig oft ausführbar.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS news (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  body        TEXT,
  type        TEXT DEFAULT 'news',      -- news | newsletter | tip | event
  icon        TEXT,
  pinned      BOOLEAN DEFAULT FALSE,
  author      TEXT DEFAULT 'PCN Vorstand',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Feed-Reihenfolge: Angepinntes zuerst, dann nach Datum
CREATE INDEX IF NOT EXISTS news_feed_order
  ON news (pinned DESC, created_at DESC);

ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- Lesen: alle Mitglieder
DROP POLICY IF EXISTS "news_read" ON news;
CREATE POLICY "news_read" ON news
  FOR SELECT USING (true);

-- Schreiben: über die App-Schicht abgesichert (nur Admin-Console schreibt)
DROP POLICY IF EXISTS "news_write" ON news;
CREATE POLICY "news_write" ON news
  FOR ALL USING (true) WITH CHECK (true);


-- ── Kontrolle ──────────────────────────────────────────────────────────
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'news'
ORDER BY ordinal_position;
