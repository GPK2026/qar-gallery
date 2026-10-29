-- T27 (29.10.2026): Werkstatt-Zugänge nur noch über die Edge Function
-- workshop-access (Antrag: Werkstatt; Entscheidung/Widerruf: Eigentümer).
revoke all on public.workshop_access from anon, authenticated;
grant all on public.workshop_access to service_role;
alter policy workshop_access_all on public.workshop_access to service_role using (true) with check (true);
