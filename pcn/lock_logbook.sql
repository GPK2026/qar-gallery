-- T24 (13.10.2026): Service-Logbuch nicht mehr mit dem öffentlichen Schlüssel
-- erreichbar. Zugriff nur noch über pcn-secure (logList, logAdd) und die
-- Funktion repair-briefing (Übernahme der Werkstatt-Dokumentation).
revoke all on public.logbook from anon, authenticated;
grant all on public.logbook to service_role;
alter policy logbook_write on public.logbook to service_role using (true) with check (true);
