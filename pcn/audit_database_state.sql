-- ═══════════════════════════════════════════════════════════════════════
-- BESTANDSAUFNAHME vor RLS-Optimierung und Index-Erstellung
--
-- Über 24 SQL-Migrationen sind mehrere sich überlappende Policy-Namen für
-- dieselben Tabellen entstanden (z.B. für "vehicles": "Own vehicles",
-- "vehicles_owner_all", "vehicles_public_read", "vehicles_insert",
-- "vehicles_update", "vehicles_delete", "vehicles_owner", "Public QR
-- lookup" — acht mögliche Namen aus drei verschiedenen Dateien).
--
-- Diese Abfrage zeigt den ECHTEN aktuellen Zustand, bevor irgendetwas
-- geändert wird — jede Optimierung ohne diese Grundlage würde blind
-- geraten, welche Policies überhaupt noch aktiv sind.
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Alle aktiven Policies je Tabelle, mit vollständiger Bedingung
SELECT
  schemaname, tablename, policyname, cmd AS command,
  permissive,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 2. Existierende Indizes je Tabelle
SELECT
  tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 3. Tabellengrößen — zeigt, wo Indizes am meisten bringen würden
SELECT
  relname AS table_name,
  n_live_tup AS estimated_rows,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- 4. RLS-Status je Tabelle (aktiviert/deaktiviert)
SELECT
  tablename, rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
