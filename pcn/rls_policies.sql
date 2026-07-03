-- ─────────────────────────────────────────────────────────────────────────────
-- QAR.Gallery / PCN — Row Level Security Policies
-- Execute in Supabase SQL Editor: dashboard → SQL Editor → New Query
-- ─────────────────────────────────────────────────────────────────────────────

-- STEP 1: Enable RLS on all tables (if not already enabled)
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE logbook          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants     ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_status   ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_history    ENABLE ROW LEVEL SECURITY;

-- STEP 2: Drop all existing open policies
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname
           FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- USERS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

-- Users can read their own profile
CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (auth.uid()::text = id::text OR auth.uid() IS NULL);
-- Note: auth.uid() IS NULL allows anon key reads for guest registration
-- In production: remove "OR auth.uid() IS NULL" once all auth is Magic Link

-- Users can update their own profile
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Anyone can insert (registration)
CREATE POLICY "users_insert_any" ON users
  FOR INSERT WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- VEHICLES TABLE
-- ─────────────────────────────────────────────────────────────────────────────

-- Owner can read/write their own vehicles
CREATE POLICY "vehicles_owner_all" ON vehicles
  FOR ALL USING (auth.uid()::text = user_id::text);

-- Public QR scan: anyone can read a vehicle by QAR-ID (for public page)
CREATE POLICY "vehicles_public_read" ON vehicles
  FOR SELECT USING (
    -- Public view: vehicle has at least one public privacy setting
    pub_gallery = true OR pub_events = true OR pub_phone = true
    -- OR anon access for demo vehicles
    OR auth.uid() IS NULL
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- LOGBOOK TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "logbook_owner" ON logbook
  FOR ALL USING (
    vehicle_id IN (SELECT id FROM vehicles WHERE user_id::text = auth.uid()::text)
  );

-- Public: logbook visible if vehicle has pub_logbook=true
CREATE POLICY "logbook_public" ON logbook
  FOR SELECT USING (
    vehicle_id IN (SELECT id FROM vehicles WHERE pub_logbook = true)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- REMINDERS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "reminders_own" ON reminders
  FOR ALL USING (auth.uid()::text = user_id::text);

-- ─────────────────────────────────────────────────────────────────────────────
-- EVENTS TABLE — public read, authenticated write
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "events_public_read" ON events
  FOR SELECT USING (true);

CREATE POLICY "events_admin_write" ON events
  FOR ALL USING (
    auth.uid()::text IN (SELECT id::text FROM users WHERE role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTICIPANTS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

-- Anyone can read participants (for event pages)
CREATE POLICY "participants_public_read" ON participants
  FOR SELECT USING (true);

-- Members can register themselves
CREATE POLICY "participants_own_insert" ON participants
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Members can update their own registration
CREATE POLICY "participants_own_update" ON participants
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- ─────────────────────────────────────────────────────────────────────────────
-- THREADS TABLE — only participants can read/write
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "threads_participant_read" ON threads
  FOR SELECT USING (
    auth.uid()::text = ANY(participants::text[])
    OR auth.uid() IS NULL -- anon: for guest contact flow
  );

CREATE POLICY "threads_create" ON threads
  FOR INSERT WITH CHECK (true); -- Both guests and members can start a thread

-- ─────────────────────────────────────────────────────────────────────────────
-- MESSAGES TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "messages_thread_participant" ON messages
  FOR SELECT USING (
    thread_id IN (
      SELECT id FROM threads
      WHERE auth.uid()::text = ANY(participants::text[])
         OR auth.uid() IS NULL
    )
  );

CREATE POLICY "messages_send" ON messages
  FOR INSERT WITH CHECK (true); -- guests + members can send

-- ─────────────────────────────────────────────────────────────────────────────
-- VEHICLE STATUS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "status_public_read" ON vehicle_status
  FOR SELECT USING (true);

CREATE POLICY "status_owner_write" ON vehicle_status
  FOR ALL USING (
    vehicle_id IN (SELECT id FROM vehicles WHERE user_id::text = auth.uid()::text)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- EVENT HISTORY TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "event_history_public" ON event_history
  FOR SELECT USING (true);

CREATE POLICY "event_history_owner" ON event_history
  FOR INSERT WITH CHECK (
    vehicle_id IN (SELECT id FROM vehicles WHERE user_id::text = auth.uid()::text)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFY: List all policies
-- ─────────────────────────────────────────────────────────────────────────────
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ─────────────────────────────────────────────────────────────────────────────
-- MVP AUTH: Add pw_hash column to users table (no Supabase Auth needed)
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS pw_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
