-- ============================================================================
-- MIGRATION 003: FUNÇÕES DE ANÁLISE DE QUERIES (FASE 3.2)
-- ============================================================================
--
-- OBJETIVO: Criar funções para EXPLAIN ANALYZE de queries críticas
--
-- USO: Monitorar performance de queries em produção
--
-- EXECUÇÃO:
-- 1. Supabase Dashboard → SQL Editor
-- 2. Colar todo este arquivo
-- 3. Run
--
-- ============================================================================

-- ============================================================================
-- FUNÇÃO: get_query_stats()
-- Retorna estatísticas de queries críticas usando EXPLAIN ANALYZE
-- ============================================================================

CREATE OR REPLACE FUNCTION get_query_stats()
RETURNS TABLE(
  query_name TEXT,
  execution_time_ms NUMERIC,
  planning_time_ms NUMERIC,
  rows_returned INTEGER,
  uses_index BOOLEAN,
  full_plan JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
  plan_result JSONB;
BEGIN
  -- Query 1: Listar estudantes ativos por turma
  EXECUTE format('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT * FROM students WHERE class = %L AND status = %L AND deleted = false ORDER BY name LIMIT 50', '5A', 'ATIVO')
  INTO plan_result;

  query_name := 'students_by_class';
  execution_time_ms := (plan_result->0->'Execution Time')::numeric;
  planning_time_ms := (plan_result->0->'Planning Time')::numeric;
  rows_returned := (plan_result->0->'Plan'->'Actual Rows')::integer;
  uses_index := (plan_result->0->'Plan'->>'Node Type') != 'Seq Scan';
  full_plan := plan_result;
  RETURN NEXT;

  -- Query 2: Buscar faltas de um estudante
  EXECUTE format('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT * FROM student_absences WHERE student_id = (SELECT id FROM students LIMIT 1) ORDER BY absence_date DESC')
  INTO plan_result;

  query_name := 'absences_by_student';
  execution_time_ms := (plan_result->0->'Execution Time')::numeric;
  planning_time_ms := (plan_result->0->'Planning Time')::numeric;
  rows_returned := (plan_result->0->'Plan'->'Actual Rows')::integer;
  uses_index := (plan_result->0->'Plan'->>'Node Type') != 'Seq Scan';
  full_plan := plan_result;
  RETURN NEXT;

  -- Query 3: Buscar estudantes com deficiência
  EXECUTE 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT * FROM students WHERE disabilities IS NOT NULL AND deleted = false'
  INTO plan_result;

  query_name := 'students_with_disabilities';
  execution_time_ms := (plan_result->0->'Execution Time')::numeric;
  planning_time_ms := (plan_result->0->'Planning Time')::numeric;
  rows_returned := (plan_result->0->'Plan'->'Actual Rows')::integer;
  uses_index := (plan_result->0->'Plan'->>'Node Type') != 'Seq Scan';
  full_plan := plan_result;
  RETURN NEXT;

  -- Query 4: Dashboard - Contar faltas por turma
  EXECUTE 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT s.class, COUNT(*) as total FROM students s JOIN student_absences a ON s.id = a.student_id WHERE s.status = ''ATIVO'' GROUP BY s.class'
  INTO plan_result;

  query_name := 'absences_by_class';
  execution_time_ms := (plan_result->0->'Execution Time')::numeric;
  planning_time_ms := (plan_result->0->'Planning Time')::numeric;
  rows_returned := (plan_result->0->'Plan'->'Actual Rows')::integer;
  uses_index := (plan_result->0->'Plan'->>'Node Type') != 'Seq Scan';
  full_plan := plan_result;
  RETURN NEXT;

  RETURN;
END;
$$;

-- ============================================================================
-- FUNÇÃO: get_slow_queries()
-- Retorna queries lentas (> 100ms) registradas no pg_stat_statements
-- ============================================================================

-- Habilitar extensão pg_stat_statements (se ainda não habilitada)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

CREATE OR REPLACE FUNCTION get_slow_queries(threshold_ms INTEGER DEFAULT 100)
RETURNS TABLE(
  query TEXT,
  calls BIGINT,
  mean_time_ms NUMERIC,
  max_time_ms NUMERIC,
  total_time_ms NUMERIC
)
LANGUAGE sql
AS $$
  SELECT
    query,
    calls,
    ROUND(mean_exec_time::numeric, 2) AS mean_time_ms,
    ROUND(max_exec_time::numeric, 2) AS max_time_ms,
    ROUND(total_exec_time::numeric, 2) AS total_time_ms
  FROM pg_stat_statements
  WHERE mean_exec_time > threshold_ms
  ORDER BY mean_exec_time DESC
  LIMIT 20;
$$;

-- ============================================================================
-- FUNÇÃO: get_table_stats()
-- Retorna estatísticas de tabelas (tamanho, rows, index usage)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS TABLE(
  table_name TEXT,
  row_count BIGINT,
  table_size TEXT,
  index_size TEXT,
  total_size TEXT,
  seq_scans BIGINT,
  index_scans BIGINT,
  index_usage_pct NUMERIC
)
LANGUAGE sql
AS $$
  SELECT
    tablename::TEXT,
    n_live_tup,
    pg_size_pretty(pg_table_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS index_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    seq_scan,
    idx_scan,
    CASE
      WHEN seq_scan + idx_scan > 0 THEN
        ROUND(100.0 * idx_scan / (seq_scan + idx_scan), 2)
      ELSE 0
    END AS index_usage_pct
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY n_live_tup DESC;
$$;

-- ============================================================================
-- FUNÇÃO: get_unused_indexes()
-- Retorna índices nunca usados (candidatos a remoção)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_unused_indexes()
RETURNS TABLE(
  table_name TEXT,
  index_name TEXT,
  index_size TEXT,
  index_scans BIGINT
)
LANGUAGE sql
AS $$
  SELECT
    tablename::TEXT,
    indexrelname::TEXT,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
    AND idx_scan = 0
    AND indexrelname LIKE 'idx_%'
  ORDER BY pg_relation_size(indexrelid) DESC;
$$;

-- ============================================================================
-- FUNÇÃO: get_index_hit_rate()
-- Retorna taxa de cache hit dos índices (>= 99% é ideal)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_index_hit_rate()
RETURNS TABLE(
  table_name TEXT,
  index_hit_rate NUMERIC,
  cache_hits BIGINT,
  disk_reads BIGINT
)
LANGUAGE sql
AS $$
  SELECT
    relname::TEXT AS table_name,
    CASE
      WHEN idx_blks_hit + idx_blks_read > 0 THEN
        ROUND(100.0 * idx_blks_hit / (idx_blks_hit + idx_blks_read), 2)
      ELSE 0
    END AS index_hit_rate,
    idx_blks_hit AS cache_hits,
    idx_blks_read AS disk_reads
  FROM pg_statio_user_tables
  WHERE schemaname = 'public'
  ORDER BY relname;
$$;

-- ============================================================================
-- VALIDAÇÃO DAS FUNÇÕES
-- ============================================================================

-- Testar get_query_stats()
SELECT * FROM get_query_stats();

-- Testar get_slow_queries()
SELECT * FROM get_slow_queries(50);

-- Testar get_table_stats()
SELECT * FROM get_table_stats();

-- Testar get_unused_indexes()
SELECT * FROM get_unused_indexes();

-- Testar get_index_hit_rate()
SELECT * FROM get_index_hit_rate();

-- ============================================================================
-- EXEMPLOS DE USO
-- ============================================================================

-- Ver queries mais lentas
SELECT query, mean_time_ms, calls
FROM get_slow_queries(100)
LIMIT 10;

-- Ver índices nunca usados
SELECT index_name, index_size
FROM get_unused_indexes();

-- Ver uso de índices por tabela
SELECT table_name, index_usage_pct
FROM get_table_stats()
WHERE index_usage_pct < 90;

-- Ver taxa de cache hit
SELECT table_name, index_hit_rate
FROM get_index_hit_rate()
WHERE index_hit_rate < 99;

-- ============================================================================
-- ROLLBACK (SE NECESSÁRIO)
-- ============================================================================

/*
DROP FUNCTION IF EXISTS get_query_stats();
DROP FUNCTION IF EXISTS get_slow_queries(INTEGER);
DROP FUNCTION IF EXISTS get_table_stats();
DROP FUNCTION IF EXISTS get_unused_indexes();
DROP FUNCTION IF EXISTS get_index_hit_rate();
*/

-- ============================================================================
-- FIM DA MIGRATION 003
-- ============================================================================

-- ✅ CHECKLIST DE VALIDAÇÃO:
-- [ ] Todas as funções criadas sem erros
-- [ ] get_query_stats() retorna 4 queries analisadas
-- [ ] get_slow_queries() retorna queries (pode estar vazio se nenhuma lenta)
-- [ ] get_table_stats() retorna estatísticas de todas as tabelas
-- [ ] get_unused_indexes() executado (pode estar vazio)
-- [ ] get_index_hit_rate() retorna taxa >= 95% (ideal >= 99%)
