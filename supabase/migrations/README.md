# 📁 Supabase Migrations - Fases 2, 3 e 4

Este diretório contém as migrations SQL para otimizações de performance do banco de dados Supabase.

## 🎯 Objetivo Geral

Otimizar a aplicação para redes ruins (3G), reduzindo tempo de carregamento de **60-90s para 3-5s** (15-20x mais rápido).

---

## 📋 Migrations Disponíveis

| Migration | Descrição | Fase | Impacto |
|-----------|-----------|------|---------|
| `001_materialized_views.sql` | 5 MVs para eliminar N+1 queries | Fase 2 | 15-20s → 5-8s (3x) |
| `002_composite_indexes.sql` | Índices compostos e parciais | Fase 3 | 5-8s → 3-5s (1.5x) |
| `003_query_analysis_functions.sql` | Funções de monitoramento de queries | Fase 3 | Diagnóstico |

---

## 🚀 Como Executar

### Via Supabase Dashboard (Recomendado)

1. Acesse: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
2. Abra o arquivo da migration desejada
3. Copie e cole o conteúdo no SQL Editor
4. Clique em "Run"
5. Verifique os resultados na aba "Results"

### Via Supabase CLI (Avançado)

```bash
# Aplicar todas as migrations em ordem
psql $DATABASE_URL -f supabase/migrations/001_materialized_views.sql
psql $DATABASE_URL -f supabase/migrations/002_composite_indexes.sql
psql $DATABASE_URL -f supabase/migrations/003_query_analysis_functions.sql
```

---

## ✅ Checklist de Validação

### Migration 001: Materialized Views (Fase 2)

- [ ] Todas as 5 Materialized Views criadas sem erros
- [ ] Função `refresh_all_materialized_views()` criada
- [ ] Função `get_mv_metadata()` criada
- [ ] ~20 índices criados com sucesso
- [ ] Executar query de validação:

```sql
SELECT * FROM get_mv_metadata();
-- Deve retornar 5 views
```

### Migration 002: Composite Indexes (Fase 3)

- [ ] 7 índices compostos criados sem erros
- [ ] 3 índices GIN (JSONB) criados sem erros
- [ ] ANALYZE executado em todas as tabelas
- [ ] Executar query de validação:

```sql
-- Ver statistics das tabelas
SELECT schemaname, tablename, last_analyze, n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- Ver índices criados
SELECT indexname, pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND indexrelname LIKE 'idx_%'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Migration 003: Query Analysis Functions (Fase 3)

- [ ] Função `get_query_stats()` criada
- [ ] Função `get_slow_queries()` criada
- [ ] Função `get_table_stats()` criada
- [ ] Função `get_unused_indexes()` criada
- [ ] Função `get_index_hit_rate()` criada
- [ ] Extensão `pg_stat_statements` habilitada
- [ ] Executar queries de validação:

```sql
-- Testar funções
SELECT * FROM get_query_stats();
SELECT * FROM get_slow_queries(100);
SELECT * FROM get_table_stats();
SELECT * FROM get_unused_indexes();
SELECT * FROM get_index_hit_rate();
```

---

## 🔄 Refresh Automático de MVs

### Opção A: pg_cron (Recomendado)

```sql
-- 1. Habilitar extensão
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Agendar job (a cada 5 minutos)
SELECT cron.schedule(
  'refresh-all-mvs',
  '*/5 * * * *',
  $$ SELECT * FROM refresh_all_materialized_views(); $$
);

-- 3. Verificar job criado
SELECT * FROM cron.job WHERE jobname = 'refresh-all-mvs';
```

### Opção B: GitHub Actions (Fallback)

Já configurado em `.github/workflows/refresh-materialized-views.yml`

**Configurar Secrets no GitHub**:
1. Acesse: https://github.com/YOUR_USER/YOUR_REPO/settings/secrets/actions
2. Adicione:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

## 📊 Monitoramento

### Endpoint de MVs: `/api/admin/materialized-views`

```bash
# Ver estatísticas das MVs
curl -H "Authorization: Bearer $TOKEN" \
  https://seu-app.vercel.app/api/admin/materialized-views

# Forçar refresh manual
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  https://seu-app.vercel.app/api/admin/materialized-views
```

### Endpoint de Health Check: `/api/monitoring/health`

```bash
# Ver status geral do sistema
curl https://seu-app.vercel.app/api/monitoring/health
```

### Queries de Monitoramento

```sql
-- Ver queries lentas (> 100ms)
SELECT query, mean_time_ms, calls
FROM get_slow_queries(100)
LIMIT 10;

-- Ver índices nunca usados
SELECT index_name, index_size
FROM get_unused_indexes();

-- Ver taxa de cache hit (deve ser >= 99%)
SELECT table_name, index_hit_rate
FROM get_index_hit_rate()
WHERE index_hit_rate < 99;

-- Ver uso de índices por tabela (deve ser >= 90%)
SELECT table_name, index_usage_pct
FROM get_table_stats()
WHERE index_usage_pct < 90;
```

---

## 🚨 Troubleshooting

### Erro: "relation already exists"

```sql
-- Solução: Dropar a MV existente
DROP MATERIALIZED VIEW IF EXISTS absences_with_student_info CASCADE;
-- Depois executar a migration novamente
```

### Erro: "index already exists"

```sql
-- Solução: Dropar o índice existente
DROP INDEX CONCURRENTLY IF EXISTS idx_students_class_status;
-- Depois executar a migration novamente
```

### Erro: "extension pg_stat_statements does not exist"

```sql
-- Solução: Habilitar extensão (requer permissões)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
-- Se não tiver permissão, solicitar via Supabase Support
```

### MVs não estão atualizando

**Verificar pg_cron**:

```sql
-- Ver status dos jobs
SELECT * FROM cron.job;

-- Ver últimas execuções
SELECT *
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'refresh-all-mvs')
ORDER BY start_time DESC
LIMIT 10;
```

**Se não houver execuções recentes**: Verificar GitHub Actions ou fazer refresh manual.

---

## 🎯 Impacto Esperado

| Métrica | Baseline | Após Fase 2 | Após Fase 3 | Melhoria Total |
|---------|----------|-------------|-------------|----------------|
| **Loading Time (3G)** | 60-90s | 5-8s | 3-5s | **15-20x** |
| **TTFB** | 2-5s | < 500ms | < 300ms | **10x** |
| **Query Time** | 2-5s | 300ms | 50-100ms | **20-40x** |
| **N+1 Queries** | Sim | Não | Não | ✅ Eliminado |
| **Index Usage** | ~60% | ~80% | ~95% | **1.5x** |
| **Payload Size** | 4.2MB | 500KB | 500KB | **8x** |

---

## 📚 Próximos Passos

### Após Migration 001 (Fase 2)
- [ ] Configurar refresh automático (pg_cron OU GitHub Actions)
- [ ] Validar performance em produção
- [ ] Monitorar `/api/admin/materialized-views`

### Após Migration 002 (Fase 3)
- [ ] Monitorar uso de índices (deve ser >= 90%)
- [ ] Verificar queries lentas (deve ser < 100ms)
- [ ] Remover índices não usados após 1 semana

### Após Migration 003 (Fase 3)
- [ ] Executar `get_query_stats()` diariamente
- [ ] Monitorar `get_slow_queries(100)` semanalmente
- [ ] Validar `get_index_hit_rate()` >= 99%

---

## 📖 Documentação Completa

- **Fase 2**: `docs/FASE-2-CONCLUIDA.md`
- **Fases 3-4**: `docs/FASE-3-4-CONCLUIDA.md`
- **Plano Completo**: `docs/OTIMIZACAO-FASES-3-4-E-VALIDACAO-CONSOLIDADO.md`

---

**Última Atualização**: 2025-10-23
**Autor**: Claude Code (Fases 2, 3 e 4)
**Status**: ✅ Pronto para Execução
