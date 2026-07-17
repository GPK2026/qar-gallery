-- ═══════════════════════════════════════════════════════════════════════
-- VOLLSTÄNDIGE LÖSCHUNG (DSGVO Art. 17 — Recht auf Vergessenwerden)
--
-- PROBLEM
-- Keine Tabelle hat einen Fremdschlüssel auf users. Ein DELETE FROM users
-- entfernt nur die Zeile — Fahrzeuge, Logbuch, Chats und Anmeldungen bleiben
-- als Waisen zurück und sind weiterhin über die user_id zuordenbar.
-- Ein Löschantrag wäre damit NICHT erfüllt.
--
-- WARUM KEIN FREMDSCHLÜSSEL
-- users.id ist UUID, vehicles.user_id ist TEXT. PostgreSQL erlaubt keinen
-- Fremdschlüssel zwischen unterschiedlichen Typen. Ein Typwechsel wäre ein
-- größerer Eingriff und würde bestehende Daten gefährden.
--
-- LÖSUNG
-- Ein Trigger, der VOR dem Löschen eines Nutzers alle abhängigen Daten
-- entfernt. Wirkt unabhängig davon, ob die App alle Schritte durchläuft —
-- auch beim Löschen direkt im Supabase Studio.
--
-- Beliebig oft ausführbar.
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION delete_user_cascade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid TEXT := OLD.id::text;
  admin_thread UUID;
BEGIN
  -- 1. Fahrzeugbezogenes zuerst (hängt an vehicles, nicht an users)
  DELETE FROM logbook
   WHERE vehicle_id IN (SELECT id FROM vehicles WHERE user_id = uid);

  DELETE FROM vehicle_status
   WHERE vehicle_id IN (SELECT id FROM vehicles WHERE user_id = uid);

  DELETE FROM event_history
   WHERE vehicle_id IN (SELECT id FROM vehicles WHERE user_id = uid);

  -- 2. Fahrzeuge selbst
  DELETE FROM vehicles WHERE user_id = uid;

  -- 3. Nutzerbezogenes
  DELETE FROM participants WHERE user_id = uid;
  DELETE FROM reminders    WHERE user_id = uid;

  -- 4. Admin-Chat: Thread-ID wird deterministisch aus der User-ID gebildet
  --    (identisch zu adminThreadId() in der App)
  BEGIN
    admin_thread := ('ad000000-0000-4000-8000-' ||
                     RIGHT(REPLACE(uid, '-', ''), 12))::uuid;
    DELETE FROM messages WHERE thread_id = admin_thread;
    DELETE FROM threads  WHERE id = admin_thread;
  EXCEPTION WHEN OTHERS THEN
    NULL;  -- ungültige UUID? dann gibt es auch keinen Thread
  END;

  -- 5. Alle weiteren Threads, in denen die Person Teilnehmer war
  DELETE FROM messages
   WHERE thread_id IN (SELECT id FROM threads WHERE uid = ANY(participants));
  DELETE FROM threads WHERE uid = ANY(participants);

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_delete_user_cascade ON users;
CREATE TRIGGER trg_delete_user_cascade
  BEFORE DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION delete_user_cascade();


-- ═══════════════════════════════════════════════════════════════════════
-- AUFRÄUMEN: bereits vorhandene Waisen entfernen
-- ═══════════════════════════════════════════════════════════════════════
DELETE FROM logbook
 WHERE vehicle_id NOT IN (SELECT id FROM vehicles);

DELETE FROM vehicles
 WHERE user_id NOT IN (SELECT id::text FROM users);

DELETE FROM participants
 WHERE user_id NOT IN (SELECT id::text FROM users);

DELETE FROM reminders
 WHERE user_id NOT IN (SELECT id::text FROM users);


-- ═══════════════════════════════════════════════════════════════════════
-- KONTROLLE
-- ═══════════════════════════════════════════════════════════════════════
SELECT tgname AS trigger_name, tgenabled AS aktiv
FROM pg_trigger
WHERE tgrelid = 'users'::regclass AND NOT tgisinternal;

SELECT 'Fahrzeuge ohne Besitzer' AS pruefung, COUNT(*) AS anzahl
FROM vehicles WHERE user_id NOT IN (SELECT id::text FROM users)
UNION ALL
SELECT 'Anmeldungen ohne Mitglied', COUNT(*)
FROM participants WHERE user_id NOT IN (SELECT id::text FROM users)
UNION ALL
SELECT 'Logbuch ohne Fahrzeug', COUNT(*)
FROM logbook WHERE vehicle_id NOT IN (SELECT id FROM vehicles);
