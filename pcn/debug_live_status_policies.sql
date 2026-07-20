-- ═══════════════════════════════════════════════════════════════════════
-- WEITERE DIAGNOSE: Vier Policies auf vehicle_status statt zwei
--
-- Der Fund: "Status public read" / "Status owner write" (älter) UND
-- "status_read" / "status_write" (neuer) existieren gleichzeitig.
--
-- Bei mehreren permissiven ALL/INSERT/UPDATE-Policies auf derselben
-- Tabelle verknüpft Postgres sie NICHT mit ODER, sondern jede zusätzliche
-- Policy muss für sich allein den Zugriff erlauben (PERMISSIVE = ODER,
-- aber nur wenn alle vom gleichen Policy-Typ sind — bei RESTRICTIVE wäre
-- es UND). Falls "Status owner write" ein einschränkendes USING/WITH CHECK
-- hat, das bei eurem Custom-Auth nie erfüllt wird, kann das den Schreib-
-- zugriff trotz der harmlosen status_write-Policy blockieren.
--
-- Diese Abfrage zeigt die VOLLSTÄNDIGE Definition aller vier Policies.
-- ═══════════════════════════════════════════════════════════════════════

SELECT
  polname       AS policy_name,
  polcmd        AS command,        -- r=select, a=insert, w=update, d=delete, *=all
  polpermissive AS permissive,     -- true = PERMISSIVE (ODER-verknüpft), false = RESTRICTIVE (UND-verknüpft)
  pg_get_expr(polqual, polrelid)      AS using_expression,
  pg_get_expr(polwithcheck, polrelid) AS with_check_expression
FROM pg_policy
WHERE polrelid = 'vehicle_status'::regclass
ORDER BY polname;
