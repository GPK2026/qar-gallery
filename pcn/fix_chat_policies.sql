-- ═══════════════════════════════════════════════════════════════════════
-- FIX: Fehlende RLS-Policies für Chat-Funktionen
--
-- Problem: threads und messages hatten nur SELECT + INSERT Policies.
--          Ohne DELETE-Policy blockiert Postgres jede Löschung STILL —
--          die App bekommt keinen Fehler, aber nichts passiert.
--          Ohne UPDATE-Policy schlägt "als gelesen markieren" fehl.
--
-- Symptome die das behebt:
--   • Chats lassen sich in der App nicht löschen
--   • Admin-Reminder kommen nicht an
--   • Nachrichten bleiben ungelesen markiert
-- ═══════════════════════════════════════════════════════════════════════

-- ── THREADS: Löschen erlauben ──────────────────────────────────────────
DROP POLICY IF EXISTS "threads_delete" ON threads;
CREATE POLICY "threads_delete" ON threads
  FOR DELETE USING (true);

-- ── THREADS: Aktualisieren erlauben (z.B. Teilnehmer ergänzen) ─────────
DROP POLICY IF EXISTS "threads_update" ON threads;
CREATE POLICY "threads_update" ON threads
  FOR UPDATE USING (true) WITH CHECK (true);

-- ── MESSAGES: Löschen erlauben ─────────────────────────────────────────
DROP POLICY IF EXISTS "messages_delete" ON messages;
CREATE POLICY "messages_delete" ON messages
  FOR DELETE USING (true);

-- ── MESSAGES: Aktualisieren erlauben (read-Status, read_at) ────────────
DROP POLICY IF EXISTS "messages_update" ON messages;
CREATE POLICY "messages_update" ON messages
  FOR UPDATE USING (true) WITH CHECK (true);

-- ── Kontrolle: alle Policies auf threads + messages anzeigen ───────────
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('threads','messages')
ORDER BY tablename, cmd;
