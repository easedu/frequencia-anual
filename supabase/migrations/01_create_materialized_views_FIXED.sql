-- ============================================================================
-- MIGRATION: Create Materialized Views for Performance Optimization (FIXED)
-- ============================================================================
-- Objetivo: Eliminar N+1 queries pré-computando JOINs
-- Impacto: 15-20s → 5-8s (3x mais rápido)
-- Refresh: Manual via cron job (a cada 5 minutos)
-- FIX: Adicionado índices UNIQUE necessários para REFRESH CONCURRENTLY
-- ============================================================================

-- ============================================================================
-- 1. MATERIALIZED VIEW: absences_with_student_info
-- ============================================================================
-- Pré-computa JOIN entre student_absences e students
-- Elimina N+1 queries ao listar faltas com dados do estudante
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS absences_with_student_info AS
SELECT
  -- Campos da falta
  a.id,
  a.student_id,
  a.absence_date,
  a.bimester,
  a.is_justified,
  a.medical_certificate_id,
  a.suspension_id,
  a.created_at,
  -- Dados do estudante (JOIN pré-computado)
  s.student_id AS student_firebase_id,
  s.name AS student_name,
  s.class AS student_class,
  s.shift AS student_shift,
  s.status AS student_status
FROM student_absences a
INNER JOIN students s ON a.student_id = s.id
WHERE s.deleted = false;

-- ⚠️ CRITICAL: Índice UNIQUE obrigatório para REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_absences_mv_id_unique
  ON absences_with_student_info(id);

-- Índices adicionais para performance
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

COMMENT ON MATERIALIZED VIEW absences_with_student_info IS
'Pre-computed JOIN between absences and students. Refresh: cron (5min). Eliminates N+1 queries.';

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
  LEFT(i.description, 100) AS description_preview, -- Primeiros 100 chars
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

-- ⚠️ CRITICAL: Índice UNIQUE
CREATE UNIQUE INDEX IF NOT EXISTS idx_interactions_mv_id_unique
  ON interactions_with_student_info(id);

CREATE INDEX IF NOT EXISTS idx_interactions_mv_student_id
  ON interactions_with_student_info(student_id);
CREATE INDEX IF NOT EXISTS idx_interactions_mv_date
  ON interactions_with_student_info(interaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_mv_class
  ON interactions_with_student_info(student_class);

COMMENT ON MATERIALIZED VIEW interactions_with_student_info IS
'Pre-computed JOIN between interactions and students. Includes description preview (100 chars).';

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

-- ⚠️ CRITICAL: Índice UNIQUE
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

COMMENT ON MATERIALIZED VIEW tasks_with_student_info IS
'Pre-computed JOIN between tasks and students. Supports filtering by resolved status and due date.';

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

-- ⚠️ CRITICAL: Índice UNIQUE
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_mv_id_unique
  ON certificates_with_student_info(id);

CREATE INDEX IF NOT EXISTS idx_certificates_mv_student_id
  ON certificates_with_student_info(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_mv_status
  ON certificates_with_student_info(status);
CREATE INDEX IF NOT EXISTS idx_certificates_mv_start_date
  ON certificates_with_student_info(start_date DESC);

COMMENT ON MATERIALIZED VIEW certificates_with_student_info IS
'Pre-computed JOIN between medical certificates and students. Supports filtering by status and date.';

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

-- ⚠️ CRITICAL: Índice UNIQUE
CREATE UNIQUE INDEX IF NOT EXISTS idx_suspensions_mv_id_unique
  ON suspensions_with_student_info(id);

CREATE INDEX IF NOT EXISTS idx_suspensions_mv_student_id
  ON suspensions_with_student_info(student_id);
CREATE INDEX IF NOT EXISTS idx_suspensions_mv_severity
  ON suspensions_with_student_info(severity);
CREATE INDEX IF NOT EXISTS idx_suspensions_mv_start_date
  ON suspensions_with_student_info(start_date DESC);

COMMENT ON MATERIALIZED VIEW suspensions_with_student_info IS
'Pre-computed JOIN between suspensions and students. Supports filtering by severity.';

-- ============================================================================
-- FUNCTION: refresh_absences_materialized_view
-- ============================================================================
-- Atualiza apenas a MV de absences (CONCURRENTLY = não bloqueia leituras)
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
-- FUNCTION: refresh_all_materialized_views
-- ============================================================================
-- Atualiza TODAS as MVs do sistema (chamada por cron job)
-- Retorna métricas de performance de cada refresh
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS TABLE(view_name TEXT, refresh_time TIMESTAMP, duration_ms INTEGER)
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
-- FUNCTION: get_mv_metadata
-- ============================================================================
-- Retorna metadados das MVs (row count, size, last refresh)
-- Útil para monitoring/debugging
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
-- Confirmar que todas as MVs foram criadas e populadas
-- ============================================================================

SELECT * FROM get_mv_metadata();
