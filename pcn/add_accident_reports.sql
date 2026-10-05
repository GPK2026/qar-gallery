-- Unfallmeldungen / Rechtliche Ersteinschätzung (debug Rechtsanwälte)
-- Angewendet am 2026-10-05 als Migration "accident_reports".
--
-- Enthält Gesundheitsdaten (Art. 9 DSGVO). Die App spricht Supabase nur mit
-- dem öffentlichen Schlüssel an – daher sind Tabellen und Bucket für
-- anon/authenticated komplett gesperrt (RLS ohne Policies + REVOKE).
-- Zugriff ausschließlich über die Edge Function "accident-report"
-- (pcn/accident-report-function.ts), die pro Fall ein Token prüft.
--
-- Neutraler Datensatz: Empfänger stehen in accident_report_dispatches
-- (heute: lawyer/debug-anwaelte; später auch insurer/...). Der Mailversand
-- arbeitet die Einträge mit status='queued' ab.

create table public.accident_reports (
  id uuid primary key default gen_random_uuid(),
  access_token_hash text not null,
  source text not null default 'pcn',
  member_id text,
  member_email text,
  member_name text,
  vehicle_id text,
  vehicle_data jsonb not null default '{}'::jsonb,
  accident_date date,
  accident_location text,
  own_role text check (own_role in ('geschaedigter','verursacher','unklar')),
  description text not null check (length(description) between 1 and 10000),
  police_involved boolean not null default false,
  police_reference text,
  injuries boolean not null default false,
  injuries_description text,
  other_party jsonb not null default '{}'::jsonb,
  callback_phone text,
  callback_preferred_time text,
  notes text,
  photo_paths text[] not null default '{}',
  consent_text text not null,
  consent_given_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.accident_report_dispatches (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.accident_reports(id) on delete cascade,
  recipient_type text not null check (recipient_type in ('lawyer','insurer')),
  recipient_slug text not null,
  status text not null default 'queued' check (status in ('queued','sent','failed','cancelled')),
  consent_given_at timestamptz not null,
  attempts int not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (report_id, recipient_type, recipient_slug)
);
create index accident_report_dispatches_queued_idx
  on public.accident_report_dispatches (created_at) where status = 'queued';

alter table public.accident_reports enable row level security;
alter table public.accident_report_dispatches enable row level security;
revoke all on public.accident_reports from anon, authenticated;
revoke all on public.accident_report_dispatches from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('accident-reports', 'accident-reports', false, 3145728, array['image/jpeg'])
on conflict (id) do nothing;
