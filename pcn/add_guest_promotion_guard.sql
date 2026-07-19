-- ═══════════════════════════════════════════════════════════════════════
-- SPERRE: Kontaktanfragen dürfen niemals direkt zu Mitgliedern werden
--
-- HINTERGRUND
-- Die App unterscheidet zwei Arten von role="guest"-Einträgen:
--   • "vehicle_contact"  — jemand hat nur eine Fahrzeug-Nachricht geschickt,
--                          nie eine Mitgliedschaft beantragt
--   • (alles andere)     — ein "echter" wartender App-Gast
--
-- Die Admin-Console blendet Kontaktanfragen aus der Mitgliederliste aus und
-- verweigert den Hochstufen-Button clientseitig. Das reicht nicht: Die
-- aktuelle Policy "users_update" erlaubt JEDES Update (USING true, WITH
-- CHECK true), weil die App keine echte Supabase-Auth nutzt und daher
-- nicht zwischen Nutzern unterscheiden kann. Jeder mit dem anon-Key könnte
-- also die Frontend-Sperre umgehen und role einfach per API umschreiben.
--
-- LÖSUNG: Ein Trigger, der unabhängig vom Aufrufer prüft, OB der konkrete
-- Wertewechsel erlaubt ist — nicht WER ihn versucht. Das ist robuster als
-- eine RLS-Policy, weil es am Datensatz selbst ansetzt.
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
     AND NEW.role = 'member' THEN
    RAISE EXCEPTION
      'Kontaktanfragen (guest_source=vehicle_contact) können nicht direkt zu Mitgliedern werden. Diese Person muss eine eigene Mitgliedschaftsanfrage/Registrierung durchlaufen.'
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
-- KONTROLLE
-- ═══════════════════════════════════════════════════════════════════════

-- Trigger vorhanden?
SELECT tgname AS trigger_name, tgenabled AS aktiv
FROM pg_trigger
WHERE tgrelid = 'users'::regclass AND NOT tgisinternal;

-- Testweise sollte dieser Befehl fehlschlagen, wenn es einen Kontakt-Gast gibt:
-- UPDATE users SET role='member' WHERE guest_source='vehicle_contact' LIMIT 1;
-- (nicht automatisch ausgeführt — nur als Hinweis zum manuellen Test)
