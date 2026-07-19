-- ═══════════════════════════════════════════════════════════════════════
-- DIAGNOSE: Warum tauchen Otto/Ulla nicht in der Admin-Console auf?
--
-- Diese Abfrage zeigt den EXAKTEN Zustand der beiden Konten in der DB,
-- damit wir sehen, an welcher Stelle es hakt — statt zu raten.
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Existieren sie überhaupt? Nach Namen suchen (auch Teiltreffer)
SELECT id, name, email, role, member_nr, guest_source,
       contact_consent_at, created_at
FROM users
WHERE name ILIKE '%otto%' OR name ILIKE '%ulla%'
ORDER BY created_at DESC;

-- 2. Falls sie NICHT auftauchen: die letzten 10 neu angelegten Konten
--    generell anschauen, um zu sehen ob die Registrierung überhaupt
--    in der DB ankommt
SELECT id, name, email, role, member_nr, guest_source, created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;
