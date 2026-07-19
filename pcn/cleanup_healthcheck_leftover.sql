-- ═══════════════════════════════════════════════════════════════════════
-- EINMALIGES AUFRÄUMEN: liegen gebliebener Health-Check-Testaccount
--
-- Grund: Der Health-Check legt für jeden Testlauf einen Wegwerf-Account
-- (healthcheck-<timestamp>@qar.invalid) an und räumt ihn danach wieder
-- weg. Der hier gefundene Account stammt vermutlich aus einem Lauf vor
-- Einführung der automatischen Cleanup-Funktion (cleanupTestUser) oder
-- aus einem abgebrochenen Lauf.
--
-- Dieses Skript entfernt gezielt nur Accounts mit der Testadress-Endung
-- "@qar.invalid" — reale Nutzerdaten sind davon nicht betroffen.
-- ═══════════════════════════════════════════════════════════════════════

-- Vorher anschauen, was betroffen ist:
SELECT id, name, email, role, created_at
FROM users
WHERE email LIKE '%@qar.invalid'
ORDER BY created_at;

-- Zugehörige Fahrzeuge (falls vorhanden) zuerst entfernen
DELETE FROM vehicles
WHERE user_id IN (SELECT id::text FROM users WHERE email LIKE '%@qar.invalid');

-- Testaccounts selbst entfernen
DELETE FROM users
WHERE email LIKE '%@qar.invalid';

-- Kontrolle: sollte jetzt leer sein
SELECT id, name, email, role
FROM users
WHERE email LIKE '%@qar.invalid';
