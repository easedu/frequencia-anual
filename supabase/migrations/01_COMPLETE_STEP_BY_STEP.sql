-- ============================================================================
-- MIGRATION 01 COMPLETA - PASSO A PASSO
-- ============================================================================
-- Execute TODO este script de uma vez
-- Ordem: 1) Cleanup → 2) MVs → 3) Funções → 4) Populate → 5) Verify
-- ============================================================================

-- ============================================================================
-- PASSO 1: CLEANUP
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🧹 PASSO 1/5: Cleanup (removendo MVs e funções antigas)...';
END $$;

DROP FUNCTION IF EXISTS refresh_all_materialized_views() CASCADE;
DROP FUNCTION IF EXISTS refresh_absences_materialized_view() CASCADE;
DROP FUNCTION IF EXISTS get_mv_metadata() CASCADE;

DROP MATERIALIZED VIEW IF EXISTS suspensions_with_student_info CASCADE;
DROP MATERIALIZED VIEW IF EXISTS certificates_with_student_info CASCADE;
DROP MATERIALIZED VIEW IF EXISTS tasks_with_student_info CASCADE;
DROP MATERIALIZED VIEW IF EXISTS interactions_with_student_info CASCADE;
DROP MATERIALIZED VIEW IF EXISTS absences_with_student_info CASCADE;

DO $$
BEGIN
  RAISE NOTICE '✅ Cleanup completo!';
END $$;

-- ============================================================================
-- PASSO 2: CRIAR MATERIALIZED VIEWS
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '📊 PASSO 2/5: Criando 5 Materialized Views...';
END $$;

-- 1. Absences
CREATE MATERIALIZED VIEW absences_with_student_info AS
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

CREATE UNIQUE INDEX idx_absences_mv_id_unique ON absences_with_student_info(id);
CREATE INDEX idx_absences_mv_student_id ON absences_with_student_info(student_id);
CREATE INDEX idx_absences_mv_date ON absences_with_student_info(absence_date DESC);
CREATE INDEX idx_absences_mv_bimester ON absences_with_student_info(bimester);
CREATE INDEX idx_absences_mv_class ON absences_with_student_info(student_class);
CREATE INDEX idx_absences_mv_justified ON absences_with_student_info(is_justified);

DO $$
BEGIN
  RAISE NOTICE '  ✓ absences_with_student_info criada';
END $$;

-- 2. Interactions
CREATE MATERIALIZED VIEW interactions_with_student_info AS
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

CREATE UNIQUE INDEX idx_interactions_mv_id_unique ON interactions_with_student_info(id);
CREATE INDEX idx_interactions_mv_student_id ON interactions_with_student_info(student_id);
CREATE INDEX idx_interactions_mv_date ON interactions_with_student_info(interaction_date DESC);
CREATE INDEX idx_interactions_mv_class ON interactions_with_student_info(student_class);

DO $$
BEGIN
  RAISE NOTICE '  ✓ interactions_with_student_info criada';
END $$;

-- 3. Tasks
CREATE MATERIALIZED VIEW tasks_with_student_info AS
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

CREATE UNIQUE INDEX idx_tasks_mv_id_unique ON tasks_with_student_info(id);
CREATE INDEX idx_tasks_mv_student_id ON tasks_with_student_info(student_id);
CREATE INDEX idx_tasks_mv_resolved ON tasks_with_student_info(is_resolved);
CREATE INDEX idx_tasks_mv_due_date ON tasks_with_student_info(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_tasks_mv_class ON tasks_with_student_info(student_class);

DO $$
BEGIN
  RAISE NOTICE '  ✓ tasks_with_student_info criada';
END $$;

-- 4. Certificates
CREATE MATERIALIZED VIEW certificates_with_student_info AS
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

CREATE UNIQUE INDEX idx_certificates_mv_id_unique ON certificates_with_student_info(id);
CREATE INDEX idx_certificates_mv_student_id ON certificates_with_student_info(student_id);
CREATE INDEX idx_certificates_mv_status ON certificates_with_student_info(status);
CREATE INDEX idx_certificates_mv_start_date ON certificates_with_student_info(start_date DESC);

DO $$
BEGIN
  RAISE NOTICE '  ✓ certificates_with_student_info criada';
END $$;

-- 5. Suspensions
CREATE MATERIALIZED VIEW suspensions_with_student_info AS
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

CREATE UNIQUE INDEX idx_suspensions_mv_id_unique ON suspensions_with_student_info(id);
CREATE INDEX idx_suspensions_mv_student_id ON suspensions_with_student_info(student_id);
CREATE INDEX idx_suspensions_mv_severity ON suspensions_with_student_info(severity);
CREATE INDEX idx_suspensions_mv_start_date ON suspensions_with_student_info(start_date DESC);

DO $$
BEGIN
  RAISE NOTICE '  ✓ suspensions_with_student_info criada';
  RAISE NOTICE '✅ Todas as 5 MVs criadas com índices UNIQUE!';
END $$;

-- ============================================================================
-- PASSO 3: CRIAR FUNÇÕES
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '⚙️  PASSO 3/5: Criando funções de refresh e metadata...';
END $$;

-- Função: refresh_absences_materialized_view
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

-- Função: refresh_all_materialized_views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS TABLE(view_name TEXT, refresh_time TIMESTAMPTZ, duration_ms INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
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

-- Função: get_mv_metadata
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
  WHERE c.relkind = 'm'
    AND n.nspname = 'public'
  ORDER BY c.relname;
END;
$$;

DO $$
BEGIN
  RAISE NOTICE '✅ Funções criadas!';
END $$;

-- ============================================================================
-- PASSO 4: POPULAR MVs (REFRESH INICIAL)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🔄 PASSO 4/5: Populando MVs (refresh inicial)...';
  RAISE NOTICE '   ⏳ Aguarde 10-30 segundos...';
END $$;

SELECT * FROM refresh_all_materialized_views();

DO $$
BEGIN
  RAISE NOTICE '✅ MVs populadas!';
END $$;

-- ============================================================================
-- PASSO 5: VERIFICAÇÃO FINAL
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '📋 PASSO 5/5: Verificação final...';
END $$;

SELECT * FROM get_mv_metadata();

-- ============================================================================
-- MENSAGENS DE SUCESSO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🎉 MIGRATION 01 COMPLETA COM SUCESSO!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '✅ 5 Materialized Views criadas:';
  RAISE NOTICE '   • absences_with_student_info';
  RAISE NOTICE '   • interactions_with_student_info';
  RAISE NOTICE '   • tasks_with_student_info';
  RAISE NOTICE '   • certificates_with_student_info';
  RAISE NOTICE '   • suspensions_with_student_info';
  RAISE NOTICE '';
  RAISE NOTICE '✅ 3 Funções criadas:';
  RAISE NOTICE '   • refresh_all_materialized_views()';
  RAISE NOTICE '   • refresh_absences_materialized_view()';
  RAISE NOTICE '   • get_mv_metadata()';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Refresh inicial executado';
  RAISE NOTICE '✅ Todos os índices UNIQUE criados';
  RAISE NOTICE '✅ Todas as MVs prontas para uso!';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🚀 PRÓXIMO PASSO: Migration 02 (pg_cron)';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
END $$;
