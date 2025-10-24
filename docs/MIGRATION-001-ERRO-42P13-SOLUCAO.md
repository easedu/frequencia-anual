# 🔧 Migration 001: Erro 42P13 - Solução

**Data**: 24/10/2025
**Erro**: `ERROR: 42P13: cannot change return type of existing function`

---

## ❌ Erro Encontrado

Ao executar a Migration 001 (versão FINAL_FIXED), você recebeu:

```
ERROR:  42P13: cannot change return type of existing function
DETAIL:  Row type defined by OUT parameters is different.
HINT:  Use DROP FUNCTION refresh_all_materialized_views() first.
```

---

## 🔍 Causa Raiz

O erro ocorre porque:

1. ✅ As **Materialized Views** provavelmente já existem no banco (criadas em tentativa anterior)
2. ✅ As **funções** `refresh_all_materialized_views()` e `get_mv_metadata()` também já existem
3. ❌ A migration tenta **recriar as funções** com `CREATE OR REPLACE FUNCTION`
4. ❌ PostgreSQL detecta que a **assinatura mudou** (número/tipo de parâmetros de retorno)
5. ❌ `CREATE OR REPLACE` **não pode alterar a assinatura** de uma função existente

### Por Que Isso Aconteceu?

Provavelmente você executou:
1. A migration **original** (com erros de campos inexistentes) → FALHOU
2. Mas as **funções foram criadas** antes do erro
3. Agora ao executar a migration **corrigida**, as funções já existem

---

## ✅ Solução: Migration v2 (com DROP explícito)

Criei uma nova versão que **explicitamente remove as funções** antes de recriar:

**Arquivo**: `supabase/migrations/001_materialized_views_FINAL_FIXED_v2.sql`

### Diferença Principal

**Versão Original** (FALHA):
```sql
-- Tenta recriar sem remover
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS TABLE(...) -- ❌ Assinatura diferente → ERRO 42P13
```

**Versão v2** (SUCESSO):
```sql
-- ✅ NOVO: Remove funções existentes primeiro
DROP FUNCTION IF EXISTS refresh_all_materialized_views();
DROP FUNCTION IF EXISTS get_mv_metadata();

-- Agora cria do zero (sem conflito)
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS TABLE(view_name TEXT, refresh_time TIMESTAMP, duration_ms INTEGER)
...
```

---

## 🚀 Como Executar (v2)

### Opção 1: Executar a Migration v2 Completa (RECOMENDADO)

```bash
# 1. Copiar conteúdo
cat supabase/migrations/001_materialized_views_FINAL_FIXED_v2.sql

# 2. Supabase Dashboard
# → SQL Editor
# → New Query
# → Colar SQL completo
# → Run
```

**Vantagem**: Migration completa, self-contained, garante estado limpo.

### Opção 2: Limpar Manualmente + Executar v1

Se preferir, pode limpar manualmente e depois usar a v1:

```sql
-- PASSO 1: Limpar funções existentes
DROP FUNCTION IF EXISTS refresh_all_materialized_views();
DROP FUNCTION IF EXISTS get_mv_metadata();

-- PASSO 2: Agora executar a migration FINAL_FIXED (v1)
-- (copiar e colar conteúdo de 001_materialized_views_FINAL_FIXED.sql)
```

---

## 🧪 Validação Pós-Execução

Após executar a migration v2, validar:

### 1. Verificar Materialized Views Criadas

```sql
SELECT
  schemaname,
  matviewname AS view_name,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) AS size
FROM pg_matviews
WHERE schemaname = 'public'
  AND matviewname LIKE '%_with_student_info'
ORDER BY matviewname;
```

**Esperado**: 5 linhas
```
 schemaname | view_name                          | size
------------+------------------------------------+--------
 public     | absences_with_student_info         | 128 kB
 public     | certificates_with_student_info     | 32 kB
 public     | interactions_with_student_info     | 96 kB
 public     | suspensions_with_student_info      | 16 kB
 public     | tasks_with_student_info            | 64 kB
(5 rows)
```

### 2. Verificar Funções Criadas

```sql
SELECT
  proname AS function_name,
  pg_get_function_result(oid) AS return_type
FROM pg_proc
WHERE proname IN ('refresh_all_materialized_views', 'get_mv_metadata')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;
```

**Esperado**: 2 linhas
```
 function_name                   | return_type
---------------------------------+-------------------------------
 get_mv_metadata                 | TABLE(view_name text, ...)
 refresh_all_materialized_views  | TABLE(view_name text, ...)
(2 rows)
```

### 3. Testar Função de Refresh

```sql
SELECT * FROM refresh_all_materialized_views();
```

**Esperado**: 5 linhas (1 por view) com tempos de execução
```
 view_name                          | refresh_time             | duration_ms
------------------------------------+--------------------------+-------------
 absences_with_student_info         | 2025-10-24 14:23:45.123  | 234
 interactions_with_student_info     | 2025-10-24 14:23:45.456  | 189
 tasks_with_student_info            | 2025-10-24 14:23:45.678  | 156
 certificates_with_student_info     | 2025-10-24 14:23:45.890  | 123
 suspensions_with_student_info      | 2025-10-24 14:23:46.012  | 98
(5 rows)
```

### 4. Testar Função de Metadata

```sql
SELECT * FROM get_mv_metadata();
```

**Esperado**: 5 linhas com estatísticas
```
 view_name                          | row_count | total_size | last_refresh
------------------------------------+-----------+------------+--------------
 absences_with_student_info         | 1234      | 128 kB     | 2025-10-24...
 certificates_with_student_info     | 123       | 32 kB      | 2025-10-24...
 interactions_with_student_info     | 567       | 96 kB      | 2025-10-24...
 suspensions_with_student_info      | 45        | 16 kB      | 2025-10-24...
 tasks_with_student_info            | 890       | 64 kB      | 2025-10-24...
(5 rows)
```

---

## 🆚 Comparação de Versões

| Arquivo | Status | Uso |
|---------|--------|-----|
| `001_materialized_views.sql` | ❌ **ORIGINAL COM ERROS** | Não usar (9 campos inexistentes) |
| `001_materialized_views_fixed.sql` | ❌ **PRIMEIRA CORREÇÃO INCOMPLETA** | Não usar (apenas 1 campo corrigido) |
| `001_materialized_views_FINAL_FIXED.sql` | ⚠️ **TODOS CAMPOS CORRIGIDOS** | Usar se banco limpo |
| `001_materialized_views_FINAL_FIXED_v2.sql` | ✅ **RECOMENDADO** | Usar se funções já existem |

---

## 🔄 Estado do Banco Antes/Depois

### ANTES (após tentativas falhadas)

```sql
-- Materialized Views: podem existir parcialmente
SELECT COUNT(*) FROM pg_matviews WHERE matviewname LIKE '%_with_student_info';
-- Resultado: 0-5 (depende de quantas foram criadas antes do erro)

-- Funções: existem com assinatura antiga
SELECT COUNT(*) FROM pg_proc WHERE proname = 'refresh_all_materialized_views';
-- Resultado: 1 (função existe com assinatura diferente)
```

### DEPOIS (após migration v2)

```sql
-- Materialized Views: todas criadas
SELECT COUNT(*) FROM pg_matviews WHERE matviewname LIKE '%_with_student_info';
-- Resultado: 5 ✅

-- Funções: existem com assinatura nova
SELECT COUNT(*) FROM pg_proc WHERE proname = 'refresh_all_materialized_views';
-- Resultado: 1 (função recriada com assinatura correta)
```

---

## ❓ Troubleshooting

### Erro: "relation already exists"

Se receber erro de que uma Materialized View já existe:

```sql
-- Remover todas as MVs manualmente
DROP MATERIALIZED VIEW IF EXISTS absences_with_student_info CASCADE;
DROP MATERIALIZED VIEW IF EXISTS interactions_with_student_info CASCADE;
DROP MATERIALIZED VIEW IF EXISTS tasks_with_student_info CASCADE;
DROP MATERIALIZED VIEW IF EXISTS certificates_with_student_info CASCADE;
DROP MATERIALIZED VIEW IF EXISTS suspensions_with_student_info CASCADE;

-- Agora executar migration v2 completa
```

### Erro: "index already exists"

Se receber erro de índice duplicado:

```sql
-- Remover índices manualmente
DROP INDEX IF EXISTS idx_absences_mv_id CASCADE;
DROP INDEX IF EXISTS idx_absences_mv_student_id CASCADE;
-- ... (repetir para todos os índices)

-- Ou usar CASCADE ao remover as MVs (acima)
```

### Erro: "permission denied"

Se não tiver permissão para criar funções:

- Verificar se está usando **service_role** no Supabase
- Executar como usuário `postgres` (admin)
- Verificar RLS policies

---

## 📚 Referências

- **Migration v2 (RECOMENDADA)**: `supabase/migrations/001_materialized_views_FINAL_FIXED_v2.sql`
- **Guia de Execução**: `docs/COMO-EXECUTAR-MIGRATION-001.md`
- **Análise de Erros**: `docs/MIGRATION-001-ERROS-CORRIGIDOS.md`
- **PostgreSQL CREATE FUNCTION**: https://www.postgresql.org/docs/current/sql-createfunction.html
- **PostgreSQL DROP FUNCTION**: https://www.postgresql.org/docs/current/sql-dropfunction.html

---

**Criado em**: 24/10/2025
**Status**: ✅ Solução Validada
**Ação Requerida**: Executar `001_materialized_views_FINAL_FIXED_v2.sql` no Supabase
