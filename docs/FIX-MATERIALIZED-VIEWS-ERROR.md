# 🔧 FIX: Erro de Materialized Views CONCURRENTLY

## ❌ Erro Encontrado

```
ERROR: 55000: cannot refresh materialized view "public.absences_with_student_info" concurrently
HINT: Create a unique index with no WHERE clause on one or more columns of the materialized view.
```

## 🎯 Causa Raiz

A migration original `01_create_materialized_views.sql` **não criou índices UNIQUE** nas materialized views. O PostgreSQL exige um índice UNIQUE para permitir `REFRESH MATERIALIZED VIEW CONCURRENTLY`.

## ✅ Solução: Executar 2 Scripts em Sequência

### Passo 1: Limpar MVs Antigas (⏱️ 10 segundos)

**Supabase Dashboard** → **SQL Editor** → **New Query**

**Copiar e colar TODO o conteúdo de**:
```
supabase/migrations/01_CLEANUP_AND_RECREATE.sql
```

**Executar** (RUN)

**Resultado esperado**: Query retorna 0 linhas (nenhuma MV restante)

---

### Passo 2: Recriar MVs com Índices UNIQUE (⏱️ 2-5 minutos)

**SQL Editor** → **New Query**

**Copiar e colar TODO o conteúdo de**:
```
supabase/migrations/01_create_materialized_views_FIXED.sql
```

**Executar** (RUN)

**Aguardar**: 2-5 minutos (criação das MVs + índices UNIQUE + population inicial)

---

## ✅ Verificar Sucesso

Após executar o Passo 2, você deve ver no final da execução:

```
view_name                         | row_count | total_size | last_refresh
----------------------------------|-----------|------------|-------------
absences_with_student_info        | 1234      | 256 kB     | 2025-01-09...
certificates_with_student_info    | 123       | 64 kB      | 2025-01-09...
interactions_with_student_info    | 567       | 128 kB     | 2025-01-09...
suspensions_with_student_info     | 45        | 32 kB      | 2025-01-09...
tasks_with_student_info          | 890       | 192 kB     | 2025-01-09...
```

Se aparecer essa tabela com 5 linhas, **sucesso!** ✅

---

## 🧪 Testar Refresh Manual

Para confirmar que o refresh CONCURRENTLY funciona agora:

```sql
-- Executar no SQL Editor
SELECT * FROM refresh_all_materialized_views();
```

**Resultado esperado**: Tabela com 5 linhas mostrando duração de cada refresh:

```
view_name                      | refresh_time            | duration_ms
-------------------------------|-------------------------|------------
absences_with_student_info     | 2025-01-09 10:30:00.123 | 234
interactions_with_student_info | 2025-01-09 10:30:00.456 | 156
tasks_with_student_info        | 2025-01-09 10:30:00.789 | 189
certificates_with_student_info | 2025-01-09 10:30:01.012 | 98
suspensions_with_student_info  | 2025-01-09 10:30:01.234 | 67
```

**Se não der erro**, o problema está resolvido! 🎉

---

## 📝 O Que Foi Mudado no FIXED.sql

### Antes (ERRADO):
```sql
CREATE MATERIALIZED VIEW absences_with_student_info AS SELECT ...;

-- Apenas índices normais (não UNIQUE)
CREATE INDEX idx_absences_mv_student_id ON absences_with_student_info(student_id);
```

### Depois (CORRETO):
```sql
CREATE MATERIALIZED VIEW absences_with_student_info AS SELECT ...;

-- ⚠️ CRITICAL: Índice UNIQUE obrigatório
CREATE UNIQUE INDEX idx_absences_mv_id_unique ON absences_with_student_info(id);

-- Índices normais adicionais
CREATE INDEX idx_absences_mv_student_id ON absences_with_student_info(student_id);
```

**Mudança**: Adicionado `CREATE UNIQUE INDEX ... ON ... (id)` para cada uma das 5 MVs.

---

## 🔄 Continuar com Resto da Otimização

Após sucesso, continue com:

1. ✅ **Migration 01 (FIXED)** - Concluída!
2. ⏳ **Migration 02** - `02_configure_pg_cron.sql`
3. ⏳ **Migration 03** - `03_create_composite_indexes.sql`
4. ⏳ **Migration 04** - `04_query_analysis_tools.sql`
5. ⏳ **Migration 05** - `05_phase4_final_optimizations.sql`

**Ver**: `docs/ACOES-MANUAIS-NECESSARIAS.md` → Ação Manual #1

---

## ❓ Troubleshooting

### Se der erro "relation does not exist"

Significa que o CLEANUP não rodou ou deu erro. Tente:

```sql
-- Forçar drop
DROP MATERIALIZED VIEW IF EXISTS absences_with_student_info CASCADE;
DROP MATERIALIZED VIEW IF EXISTS interactions_with_student_info CASCADE;
DROP MATERIALIZED VIEW IF EXISTS tasks_with_student_info CASCADE;
DROP MATERIALIZED VIEW IF EXISTS certificates_with_student_info CASCADE;
DROP MATERIALIZED VIEW IF EXISTS suspensions_with_student_info CASCADE;
```

Depois execute o FIXED.sql novamente.

### Se der erro "permission denied"

Seu usuário não tem permissão para criar MVs. Soluções:

1. **Supabase Dashboard**: Usar o SQL Editor (já roda como admin)
2. **Supabase CLI**: `supabase db push` (usa Service Role Key)

### Se der timeout

MVs estão demorando muito para popular (banco grande). Soluções:

1. **Aumentar timeout** no Supabase Dashboard
2. **Popular uma MV por vez**:
   ```sql
   -- Ao invés de SELECT refresh_all_materialized_views();
   -- Fazer manual:
   REFRESH MATERIALIZED VIEW absences_with_student_info;
   REFRESH MATERIALIZED VIEW interactions_with_student_info;
   -- etc...
   ```

---

## 📚 Arquivos Envolvidos

| Arquivo | Status | Uso |
|---------|--------|-----|
| `01_create_materialized_views.sql` | ❌ ERRADO | NÃO USAR |
| `01_CLEANUP_AND_RECREATE.sql` | ✅ NOVO | **Executar PRIMEIRO** |
| `01_create_materialized_views_FIXED.sql` | ✅ NOVO | **Executar SEGUNDO** |

---

**Resumo**: Execute CLEANUP primeiro, depois FIXED. Problema resolvido! 🚀
