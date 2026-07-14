-- ─────────────────────────────────────────────────────────────────────────────
-- QAR.Gallery / PCN — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  email            TEXT UNIQUE NOT NULL,
  club_code        TEXT,
  role             TEXT DEFAULT 'member',
  member_nr        TEXT,
  beitrag_bezahlt  BOOLEAN DEFAULT FALSE,
  beitrag_datum    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  last_seen        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Vehicles ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicles (
  id          TEXT PRIMARY KEY,  -- V + random (e.g. V3K9M2)
  qar_id      TEXT UNIQUE NOT NULL,  -- QAR-XXXXXXXX (public, in QR code)
  user_id     TEXT NOT NULL,     -- owner
  hersteller  TEXT,
  modell      TEXT,
  baujahr     TEXT,
  kraftstoff  TEXT,
  getriebe    TEXT,
  farbe       TEXT,
  kennzeichen TEXT,
  fin         TEXT,              -- NEVER exposed publicly
  kilometerstand TEXT,
  tuev_faelligkeit TEXT,
  marktwert   TEXT,
  zustand     TEXT,
  besonderheiten TEXT,
  image       TEXT,              -- URL
  privacy     JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Logbook ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS logbook (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id  TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  type        TEXT NOT NULL,
  km          TEXT,
  notes       TEXT,
  workshop    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Reminders ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reminders (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     TEXT NOT NULL,
  vehicle_id  TEXT,
  title       TEXT NOT NULL,
  date        DATE NOT NULL,
  done        BOOLEAN DEFAULT FALSE,
  done_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Events ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  subtitle    TEXT,
  date        DATE NOT NULL,
  end_date    DATE,
  location    TEXT,
  category    TEXT,
  description TEXT,
  max_participants INT,
  entry_fee   TEXT,
  classes     TEXT[] DEFAULT '{}',
  sponsors    JSONB DEFAULT '[]'::jsonb,
  organizer_id TEXT,
  status      TEXT DEFAULT 'upcoming',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Event Participants ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS participants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  vehicle_id  TEXT NOT NULL,
  class       TEXT,
  start_nr    TEXT,
  status      TEXT DEFAULT 'confirmed',
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id, vehicle_id)
);

-- ── Event History ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id  TEXT NOT NULL,
  event_id    TEXT,
  event_name  TEXT NOT NULL,
  date        DATE NOT NULL,
  start_nr    TEXT,
  class       TEXT,
  result      TEXT,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Threads (Messenger) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS threads (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participants TEXT[] NOT NULL,
  vehicle_id  TEXT,
  vehicle_name TEXT,
  anonymous   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Messages ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id   UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  from_id     TEXT NOT NULL,
  text        TEXT NOT NULL,
  read        BOOLEAN DEFAULT FALSE,
  is_system   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security (RLS) — users only see their own data
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE logbook     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads     ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages    ENABLE ROW LEVEL SECURITY;

-- Events are public
ALTER TABLE events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events are public"         ON events        FOR SELECT USING (true);
CREATE POLICY "Event history is public"   ON event_history FOR SELECT USING (true);

-- Users can read/write own data
CREATE POLICY "Own vehicles"    ON vehicles    FOR ALL USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Own logbook"     ON logbook     FOR ALL USING (vehicle_id IN (SELECT id FROM vehicles WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'));
CREATE POLICY "Own reminders"   ON reminders   FOR ALL USING (user_id   = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Own threads"     ON threads     FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'sub' = ANY(participants));
CREATE POLICY "Thread messages" ON messages    FOR ALL USING (thread_id IN (SELECT id FROM threads WHERE current_setting('request.jwt.claims', true)::json->>'sub' = ANY(participants)));

-- Public vehicle lookup by QAR-ID (for QR scan)
CREATE POLICY "Public QR lookup" ON vehicles FOR SELECT USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes for performance
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vehicles_user     ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_qar_id   ON vehicles(qar_id);
CREATE INDEX IF NOT EXISTS idx_logbook_vehicle   ON logbook(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user    ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_event ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_user  ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread   ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_threads_participants ON threads USING GIN(participants);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: PCN Demo Events (run after schema)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO events (id, name, subtitle, date, location, category, max_participants, entry_fee, classes)
VALUES
  ('E001','PCN TrackDay Nürburgring','Nordschleife · Touristenfahrten',
   CURRENT_DATE + 12,'Nürburgring, Nordschleife','Trackday',40,'€ 380 / Fahrzeug',
   ARRAY['Street','Sport','Race']),
  ('E002','After Work Classics','Abendausfahrt Grand-Prix-Strecke',
   CURRENT_DATE + 22,'Grand-Prix-Strecke, Nürburgring','Ausfahrt',60,'kostenlos für Mitglieder',
   ARRAY['Alle Modelle']),
  ('E003','BELMOT Oldtimer-Grand-Prix','53. Auflage — Clubbesuch',
   CURRENT_DATE + 41,'Nürburgring','Rennsport',200,'Eintritt ab € 29',
   ARRAY['Besucher','Aktive Fahrer']),
  ('E004','PCN Clubabend','CHRSN x PCN im Kesselchen',
   CURRENT_DATE + 51,'Historisches Fahrerlager','Clubabend',80,'kostenlos',
   ARRAY['Alle Mitglieder'])
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- Done! Next steps:
-- 1. Copy SUPABASE_URL + SUPABASE_ANON_KEY from Settings → API
-- 2. In pcn_storage.js: set BACKEND = "supabase"
-- 3. Set SUPABASE_URL and SUPABASE_KEY constants
-- ─────────────────────────────────────────────────────────────────────────────
