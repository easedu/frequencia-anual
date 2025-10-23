# 🟠 FASE 2 - Setup no Supabase

**Status**: Implementado (código pronto)
**Requer**: Execução manual no Supabase SQL Editor
**Tempo estimado**: 5-10 minutos
**Impacto**: 15-20s → 5-8s (3x mais rápido)

---

## 📋 CHECKLIST DE EXECUÇÃO

### ✅ Pré-requisitos

- [ ] Acesso ao [Supabase Dashboard](https://supabase.com/dashboard)
- [ ] Projeto: `xccjifrggpgevqftwdkx`
- [ ] Permissões de **SQL Editor**
- [ ] Backup do banco (recomendado)

---

## 🚀 PASSO 1: Criar Materialized Views

### 1.1. Abrir SQL Editor

1. Acessar: https://supabase.com/dashboard/project/xccjifrggpgevqftwdkx
2. Menu lateral → **SQL Editor**
3. Criar **New Query**

### 1.2. Executar Migration

Copiar e executar todo o conteúdo de:

**Arquivo**: `supabase/migrations/01_create_materialized_views.sql`

```bash
# Ou via CLI do Supabase (se tiver instalado)
supabase db push
```

### 1.3. Verificar Criação

Executar query de verificação:

```sql
SELECT * FROM get_mv_metadata();
```

**Resultado esperado**: 5 materialized views listadas

| view_name | row_count | total_size | last_refresh |
|-----------|-----------|------------|--------------|
| absences_with_student_info | ~1500 | ~200KB | 2025-01-XX XX:XX |
| interactions_with_student_info | ~300 | ~50KB | 2025-01-XX XX:XX |
| tasks_with_student_info | ~150 | ~30KB | 2025-01-XX XX:XX |
| certificates_with_student_info | ~100 | ~20KB | 2025-01-XX XX:XX |
| suspensions_with_student_info | ~50 | ~10KB | 2025-01-XX XX:XX |

---

## 🕐 PASSO 2: Configurar Refresh Automático

### Opção A: pg_cron (RECOMENDADO)

**Requisito**: Extensão `pg_cron` habilitada (verificar com Supabase Support)

#### 2.A.1. Verificar se pg_cron está disponível

```sql
SELECT * FROM pg_available_extensions WHERE name = 'pg_cron';
```

Se retornar resultado → **pg_cron disponível**

#### 2.A.2. Executar configuração

**Arquivo**: `supabase/migrations/02_configure_pg_cron.sql`

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'refresh-all-mvs',
  '*/5 * * * *',
  $$ SELECT * FROM refresh_all_materialized_views(); $$
);
```

#### 2.A.3. Verificar job criado

```sql
SELECT * FROM cron.job WHERE jobname = 'refresh-all-mvs';
```

**Resultado esperado**:

| jobname | schedule | active | command |
|---------|----------|--------|---------|
| refresh-all-mvs | */5 * * * * | true | SELECT * FROM refresh_all_materialized_views(); |

#### 2.A.4. Monitorar execuções

```sql
SELECT
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'refresh-all-mvs')
ORDER BY start_time DESC
LIMIT 5;
```

---

### Opção B: GitHub Actions (ALTERNATIVA)

**Usar se**: pg_cron não estiver disponível

#### 2.B.1. Configurar Secrets no GitHub

1. Ir em: Settings → Secrets and variables → Actions
2. Adicionar secrets:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | https://xccjifrggpgevqftwdkx.supabase.co |
| `SUPABASE_SERVICE_ROLE_KEY` | (service_role key do Supabase Dashboard → Settings → API) |

#### 2.B.2. Workflow já criado

**Arquivo**: `.github/workflows/refresh-materialized-views.yml`

- ✅ Já commitado no repositório
- ✅ Executa a cada 5 minutos (8h-18h BRT, segunda a sexta)
- ✅ Pode ser acionado manualmente (Actions → Run workflow)

#### 2.B.3. Testar execução manual

1. GitHub → Actions → "Refresh Materialized Views"
2. **Run workflow** → Branch: `optimization/supabase-network-performance`
3. Verificar logs de execução

---

## 🧪 PASSO 3: Validar Funcionamento

### 3.1. Refresh Manual

```sql
SELECT * FROM refresh_all_materialized_views();
```

**Resultado esperado**:

| view_name | refresh_time | duration_ms |
|-----------|--------------|-------------|
| absences_with_student_info | 2025-01-XX XX:XX | 150 |
| interactions_with_student_info | 2025-01-XX XX:XX | 50 |
| tasks_with_student_info | 2025-01-XX XX:XX | 30 |
| certificates_with_student_info | 2025-01-XX XX:XX | 20 |
| suspensions_with_student_info | 2025-01-XX XX:XX | 15 |

**Total**: < 300ms (muito rápido!)

### 3.2. Query de Teste

**ANTES** (sem MV - N+1 query):

```sql
EXPLAIN ANALYZE
SELECT a.*, s.name, s.class
FROM student_absences a
JOIN students s ON a.student_id = s.id
LIMIT 100;
```

**Tempo esperado**: 500-1000ms

**DEPOIS** (com MV):

```sql
EXPLAIN ANALYZE
SELECT * FROM absences_with_student_info
LIMIT 100;
```

**Tempo esperado**: 50-150ms (**5-10x mais rápido!**)

### 3.3. Verificar Índices

```sql
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename LIKE '%_with_student_info'
ORDER BY tablename, indexname;
```

**Resultado esperado**: 15+ índices criados

---

## 📊 PASSO 4: Métricas de Performance

### 4.1. Testar API (após deploy)

```bash
# Endpoint tradicional (antes)
time curl "https://seu-dominio.vercel.app/api/absences?limit=100" \
  -H "Authorization: Bearer $TOKEN"

# Tempo esperado ANTES: 2-5 segundos
# Tempo esperado DEPOIS: 300-800ms
```

### 4.2. Monitorar tamanho das MVs

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename LIKE '%_with_student_info'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 🚨 TROUBLESHOOTING

### Erro: "extension pg_cron is not available"

**Solução**: Usar GitHub Actions (Opção B)

### Erro: "permission denied for schema cron"

**Solução**: Executar como superuser ou usar GitHub Actions

### MVs não atualizam automaticamente

**Verificar**:

```sql
-- pg_cron
SELECT * FROM cron.job WHERE jobname = 'refresh-all-mvs';

-- GitHub Actions
# Ver logs em: GitHub → Actions → "Refresh Materialized Views"
```

### Performance não melhorou

**Verificar**:

1. MVs foram refreshed recentemente?
2. APIs estão usando as MVs? (ver código em `src/app/api/`)
3. Índices foram criados? (query acima)

---

## 🎯 PRÓXIMOS PASSOS

Após setup completo:

1. ✅ **Testar** refresh manual
2. ✅ **Validar** performance com EXPLAIN ANALYZE
3. ✅ **Monitorar** cron job (pg_cron ou GitHub Actions)
4. ✅ **Deploy** das APIs otimizadas
5. ✅ **Medir** métricas de performance em produção

---

## 📚 REFERÊNCIAS

- **Migration SQL**: `supabase/migrations/01_create_materialized_views.sql`
- **Cron Setup**: `supabase/migrations/02_configure_pg_cron.sql`
- **GitHub Actions**: `.github/workflows/refresh-materialized-views.yml`
- **Documentação pg_cron**: https://github.com/citusdata/pg_cron
- **Supabase Docs**: https://supabase.com/docs/guides/database/extensions/pg_cron

---

**Status após setup**: ✅ Fase 2 Materialized Views COMPLETA
