-- ============================================================================
-- QUERY ANALYSIS TOOLS
-- ============================================================================
-- Ferramentas para analisar e otimizar queries em produção
-- Uso: Identificar slow queries, missing indexes, table bloat
-- ============================================================================

-- ============================================================================
-- FUNÇÃO: analyze_query_performance
-- ============================================================================
-- Analisa uma query e retorna métricas de performance + sugestões
-- ============================================================================

CREATE OR REPLACE FUNCTION analyze_query_performance(query_text TEXT)
RETURNS TABLE(
  metric TEXT,
  value TEXT,
  suggestion TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  explain_result TEXT;
  execution_time NUMERIC;
  planning_time NUMERIC;
BEGIN
  -- Executar EXPLAIN ANALYZE
  EXECUTE 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' || query_text INTO explain_result;

  -- Extrair métricas
  execution_time := (explain_result::json->0->'Execution Time')::NUMERIC;
  planning_time := (explain_result::json->0->'Planning Time')::NUMERIC;

  -- Retornar métricas
  RETURN QUERY SELECT
    'Execution Time'::TEXT,
    ROUND(execution_time, 2)::TEXT || ' ms',
    CASE
      WHEN execution_time > 1000 THEN 'SLOW: Consider adding indexes or optimizing query'
      WHEN execution_time > 100 THEN 'MODERATE: Review query plan'
      ELSE 'FAST: No action needed'
    END;

  RETURN QUERY SELECT
    'Planning Time'::TEXT,
    ROUND(planning_time, 2)::TEXT || ' ms',
    CASE
      WHEN planning_time > 50 THEN 'HIGH: Consider simplifying query'
      ELSE 'OK'
    END;

  RETURN QUERY SELECT
    'Full Explain'::TEXT,
    explain_result,
    'Review full plan for optimization opportunities'::TEXT;
END;
$$;

COMMENT ON FUNCTION analyze_query_performance IS
'Analyzes query performance using EXPLAIN ANALYZE. Returns metrics and optimization suggestions.';

-- ============================================================================
-- FUNÇÃO: find_missing_indexes
-- ============================================================================
-- Identifica queries que fazem Seq Scan e sugere índices
-- Requer: pg_stat_statements extension
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

CREATE OR REPLACE FUNCTION find_missing_indexes()
RETURNS TABLE(
  query_sample TEXT,
  calls BIGINT,
  total_time NUMERIC,
  avg_time NUMERIC,
  suggestion TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    LEFT(query, 100) AS query_sample,
    calls,
    ROUND((total_exec_time)::NUMERIC, 2) AS total_time,
    ROUND((mean_exec_time)::NUMERIC, 2) AS avg_time,
    'Review for missing indexes - High sequential scan cost'::TEXT AS suggestion
  FROM pg_stat_statements
  WHERE query ILIKE '%SELECT%'
    AND query NOT ILIKE '%pg_%'
    AND mean_exec_time > 100  -- Queries > 100ms
  ORDER BY total_exec_time DESC
  LIMIT 20;
END;
$$;

COMMENT ON FUNCTION find_missing_indexes IS
'Finds slow queries (>100ms) that might benefit from indexes. Based on pg_stat_statements.';

-- ============================================================================
-- FUNÇÃO: get_table_statistics
-- ============================================================================
-- Retorna estatísticas detalhadas de cada tabela
-- ============================================================================

CREATE OR REPLACE FUNCTION get_table_statistics()
RETURNS TABLE(
  table_name TEXT,
  row_count BIGINT,
  total_size TEXT,
  table_size TEXT,
  indexes_size TEXT,
  seq_scans BIGINT,
  idx_scans BIGINT,
  index_usage_pct NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (schemaname || '.' || relname)::TEXT AS table_name,
    n_live_tup AS row_count,
    pg_size_pretty(pg_total_relation_size((schemaname || '.' || relname)::regclass)) AS total_size,
    pg_size_pretty(pg_relation_size((schemaname || '.' || relname)::regclass)) AS table_size,
    pg_size_pretty(
      pg_total_relation_size((schemaname || '.' || relname)::regclass) -
      pg_relation_size((schemaname || '.' || relname)::regclass)
    ) AS indexes_size,
    seq_scan AS seq_scans,
    COALESCE(idx_scan, 0) AS idx_scans,
    CASE
      WHEN (seq_scan + COALESCE(idx_scan, 0)) > 0
      THEN ROUND(100.0 * COALESCE(idx_scan, 0) / (seq_scan + COALESCE(idx_scan, 0)), 2)
      ELSE 0
    END AS index_usage_pct
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size((schemaname || '.' || relname)::regclass) DESC;
END;
$$;

COMMENT ON FUNCTION get_table_statistics IS
'Returns comprehensive statistics for all tables: size, scans, index usage percentage.';

-- ============================================================================
-- FUNÇÃO: check_index_health
-- ============================================================================
-- Verifica saúde dos índices (bloat, unused indexes)
-- ============================================================================

CREATE OR REPLACE FUNCTION check_index_health()
RETURNS TABLE(
  index_name TEXT,
  table_name TEXT,
  index_size TEXT,
  index_scans BIGINT,
  status TEXT,
  recommendation TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    indexrelname AS index_name,
    tablename AS table_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan AS index_scans,
    CASE
      WHEN idx_scan = 0 THEN 'UNUSED'
      WHEN idx_scan < 100 THEN 'LOW_USAGE'
      ELSE 'ACTIVE'
    END AS status,
    CASE
      WHEN idx_scan = 0 THEN 'Consider dropping - Never used'
      WHEN idx_scan < 100 THEN 'Review usage - Rarely used'
      ELSE 'Healthy - Keep index'
    END AS recommendation
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
  ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;
END;
$$;

COMMENT ON FUNCTION check_index_health IS
'Checks index health: identifies unused or rarely used indexes that can be dropped.';

-- ============================================================================
-- FUNÇÃO: get_slow_queries
-- ============================================================================
-- Lista as 20 queries mais lentas do sistema
-- ============================================================================

CREATE OR REPLACE FUNCTION get_slow_queries()
RETURNS TABLE(
  query_sample TEXT,
  calls BIGINT,
  total_time_sec NUMERIC,
  avg_time_ms NUMERIC,
  max_time_ms NUMERIC,
  stddev_time_ms NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    LEFT(query, 150) AS query_sample,
    calls,
    ROUND((total_exec_time / 1000)::NUMERIC, 2) AS total_time_sec,
    ROUND(mean_exec_time::NUMERIC, 2) AS avg_time_ms,
    ROUND(max_exec_time::NUMERIC, 2) AS max_time_ms,
    ROUND(stddev_exec_time::NUMERIC, 2) AS stddev_time_ms
  FROM pg_stat_statements
  WHERE query NOT ILIKE '%pg_stat%'
    AND query NOT ILIKE '%pg_catalog%'
  ORDER BY mean_exec_time DESC
  LIMIT 20;
END;
$$;

COMMENT ON FUNCTION get_slow_queries IS
'Returns top 20 slowest queries with execution statistics. Use for identifying optimization targets.';

-- ============================================================================
-- FUNÇÃO: optimize_all_tables
-- ============================================================================
-- Executa VACUUM ANALYZE em todas as tabelas do sistema
-- Uso: Após bulk operations ou criação de índices
-- ============================================================================

CREATE OR REPLACE FUNCTION optimize_all_tables()
RETURNS TABLE(
  table_name TEXT,
  operation TEXT,
  status TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT tablename::TEXT AS tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    BEGIN
      EXECUTE 'VACUUM ANALYZE ' || quote_ident(tbl.tablename);
      RETURN QUERY SELECT tbl.tablename::TEXT, 'VACUUM ANALYZE'::TEXT, 'SUCCESS'::TEXT;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT tbl.tablename::TEXT, 'VACUUM ANALYZE'::TEXT, ('FAILED: ' || SQLERRM)::TEXT;
    END;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION optimize_all_tables IS
'Runs VACUUM ANALYZE on all tables. Call after creating indexes or bulk operations.';

-- ============================================================================
-- VIEW: query_performance_dashboard
-- ============================================================================
-- View consolidada de métricas de performance
-- ============================================================================

CREATE OR REPLACE VIEW query_performance_dashboard AS
SELECT
  'Total Tables' AS metric,
  COUNT(*)::TEXT AS value,
  'Number of tables in public schema' AS description
FROM pg_tables
WHERE schemaname = 'public'

UNION ALL

SELECT
  'Total Indexes' AS metric,
  COUNT(*)::TEXT AS value,
  'Number of indexes (excluding pkeys)' AS description
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname NOT LIKE '%_pkey'

UNION ALL

SELECT
  'Unused Indexes' AS metric,
  COUNT(*)::TEXT AS value,
  'Indexes with 0 scans' AS description
FROM pg_stat_user_indexes
WHERE idx_scan = 0

UNION ALL

SELECT
  'Materialized Views' AS metric,
  COUNT(*)::TEXT AS value,
  'Number of materialized views' AS description
FROM pg_matviews
WHERE schemaname = 'public'

UNION ALL

SELECT
  'Database Size' AS metric,
  pg_size_pretty(pg_database_size(current_database())) AS value,
  'Total database size' AS description;

COMMENT ON VIEW query_performance_dashboard IS
'Quick overview of database health and performance metrics.';

-- ============================================================================
-- EXEMPLO DE USO DAS FUNÇÕES
-- ============================================================================

-- Ver estatísticas das tabelas
-- SELECT * FROM get_table_statistics();

-- Ver queries lentas
-- SELECT * FROM get_slow_queries();

-- Verificar saúde dos índices
-- SELECT * FROM check_index_health();

-- Dashboard de performance
-- SELECT * FROM query_performance_dashboard;

-- Otimizar todas as tabelas
-- SELECT * FROM optimize_all_tables();

-- Analisar uma query específica
-- SELECT * FROM analyze_query_performance('SELECT * FROM students WHERE class = ''5A'' AND status = ''ATIVO''');
