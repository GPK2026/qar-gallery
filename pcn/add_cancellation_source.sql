-- ═══════════════════════════════════════════════════════════════════════
-- TRENNUNG: Admin-Ablehnung vs. Mitglieder-Selbststornierung
--
-- Bisher schreiben BEIDE Vorgänge identisch status='cancelled' — aus der
-- Datenbank heraus ist nicht unterscheidbar, ob der Vorstand eine Anfrage
-- abgelehnt hat, oder ob sich das Mitglied selbst wieder abgemeldet hat.
--
-- Folgen bisher:
--   • Mitglied sieht nach einer Admin-Ablehnung nur wieder das leere
--     Anmeldeformular, statt einer klaren "Abgelehnt"-Meldung
--     (myReg-Filter schließt cancelled komplett aus)
--   • Die Admin-Console zeigt keine Information darüber, WER storniert hat
--
-- Diese Migration fügt ein separates Feld hinzu, ohne den bestehenden
-- 'cancelled'-Status zu verändern — alle bisherigen Auswertungen
-- (z.B. "wie viele storniert") funktionieren unverändert weiter.
--
-- Beliebig oft ausführbar.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE participants ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
-- Werte: 'admin' (Vorstand hat abgelehnt) oder 'member' (Mitglied hat selbst storniert)

-- Kontrolle
SELECT id, event_id, user_id, status, cancelled_by
FROM participants
WHERE status = 'cancelled'
ORDER BY registered_at DESC
LIMIT 20;
