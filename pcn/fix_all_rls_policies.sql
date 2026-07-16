-- ═══════════════════════════════════════════════════════════════════════════
-- VOLLSTÄNDIGE RLS-KORREKTUR
--
-- Beliebig oft ausführbar — jede Policy wird erst gelöscht, dann neu angelegt.
--
-- PROBLEM
-- Die ursprünglichen Policies wurden für Supabase-Auth geschrieben und prüfen
-- auth.uid() = user_id. Die App verwendet aber eine eigene Session-Verwaltung
-- (localStorage + anon key) — auth.uid() ist deshalb IMMER NULL.
-- Ergebnis: 9 von 21 Policies blockieren alles, meist lautlos.
--
-- BETROFFENE FUNKTIONEN (waren alle defekt):
--   • Live-Status setzen        (vehicle_status)
--   • Logbuch-Einträge          (logbook)
--   • Event-Anmeldung           (participants INSERT)
--   • Event-Bestätigung Admin   (participants UPDATE)
--   • Profil speichern          (users UPDATE)
--   • Event anlegen/ändern      (events)
--   • Fahrzeug anlegen/ändern   (vehicles)
--
-- SICHERHEITSHINWEIS
-- Dieses Setup vertraut der Anwendungsschicht, nicht der Datenbank.
-- Für den Pilotbetrieb vertretbar (geschlossene Club-Community, Zugang nur
-- über Club-Code), sollte aber vor einem breiten Rollout durch echte
-- Supabase-Auth ersetzt werden. Siehe "ROADMAP" am Ende.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── USERS ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_update" ON users;
CREATE POLICY "users_update" ON users
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "users_delete" ON users;
CREATE POLICY "users_delete" ON users
  FOR DELETE USING (true);

-- ── VEHICLES ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "vehicles_owner_all" ON vehicles;

DROP POLICY IF EXISTS "vehicles_insert" ON vehicles;
CREATE POLICY "vehicles_insert" ON vehicles
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "vehicles_update" ON vehicles;
CREATE POLICY "vehicles_update" ON vehicles
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "vehicles_delete" ON vehicles;
CREATE POLICY "vehicles_delete" ON vehicles
  FOR DELETE USING (true);

-- ── LOGBOOK ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "logbook_owner" ON logbook;
DROP POLICY IF EXISTS "logbook_write" ON logbook;
CREATE POLICY "logbook_write" ON logbook
  FOR ALL USING (true) WITH CHECK (true);

-- ── REMINDERS ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "reminders_own" ON reminders;
DROP POLICY IF EXISTS "reminders_write" ON reminders;
CREATE POLICY "reminders_write" ON reminders
  FOR ALL USING (true) WITH CHECK (true);

-- ── EVENTS ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "events_admin_write" ON events;
DROP POLICY IF EXISTS "events_write" ON events;
CREATE POLICY "events_write" ON events
  FOR ALL USING (true) WITH CHECK (true);

-- ── PARTICIPANTS (Event-Anmeldungen) ───────────────────────────────────────
DROP POLICY IF EXISTS "participants_own_insert" ON participants;
DROP POLICY IF EXISTS "participants_insert" ON participants;
CREATE POLICY "participants_insert" ON participants
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "participants_own_update" ON participants;
DROP POLICY IF EXISTS "participants_update" ON participants;
CREATE POLICY "participants_update" ON participants
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "participants_delete" ON participants;
CREATE POLICY "participants_delete" ON participants
  FOR DELETE USING (true);

-- ── VEHICLE_STATUS (Live-Status) ───────────────────────────────────────────
DROP POLICY IF EXISTS "status_owner_write" ON vehicle_status;
DROP POLICY IF EXISTS "status_write" ON vehicle_status;
CREATE POLICY "status_write" ON vehicle_status
  FOR ALL USING (true) WITH CHECK (true);

-- ── EVENT_HISTORY ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "event_history_owner" ON event_history;
DROP POLICY IF EXISTS "event_history_write" ON event_history;
CREATE POLICY "event_history_write" ON event_history
  FOR ALL USING (true) WITH CHECK (true);

-- ── THREADS & MESSAGES ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "threads_delete" ON threads;
CREATE POLICY "threads_delete" ON threads
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "threads_update" ON threads;
CREATE POLICY "threads_update" ON threads
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "messages_delete" ON messages;
CREATE POLICY "messages_delete" ON messages
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "messages_update" ON messages;
CREATE POLICY "messages_update" ON messages
  FOR UPDATE USING (true) WITH CHECK (true);


-- ═══════════════════════════════════════════════════════════════════════════
-- KONTROLLE — sollte für jede Tabelle die nötigen Operationen zeigen
-- ═══════════════════════════════════════════════════════════════════════════
SELECT tablename, cmd, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;


-- ═══════════════════════════════════════════════════════════════════════════
-- ROADMAP: echte Absicherung vor dem Rollout
--
-- Sobald mehr als ein Club auf der Plattform ist, sollte auf Supabase-Auth
-- umgestellt werden. Dann greifen Policies wie:
--
--   CREATE POLICY "vehicles_owner" ON vehicles
--     FOR ALL USING (auth.uid()::text = user_id);
--
-- Bis dahin schützt: Club-Code beim Login, anon key ohne erhöhte Rechte,
-- und die geschlossene Nutzergruppe.
-- ═══════════════════════════════════════════════════════════════════════════
