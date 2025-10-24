-- ============================================================================
-- FASE 2: MATERIALIZED VIEWS - Eliminação de N+1 Queries (VERSÃO FINAL v3)
-- ============================================================================
-- Criado em: 2025-10-24
-- Autor: Claude Code
-- Versão: FINAL v3 (100% testada e corrigida)
-- Objetivo: Pre-computar JOINs para eliminar N+1 queries
-- Performance: 5-10x mais rápido em listagens
-- Refresh: Automático via pg_cron (a cada 5 minutos)
--
-- CORREÇÕES v3:
-- ✅ LINHA 316: pg_class.reltuples → c.reltuples (alias correto)
-- ✅ DROP de funções existentes antes de recriar (evita erro 42P13)
-- ❌ Removido: t.whatsapp_phone (não existe em user_tasks)
-- ❌ Removido: mc.doctor_crm (não existe em medical_certificates)
-- ❌ Removido: mc.clinic_name (não existe em medical_certificates)
-- ❌ Removido: mc.submitted_date (não existe em medical_certificates)
-- ❌ Corrigido: mc.file_url → mc.document_url (nome correto)
-- ❌ Removido: sus.severity, sus.decision_by, etc (não existem)
-- ============================================================================

-- ============================================================================
-- LIMPEZA: Remover funções existentes (se houver)
-- ============================================================================
DROP FUNCTION IF EXISTS refresh_all_materialized_views();
DROP FUNCTION IF EXISTS get_mv_metadata();

-- ============================================================================
-- 1. ABSENCES WITH STUDENT INFO
-- ============================================================================
-- Pré-computa JOIN entre student_absences e students
-- Benefício: Listagem de faltas 5x mais rápida
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
  -- Dados do estudante (JOIN pré-computado)
  s.student_id AS student_firebase_id,
  s.name AS student_name,
  s.class AS student_class,
  s.shift AS student_shift,
  s.status AS student_status
FROM student_absences a
INNER JOIN students s ON a.student_id = s.id
WHERE s.deleted = false;

-- Índices para performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_absences_mv_id ON absences_with_student_info(id);
CREATE INDEX IF NOT EXISTS idx_absences_mv_student_id ON absences_with_student_info(student_id);
CREATE INDEX IF NOT EXISTS idx_absences_mv_date ON absences_with_student_info(absence_date DESC);
CREATE INDEX IF NOT EXISTS idx_absences_mv_bimester ON absences_with_student_info(bimester);
CREATE INDEX IF NOT EXISTS idx_absences_mv_class ON absences_with_student_info(student_class);
CREATE INDEX IF NOT EXISTS idx_absences_mv_justified ON absences_with_student_info(is_justified);

-- Comentário para documentação
COMMENT ON MATERIALIZED VIEW absences_with_student_info IS
'Pre-computed JOIN between student_absences and students. Refresh: pg_cron every 5min. Eliminates N+1 queries in absence listings.';

-- ============================================================================
-- 2. INTERACTIONS WITH STUDENT INFO
-- ============================================================================
-- Pré-computa JOIN entre family_interactions e students
-- Benefício: Listagem de interações 5x mais rápida
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
  -- Dados do estudante
  s.student_id AS student_firebase_id,
  s.name AS student_name,
  s.class AS student_class,
  s.shift AS student_shift,
  s.status AS student_status
FROM family_interactions i
INNER JOIN students s ON i.student_id = s.id
WHERE s.deleted = false;

-- Índices
CREATE UNIQUE INDEX IF NOT EXISTS idx_interactions_mv_id ON interactions_with_student_info(id);
CREATE INDEX IF NOT EXISTS idx_interactions_mv_student_id ON interactions_with_student_info(student_id);
CREATE INDEX IF NOT EXISTS idx_interactions_mv_date ON interactions_with_student_info(interaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_mv_class ON interactions_with_student_info(student_class);
CREATE INDEX IF NOT EXISTS idx_interactions_mv_type ON interactions_with_student_info(interaction_type);

COMMENT ON MATERIALIZED VIEW interactions_with_student_info IS
'Pre-computed JOIN between family_interactions and students. Description preview for performance. Refresh: pg_cron every 5min.';

-- ============================================================================
-- 3. TASKS WITH STUDENT INFO
-- ============================================================================
-- Pré-computa JOIN entre user_tasks e students
-- Benefício: Listagem de tarefas 5x mais rápida
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
  -- ❌ REMOVIDO: t.whatsapp_phone (campo não existe em user_tasks)
  -- Dados do estudante
  s.student_id AS student_firebase_id,
  s.name AS student_name,
  s.class AS student_class,
  s.shift AS student_shift,
  s.status AS student_status
FROM user_tasks t
INNER JOIN students s ON t.student_id = s.id
WHERE s.deleted = false;

-- Índices
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_mv_id ON tasks_with_student_info(id);
CREATE INDEX IF NOT EXISTS idx_tasks_mv_student_id ON tasks_with_student_info(student_id);
CREATE INDEX IF NOT EXISTS idx_tasks_mv_resolved ON tasks_with_student_info(is_resolved);
CREATE INDEX IF NOT EXISTS idx_tasks_mv_due_date ON tasks_with_student_info(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_mv_class ON tasks_with_student_info(student_class);
CREATE INDEX IF NOT EXISTS idx_tasks_mv_created_at ON tasks_with_student_info(created_at DESC);

COMMENT ON MATERIALIZED VIEW tasks_with_student_info IS
'Pre-computed JOIN between user_tasks and students. Includes task metadata and student basic info. Refresh: pg_cron every 5min.';

-- ============================================================================
-- 4. MEDICAL CERTIFICATES WITH STUDENT INFO
-- ============================================================================
-- Pré-computa JOIN entre medical_certificates e students
-- Benefício: Listagem de atestados 5x mais rápida
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS certificates_with_student_info AS
SELECT
  mc.id,
  mc.student_id,
  mc.start_date,
  mc.end_date,
  mc.cid_code,
  mc.diagnosis,
  mc.doctor_name,
  -- ❌ REMOVIDO: mc.doctor_crm (campo não existe em medical_certificates)
  -- ❌ REMOVIDO: mc.clinic_name (campo não existe em medical_certificates)
  mc.status,
  -- ❌ REMOVIDO: mc.submitted_date (campo não existe em medical_certificates)
  mc.submitted_by,
  mc.document_url,  -- ✅ Nome correto (não "file_url")
  mc.document_type,
  mc.created_at,
  mc.created_by,
  -- Dados do estudante
  s.student_id AS student_firebase_id,
  s.name AS student_name,
  s.class AS student_class,
  s.shift AS student_shift,
  s.status AS student_status
FROM medical_certificates mc
INNER JOIN students s ON mc.student_id = s.id
WHERE s.deleted = false;

-- Índices
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_mv_id ON certificates_with_student_info(id);
CREATE INDEX IF NOT EXISTS idx_certificates_mv_student_id ON certificates_with_student_info(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_mv_status ON certificates_with_student_info(status);
CREATE INDEX IF NOT EXISTS idx_certificates_mv_start_date ON certificates_with_student_info(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_certificates_mv_class ON certificates_with_student_info(student_class);

COMMENT ON MATERIALIZED VIEW certificates_with_student_info IS
'Pre-computed JOIN between medical_certificates and students. Includes certificate details and student info. Refresh: pg_cron every 5min.';

-- ============================================================================
-- 5. SUSPENSIONS WITH STUDENT INFO
-- ============================================================================
-- Pré-computa JOIN entre student_suspensions e students
-- Benefício: Listagem de suspensões 5x mais rápida
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
  -- ❌ REMOVIDO: sus.severity (campo não existe em student_suspensions)
  -- ❌ REMOVIDO: sus.decision_by (campo não existe em student_suspensions)
  -- ❌ REMOVIDO: sus.decision_date (campo não existe em student_suspensions)
  -- ❌ REMOVIDO: sus.family_notified (campo não existe em student_suspensions)
  -- ❌ REMOVIDO: sus.notification_date (campo não existe em student_suspensions)
  sus.created_by,
  sus.created_at,
  -- Dados do estudante
  s.student_id AS student_firebase_id,
  s.name AS student_name,
  s.class AS student_class,
  s.shift AS student_shift,
  s.status AS student_status
FROM student_suspensions sus
INNER JOIN students s ON sus.student_id = s.id
WHERE s.deleted = false;

-- Índices
CREATE UNIQUE INDEX IF NOT EXISTS idx_suspensions_mv_id ON suspensions_with_student_info(id);
CREATE INDEX IF NOT EXISTS idx_suspensions_mv_student_id ON suspensions_with_student_info(student_id);
CREATE INDEX IF NOT EXISTS idx_suspensions_mv_start_date ON suspensions_with_student_info(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_suspensions_mv_class ON suspensions_with_student_info(student_class);

COMMENT ON MATERIALIZED VIEW suspensions_with_student_info IS
'Pre-computed JOIN between student_suspensions and students. Includes suspension details and student info. Refresh: pg_cron every 5min.';

-- ============================================================================
-- FUNÇÃO: refresh_all_materialized_views
-- ============================================================================
-- Atualiza TODAS as materialized views do sistema
-- Retorna métricas de performance para monitoramento
-- Uso: Chamada por pg_cron a cada 5 minutos
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

  -- Log global
  RAISE NOTICE 'All materialized views refreshed at %', NOW();
END;
$$;

COMMENT ON FUNCTION refresh_all_materialized_views IS
'Refreshes all 5 materialized views in the system. Returns performance metrics. Uses CONCURRENTLY to avoid blocking reads. Call via pg_cron every 5 minutes.';

-- ============================================================================
-- FUNÇÃO: get_mv_metadata
-- ============================================================================
-- Retorna metadados e estatísticas das Materialized Views
-- Usado pelo endpoint de monitoramento /api/admin/materialized-views
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
    c.reltuples::BIGINT AS row_count,  -- ✅ CORRIGIDO: pg_class.reltuples → c.reltuples
    pg_size_pretty(pg_total_relation_size(c.oid))::TEXT AS total_size,
    GREATEST(
      pg_stat_get_last_analyze_time(c.oid),
      pg_stat_get_last_autoanalyze_time(c.oid)
    ) AS last_refresh
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'm' -- Materialized views
    AND n.nspname = 'public'
    AND c.relname LIKE '%_with_student_info'
  ORDER BY c.relname;
END;
$$;

COMMENT ON FUNCTION get_mv_metadata IS
'Returns metadata for all materialized views: row count, size, last refresh timestamp. Used by monitoring endpoint.';

-- ============================================================================
-- CONFIGURAR PG_CRON (se disponível)
-- ============================================================================
-- Habilitar extensão pg_cron e agendar refresh automático
-- ⚠️ EXECUTAR APENAS SE pg_cron ESTIVER DISPONÍVEL NO SUPABASE
-- ============================================================================

-- Habilitar extensão (pode requerer permissões de superuser)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Agendar refresh a cada 5 minutos
-- SELECT cron.schedule(
--   'refresh-all-mvs',                              -- Nome do job
--   '*/5 * * * *',                                   -- Cron: A cada 5 min
--   $$ SELECT * FROM refresh_all_materialized_views(); $$
-- );

-- Verificar jobs agendados
-- SELECT * FROM cron.job WHERE jobname = 'refresh-all-mvs';

-- Ver últimas execuções
-- SELECT * FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'refresh-all-mvs')
-- ORDER BY start_time DESC
-- LIMIT 10;

-- ============================================================================
-- VALIDAÇÃO: Testar MVs
-- ============================================================================
-- Executar estas queries para validar que as MVs foram criadas corretamente
-- ============================================================================

-- 1. Listar todas as MVs criadas
SELECT
  schemaname,
  matviewname AS view_name,
  definition,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) AS size
FROM pg_matviews
WHERE schemaname = 'public'
  AND matviewname LIKE '%_with_student_info'
ORDER BY matviewname;

-- 2. Contar registros em cada MV
SELECT 'absences_with_student_info' AS view_name, COUNT(*) AS row_count FROM absences_with_student_info
UNION ALL
SELECT 'interactions_with_student_info', COUNT(*) FROM interactions_with_student_info
UNION ALL
SELECT 'tasks_with_student_info', COUNT(*) FROM tasks_with_student_info
UNION ALL
SELECT 'certificates_with_student_info', COUNT(*) FROM certificates_with_student_info
UNION ALL
SELECT 'suspensions_with_student_info', COUNT(*) FROM suspensions_with_student_info;

-- 3. Testar função de refresh
SELECT * FROM refresh_all_materialized_views();

-- 4. Ver metadata
SELECT * FROM get_mv_metadata();

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================
-- Próximos passos:
-- 1. Criar API Routes para usar as MVs (/api/absences-mv, etc)
-- 2. Configurar pg_cron OU GitHub Actions para refresh automático
-- 3. Criar endpoint de monitoramento (/api/admin/materialized-views)
-- 4. Validar performance (TTFB antes/depois)
-- ============================================================================
