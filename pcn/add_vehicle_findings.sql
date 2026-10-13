-- ═══════════════════════════════════════════════════════════════════════════
-- Mängel & Feststellungen am eigenen Fahrzeug (Kratzer, Bordstein, Reifen …)
-- Zugriff ausschließlich über die Edge Function pcn-secure (findingsList /
-- findingSave / findingDelete, nur Eigentümer). Für anon gesperrt.
-- Angewendet am 13.10.2026.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.vehicle_findings (
  id uuid primary key default gen_random_uuid(),
  vehicle_id text not null,
  created_by_user_id text not null,
  category text not null default 'sonstiges',
  title text not null,
  position text,
  description text,
  found_at date,
  km integer,
  status text not null default 'offen' check (status in ('offen','beobachten','behoben')),
  fixed_at date,
  fix_note text,
  cost numeric(10,2),
  photos jsonb not null default '[]'::jsonb,   -- max. 4 JPEG-Data-URLs (~100–200 KB)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vehicle_findings_vehicle_idx on public.vehicle_findings (vehicle_id);
alter table public.vehicle_findings enable row level security;
revoke all on public.vehicle_findings from anon, authenticated;
grant select, insert, update, delete on public.vehicle_findings to service_role;

-- Geführte Einführung: Punkte je bestätigtem Schritt (event_type 'onboarding')
alter table public.point_events drop constraint point_events_event_type_check;
alter table public.point_events add constraint point_events_event_type_check
  check (event_type = any (array['qr_scan','view_akte','news_read','birthday','birthday_round','onboarding']));

-- Reparatur-Briefing: Videos zu Mängeln + Link für die Werkstatt
alter table public.vehicle_findings add column if not exists videos jsonb not null default '[]'::jsonb;
create table if not exists public.repair_briefings (
  id uuid primary key default gen_random_uuid(),
  vehicle_id text not null,
  owner_user_id text not null,
  access_token_hash text not null,  -- SHA-256 des Link-Tokens; das Token selbst kennt nur der Eigentümer
  snapshot jsonb not null,          -- Fahrzeug, Kontakt, Nachricht, Mängel (Stand beim Senden)
  recipient_label text,
  expires_at timestamptz not null,
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  view_count integer not null default 0,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists repair_briefings_vehicle_idx on public.repair_briefings (vehicle_id);
alter table public.repair_briefings enable row level security;
revoke all on public.repair_briefings from anon, authenticated;
grant select, insert, update, delete on public.repair_briefings to service_role;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('finding-media', 'finding-media', false, 52428800, array['video/mp4','video/quicktime','video/webm'])
on conflict (id) do nothing;

-- Werkstatt-Dokumentation zum Briefing (Edge Function repair-briefing)
-- Bewusst KEINE Abnahme (§ 640 BGB) und keine Auftragsvergabe: completed_at =
-- Werkstatt hat dokumentiert, logbook_transferred_at = Eigentümer hat ins
-- Logbuch übernommen. Zusätzlich Festgestelltes (work.extras) ist ein Hinweis.
alter table public.repair_briefings
  add column if not exists work jsonb not null default '{}'::jsonb,
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by text,
  add column if not exists logbook_transferred_at timestamptz;
