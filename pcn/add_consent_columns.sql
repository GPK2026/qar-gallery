-- ═══════════════════════════════════════════════════════════════════════
-- DSGVO: Einwilligung dokumentieren
--
-- Art. 7 Abs. 1 DSGVO: Der Verantwortliche muss nachweisen können, dass
-- die betroffene Person eingewilligt hat. Ohne Zeitstempel und Version
-- ist die Einwilligung im Streitfall wertlos.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS consent_version TEXT;

-- Widerruf dokumentieren (Art. 7 Abs. 3 — jederzeit widerrufbar)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS consent_withdrawn_at TIMESTAMPTZ;

-- Kontrolle: wer hat wann eingewilligt?
SELECT name, email, consent_at, consent_version, consent_withdrawn_at
FROM users
ORDER BY created_at DESC;
