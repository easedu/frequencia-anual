-- ============================================================================
-- FIX: Corrigir função get_mv_metadata (erro de alias pg_class)
-- ============================================================================
-- Erro: "invalid reference to FROM-clause entry for table pg_class"
-- Causa: Linha 316 usa pg_class.reltuples ao invés de c.reltuples (alias)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_mv_metadata()
RETURNS TABLE(
  view_name TEXT,
  row_count BIGINT,
  total_size TEXT,
  last_refresh TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.relname::TEXT AS view_name,
    c.reltuples::BIGINT AS row_count,  -- ✅ CORRIGIDO: c.reltuples ao invés de pg_class.reltuples
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
