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
