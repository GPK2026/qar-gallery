-- T20 (13.10.2026): Belege der Fahrzeugakte nicht mehr mit dem öffentlichen
-- Schlüssel erreichbar. Zugriff nur noch über die Edge Function pcn-secure
-- (docList, docUpload, docMarkAnalyzed, docDelete) mit Sitzungs-Token.
revoke all on public.vehicle_documents from anon, authenticated;
grant all on public.vehicle_documents to service_role;
alter policy vehicle_documents_all on public.vehicle_documents to service_role using (true) with check (true);
