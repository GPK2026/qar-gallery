-- Sofort-Härtung (Oktober 2026) — Schritt 1 und 2
-- Voraussetzung: Edge Function "pcn-secure" ist deployt und die App nutzt sie
-- (pcn_storage.js: auth.* und emergencyProfiles.* → secureApi).

-- ── Schritt 1: Passwort-Hashes in gesperrte Tabelle kopieren ───────────────
create table if not exists public.user_credentials (
  user_id uuid primary key references public.users(id) on delete cascade,
  pw_hash text not null,
  updated_at timestamptz not null default now()
);
alter table public.user_credentials enable row level security;
revoke all on public.user_credentials from anon, authenticated;
insert into public.user_credentials (user_id, pw_hash)
select id, pw_hash from public.users
where coalesce(pw_hash,'') <> '' and pw_hash not like 'disabled:%'
on conflict (user_id) do nothing;

-- ── Schritt 2: öffentliche Spalte leeren, Notfalldaten sperren ────────────
-- Platzhalter statt DROP: Eine noch geladene alte App-Version lehnt damit
-- jeden Login ab, statt ihn ungeprüft durchzulassen.
update public.users set pw_hash = 'disabled:moved-to-user_credentials';

create or replace function public.users_strip_pw_hash()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.pw_hash := 'disabled:moved-to-user_credentials';
  return new;
end $$;
revoke all on function public.users_strip_pw_hash() from public, anon, authenticated;

drop trigger if exists users_strip_pw_hash on public.users;
create trigger users_strip_pw_hash
  before insert or update of pw_hash on public.users
  for each row execute function public.users_strip_pw_hash();

drop policy if exists emergency_profiles_all on public.emergency_profiles;
drop policy if exists emergency_contacts_all on public.emergency_contacts;
revoke all on public.emergency_profiles from anon, authenticated;
revoke all on public.emergency_contacts from anon, authenticated;

update public.workshop_signup_requests set pw_hash = null where pw_hash is not null;
drop policy if exists workshop_signup_requests_all on public.workshop_signup_requests;
revoke all on public.workshop_signup_requests from anon, authenticated;

-- ── Nachtrag 9.10.: Rechte für die Edge Functions ─────────────────────────
-- Neu angelegte Tabellen bekommen in diesem Projekt KEINE automatischen
-- Rechte — auch nicht für service_role. Ohne diese Zeilen scheitern Login
-- (pcn-secure) und Unfallmeldung (accident-report) mit "permission denied".
grant select, insert, update, delete on public.user_credentials to service_role;
grant select, insert, update, delete on public.accident_reports to service_role;
grant select, insert, update, delete on public.accident_report_dispatches to service_role;
