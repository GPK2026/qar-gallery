-- ═══════════════════════════════════════════════════════════════════════
-- REPARATUR: Registrierungen, die am alten (zu groben) Trigger scheiterten
--
-- HINTERGRUND
-- Der ursprüngliche Trigger block_guest_contact_promotion blockierte
-- JEDEN Wechsel von role='guest' zu role='member' bei
-- guest_source='vehicle_contact' — auch echte Registrierungen über den
-- "Guest upgrade"-Pfad in register(). Diese Personen haben den kompletten
-- Registrierungsprozess durchlaufen (Name, Club-Code, Passwort), aber die
-- Datenbank-Änderung wurde komplett zurückgerollt (PostgreSQL rollt bei
-- einer Exception im BEFORE-Trigger die GESAMTE Transaktion zurück, nicht
-- nur das role-Feld) — sie stecken deshalb weiterhin mit role='guest'
-- fest, member_nr ist NULL, club_code ist NULL.
--
-- Der Trigger selbst wurde bereits korrigiert (fix_guest_promotion_guard.sql).
-- Dieses Skript repariert nur die bereits hängengebliebenen Altfälle.
--
-- WICHTIG: Beliebig oft ausführbar, betrifft NUR Konten mit
-- guest_source='vehicle_contact' UND role='guest' UND leerer member_nr —
-- also genau das Muster eines gescheiterten Upgrade-Versuchs. Echte,
-- unbeteiligte Kontaktanfragen (die sich nie registrieren wollten) haben
-- ebenfalls role='guest', aber werden hier NICHT verändert, weil wir
-- keine Vermutung darüber anstellen, ob sie Mitglied werden wollten.
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Zuerst ansehen, wen es betrifft — WICHTIG: das sind nur KANDIDATEN.
--    Wir können aus der DB allein nicht zweifelsfrei unterscheiden zwischen
--    "hat sich registriert, wurde geblockt" und "hat nie eine Mitgliedschaft
--    gewollt". Bitte die Liste mit den tatsächlich betroffenen Namen
--    (z.B. Otto, Ulla) manuell abgleichen, bevor der UPDATE-Block läuft.
SELECT id, name, email, role, member_nr, club_code, guest_source, created_at
FROM users
WHERE guest_source = 'vehicle_contact'
  AND role = 'guest'
  AND (member_nr IS NULL OR member_nr = '')
ORDER BY created_at DESC;


-- ═══════════════════════════════════════════════════════════════════════
-- 2. REPARATUR — NICHT automatisch ausgeführt (auskommentiert).
--    Für jede betroffene Person einzeln die E-Mail eintragen und den
--    Club-Code verwenden, den ihr tatsächlich nutzt.
--
--    Vergibt eine neue, eindeutige Mitgliedsnummer und setzt den
--    Registrierungsvorgang so, wie er beim ersten Versuch hätte
--    ankommen sollen.
-- ═══════════════════════════════════════════════════════════════════════

-- UPDATE users
-- SET role = 'member',
--     club_code = 'PCN2026',
--     member_nr = 'PCN-' || floor(1000 + random()*8999)::int,
--     converted_from_guest = true
-- WHERE email = 'otto@beispiel.de'
--   AND guest_source = 'vehicle_contact'
--   AND role = 'guest';

-- UPDATE users
-- SET role = 'member',
--     club_code = 'PCN2026',
--     member_nr = 'PCN-' || floor(1000 + random()*8999)::int,
--     converted_from_guest = true
-- WHERE email = 'ulla@beispiel.de'
--   AND guest_source = 'vehicle_contact'
--   AND role = 'guest';


-- ═══════════════════════════════════════════════════════════════════════
-- 3. KONTROLLE nach der Reparatur
-- ═══════════════════════════════════════════════════════════════════════
-- SELECT id, name, email, role, member_nr, club_code, created_at
-- FROM users
-- WHERE name ILIKE '%otto%' OR name ILIKE '%ulla%'
-- ORDER BY created_at DESC;
