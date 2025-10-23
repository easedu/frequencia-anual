-- ============================================================================
-- FIX: Corrigir tipos TIMESTAMP → TIMESTAMPTZ na função refresh_all
-- ============================================================================
-- Erro: "Returned type timestamp without time zone does not match expected type timestamp with time zone"
-- Causa: DECLARE usa TIMESTAMP mas função retorna TIMESTAMPTZ
-- Solução: Mudar variáveis para TIMESTAMPTZ
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS TABLE(view_name TEXT, refresh_time TIMESTAMPTZ, duration_ms INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_time TIMESTAMPTZ;  -- ✅ CORRIGIDO: TIMESTAMP → TIMESTAMPTZ
  end_time TIMESTAMPTZ;    -- ✅ CORRIGIDO: TIMESTAMP → TIMESTAMPTZ
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
-- TESTAR FUNÇÃO CORRIGIDA
-- ============================================================================

SELECT * FROM refresh_all_materialized_views();
