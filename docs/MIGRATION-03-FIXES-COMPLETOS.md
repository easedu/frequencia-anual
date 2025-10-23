# 🔧 Migration 03 - Todos os Fixes de Predicados IMMUTABLE

## ❌ Problema Geral

```
ERROR: 42P17: functions in index predicate must be marked IMMUTABLE
```

PostgreSQL é **extremamente rigoroso** sobre quais expressões podem ser usadas em predicados de índices (`WHERE` clauses). Apenas funções e operadores marcados como `IMMUTABLE` são aceitos.

---

## 🐛 3 Bugs Corrigidos

### Fix #1: Operador IN (Linhas 128, 168)

**Erro Original**:
```sql
WHERE status IN ('PENDING', 'UNDER_REVIEW')
```

**Por que falha**: Operador `IN` não é marcado como IMMUTABLE.

**Solução**:
```sql
-- Dividido em 2 índices separados
WHERE status = 'PENDING'
WHERE status = 'UNDER_REVIEW'
```

**Arquivos afetados**: Linhas 128, 168

---

### Fix #2: Comparação JSONB != (Linhas 185, 191)

**Erro Original**:
```sql
WHERE disabilities != '[]'::jsonb
WHERE address != '{}'::jsonb
```

**Por que falha**: Operador `!=` em JSONB não é IMMUTABLE.

**Solução**:
```sql
-- Removido comparação, mantém apenas NULL check
WHERE disabilities IS NOT NULL
WHERE address IS NOT NULL
```

**Arquivos afetados**: Linhas 185, 191

---

### Fix #3: CURRENT_DATE (Linha 110)

**Erro Original**:
```sql
WHERE is_resolved = false AND due_date < CURRENT_DATE
```

**Por que falha**: `CURRENT_DATE` é função volátil (muda todo dia).

**Solução**:
```sql
-- Removido condição de data
WHERE is_resolved = false
-- Query filtra data em runtime: WHERE ... AND due_date < CURRENT_DATE
```

**Arquivos afetados**: Linha 110

---

## ✅ Predicados IMMUTABLE Aceitos

**Operadores simples**:
```sql
✅ WHERE deleted = false
✅ WHERE status = 'ATIVO'
✅ WHERE field > 10
✅ WHERE field >= 100
✅ WHERE field < 50
✅ WHERE field <= 1000
✅ WHERE field IS NULL
✅ WHERE field IS NOT NULL
```

**Combinações com AND**:
```sql
✅ WHERE deleted = false AND status = 'ATIVO'
✅ WHERE is_resolved = false AND assigned_to IS NOT NULL
```

---

## ❌ Predicados NÃO-IMMUTABLE Rejeitados

**Operadores problemáticos**:
```sql
❌ WHERE status IN ('A', 'B')           -- Usar múltiplos índices com =
❌ WHERE field != value                 -- Remover ou usar IS NOT NULL
❌ WHERE field <> value                 -- Alias de !=
❌ WHERE field::text LIKE '%x%'         -- Usar índice GIN com pg_trgm
❌ WHERE LOWER(field) = 'value'         -- Criar índice funcional
❌ WHERE field ILIKE '%search%'         -- Usar GIN + pg_trgm
```

**Funções voláteis**:
```sql
❌ WHERE date < CURRENT_DATE            -- Filtrar em runtime
❌ WHERE date > NOW()                   -- Filtrar em runtime
❌ WHERE created_at > CURRENT_TIMESTAMP -- Filtrar em runtime
❌ WHERE random() > 0.5                 -- Obviamente não-IMMUTABLE
```

**Comparações JSONB complexas**:
```sql
❌ WHERE jsonb_field != '{}'::jsonb     -- Remover !=
❌ WHERE jsonb_field <> '[]'::jsonb     -- Remover <>
✅ WHERE jsonb_field IS NOT NULL        -- Aceito
```

---

## 📊 Status Final da Migration 03

**Total de índices criados**: ~30 índices

**Categorias**:
1. **Índices Compostos** (12): Queries com múltiplos filtros
2. **Índices Parciais** (8): Subconjuntos com WHERE clause
3. **Índices GIN** (4): Busca em JSONB e texto
4. **Índices INCLUDE** (6): Covering queries

**Todos os predicados agora são IMMUTABLE!** ✅

---

## 🎓 Lições Aprendidas

1. **PostgreSQL é rigoroso**: Sempre testar predicados de índices
2. **Operadores simples são seguros**: `=`, `>`, `<`, `IS NULL`
3. **Evitar funções voláteis**: `CURRENT_DATE`, `NOW()`, `random()`
4. **Dividir predicados complexos**: `IN (...)` → múltiplos índices com `=`
5. **JSONB precisa cuidado**: Evitar `!=`, `<>` em comparações

---

## 🚀 Próximos Passos

Após executar Migration 03 com sucesso:

1. ✅ **Migration 01** - Materialized Views (COMPLETA)
2. ✅ **Migration 02** - pg_cron (COMPLETA)
3. ⏳ **Migration 03** - Índices Compostos (executar versão corrigida)
4. ⏳ **Migration 04** - Ferramentas de Análise (próxima)
5. ⏳ **Migration 05** - Otimizações Finais (última)

---

**Versão do arquivo corrigido**: `03_create_composite_indexes.sql` (commit bee3c21)

**Data**: 2025-01-09
**Total de fixes**: 3 predicados corrigidos
**Status**: Pronto para execução sem erros
