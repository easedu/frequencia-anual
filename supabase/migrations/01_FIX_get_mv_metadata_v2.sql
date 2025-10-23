-- ============================================================================
-- FIX v2: Corrigir função get_mv_metadata (timestamp type mismatch)
-- ============================================================================
-- Erro: "Returned type timestamp with time zone does not match expected type timestamp without time zone"
-- Causa: GREATEST() retorna TIMESTAMPTZ mas função declara TIMESTAMP
-- Solução: Mudar tipo de retorno para TIMESTAMPTZ OU fazer cast para TIMESTAMP
-- ============================================================================

CREATE OR REPLACE FUNCTION get_mv_metadata()
RETURNS TABLE(
  view_name TEXT,
  row_count BIGINT,
  total_size TEXT,
  last_refresh TIMESTAMPTZ  -- ✅ MUDADO: TIMESTAMP → TIMESTAMPTZ
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
-- TESTAR FUNÇÃO CORRIGIDA
-- ============================================================================

SELECT * FROM get_mv_metadata();
