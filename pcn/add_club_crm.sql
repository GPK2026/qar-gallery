-- 28.10.2026: Club-CRM (Admin-Konsole, Reiter "CRM")
-- Zugriff nur über die Edge Function club-crm (Sitzungs-Token + is_admin).

-- 1) Admin-Recht nur serverseitig änderbar (vorher mit dem öffentlichen Schlüssel setzbar)
create or replace function public.users_protect_is_admin() returns trigger
language plpgsql set search_path to '' as $$
begin
  if current_user in ('anon','authenticated') then
    if tg_op = 'INSERT' then new.is_admin := false;
    else new.is_admin := old.is_admin; end if;
  end if;
  return new;
end $$;
create or replace trigger users_protect_is_admin
  before insert or update on public.users
  for each row execute function public.users_protect_is_admin();

-- 2) CRM-Tabellen (Löschen eines Kontos löscht die CRM-Daten mit)
create table if not exists public.crm_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null, category text not null default 'sonstiges',
  contact_name text, email text, phone text, website text, address text,
  tags text[] not null default '{}',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.crm_people (
  user_id uuid primary key references public.users(id) on delete cascade,
  stage text, tags text[] not null default '{}',
  updated_at timestamptz not null default now());
create table if not exists public.crm_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  partner_id uuid references public.crm_partners(id) on delete cascade,
  text text not null, author_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((user_id is null) <> (partner_id is null)));
create table if not exists public.crm_followups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  partner_id uuid references public.crm_partners(id) on delete cascade,
  due_date date not null, text text not null, done_at timestamptz,
  author_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((user_id is null) <> (partner_id is null)));
create index if not exists crm_notes_user_idx on public.crm_notes(user_id);
create index if not exists crm_notes_partner_idx on public.crm_notes(partner_id);
create index if not exists crm_followups_due_idx on public.crm_followups(due_date) where done_at is null;
alter table public.crm_partners enable row level security;
alter table public.crm_people enable row level security;
alter table public.crm_notes enable row level security;
alter table public.crm_followups enable row level security;
revoke all on public.crm_partners, public.crm_people, public.crm_notes, public.crm_followups from anon, authenticated;
grant all on public.crm_partners, public.crm_people, public.crm_notes, public.crm_followups to service_role;
