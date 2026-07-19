-- ═══════════════════════════════════════════════════════════════════════
-- KORREKTUR: Sperre blockierte fälschlich echte Registrierungen
--
-- PROBLEM (gefunden nach Meldung: "Nach Zustimmung als Mitglied bricht
-- Profil-Öffnen ab und ich lande im Gastmodus")
--
-- Der Trigger trg_block_guest_contact_promotion (siehe
-- add_guest_promotion_guard.sql) blockierte JEDEN Wechsel von
-- role='guest' zu role='member' bei guest_source='vehicle_contact' —
-- das traf nicht nur den beabsichtigten Fall (Vorstand stuft in der
-- Admin-Console per Klick hoch, ohne dass eine echte Registrierung
-- stattfand), sondern auch den völlig legitimen Fall: Jemand hatte vor
-- Zeit X eine Fahrzeug-Kontaktanfrage gestellt und registriert sich
-- jetzt ganz reguär mit Club-Code und Passwort als Mitglied — der
-- bereits vorher existierende "Guest upgrade"-Pfad in register().
--
-- UNTERSCHEIDUNG
-- Der Admin-Console-Kurzschluss (toggleRole) ändert AUSSCHLIESSLICH
-- role. Eine echte Registrierung setzt zusätzlich member_nr. Das ist
-- ein zuverlässiges Merkmal, um beide Fälle zu trennen.
--
-- Beliebig oft ausführbar.
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION block_guest_contact_promotion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.guest_source = 'vehicle_contact'
     AND OLD.role = 'guest'
     AND NEW.role = 'member'
     AND (NEW.member_nr IS NULL OR NEW.member_nr = '') THEN
    -- Kein member_nr vergeben → kein echter Registrierungsvorgang,
    -- sondern ein reiner Rollenwechsel ohne Mitgliedschaftsdaten.
    RAISE EXCEPTION
      'Kontaktanfragen können nicht direkt zu Mitgliedern werden — nur über eine echte Registrierung mit Club-Code (vergibt automatisch eine Mitgliedsnummer).'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_guest_contact_promotion ON users;
CREATE TRIGGER trg_block_guest_contact_promotion
  BEFORE UPDATE ON users
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION block_guest_contact_promotion();


-- ═══════════════════════════════════════════════════════════════════════
-- WICHTIG: Falls dein eigener Testaccount gerade in diesem kaputten
-- Zustand feststeckt (role wieder auf 'guest' nach fehlgeschlagenem
-- Versuch), hier manuell reparieren — ERSETZE die E-Mail-Adresse:
-- ═══════════════════════════════════════════════════════════════════════
-- UPDATE users
--   SET role = 'member', member_nr = 'PCN-' || floor(1000 + random()*8999)::int
--   WHERE email = 'DEINE-TEST-EMAIL@example.com' AND role = 'guest';


-- ═══════════════════════════════════════════════════════════════════════
-- KONTROLLE
-- ═══════════════════════════════════════════════════════════════════════
SELECT tgname AS trigger_name, tgenabled AS aktiv
FROM pg_trigger
WHERE tgrelid = 'users'::regclass AND NOT tgisinternal;
