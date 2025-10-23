-- ============================================================================
-- MIGRATION COMPLETA FINAL: Materialized Views + Todas as Funções
-- ============================================================================
-- Este script consolida TUDO:
-- 1. Criação das 5 Materialized Views com índices UNIQUE
-- 2. Função refresh_all_materialized_views()
-- 3. Função refresh_absences_materialized_view()
-- 4. Função get_mv_metadata() (com tipos corrigidos)
-- 5. Refresh inicial + verificação
-- ============================================================================

-- ============================================================================
-- CLEANUP (caso já exista algo parcial)
-- ============================================================================

DROP FUNCTION IF EXISTS refresh_all_materialized_views() CASCADE;
DROP FUNCTION IF EXISTS refresh_absences_materialized_view() CASCADE;
DROP FUNCTION IF EXISTS get_mv_metadata() CASCADE;

-- ============================================================================
-- 1. MATERIALIZED VIEW: absences_with_student_info
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS absences_with_student_info AS
SELECT
  a.id,
  a.student_id,
  a.absence_date,
  a.bimester,
  a.is_justified,
  a.medical_certificate_id,
  a.suspension_id,
  a.created_at,
  s.student_id AS student_firebase_id,
  s.name AS student_name,
  s.class AS student_class,
  s.shift AS student_shift,
  s.status AS student_status
FROM student_absences a
INNER JOIN students s ON a.student_id = s.id
WHERE s.deleted = false;

-- Índice UNIQUE obrigatório para REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_absences_mv_id_unique
  ON absences_with_student_info(id);

-- Índices adicionais
CREATE INDEX IF NOT EXISTS idx_absences_mv_student_id
  ON absences_with_student_info(student_id);
CREATE INDEX IF NOT EXISTS idx_absences_mv_date
  ON absences_with_student_info(absence_date DESC);
CREATE INDEX IF NOT EXISTS idx_absences_mv_bimester
  ON absences_with_student_info(bimester);
CREATE INDEX IF NOT EXISTS idx_absences_mv_class
  ON absences_with_student_info(student_class);
CREATE INDEX IF NOT EXISTS idx_absences_mv_justified
  ON absences_with_student_info(is_justified);

-- ============================================================================
-- 2. MATERIALIZED VIEW: interactions_with_student_info
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS interactions_with_student_info AS
SELECT
  i.id,
  i.student_id,
  i.interaction_type,
  i.interaction_date,
  i.description,
  LEFT(i.description, 100) AS description_preview,
  i.is_sensitive,
  i.created_by,
  i.created_at,
  s.student_id AS student_firebase_id,
  s.name AS student_name,
  s.class AS student_class,
  s.shift AS student_shift
FROM family_interactions i
INNER JOIN students s ON i.student_id = s.id
WHERE s.deleted = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_interactions_mv_id_unique
  ON interactions_with_student_info(id);

CREATE INDEX IF NOT EXISTS idx_interactions_mv_student_id
  ON interactions_with_student_info(student_id);
CREATE INDEX IF NOT EXISTS idx_interactions_mv_date
  ON interactions_with_student_info(interaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_mv_class
  ON interactions_with_student_info(student_class);

-- ============================================================================
-- 3. MATERIALIZED VIEW: tasks_with_student_info
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS tasks_with_student_info AS
SELECT
  t.id,
  t.student_id,
  t.title,
  t.description,
  t.recommended_action,
  t.is_resolved,
  t.action_taken,
  t.created_by,
  t.assigned_to,
  t.created_at,
  t.resolved_at,
  t.due_date,
  s.student_id AS student_firebase_id,
  s.name AS student_name,
  s.class AS student_class,
  s.shift AS student_shift,
  s.status AS student_status
FROM user_tasks t
INNER JOIN students s ON t.student_id = s.id
WHERE s.deleted = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_mv_id_unique
  ON tasks_with_student_info(id);

CREATE INDEX IF NOT EXISTS idx_tasks_mv_student_id
  ON tasks_with_student_info(student_id);
CREATE INDEX IF NOT EXISTS idx_tasks_mv_resolved
  ON tasks_with_student_info(is_resolved);
CREATE INDEX IF NOT EXISTS idx_tasks_mv_due_date
  ON tasks_with_student_info(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_mv_class
  ON tasks_with_student_info(student_class);

-- ============================================================================
-- 4. MATERIALIZED VIEW: certificates_with_student_info
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS certificates_with_student_info AS
SELECT
  mc.id,
  mc.student_id,
  mc.start_date,
  mc.end_date,
  mc.days_covered,
  mc.cid_code,
  mc.diagnosis,
  mc.doctor_name,
  mc.status,
  mc.submitted_date,
  mc.created_at,
  s.student_id AS student_firebase_id,
  s.name AS student_name,
  s.class AS student_class,
  s.shift AS student_shift
FROM medical_certificates mc
INNER JOIN students s ON mc.student_id = s.id
WHERE s.deleted = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_mv_id_unique
  ON certificates_with_student_info(id);

CREATE INDEX IF NOT EXISTS idx_certificates_mv_student_id
  ON certificates_with_student_info(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_mv_status
  ON certificates_with_student_info(status);
CREATE INDEX IF NOT EXISTS idx_certificates_mv_start_date
  ON certificates_with_student_info(start_date DESC);

-- ============================================================================
-- 5. MATERIALIZED VIEW: suspensions_with_student_info
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS suspensions_with_student_info AS
SELECT
  sus.id,
  sus.student_id,
  sus.start_date,
  sus.end_date,
  sus.days_suspended,
  sus.reason,
  sus.description,
  sus.severity,
  sus.decision_by,
  sus.decision_date,
  sus.family_notified,
  sus.created_at,
  s.student_id AS student_firebase_id,
  s.name AS student_name,
  s.class AS student_class,
  s.shift AS student_shift
FROM student_suspensions sus
INNER JOIN students s ON sus.student_id = s.id
WHERE s.deleted = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_suspensions_mv_id_unique
  ON suspensions_with_student_info(id);

CREATE INDEX IF NOT EXISTS idx_suspensions_mv_student_id
  ON suspensions_with_student_info(student_id);
CREATE INDEX IF NOT EXISTS idx_suspensions_mv_severity
  ON suspensions_with_student_info(severity);
CREATE INDEX IF NOT EXISTS idx_suspensions_mv_start_date
  ON suspensions_with_student_info(start_date DESC);

-- ============================================================================
-- FUNÇÃO: refresh_absences_materialized_view
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_absences_materialized_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY absences_with_student_info;
  RAISE NOTICE 'Materialized view absences_with_student_info refreshed at %', NOW();
END;
$$;

COMMENT ON FUNCTION refresh_absences_materialized_view IS
'Refreshes absences_with_student_info using CONCURRENTLY (non-blocking). For manual/cron trigger.';

-- ============================================================================
-- FUNÇÃO: refresh_all_materialized_views
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS TABLE(view_name TEXT, refresh_time TIMESTAMPTZ, duration_ms INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration INTEGER;
BEGIN
  -- 1. Absences
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY absences_with_student_info;
  end_time := clock_timestamp();
  duration := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
  RETURN QUERY SELECT 'absences_with_student_info'::TEXT, end_time, duration;

  -- 2. Interactions
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY interactions_with_student_info;
  end_time := clock_timestamp();
  duration := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
  RETURN QUERY SELECT 'interactions_with_student_info'::TEXT, end_time, duration;

  -- 3. Tasks
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY tasks_with_student_info;
  end_time := clock_timestamp();
  duration := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
  RETURN QUERY SELECT 'tasks_with_student_info'::TEXT, end_time, duration;

  -- 4. Medical Certificates
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY certificates_with_student_info;
  end_time := clock_timestamp();
  duration := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
  RETURN QUERY SELECT 'certificates_with_student_info'::TEXT, end_time, duration;

  -- 5. Suspensions
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY suspensions_with_student_info;
  end_time := clock_timestamp();
  duration := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
  RETURN QUERY SELECT 'suspensions_with_student_info'::TEXT, end_time, duration;

  RAISE NOTICE 'All materialized views refreshed at %', NOW();
END;
$$;

COMMENT ON FUNCTION refresh_all_materialized_views IS
'Refreshes all 5 materialized views. Returns performance metrics. Call via cron every 5 minutes.';

-- ============================================================================
-- FUNÇÃO: get_mv_metadata
-- ============================================================================

CREATE OR REPLACE FUNCTION get_mv_metadata()
RETURNS TABLE(
  view_name TEXT,
  row_count BIGINT,
  total_size TEXT,
  last_refresh TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.relname::TEXT AS view_name,
    c.reltuples::BIGINT AS row_count,
    pg_size_pretty(pg_total_relation_size(c.oid))::TEXT AS total_size,
    GREATEST(
      pg_stat_get_last_analyze_time(c.oid),
      pg_stat_get_last_autoanalyze_time(c.oid)
    ) AS last_refresh
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'm' -- Materialized views
    AND n.nspname = 'public'
  ORDER BY c.relname;
END;
$$;

COMMENT ON FUNCTION get_mv_metadata IS
'Returns metadata for all materialized views (count, size, last refresh). For monitoring.';

-- ============================================================================
-- INITIAL REFRESH
-- ============================================================================
-- Popular as MVs pela primeira vez (pode demorar alguns segundos)
-- ============================================================================

SELECT refresh_all_materialized_views();

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

SELECT * FROM get_mv_metadata();

-- ============================================================================
-- MENSAGEM DE SUCESSO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 01 COMPLETA!';
  RAISE NOTICE '✅ 5 Materialized Views criadas com índices UNIQUE';
  RAISE NOTICE '✅ 3 Funções criadas (refresh_all, refresh_absences, get_metadata)';
  RAISE NOTICE '✅ Refresh inicial executado';
  RAISE NOTICE '🚀 Próximo passo: Migration 02 (pg_cron)';
END $$;
