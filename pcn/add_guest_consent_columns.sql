-- ═══════════════════════════════════════════════════════════════════════
-- GAST-KONTAKTAUFNAHME: getrennte Einwilligungen
--
-- Kopplungsverbot (Art. 7 Abs. 4 DSGVO): Die Einwilligung zur eigentlichen
-- Leistung (Nachrichten-Zustellung) darf NICHT mit der Einwilligung zu
-- einem anderen Zweck (Marketing/Lead-Nutzung) verknüpft werden. Beides
-- muss getrennt abfragbar, getrennt nachweisbar und getrennt widerrufbar
-- sein — deshalb zwei eigenständige Spaltenpaare, nicht die Wiederverwendung
-- der bestehenden consent_at/consent_version-Spalten (die decken den
-- Mitglieder-Registrierungs-Zweck ab, nicht den Gast-Kontakt-Zweck).
-- ═══════════════════════════════════════════════════════════════════════

-- Pflicht: Zustimmung zu AGB/Kontaktaufnahme-Bedingungen (Zweck: Zustellung)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS contact_consent_at TIMESTAMPTZ;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS contact_consent_version TEXT;

-- Optional: Marketing-/Lead-Einwilligung (Zweck: eigene Werbung, Newsletter)
-- NULL = nie gefragt bzw. nicht zugestimmt. Getrennt vom obigen Zweck.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMPTZ;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS marketing_consent_version TEXT;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS marketing_consent_withdrawn_at TIMESTAMPTZ;

-- Kontrolle: wer hat welcher Einwilligung wann zugestimmt?
SELECT
  name, email, role,
  contact_consent_at, contact_consent_version,
  marketing_consent_at, marketing_consent_version, marketing_consent_withdrawn_at
FROM users
WHERE role = 'guest'
ORDER BY created_at DESC;
