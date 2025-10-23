-- ============================================================================
-- CLEANUP: Remover MVs antigas SEM índices UNIQUE
-- ============================================================================
-- Execute este script ANTES do 01_create_materialized_views_FIXED.sql
-- ============================================================================

-- Drop funções que dependem das MVs
DROP FUNCTION IF EXISTS refresh_all_materialized_views() CASCADE;
DROP FUNCTION IF EXISTS refresh_absences_materialized_view() CASCADE;
DROP FUNCTION IF EXISTS get_mv_metadata() CASCADE;

-- Drop Materialized Views antigas
DROP MATERIALIZED VIEW IF EXISTS suspensions_with_student_info CASCADE;
DROP MATERIALIZED VIEW IF EXISTS certificates_with_student_info CASCADE;
DROP MATERIALIZED VIEW IF EXISTS tasks_with_student_info CASCADE;
DROP MATERIALIZED VIEW IF EXISTS interactions_with_student_info CASCADE;
DROP MATERIALIZED VIEW IF EXISTS absences_with_student_info CASCADE;

-- Verificar que tudo foi removido
SELECT
  c.relname AS view_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'm' -- Materialized views
  AND n.nspname = 'public';

-- Se retornar 0 linhas, está limpo e pronto para executar o FIXED.sql
