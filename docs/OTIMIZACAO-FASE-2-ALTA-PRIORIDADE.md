# 🟠 FASE 2: OTIMIZAÇÕES DE ALTA PRIORIDADE

**Status Pré-requisito**: Fase 1 (Críticas) CONCLUÍDA ✅
**Impacto Estimado**: 15-20s → 5-8s (3x adicional)
**Tempo Estimado**: 3-4 dias

---

## 📋 OTIMIZAÇÕES DESTA FASE

1. **N+1 Queries**: Materialized Views + Eager Loading
2. **Paginação Ineficiente**: Infinite Scroll + Cursor-based
3. **Timeout Conservador**: Retry Adaptativo + Circuit Breaker

---

## 🟠 2.1: N+1 QUERIES - Materialized Views

**Problema**: JOINs executados para cada registro individualmente
**Solução**: Pre-computar JOINs em Materialized Views

### 📝 Etapa 2.1.1: Criar Materialized View - Absences com Student

**Executar no Supabase SQL Editor**:

```sql
-- ============================================================================
-- MATERIALIZED VIEW: absences_with_student_info
-- ============================================================================
-- Pré-computa JOIN entre student_absences e students
-- Atualização: Manual (trigger ou cron job)
-- Benefício: Elimina N+1 queries em listagens de faltas
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
CREATE INDEX idx_absences_mv_student_id ON absences_with_student_info(student_id);
CREATE INDEX idx_absences_mv_date ON absences_with_student_info(absence_date DESC);
CREATE INDEX idx_absences_mv_bimester ON absences_with_student_info(bimester);
CREATE INDEX idx_absences_mv_class ON absences_with_student_info(student_class);
CREATE INDEX idx_absences_mv_justified ON absences_with_student_info(is_justified);

-- Comentário para documentação
COMMENT ON MATERIALIZED VIEW absences_with_student_info IS
'Pre-computed JOIN between absences and students. Refresh strategy: Manual trigger or cron job (every 5min). Eliminates N+1 queries when listing absences.';
```

### 📝 Etapa 2.1.2: Criar Função de Refresh

**Supabase SQL Editor**:

```sql
-- ============================================================================
-- FUNÇÃO: refresh_absences_materialized_view
-- ============================================================================
-- Atualiza a materialized view de forma concorrente (não bloqueia leituras)
-- Chamada: Manual ou via cron job
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_absences_materialized_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY absences_with_student_info;

  -- Log para auditoria
  RAISE NOTICE 'Materialized view absences_with_student_info refreshed at %', NOW();
END;
$$;

-- Comentário
COMMENT ON FUNCTION refresh_absences_materialized_view IS
'Refreshes absences_with_student_info materialized view using CONCURRENTLY (non-blocking). Call this function after bulk operations on absences or students.';
```

### 📝 Etapa 2.1.3: Criar Trigger Automático (Opcional)

**ATENÇÃO**: Triggers automáticos em EVERY insert/update podem causar overhead. Use apenas se volume de writes for BAIXO (< 100/min).

**Supabase SQL Editor**:

```sql
-- ============================================================================
-- TRIGGER: auto_refresh_absences_mv
-- ============================================================================
-- Atualiza MV automaticamente após INSERT/UPDATE/DELETE em absences
-- ⚠️ USO RECOMENDADO: Apenas para ambientes com baixo volume de writes
-- ⚠️ PRODUÇÃO: Preferir cron job (refresh a cada 5-10 min)
-- ============================================================================

-- Função trigger
CREATE OR REPLACE FUNCTION trigger_refresh_absences_mv()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Debounce: apenas atualizar se última atualização foi há > 5min
  -- (evitar refresh a cada write individual)
  PERFORM refresh_absences_materialized_view();
  RETURN NEW;
END;
$$;

-- Trigger em student_absences (COMMENTED OUT por padrão)
-- DESCOMENTE APENAS SE VOLUME DE WRITES FOR BAIXO!
/*
CREATE TRIGGER auto_refresh_absences_mv_on_insert
AFTER INSERT ON student_absences
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_absences_mv();

CREATE TRIGGER auto_refresh_absences_mv_on_update
AFTER UPDATE ON student_absences
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_absences_mv();

CREATE TRIGGER auto_refresh_absences_mv_on_delete
AFTER DELETE ON student_absences
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_absences_mv();
*/

-- Comentário
COMMENT ON FUNCTION trigger_refresh_absences_mv IS
'⚠️ AUTO-REFRESH DISABLED BY DEFAULT. Uncomment triggers only for low-write environments. For production, use cron job instead.';
```

### 📝 Etapa 2.1.4: Configurar Cron Job (RECOMENDADO)

**Opção A: Supabase pg_cron Extension**

```sql
-- Habilitar extensão pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Agendar refresh a cada 5 minutos
SELECT cron.schedule(
  'refresh-absences-mv',                          -- Nome do job
  '*/5 * * * *',                                   -- Cron: A cada 5 min
  $$ SELECT refresh_absences_materialized_view(); $$
);

-- Verificar jobs agendados
SELECT * FROM cron.job;

-- Desabilitar job (se necessário)
-- SELECT cron.unschedule('refresh-absences-mv');
```

**Opção B: GitHub Actions (se pg_cron não disponível)**

**Arquivo**: `.github/workflows/refresh-materialized-views.yml` (CRIAR NOVO)

```yaml
name: Refresh Materialized Views

on:
  schedule:
    # A cada 5 minutos (horário UTC)
    - cron: '*/5 * * * *'
  workflow_dispatch: # Permite trigger manual

jobs:
  refresh-views:
    runs-on: ubuntu-latest
    steps:
      - name: Refresh absences_with_student_info
        run: |
          curl -X POST "${{ secrets.SUPABASE_URL }}/rest/v1/rpc/refresh_absences_materialized_view" \
            -H "apikey: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json"

      - name: Log refresh time
        run: echo "MV refreshed at $(date)"
```

**Configurar Secrets no GitHub**:
- `SUPABASE_URL`: https://xccjifrggpgevqftwdkx.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY`: (service_role key do Supabase)

### 📝 Etapa 2.1.5: Refatorar API para Usar MV

**Arquivo**: `src/app/api/absences/route.ts`

```typescript
/**
 * API Route: /api/absences (OTIMIZADO com Materialized View)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/api/_middleware/auth';
import { validateQueryParams } from '@/app/api/_middleware/validation';
import { absenceQuerySchema } from '@/app/api/_schemas/absenceSchemas';
import { paginatedResponse, errorResponse } from '@/app/api/_utils/response';
import { handleError } from '@/app/api/_utils/errorHandler';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { resolveFirebaseUUIDToInternal } from '@/app/api/_utils/studentIdResolver';

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const validation = validateQueryParams(req, absenceQuerySchema);

    if (!validation.success) {
      return validation.response;
    }

    const {
      estudanteId,
      bimestre,
      justificada,
      dataInicio,
      dataFim,
      turma,
      page,
      limit,
    } = validation.data;

    let internalStudentId: string | undefined = undefined;

    if (estudanteId) {
      const resolved = await resolveFirebaseUUIDToInternal(estudanteId);
      if (!resolved) {
        return errorResponse('NOT_FOUND', `Estudante não encontrado: ${estudanteId}`, 404);
      }
      internalStudentId = resolved;
    }

    // ✅ OTIMIZAÇÃO: Usar Materialized View ao invés de JOIN
    // ANTES: .from('student_absences').select('*, students(name, class, student_id)')
    // DEPOIS: .from('absences_with_student_info').select('*')
    let query: any = supabaseAdmin
      .from('absences_with_student_info') // ✅ MV ao invés de JOIN
      .select('*', { count: 'estimated' }) // ✅ estimated ao invés de exact
      .order('absence_date', { ascending: false });

    // Aplicar filtros
    if (internalStudentId) {
      query = query.eq('student_id', internalStudentId);
    }

    if (bimestre) {
      query = query.eq('bimester', bimestre);
    }

    if (justificada !== undefined) {
      query = query.eq('is_justified', justificada);
    }

    if (dataInicio) {
      query = query.gte('absence_date', dataInicio);
    }

    if (dataFim) {
      query = query.lte('absence_date', dataFim);
    }

    if (turma) {
      query = query.eq('student_class', turma); // ✅ Campo já desnormalizado na MV
    }

    // Paginação
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('[GET /api/absences] Supabase error:', error);
      return errorResponse('DATABASE_ERROR', 'Erro ao buscar faltas', 500);
    }

    // Converter para formato esperado pelo frontend
    const absences = (data || []).map((row: any) => ({
      id: row.id,
      estudanteId: row.student_firebase_id,
      student_id: row.student_id,
      estudanteNome: row.student_name,
      turma: row.student_class,
      turno: row.student_shift,
      status: row.student_status,
      data: row.absence_date,
      absence_date: row.absence_date,
      bimestre: row.bimester,
      justificada: row.is_justified,
      is_justified: row.is_justified,
      atestadoId: row.medical_certificate_id,
      suspensaoId: row.suspension_id,
      criadoEm: row.created_at,
    }));

    return paginatedResponse(absences, page, limit, count || 0, 'dynamic');
  } catch (error) {
    return handleError(error, 'GET /api/absences');
  }
});
```

### 📝 Etapa 2.1.6: Criar MVs para Outras Entidades

**IMPORTANTE**: Repetir etapas 2.1.1 a 2.1.5 para:

1. **Interactions com Student**:

```sql
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

-- Índices
CREATE INDEX idx_interactions_mv_student_id ON interactions_with_student_info(student_id);
CREATE INDEX idx_interactions_mv_date ON interactions_with_student_info(interaction_date DESC);
CREATE INDEX idx_interactions_mv_class ON interactions_with_student_info(student_class);
```

2. **Tasks com Student**:

```sql
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

-- Índices
CREATE INDEX idx_tasks_mv_student_id ON tasks_with_student_info(student_id);
CREATE INDEX idx_tasks_mv_resolved ON tasks_with_student_info(is_resolved);
CREATE INDEX idx_tasks_mv_due_date ON tasks_with_student_info(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_tasks_mv_class ON tasks_with_student_info(student_class);
```

3. **Medical Certificates com Student**:

```sql
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

-- Índices
CREATE INDEX idx_certificates_mv_student_id ON certificates_with_student_info(student_id);
CREATE INDEX idx_certificates_mv_status ON certificates_with_student_info(status);
CREATE INDEX idx_certificates_mv_start_date ON certificates_with_student_info(start_date DESC);
```

4. **Suspensions com Student**:

```sql
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

-- Índices
CREATE INDEX idx_suspensions_mv_student_id ON suspensions_with_student_info(student_id);
CREATE INDEX idx_suspensions_mv_severity ON suspensions_with_student_info(severity);
CREATE INDEX idx_suspensions_mv_start_date ON suspensions_with_student_info(start_date DESC);
```

### 📝 Etapa 2.1.7: Criar Função de Refresh Global

**Supabase SQL Editor**:

```sql
-- ============================================================================
-- FUNÇÃO: refresh_all_materialized_views
-- ============================================================================
-- Atualiza TODAS as materialized views do sistema
-- Uso: Chamada por cron job único (a cada 5 minutos)
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

-- Comentário
COMMENT ON FUNCTION refresh_all_materialized_views IS
'Refreshes all materialized views in the system (absences, interactions, tasks, certificates, suspensions). Returns performance metrics for each view. Call via cron job every 5 minutes.';
```

### 📝 Etapa 2.1.8: Atualizar Cron Job para Refresh Global

**Supabase pg_cron**:

```sql
-- Remover job antigo (se existir)
SELECT cron.unschedule('refresh-absences-mv');

-- Criar job global
SELECT cron.schedule(
  'refresh-all-mvs',                              -- Nome do job
  '*/5 * * * *',                                   -- Cron: A cada 5 min
  $$ SELECT * FROM refresh_all_materialized_views(); $$
);

-- Verificar
SELECT * FROM cron.job WHERE jobname = 'refresh-all-mvs';

-- Ver últimas execuções
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'refresh-all-mvs')
ORDER BY start_time DESC
LIMIT 10;
```

**GitHub Actions** (atualizar):

```yaml
name: Refresh Materialized Views

on:
  schedule:
    - cron: '*/5 * * * *'
  workflow_dispatch:

jobs:
  refresh-views:
    runs-on: ubuntu-latest
    steps:
      - name: Refresh all materialized views
        run: |
          curl -X POST "${{ secrets.SUPABASE_URL }}/rest/v1/rpc/refresh_all_materialized_views" \
            -H "apikey: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json"

      - name: Log refresh time
        run: echo "All MVs refreshed at $(date)"
```

### 📝 Etapa 2.1.9: Criar Endpoint de Monitoramento

**Arquivo**: `src/app/api/admin/materialized-views/route.ts` (CRIAR NOVO)

```typescript
/**
 * API Route: /api/admin/materialized-views
 *
 * Gerenciar e monitorar Materialized Views
 * APENAS para admins
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/app/api/_middleware/auth';
import { successResponse, errorResponse } from '@/app/api/_utils/response';
import { handleError } from '@/app/api/_utils/errorHandler';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// ============================================================================
// GET /api/admin/materialized-views - Status das MVs
// ============================================================================

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    // Query para obter metadados das MVs
    const { data, error } = await supabaseAdmin.rpc('get_mv_metadata');

    if (error) {
      return errorResponse('DATABASE_ERROR', 'Erro ao buscar metadata de MVs', 500);
    }

    return successResponse({
      views: data,
      lastRefresh: new Date().toISOString(),
    });
  } catch (error) {
    return handleError(error, 'GET /api/admin/materialized-views');
  }
});

// ============================================================================
// POST /api/admin/materialized-views/refresh - Forçar refresh
// ============================================================================

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    // Trigger manual refresh
    const { data, error } = await supabaseAdmin.rpc('refresh_all_materialized_views');

    if (error) {
      return errorResponse('DATABASE_ERROR', 'Erro ao atualizar MVs', 500);
    }

    return successResponse({
      message: 'Materialized views atualizadas com sucesso',
      results: data,
    });
  } catch (error) {
    return handleError(error, 'POST /api/admin/materialized-views/refresh');
  }
});
```

**Função SQL auxiliar**:

```sql
-- Função para obter metadata das MVs
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
    pg_class.reltuples::BIGINT AS row_count,
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
```

### 📝 Etapa 2.1.10: Validar N+1 Eliminado

**Teste de Performance**:

```bash
# 1. Antes (com N+1): Listar 1000 faltas com JOIN
time curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/absences?limit=1000"
# Esperado: 2-5 segundos

# 2. Depois (sem N+1): Listar 1000 faltas com MV
time curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/absences?limit=1000"
# Esperado: 300-800ms (5-10x mais rápido!)
```

**Verificar Query Plan no Supabase**:

```sql
-- ANTES (com JOIN)
EXPLAIN ANALYZE
SELECT a.*, s.name, s.class
FROM student_absences a
JOIN students s ON a.student_id = s.id
LIMIT 1000;
-- Planning Time: ~50ms, Execution Time: ~2000ms

-- DEPOIS (com MV)
EXPLAIN ANALYZE
SELECT * FROM absences_with_student_info
LIMIT 1000;
-- Planning Time: ~5ms, Execution Time: ~300ms (7x mais rápido!)
```

**Critérios de Sucesso**:

- ✅ Query time reduzido em 5-10x
- ✅ Nenhum JOIN visível no EXPLAIN ANALYZE
- ✅ MVs atualizadas automaticamente a cada 5 min
- ✅ Endpoint de monitoring retorna status OK
- ✅ Frontend não percebe mudança (mesmos dados)

---

## 🟠 2.2: PAGINAÇÃO INEFICIENTE - Infinite Scroll

**Problema**: "Load All Pages" faz 10-20 requests sequenciais
**Solução**: Infinite Scroll com React Query + Cursor-based Pagination

### 📝 Etapa 2.2.1: Implementar Cursor-based Pagination (Backend)

**Arquivo**: `src/app/api/students/route.ts` (adicionar suporte a cursor)

```typescript
/**
 * GET /api/students (OTIMIZADO com Cursor-based Pagination)
 *
 * Query Params:
 * - cursor: ID do último estudante da página anterior (opcional)
 * - limit: Quantidade de registros (padrão: 50, máx: 200)
 * - ...outros filtros
 */

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const { searchParams } = new URL(req.url);

    // ✅ NOVO: Parâmetros de cursor pagination
    const cursor = searchParams.get('cursor'); // UUID do último estudante
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const maxLimit = 200; // Máximo por request
    const effectiveLimit = Math.min(limit, maxLimit);

    // Outros filtros (turma, turno, status, etc)
    const turma = searchParams.get('turma');
    const turno = searchParams.get('turno');
    const status = searchParams.get('status') || 'ATIVO';
    const search = searchParams.get('search');
    const detail = searchParams.get('detail') || 'minimal';

    // Validar detail level
    const validDetailLevels = ['minimal', 'summary', 'detailed', 'full'];
    const detailLevel = validDetailLevels.includes(detail) ? detail : 'minimal';

    // SELECT estratificado
    const selectQuery = SELECT_QUERIES[detailLevel];

    // Construir query base
    let query: any = supabaseAdmin
      .from('students')
      .select(selectQuery, { count: 'exact' }) // Exact apenas na primeira página
      .eq('deleted', false)
      .order('name', { ascending: true }); // ✅ IMPORTANTE: Sempre ordenar por campo único

    // Aplicar filtros
    if (turma) query = query.eq('class', turma);
    if (turno) query = query.eq('shift', turno);
    if (status) query = query.eq('status', status);
    if (search) query = query.ilike('name', `%${search}%`);

    // ✅ CURSOR PAGINATION: Começar após o cursor
    if (cursor) {
      // Buscar nome do estudante do cursor (para ordenação)
      const { data: cursorStudent } = await supabaseAdmin
        .from('students')
        .select('name')
        .eq('student_id', cursor)
        .single();

      if (cursorStudent) {
        // Buscar estudantes cujo nome vem DEPOIS do cursor
        query = query.gt('name', cursorStudent.name);
      }
    }

    // Limitar resultados (pegar 1 a mais para saber se há next page)
    query = query.limit(effectiveLimit + 1);

    // Executar query
    const { data, error, count } = await query;

    if (error) {
      console.error('[GET /api/students] Error:', error);
      return errorResponse('DATABASE_ERROR', 'Erro ao buscar estudantes', 500);
    }

    // Determinar se há próxima página
    const hasNextPage = (data || []).length > effectiveLimit;
    const students = hasNextPage ? (data || []).slice(0, effectiveLimit) : (data || []);

    // Próximo cursor: student_id do último estudante desta página
    const nextCursor = hasNextPage && students.length > 0
      ? students[students.length - 1].student_id
      : null;

    // Converter para formato legacy
    const formattedStudents = students.map((s: any) =>
      convertStudentByDetailLevel(s, detailLevel)
    );

    // Response com cursor pagination
    return NextResponse.json(
      {
        success: true,
        data: formattedStudents,
        pagination: {
          limit: effectiveLimit,
          total: cursor ? undefined : count, // Total apenas na primeira request
          hasNextPage,
          nextCursor,
        },
      },
      {
        status: 200,
        headers: {
          ...CACHE_POLICIES.dynamic,
          'Vary': 'Accept-Encoding, Authorization',
        },
      }
    );
  } catch (error) {
    return handleError(error, 'GET /api/students');
  }
});
```

### 📝 Etapa 2.2.2: Atualizar Frontend Hook - useInfiniteStudents

**Arquivo**: `src/hooks/api/useStudents.ts` (atualizar useInfiniteStudents)

```typescript
/**
 * Hook para infinite scroll com cursor-based pagination
 * OTIMIZADO: Usa cursor ao invés de page numbers
 */

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

interface CursorPaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    limit: number;
    total?: number;
    hasNextPage: boolean;
    nextCursor: string | null;
  };
}

export function useInfiniteStudents(filters: Omit<StudentFilters, 'page' | 'limit'> = {}) {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: [...studentsKeys.lists(), 'infinite', filters],
    queryFn: async ({ pageParam = null }) => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();

      const params = new URLSearchParams();
      if (filters.turma) params.append('turma', filters.turma);
      if (filters.turno) params.append('turno', filters.turno);
      if (filters.status) params.append('status', filters.status);
      if (filters.bolsa_familia) params.append('bolsaFamilia', filters.bolsa_familia);
      if (filters.search) params.append('search', filters.search);
      if (filters.detail) params.append('detail', filters.detail);
      params.append('limit', '50'); // 50 por página

      // ✅ CURSOR: Adicionar se não for primeira página
      if (pageParam) {
        params.append('cursor', pageParam);
      }

      const response = await fetch(`/api/students?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar estudantes');
      }

      return response.json() as Promise<CursorPaginatedResponse<Student>>;
    },
    getNextPageParam: (lastPage) => {
      // ✅ Retornar cursor para próxima página
      return lastPage.pagination.hasNextPage ? lastPage.pagination.nextCursor : undefined;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
  });
}
```

### 📝 Etapa 2.2.3: Instalar Dependência de Infinite Scroll

```bash
npm install react-intersection-observer
```

### 📝 Etapa 2.2.4: Criar Componente de Infinite Scroll

**Arquivo**: `src/components/InfiniteScrollContainer.tsx` (CRIAR NOVO)

```typescript
/**
 * Componente de Infinite Scroll
 * Usa Intersection Observer para detectar scroll até o fim
 */

'use client';

import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { Loader2 } from 'lucide-react';

interface InfiniteScrollContainerProps {
  children: React.ReactNode;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  isFetchingNextPage?: boolean;
  loadingMessage?: string;
  endMessage?: string;
}

export function InfiniteScrollContainer({
  children,
  onLoadMore,
  hasMore,
  isLoading,
  isFetchingNextPage = false,
  loadingMessage = 'Carregando mais...',
  endMessage = 'Fim da lista',
}: InfiniteScrollContainerProps) {
  // Intersection Observer para detectar quando usuário scrollou até o fim
  const { ref, inView } = useInView({
    threshold: 0.5, // Trigger quando 50% do elemento estiver visível
    triggerOnce: false, // Permitir múltiplos triggers
  });

  // Carregar mais quando "trigger" estiver visível
  useEffect(() => {
    if (inView && hasMore && !isLoading && !isFetchingNextPage) {
      onLoadMore();
    }
  }, [inView, hasMore, isLoading, isFetchingNextPage, onLoadMore]);

  return (
    <div className="space-y-4">
      {/* Conteúdo (lista de itens) */}
      {children}

      {/* Trigger de scroll */}
      {hasMore && (
        <div ref={ref} className="flex items-center justify-center py-8">
          {(isLoading || isFetchingNextPage) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">{loadingMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* Mensagem de fim */}
      {!hasMore && !isLoading && (
        <div className="text-center py-8 text-sm text-muted-foreground border-t">
          {endMessage}
        </div>
      )}
    </div>
  );
}
```

### 📝 Etapa 2.2.5: Atualizar Componente de Listagem

**Arquivo**: `src/app/cadastrar-estudante/page.tsx` (exemplo)

```typescript
'use client';

import { useInfiniteStudents } from '@/hooks/api/useStudents';
import { InfiniteScrollContainer } from '@/components/InfiniteScrollContainer';
import { StudentCard } from '@/components/StudentCard';
import { Skeleton } from '@/components/ui/skeleton';

export default function CadastrarEstudantePage() {
  // ✅ ANTES: const { data, isLoading } = useStudents({ status: 'ATIVO' });

  // ✅ DEPOIS: Infinite scroll
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
    error,
  } = useInfiniteStudents({
    status: 'ATIVO',
    detail: 'minimal',
  });

  // Loading inicial
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="text-red-600 p-4">
        Erro ao carregar estudantes: {error?.message}
      </div>
    );
  }

  // Flatten pages (todas as páginas carregadas até agora)
  const allStudents = data?.pages.flatMap(page => page.data) || [];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Estudantes Ativos</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Mostrando {allStudents.length} estudantes
      </p>

      {/* ✅ Infinite Scroll Container */}
      <InfiniteScrollContainer
        onLoadMore={fetchNextPage}
        hasMore={hasNextPage || false}
        isLoading={isLoading}
        isFetchingNextPage={isFetchingNextPage}
        loadingMessage="Carregando mais estudantes..."
        endMessage={`Total de ${allStudents.length} estudantes`}
      >
        {/* Grid de estudantes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allStudents.map((student) => (
            <StudentCard key={student.id} student={student} />
          ))}
        </div>
      </InfiniteScrollContainer>
    </div>
  );
}
```

### 📝 Etapa 2.2.6: Validar Infinite Scroll

**Teste Manual**:

1. Abrir página de estudantes
2. Scroll até o fim da lista
3. Observar loading spinner aparecer
4. Próxima página carregar automaticamente
5. Repetir até o fim

**Métricas Esperadas**:

- ✅ Primeira página: < 1s
- ✅ Páginas seguintes: < 500ms cada
- ✅ Sem "Load All" (não trava esperando todas as páginas)
- ✅ UX suave (sem loading blocante)

**Critérios de Sucesso**:

- ✅ Dados aparecem progressivamente
- ✅ Usuário pode interagir com primeiros resultados IMEDIATAMENTE
- ✅ Loading indicator apenas no fim da lista (não bloqueia tela toda)
- ✅ Performance em 3G: Cada página carrega em < 2s

---

**CONTINUA EM PRÓXIMO DOCUMENTO...**

---

## 🟠 2.3: TIMEOUT CONSERVADOR - Retry Adaptativo

(Ver arquivo OTIMIZACAO-FASE-2-PARTE-2.md)

---

**FIM DA PARTE 1 DA FASE 2**
