-- ═══════════════════════════════════════════════════════════════════════════
-- SIMULATIONSTEST — 5 realistische Mitglieder
--
-- ⚠️  ACHTUNG: Der erste Block LÖSCHT ALLE bestehenden Mitglieder.
--     Durch den CASCADE-Trigger verschwinden damit auch:
--     Fahrzeuge, Logbücher, Chats, Anmeldungen, Punkte.
--     Das ist endgültig — es gibt kein Zurück.
--
--     Falls du unsicher bist: erst nur Teil 2 ausführen (ab "NEUE MITGLIEDER"),
--     dann kommen die 5 zusätzlich zu den bestehenden dazu.
--
-- Zugangsdaten für alle fünf: Passwort  PCN2026
-- Login unter qar.gallery/pcn mit der jeweiligen E-Mail.
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- TEIL 1: Aufräumen
-- ───────────────────────────────────────────────────────────────────────────

-- Vorher anschauen, was gelöscht wird:
SELECT name, email, member_nr, created_at FROM users ORDER BY created_at;

-- Der Trigger räumt Fahrzeuge, Chats und Anmeldungen automatisch mit weg.
DELETE FROM users;

-- Reste, die an keinem Nutzer hängen (Club-Kanal, verwaiste Events)
DELETE FROM messages;
DELETE FROM threads;
DELETE FROM participants;


-- ───────────────────────────────────────────────────────────────────────────
-- TEIL 2: NEUE MITGLIEDER
--
-- Fünf Profile aus der Region um den Nürburgring. Bewusst unterschiedlich:
-- vom Neuzugang ohne Fahrzeug bis zum Gründungsmitglied mit drei Autos.
-- Damit sehen wir im Onboarding-Fortschritt echte Spannweite.
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO users (id, name, email, club_code, role, member_nr, pw_hash,
                   city, phone, geburtstag, beitrag_bezahlt, beitrag_datum,
                   bio, consent_at, consent_version, created_at, last_seen)
VALUES
  -- Gründungsmitglied, sehr aktiv, drei Fahrzeuge
  ('11111111-1111-4111-8111-111111111111',
   'Michael Brandt', 'michael.brandt@pcn-test.de', 'PCN2026', 'member', 'PCN-0012',
   'UENOMjAyNg==', 'Adenau', '+49 2691 445566', '1968-04-17',
   true, '2026-01-14 10:22:00+01',
   'Seit 1998 am Ring. Sammelt luftgekühlte Elfer und fährt jeden Sommer die Nordschleife.',
   '2026-01-10 09:15:00+01', 'pilot-2026-07',
   '2019-03-12 14:30:00+01', NOW()),

  -- Vorstandsmitglied, Oldtimer-Fraktion
  ('22222222-2222-4222-8222-222222222222',
   'Sabine Hofmann', 'sabine.hofmann@pcn-test.de', 'PCN2026', 'member', 'PCN-0034',
   'UENOMjAyNg==', 'Koblenz', '+49 261 998877', '1975-11-03',
   true, '2026-02-02 16:45:00+01',
   'Restauriert seit 15 Jahren Vorkriegs- und 356er-Modelle. Schriftführerin im Club.',
   '2026-01-11 11:40:00+01', 'pilot-2026-07',
   '2020-07-08 09:15:00+02', NOW()),

  -- Motorsportler, Trackday-Fahrer
  ('33333333-3333-4333-8333-333333333333',
   'Thomas Reuter', 'thomas.reuter@pcn-test.de', 'PCN2026', 'member', 'PCN-0087',
   'UENOMjAyNg==', 'Daun', '+49 6592 334455', '1988-06-29',
   false, NULL,
   'GT4 RS auf der Nordschleife. Bestzeit 7:24. Immer auf der Suche nach der perfekten Runde.',
   '2026-03-20 18:05:00+01', 'pilot-2026-07',
   '2023-05-19 18:45:00+02', NOW()),

  -- Klassiker-Liebhaber, weniger aktiv
  ('44444444-4444-4444-8444-444444444444',
   'Andreas Wenzel', 'andreas.wenzel@pcn-test.de', 'PCN2026', 'member', 'PCN-0103',
   'UENOMjAyNg==', 'Cochem', '+49 2671 776655', '1961-09-12',
   true, '2026-01-28 08:30:00+01',
   'Carrera RS 2.7 seit 1994 in Familienbesitz. Fährt nur bei Sonnenschein.',
   '2026-01-25 14:20:00+01', 'pilot-2026-07',
   '2021-11-03 11:20:00+01', NOW()),

  -- Neuzugang, noch kein Fahrzeug angelegt
  ('55555555-5555-4555-8555-555555555555',
   'Claudia Vogt', 'claudia.vogt@pcn-test.de', 'PCN2026', 'member', 'PCN-0156',
   'UENOMjAyNg==', 'Mayen', NULL, NULL,
   false, NULL,
   NULL,
   '2026-07-14 20:10:00+02', 'pilot-2026-07',
   '2026-07-14 20:10:00+02', NOW());


-- ───────────────────────────────────────────────────────────────────────────
-- FAHRZEUGE
--
-- Bewusst unterschiedlich gepflegt: von vollständig bis lückenhaft.
-- Privacy folgt dem Standard — nur Basisdaten öffentlich, Kennzeichen und
-- FIN verborgen, bis der Eigentümer sie freigibt.
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO vehicles (id, qar_id, user_id, hersteller, modell, baujahr, kraftstoff,
                      getriebe, farbe, kennzeichen, fin, kilometerstand,
                      tuev_faelligkeit, marktwert, zustand, besonderheiten,
                      image, images, phone, privacy, created_at, updated_at)
VALUES
  -- Michael Brandt: drei Fahrzeuge, alle gepflegt
  ('VMB001', 'QAR-K7M2P9XR', '11111111-1111-4111-8111-111111111111',
   'Porsche', '911 Carrera 3.2', '1987', 'Benzin', '5-Gang manuell', 'Grand Prix Weiß',
   'AW-MB 911', 'WP0ZZZ91ZHS100234', '187400', '09/2027', '95000', '2',
   'G-Modell, letzte Baujahre. Matching Numbers, Ori-Lack, Scheckheft lückenlos seit Erstauslieferung.',
   'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80',
   '["https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80"]'::jsonb,
   NULL,
   '{"hersteller":true,"modell":true,"baujahr":true,"farbe":true,"kraftstoff":true,"getriebe":true,"besonderheiten":true,"pub_gallery":true,"pub_events":true,"kennzeichen":false,"fin":false,"marktwert":false,"kilometerstand":false,"zustand":false,"tuev_faelligkeit":false,"pub_logbook":false,"pub_phone":false}'::jsonb,
   '2019-03-12 15:00:00+01', NOW()),

  ('VMB002', 'QAR-T4H8N2WQ', '11111111-1111-4111-8111-111111111111',
   'Porsche', '993 Carrera S', '1996', 'Benzin', '6-Gang manuell', 'Arenarot',
   'AW-MB 993', 'WP0ZZZ99ZTS320145', '142800', '05/2027', '145000', '2',
   'Letzter luftgekühlter Elfer. Breitbau, Werksschiebedach, aus zweiter Hand.',
   'https://images.unsplash.com/photo-1611821064430-0d40291d0f0b?w=800&q=80',
   '["https://images.unsplash.com/photo-1611821064430-0d40291d0f0b?w=800&q=80"]'::jsonb,
   NULL,
   '{"hersteller":true,"modell":true,"baujahr":true,"farbe":true,"kraftstoff":true,"getriebe":true,"besonderheiten":true,"pub_gallery":true,"pub_events":true,"kennzeichen":false,"fin":false,"marktwert":false,"kilometerstand":false,"zustand":false,"tuev_faelligkeit":false,"pub_logbook":false,"pub_phone":false}'::jsonb,
   '2020-06-04 10:15:00+02', NOW()),

  ('VMB003', 'QAR-B9L5J3ZK', '11111111-1111-4111-8111-111111111111',
   'Porsche', 'Cayenne S', '2019', 'Benzin', 'Tiptronic', 'Vulkangrau',
   'AW-MB 200', 'WP1ZZZ9YZKD450998', '78200', '11/2026', '52000', '2',
   'Der Alltagswagen und Zugfahrzeug für den Anhänger.',
   NULL, '[]'::jsonb, NULL,
   '{"hersteller":true,"modell":true,"baujahr":true,"farbe":true,"kraftstoff":true,"getriebe":true,"kennzeichen":false,"fin":false,"marktwert":false,"kilometerstand":false,"zustand":false,"tuev_faelligkeit":false,"besonderheiten":false,"pub_logbook":false,"pub_events":false,"pub_phone":false,"pub_gallery":false}'::jsonb,
   '2022-04-18 16:40:00+02', NOW()),

  -- Sabine Hofmann: 356er, vollständig, mit Telefon freigegeben
  ('VSH001', 'QAR-R6D1F8YM', '22222222-2222-4222-8222-222222222222',
   'Porsche', '356 B Super 90', '1961', 'Benzin', '4-Gang manuell', 'Silbermetallic',
   'MYK-SH 356', '84001456', '96300', '03/2028', '285000', '1',
   'Vollrestauration 2018–2021 in Eigenregie. Nummerngleich, Zertifikat vom Porsche Museum.',
   'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80',
   '["https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80"]'::jsonb,
   '+49 261 998877',
   '{"hersteller":true,"modell":true,"baujahr":true,"farbe":true,"kraftstoff":true,"getriebe":true,"besonderheiten":true,"pub_gallery":true,"pub_events":true,"pub_phone":true,"kennzeichen":false,"fin":false,"marktwert":false,"kilometerstand":false,"zustand":false,"tuev_faelligkeit":false,"pub_logbook":false}'::jsonb,
   '2020-07-08 09:30:00+02', NOW()),

  -- Thomas Reuter: GT4 RS, Trackday-Setup
  ('VTR001', 'QAR-G2W7V4CN', '33333333-3333-4333-8333-333333333333',
   'Porsche', '718 Cayman GT4 RS', '2023', 'Benzin', 'PDK', 'Arktisgrau',
   'DAU-TR 4', 'WP0ZZZ98ZPS230771', '11400', '04/2027', '182000', '1',
   'Weissach-Paket, Clubsport-Käfig, Trackday-Setup für die Nordschleife.',
   'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&q=80',
   '["https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&q=80"]'::jsonb,
   NULL,
   '{"hersteller":true,"modell":true,"baujahr":true,"farbe":true,"kraftstoff":true,"getriebe":true,"besonderheiten":true,"pub_gallery":true,"pub_events":true,"kennzeichen":false,"fin":false,"marktwert":false,"kilometerstand":false,"zustand":false,"tuev_faelligkeit":false,"pub_logbook":false,"pub_phone":false}'::jsonb,
   '2023-05-19 19:00:00+02', NOW()),

  -- Andreas Wenzel: Carrera RS — Akte bewusst unvollständig (kein Foto, keine Geschichte)
  ('VAW001', 'QAR-P8S3Q6HT', '44444444-4444-4444-8444-444444444444',
   'Porsche', '911 Carrera RS 2.7', '1973', 'Benzin', '5-Gang manuell', 'Grand Prix Weiß',
   'COC-AW 273', NULL, '89100', '08/2026', NULL, '2',
   NULL,
   NULL, '[]'::jsonb, NULL,
   '{"hersteller":true,"modell":true,"baujahr":true,"farbe":true,"kraftstoff":true,"getriebe":true,"kennzeichen":false,"fin":false,"marktwert":false,"kilometerstand":false,"zustand":false,"tuev_faelligkeit":false,"besonderheiten":false,"pub_logbook":false,"pub_events":false,"pub_phone":false,"pub_gallery":false}'::jsonb,
   '2021-11-03 11:45:00+01', NOW());

-- Claudia Vogt hat bewusst KEIN Fahrzeug — zeigt den Onboarding-Stand "0%"


-- ───────────────────────────────────────────────────────────────────────────
-- LOGBUCH — nur bei den gepflegten Akten
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO logbook (vehicle_id, date, type, km, notes, created_at)
VALUES
  ('VMB001', '2026-05-18', 'Wartung',      '186900', 'Große Inspektion, Ventilspiel eingestellt, Zündkerzen neu.', '2026-05-18 12:00:00+02'),
  ('VMB001', '2026-06-22', 'Ausfahrt',     '187400', 'Eifel-Runde über Adenau, Nürburg, Kelberg. 210 km.',        '2026-06-22 18:30:00+02'),
  ('VMB002', '2026-04-11', 'Reifen',       '142100', 'Neue Michelin Pilot Sport, Achsvermessung.',                 '2026-04-11 09:45:00+02'),
  ('VSH001', '2026-03-07', 'Restaurierung','96100',  'Chromteile neu, Türdichtungen erneuert.',                    '2026-03-07 14:20:00+01'),
  ('VSH001', '2026-06-14', 'TÜV',          '96300',  'HU ohne Mängel, H-Kennzeichen verlängert.',                  '2026-06-14 10:15:00+02'),
  ('VTR001', '2026-06-28', 'Trackday',     '11200',  'Nordschleife, 8 Runden. Bestzeit 7:24. Bremsen geprüft.',    '2026-06-28 17:00:00+02'),
  ('VTR001', '2026-07-05', 'Wartung',      '11400',  'Bremsflüssigkeit gewechselt, Setup für Bellmot angepasst.',  '2026-07-05 11:30:00+02');


-- ───────────────────────────────────────────────────────────────────────────
-- KONTROLLE
-- ───────────────────────────────────────────────────────────────────────────

SELECT
  u.name,
  u.member_nr,
  u.city,
  CASE WHEN u.beitrag_bezahlt THEN '✓ bezahlt' ELSE '✗ offen' END AS beitrag,
  COUNT(v.id)                                                     AS fahrzeuge,
  COALESCE(SUM(CASE WHEN v.image IS NOT NULL THEN 1 ELSE 0 END),0) AS mit_foto,
  TO_CHAR(u.created_at, 'YYYY')                                   AS seit
FROM users u
LEFT JOIN vehicles v ON v.user_id = u.id::text
GROUP BY u.id, u.name, u.member_nr, u.city, u.beitrag_bezahlt, u.created_at
ORDER BY u.created_at;
