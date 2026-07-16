-- ═══════════════════════════════════════════════════════════════════════════
-- SICHERHEITS-KORREKTUR — Stand 16. Juli 2026
--
-- ERLEDIGT IM CODE (kein SQL nötig):
--   ✅ service_role-Key aus admin.html entfernt → nutzt jetzt anon-Key
--      Damit kann niemand mehr über die Admin-Seite RLS umgehen.
--
-- OFFEN — und ehrlich benannt:
--   ⚠️ Chat-Privatsphäre existiert aktuell NUR im Frontend-Code.
--      Die Policy sagt: "auth.uid() = ANY(participants) OR auth.uid() IS NULL"
--      Da die App keine Supabase-Auth nutzt, ist auth.uid() IMMER NULL
--      → die Bedingung ist faktisch USING(true)
--      → wer den anon-Key hat, kann per API ALLE Chats lesen
--
--      Das widerspricht dem Versprechen in der App:
--      "Chat-Nachrichten zwischen Mitgliedern sind für den Admin nicht einsehbar."
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- OPTION A — Pragmatisch: Nachrichteninhalte verschleiern (JETZT)
--
-- Verhindert das Schlimmste ohne Auth-Umbau: Wer per API die messages-Tabelle
-- abfragt, sieht keine Klartexte mehr. Die App liest weiter über eine Funktion,
-- die nur Threads mit passender Teilnehmerschaft ausgibt.
--
-- Ehrlich: Das ist Verschleierung, keine Kryptografie. Es hebt die Hürde,
-- beseitigt das Problem aber nicht. Für den Pilot mit ~10 Mitgliedern
-- vertretbar, für 150 nicht.
-- ───────────────────────────────────────────────────────────────────────────

-- Sicherer Lesezugriff: gibt nur Threads zurück, in denen die übergebene
-- User-ID auch wirklich Teilnehmer ist. Die App ruft das statt direktem SELECT.
CREATE OR REPLACE FUNCTION get_my_threads(p_user_id TEXT)
RETURNS SETOF threads
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM threads
  WHERE p_user_id = ANY(participants::text[])
  ORDER BY created_at DESC;
$$;

CREATE OR REPLACE FUNCTION get_thread_messages(p_user_id TEXT, p_thread_id UUID)
RETURNS SETOF messages
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.* FROM messages m
  JOIN threads t ON t.id = m.thread_id
  WHERE m.thread_id = p_thread_id
    AND p_user_id = ANY(t.participants::text[])
  ORDER BY m.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION get_my_threads(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_thread_messages(TEXT, UUID) TO anon;


-- ───────────────────────────────────────────────────────────────────────────
-- OPTION B — Richtig: Supabase Auth (VOR ROLLOUT AUF ALLE 150)
--
-- Erst mit echter Authentifizierung wird auth.uid() gefüllt und die
-- ursprünglichen Policies greifen wie gedacht. Dann gilt:
--
--   CREATE POLICY "threads_participant_read" ON threads
--     FOR SELECT USING (auth.uid()::text = ANY(participants::text[]));
--
--   CREATE POLICY "messages_participant" ON messages
--     FOR SELECT USING (
--       thread_id IN (SELECT id FROM threads
--                     WHERE auth.uid()::text = ANY(participants::text[]))
--     );
--
-- Aufwand: ~1 Tag (Magic Link Login + Session-Umbau + Policy-Rückbau)
-- Zeitpunkt: nach dem Pilot mit 5–10 Mitgliedern, VOR dem Rollout auf 150
-- ───────────────────────────────────────────────────────────────────────────


-- ───────────────────────────────────────────────────────────────────────────
-- Mitglieder löschen: bleibt möglich, aber die Admin-Console verifiziert
-- die Löschung und meldet Fehlschläge. Ein Hard-Block (USING false) wäre
-- schlechter — die Löschfunktion würde lautlos nichts tun, genau der
-- Fehlertyp der uns heute mehrfach Stunden gekostet hat.
--
-- Empfehlung stattdessen: In Supabase ein tägliches Backup aktivieren
-- (Dashboard → Database → Backups). Dann ist ein versehentliches Löschen
-- reparierbar statt endgültig.
-- ───────────────────────────────────────────────────────────────────────────

-- Kontrolle
SELECT tablename, cmd, policyname
FROM pg_policies
WHERE tablename IN ('threads','messages','users')
ORDER BY tablename, cmd;
