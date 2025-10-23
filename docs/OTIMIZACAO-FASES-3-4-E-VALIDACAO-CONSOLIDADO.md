# 📚 FASES 3-4 + VALIDAÇÃO + ROLLBACK + MONITORAMENTO (CONSOLIDADO)

**Este documento consolida todas as fases restantes em um único guia.**

---

## 🟡 FASE 3: OTIMIZAÇÕES DE MÉDIA PRIORIDADE

**Tempo Estimado**: 2 dias
**Impacto**: 5-8s → 3-5s (1.5x adicional)

### 3.1: ÍNDICES COMPOSTOS E PARCIAIS

#### SQL para Executar no Supabase:

```sql
-- ============================================================================
-- ÍNDICES COMPOSTOS PARA QUERIES FREQUENTES
-- ============================================================================

-- Students: Filtro por turma + status + deleted
CREATE INDEX CONCURRENTLY idx_students_class_status
ON students(class, status, deleted)
WHERE deleted = false;

-- Students: Filtro por turno + status
CREATE INDEX CONCURRENTLY idx_students_shift_status
ON students(shift, status)
WHERE status = 'ATIVO' AND deleted = false;

-- Students: Busca por nome (case insensitive)
CREATE INDEX CONCURRENTLY idx_students_name_lower
ON students(LOWER(name));

-- Absences: Por estudante + data
CREATE INDEX CONCURRENTLY idx_absences_student_date
ON student_absences(student_id, absence_date DESC);

-- Absences: Por bimestre + justificada
CREATE INDEX CONCURRENTLY idx_absences_bimester_justified
ON student_absences(bimester, is_justified);

-- Interactions: Por estudante + data
CREATE INDEX CONCURRENTLY idx_interactions_student_date
ON family_interactions(student_id, interaction_date DESC);

-- Tasks: Por estudante + resolvida
CREATE INDEX CONCURRENTLY idx_tasks_student_resolved
ON user_tasks(student_id, is_resolved);

-- Tasks: Por devido + não resolvida (tarefas pendentes)
CREATE INDEX CONCURRENTLY idx_tasks_due_unresolved
ON user_tasks(due_date)
WHERE is_resolved = false AND due_date IS NOT NULL;

-- ============================================================================
-- ÍNDICES GIN PARA JSONB
-- ============================================================================

-- Students: Busca em disabilities (JSONB)
CREATE INDEX CONCURRENTLY idx_students_disabilities_gin
ON students USING GIN (disabilities jsonb_path_ops);

-- Students: Busca em address (JSONB)
CREATE INDEX CONCURRENTLY idx_students_address_gin
ON students USING GIN (address jsonb_path_ops);

-- Contacts: Busca em whatsapp_data (JSONB)
CREATE INDEX CONCURRENTLY idx_contacts_whatsapp_gin
ON student_contacts USING GIN (whatsapp_data jsonb_path_ops);

-- ============================================================================
-- ATUALIZAR STATISTICS
-- ============================================================================

-- Atualizar statistics para queries mais precisas
ANALYZE students;
ANALYZE student_absences;
ANALYZE family_interactions;
ANALYZE user_tasks;
ANALYZE student_contacts;

-- Ver statistics
SELECT schemaname, tablename, last_analyze, last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public';
```

**Checklist**:
- [ ] Índices compostos criados (7 índices)
- [ ] Índices GIN criados para JSONB (3 índices)
- [ ] ANALYZE executado
- [ ] Statistics atualizadas

### 3.2: EXPLAIN ANALYZE - Otimizar Queries Críticas

**Queries para Analisar**:

```sql
-- 1. Listar estudantes ativos por turma
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM students
WHERE class = '5A' AND status = 'ATIVO' AND deleted = false
ORDER BY name
LIMIT 50;

-- 2. Buscar faltas de um estudante
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM student_absences
WHERE student_id = 'uuid-aqui'
ORDER BY absence_date DESC;

-- 3. Buscar estudantes com deficiência
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM students
WHERE disabilities IS NOT NULL
  AND deleted = false;

-- 4. Dashboard: Contar faltas por turma
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT class, COUNT(*) as total
FROM students s
JOIN student_absences a ON s.id = a.student_id
WHERE s.status = 'ATIVO'
GROUP BY class;
```

**Analisar**:
- Seq Scan → Index Scan (bom!)
- Execution Time < 100ms
- Buffers: hits > reads (cache funcionando)

**Checklist**:
- [ ] EXPLAIN ANALYZE executado em 10 queries críticas
- [ ] Seq Scans eliminados (substituídos por Index Scans)
- [ ] Execution time < 100ms para queries simples
- [ ] Documentado em planilha (query, before, after, improvement)

### 3.3: CONNECTION POOLING (Opcional - apenas se necessário)

**Quando Usar**: Se observar "too many connections" no Supabase logs

**Opção 1: Supabase Pooler (Recomendado)**

No dashboard Supabase:
- Settings → Database → Connection Pooling → Enable
- Mode: Transaction
- Pool Size: 20

**Opção 2: pgBouncer (se self-hosted)**

```ini
[databases]
* = host=db.xxx.supabase.co port=5432

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
```

**Checklist**:
- [ ] Verificar logs: "too many connections" aparece? (Se NÃO, skip)
- [ ] Se SIM: Habilitar Supabase Pooler
- [ ] Validar: Connection count < 20 (query: `SELECT count(*) FROM pg_stat_activity`)

---

## 🟢 FASE 4: OTIMIZAÇÕES DE BAIXA PRIORIDADE

**Tempo Estimado**: 1 dia
**Impacto**: Polimento final

### 4.1: count: 'exact' → 'estimated'

**Arquivo**: Todas as APIs (buscar e substituir)

```bash
# Buscar todos os usos
grep -r "count: 'exact'" src/app/api

# Substituir por 'estimated' onde total não é crítico
# Manter 'exact' apenas em:
# - Paginação de primeira página (para total correto)
# - Relatórios administrativos
```

**Regra**:
- **Primeira página** (page === 1): `count: 'exact'`
- **Páginas seguintes** (page > 1): `count: 'planned'` (sem count)
- **Cursor pagination**: Sem count

**Exemplo**:

```typescript
// ANTES
.select('*', { count: 'exact' })

// DEPOIS
.select('*', {
  count: page === 1 ? 'estimated' : 'planned'
})
```

**Checklist**:
- [ ] Substituído em 6 APIs principais
- [ ] Validado: COUNT time reduzido (50-100ms → 5-10ms)

### 4.2: BUNDLE OPTIMIZATION FINAL

```bash
# 1. Analisar bundle atual
npm run analyze

# 2. Identificar pacotes grandes
# Target: Cada chunk < 100KB

# 3. Lazy load componentes pesados
```

**Componentes para Lazy Load**:

```typescript
// Charts (Recharts é pesado: ~200KB)
const AbsenceChart = lazy(() => import('@/components/charts/AbsenceChart'));
const KPIChart = lazy(() => import('@/components/charts/KPIChart'));

// Tabelas complexas
const StudentTable = lazy(() => import('@/components/StudentTable'));

// Modais pesados
const StudentDialog = lazy(() => import('@/components/StudentDialog'));
```

**Checklist**:
- [ ] Bundle total < 500KB (compressed)
- [ ] Cada chunk < 100KB
- [ ] Lazy loading de charts
- [ ] Lazy loading de tabelas
- [ ] Code splitting validado

### 4.3: POLIMENTO FINAL

**Otimizações Menores**:

```typescript
// 1. Remover console.logs de produção
// next.config.mjs
const nextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

// 2. Minificar IDs de classes CSS
const nextConfig = {
  experimental: {
    optimizeCss: true,
  },
};

// 3. Preload fonts críticos
// app/layout.tsx
<link
  rel="preload"
  href="/fonts/inter.woff2"
  as="font"
  type="font/woff2"
  crossOrigin="anonymous"
/>
```

**Checklist**:
- [ ] console.logs removidos
- [ ] CSS minificado
- [ ] Fonts preloaded
- [ ] Imagens otimizadas (WebP, lazy load)

---

## ✅ VALIDAÇÃO E TESTES

### Teste 1: Lighthouse Audit

```bash
# Baseline (antes)
npx lighthouse https://seu-app.vercel.app \
  --throttling.rttMs=300 \
  --throttling.throughputKbps=400 \
  --output=html \
  --output-path=./docs/performance/baseline.html

# Após otimizações
npx lighthouse https://seu-app-optimized.vercel.app \
  --throttling.rttMs=300 \
  --throttling.throughputKbps=400 \
  --output=html \
  --output-path=./docs/performance/optimized.html

# Comparar
code --diff docs/performance/baseline.html docs/performance/optimized.html
```

**Critérios de Sucesso**:
- ✅ Performance Score: > 90
- ✅ FCP: < 2s
- ✅ LCP: < 4s
- ✅ CLS: < 0.1
- ✅ TBT: < 300ms

### Teste 2: WebPageTest (3G Slow)

1. Acessar: https://www.webpagetest.org/
2. URL: https://seu-app.vercel.app
3. Test Location: Dulles, VA - Chrome
4. Connection: 3G Slow (400 Kbps, 400ms RTT)
5. Run Test

**Critérios de Sucesso**:
- ✅ First Byte: < 1s
- ✅ Start Render: < 3s
- ✅ Document Complete: < 5s
- ✅ Fully Loaded: < 8s

### Teste 3: Real User Testing (3G)

**Chrome DevTools**:
1. DevTools → Network → Throttling → Custom
2. Download: 400 Kbps
3. Upload: 200 Kbps
4. Latency: 400ms

**Checklist Manual**:
- [ ] Login: < 2s
- [ ] Dashboard load: < 5s
- [ ] Lista de estudantes: Primeira página < 1s
- [ ] Scroll infinito: Próxima página < 2s
- [ ] Criar estudante: < 3s
- [ ] Editar estudante: < 2s
- [ ] Busca: < 1s (com debounce)

### Teste 4: Cache Validation

```bash
# 1. Primeira carga (cache vazio)
time curl -H "Authorization: Bearer $TOKEN" \
  "https://seu-app.vercel.app/api/students?limit=50"
# Esperado: 500ms - 1s

# 2. Segunda carga (React Query cache)
# No navegador, recarregar página
# Esperado: < 100ms (disk cache)

# 3. Terceira carga (HTTP cache - após 1 min)
time curl -H "Authorization: Bearer $TOKEN" \
  "https://seu-app.vercel.app/api/students?limit=50"
# Esperado: 304 Not Modified, < 100ms
```

**Critérios de Sucesso**:
- ✅ Cache hit rate: > 80%
- ✅ Cached requests: < 100ms
- ✅ HTTP 304: Funcionando

### Teste 5: Error Rate (3G)

```bash
# Script de teste de carga
for i in {1..100}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "Authorization: Bearer $TOKEN" \
    "https://seu-app.vercel.app/api/students?limit=50" \
    --max-time 10
done | sort | uniq -c
```

**Critérios de Sucesso**:
- ✅ 200 OK: > 95%
- ✅ 5xx errors: < 2%
- ✅ Timeouts: < 3%

---

## 🔄 ROLLBACK PLAN

### Ponto de Restauração por Fase

```bash
# Fase 1 → Fase 0 (baseline)
git checkout v1.0-pre-optimization

# Fase 2 → Fase 1
git checkout v1.1-optimization-critical

# Fase 3 → Fase 2
git checkout v1.2-optimization-high

# Fase 4 → Fase 3
git checkout v1.3-optimization-medium
```

### Rollback de Materialized Views

```sql
-- Remover cron job
SELECT cron.unschedule('refresh-all-mvs');

-- Dropar MVs
DROP MATERIALIZED VIEW IF EXISTS absences_with_student_info CASCADE;
DROP MATERIALIZED VIEW IF EXISTS interactions_with_student_info CASCADE;
DROP MATERIALIZED VIEW IF EXISTS tasks_with_student_info CASCADE;
DROP MATERIALIZED VIEW IF EXISTS certificates_with_student_info CASCADE;
DROP MATERIALIZED VIEW IF EXISTS suspensions_with_student_info CASCADE;

-- Revert APIs para usar JOINs
# (git checkout arquivos específicos da tag anterior)
```

### Rollback de Índices

```sql
-- Listar índices criados
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%';

-- Dropar índices específicos
DROP INDEX CONCURRENTLY idx_students_class_status;
DROP INDEX CONCURRENTLY idx_students_shift_status;
-- ... (todos os outros)
```

### Rollback de React Query

```bash
# 1. Desinstalar
npm uninstall @tanstack/react-query @tanstack/react-query-devtools

# 2. Remover QueryProvider de layout.tsx
# 3. Revert hooks para versão sem React Query (git checkout)
```

**IMPORTANTE**: Fazer rollback INCREMENTAL (fase por fase), nunca tudo de uma vez.

---

## 📊 MONITORAMENTO CONTÍNUO

### Dashboard de Performance (Vercel Analytics)

**Métricas a Acompanhar**:
- Real User Monitoring (RUM)
- Core Web Vitals (LCP, FID, CLS)
- Error Rate
- Response Time (p50, p95, p99)

**Alertas** (configurar no Vercel):
- LCP > 4s → Email
- Error Rate > 10% → Email
- Response Time p95 > 2s → Email

### Supabase Dashboard

**Monitorar Diariamente**:
- Database Size
- Active Connections
- Query Performance
- Slow Queries (> 1s)

**Alertas**:
- Connections > 80% → Email
- Storage > 90% → Email

### Custom Monitoring Endpoint

**Arquivo**: `src/app/api/monitoring/health/route.ts`

```typescript
/**
 * Endpoint de health check completo
 */

import { NextRequest } from 'next/server';
import { successResponse } from '@/app/api/_utils/response';
import { getAllPerformanceMetrics } from '@/utils/adaptiveRetry';
import { getAllCircuitBreakers } from '@/utils/circuitBreaker';

export async function GET(req: NextRequest) {
  const performanceMetrics = getAllPerformanceMetrics();
  const circuitBreakers: Record<string, any> = {};

  getAllCircuitBreakers().forEach((breaker, name) => {
    circuitBreakers[name] = breaker.getMetrics();
  });

  return successResponse({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    performance: performanceMetrics,
    circuitBreakers,
    uptime: process.uptime(),
  });
}
```

**Cron Job de Monitoramento** (Opcional):

```yaml
# .github/workflows/monitoring-health-check.yml
name: Health Check

on:
  schedule:
    - cron: '*/15 * * * *' # A cada 15 min

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - name: Check health endpoint
        run: |
          response=$(curl -s https://seu-app.vercel.app/api/monitoring/health)
          echo "$response" | jq .

          # Verificar se está healthy
          status=$(echo "$response" | jq -r '.data.status')
          if [ "$status" != "healthy" ]; then
            echo "❌ Health check failed!"
            exit 1
          fi
```

---

## 📋 CHECKLIST FINAL CONSOLIDADO

### Pré-Implementação
- [ ] Backup Supabase criado
- [ ] Tag Git criada (v1.0-pre-optimization)
- [ ] Baseline capturado (Lighthouse, Bundle, HAR)
- [ ] Branch criada

### Fase 1 (Críticas)
- [ ] Over-fetching: 6 APIs otimizadas
- [ ] Compressão: Habilitada e validada (70-80%)
- [ ] React Query: Integrado e funcionando
- [ ] HTTP Cache: Configurado (s-maxage, stale-while-revalidate)
- [ ] Tag: v1.1-optimization-critical

### Fase 2 (Altas)
- [ ] Materialized Views: 5 MVs criadas
- [ ] Cron job: Refresh a cada 5 min
- [ ] Infinite Scroll: Implementado
- [ ] Cursor pagination: Funcionando
- [ ] Retry adaptativo: Testado
- [ ] Circuit Breaker: Validado
- [ ] Tag: v1.2-optimization-high

### Fase 3 (Médias)
- [ ] Índices compostos: 7 criados
- [ ] Índices GIN: 3 criados
- [ ] EXPLAIN ANALYZE: 10 queries otimizadas
- [ ] Connection pooling: Configurado (se necessário)
- [ ] Tag: v1.3-optimization-medium

### Fase 4 (Baixas)
- [ ] count: 'estimated' implementado
- [ ] Bundle < 500KB
- [ ] Lazy loading: Charts, tabelas
- [ ] Polimento: console.logs removidos, CSS minificado
- [ ] Tag: v1.4-optimization-low

### Validação
- [ ] Lighthouse: Performance > 90
- [ ] WebPageTest 3G: < 5s total load
- [ ] Cache: Hit rate > 80%
- [ ] Error rate: < 5%
- [ ] Real user testing: Todos os fluxos < 5s

### Deploy Produção
- [ ] Merge para main
- [ ] Deploy automático
- [ ] Smoke tests
- [ ] Monitorar primeiras 24h
- [ ] Coletar feedback

---

## 🎯 RESULTADO ESPERADO FINAL

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| **Loading Time (3G)** | 60-90s | 3-5s | **15-20x** |
| **TTFB** | 2-5s | < 500ms | **10x** |
| **FCP** | 8-15s | < 2s | **7x** |
| **LCP** | 15-30s | < 4s | **7x** |
| **Payload Size** | 4.2MB | 500KB | **8x** |
| **Query Time** | 2-5s | 300ms | **10x** |
| **Cache Hit Rate** | 0% | > 80% | ∞ |
| **Error Rate** | 30-50% | < 5% | **10x** |
| **Failed Requests** | 50% | < 5% | **10x** |

---

**DOCUMENTAÇÃO COMPLETA** ✅

**TOTAL DE GUIAS**: 150KB+ de documentação detalhada

**PRÓXIMO PASSO**: Iniciar implementação pela [Fase 1](./OTIMIZACAO-SUPABASE-REDES-RUINS-GUIA-COMPLETO.md)
