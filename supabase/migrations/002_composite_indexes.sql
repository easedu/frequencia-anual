-- ============================================================================
-- MIGRATION 002: ÍNDICES COMPOSTOS E PARCIAIS (FASE 3)
-- ============================================================================
--
-- OBJETIVO: Otimizar queries frequentes com índices compostos e parciais
--
-- IMPACTO ESPERADO: 5-8s → 3-5s (1.5x adicional)
--
-- EXECUÇÃO:
-- 1. Supabase Dashboard → SQL Editor
-- 2. Colar todo este arquivo
-- 3. Run
-- 4. Aguardar criação dos índices (CONCURRENTLY = não bloqueia)
--
-- ROLLBACK:
-- Ver seção ao final deste arquivo
--
-- ============================================================================

-- ============================================================================
-- ÍNDICES COMPOSTOS PARA QUERIES FREQUENTES
-- ============================================================================

-- Students: Filtro por turma + status + deleted
-- Usado em: /api/students?class=5A&status=ATIVO
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_class_status
ON students(class, status, deleted)
WHERE deleted = false;

-- Students: Filtro por turno + status
-- Usado em: Dashboard, filtros de turno
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_shift_status
ON students(shift, status)
WHERE status = 'ATIVO' AND deleted = false;

-- Students: Busca por nome (case insensitive)
-- Usado em: Search bar, autocomplete
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_name_lower
ON students(LOWER(name));

-- Absences: Por estudante + data (ordenado DESC)
-- Usado em: /api/absences?estudanteId=xxx
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_absences_student_date
ON student_absences(student_id, absence_date DESC);

-- Absences: Por bimestre + justificada
-- Usado em: Relatórios de faltas por bimestre
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_absences_bimester_justified
ON student_absences(bimester, is_justified);

-- Interactions: Por estudante + data (ordenado DESC)
-- Usado em: /api/interactions?estudanteId=xxx
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interactions_student_date
ON family_interactions(student_id, interaction_date DESC);

-- Tasks: Por estudante + resolvida
-- Usado em: /api/tasks?estudanteId=xxx&resolved=false
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_student_resolved
ON user_tasks(student_id, is_resolved);

-- Tasks: Por devido + não resolvida (tarefas pendentes)
-- Usado em: Dashboard de tarefas pendentes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_due_unresolved
ON user_tasks(due_date)
WHERE is_resolved = false AND due_date IS NOT NULL;

-- ============================================================================
-- ÍNDICES GIN PARA JSONB (BUSCA EM CAMPOS JSON)
-- ============================================================================

-- Students: Busca em disabilities (JSONB)
-- Usado em: /perfil-deficiente, filtros de deficiência
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_disabilities_gin
ON students USING GIN (disabilities jsonb_path_ops);

-- Students: Busca em address (JSONB)
-- Usado em: Filtros por CEP, bairro, cidade
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_address_gin
ON students USING GIN (address jsonb_path_ops);

-- Contacts: Busca em whatsapp_data (JSONB)
-- Usado em: Automação de WhatsApp, verificação de contatos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_whatsapp_gin
ON student_contacts USING GIN (whatsapp_data jsonb_path_ops);

-- ============================================================================
-- ATUALIZAR STATISTICS (QUERY PLANNER)
-- ============================================================================

-- Atualizar statistics para queries mais precisas
-- ANALYZE coleta estatísticas sobre distribuição de dados
-- PostgreSQL usa isso para escolher o melhor plano de execução
ANALYZE students;
ANALYZE student_absences;
ANALYZE family_interactions;
ANALYZE user_tasks;
ANALYZE student_contacts;
ANALYZE medical_certificates;
ANALYZE student_suspensions;

-- ============================================================================
-- VALIDAÇÃO DOS ÍNDICES
-- ============================================================================

-- Ver statistics das tabelas
SELECT
  schemaname,
  tablename,
  last_analyze,
  last_autoanalyze,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- Ver índices criados
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Ver tamanho dos índices
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexrelname LIKE 'idx_%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================================
-- VERIFICAR USO DOS ÍNDICES (APÓS ALGUMAS HORAS)
-- ============================================================================

-- Ver índices mais usados
SELECT
  schemaname,
  tablename,
  indexrelname,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexrelname LIKE 'idx_%'
ORDER BY idx_scan DESC;

-- Ver índices NUNCA usados (candidatos a remoção)
SELECT
  schemaname,
  tablename,
  indexrelname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexrelname LIKE 'idx_%'
  AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================================
-- ROLLBACK (SE NECESSÁRIO)
-- ============================================================================

/*
-- Remover índices compostos
DROP INDEX CONCURRENTLY IF EXISTS idx_students_class_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_students_shift_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_students_name_lower;
DROP INDEX CONCURRENTLY IF EXISTS idx_absences_student_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_absences_bimester_justified;
DROP INDEX CONCURRENTLY IF EXISTS idx_interactions_student_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_tasks_student_resolved;
DROP INDEX CONCURRENTLY IF EXISTS idx_tasks_due_unresolved;

-- Remover índices GIN
DROP INDEX CONCURRENTLY IF EXISTS idx_students_disabilities_gin;
DROP INDEX CONCURRENTLY IF EXISTS idx_students_address_gin;
DROP INDEX CONCURRENTLY IF EXISTS idx_contacts_whatsapp_gin;
*/

-- ============================================================================
-- FIM DA MIGRATION 002
-- ============================================================================

-- ✅ CHECKLIST DE VALIDAÇÃO:
-- [ ] Todos os índices criados sem erros
-- [ ] ANALYZE executado em todas as tabelas
-- [ ] Statistics atualizadas (last_analyze recente)
-- [ ] Nenhum índice duplicado (verificar pg_indexes)
-- [ ] Tamanho total dos índices < 100MB (verificar pg_size_pretty)
-- [ ] Aguardar 24h e verificar uso (idx_scan > 0)
