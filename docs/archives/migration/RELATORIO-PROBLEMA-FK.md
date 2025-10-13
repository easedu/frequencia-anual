# 🚨 RELATÓRIO: Problema de FK em student_absences

**Data**: 2025-10-11
**Status**: ❌ PROBLEMA PARCIALMENTE RESOLVIDO

---

## 📊 SITUAÇÃO ATUAL

### Dados no Supabase

| Tabela | Registros | Esperado | Status |
|--------|-----------|----------|--------|
| **students** | 739 | 739 | ✅ OK |
| **student_absences** | 17.822 | 17.822 | ✅ OK |
| **Estudantes únicos com faltas** | **39** | **718** | ❌ PROBLEMA |

### Problema

- ✅ **17.822 faltas foram importadas** (100% das faltas únicas)
- ❌ Mas estão distribuídas em apenas **39 estudantes** (5%)
- ❌ Faltam faltas para **679 estudantes** (95%)

---

## 🔍 CAUSA RAIZ

O script de importação usa `upsert` em lotes:

```javascript
await supabase
  .from('student_absences')
  .upsert(batch, { onConflict: 'student_id,absence_date' });
```

**Problema**: Se **algum registro** do lote falhar na FK, o **lote inteiro** é rejeitado.

**Resultado**: Apenas os primeiros estudantes (do início do backup) tiveram todas as faltas importadas.

---

## ✅ SOLUÇÃO

### Opção 1: Limpar e Reimportar Com Tratamento Individual

1. **Limpar tabela** `student_absences`
2. **Inserir registro por registro** com try-catch individual
3. **Log de erros** para identificar quais `student_id` falharam

**Tempo estimado**: 30-40 minutos (17.822 inserções individuais)

### Opção 2: Identificar IDs Problemáticos e Corrigir

1. **Extrair lista** dos 679 estudantes sem faltas
2. **Verificar** se esses `student_id` existem em `students`
3. **Inserir faltas** apenas desses estudantes

**Tempo estimado**: 10-15 minutos

### Opção 3: Usar Stored Procedure (PostgreSQL)

1. **Criar stored procedure** que faz upsert com exception handling
2. **Executar** para todos os registros

**Tempo estimado**: 5-10 minutos (mais rápido)

---

## 🎯 RECOMENDAÇÃO

**Usar Opção 2** (mais rápida e segura):

1. Identificar os 679 estudantes sem faltas
2. Pegar suas faltas do backup
3. Inserir em lote (confirmando que IDs existem)

---

## 📝 PRÓXIMOS PASSOS

1. [ ] Identificar 679 estudantes faltando
2. [ ] Verificar se `student_id` deles existe em `students`
3. [ ] Importar faltas desses estudantes
4. [ ] Validar: 718 estudantes com faltas
5. [ ] Verificar dashboard

---

## 📊 VALIDAÇÃO FINAL

Após correção, confirmar:

- [ ] `student_absences` tem 17.822 faltas (ou mais, se haviam duplicatas)
- [ ] **718 estudantes únicos** com faltas
- [ ] Dashboard mostra totais corretos
- [ ] API `/api/debug-absences` mostra diferença zero

---

## 🔧 COMANDO PARA VALIDAR

```bash
# Contar estudantes únicos com faltas
SELECT COUNT(DISTINCT student_id) FROM student_absences;
-- Esperado: 718

# Total de faltas
SELECT COUNT(*) FROM student_absences;
-- Esperado: ~17.822

# Estudantes sem faltas (que deveriam ter)
SELECT student_id, name FROM students
WHERE student_id NOT IN (SELECT DISTINCT student_id FROM student_absences)
AND student_id IN (SELECT DISTINCT estudanteId FROM backup_firebase);
-- Esperado: 0
```

---

## 📚 ARQUIVOS RELACIONADOS

- [fix-absences-fk.sql](supabase-migrations/fix-absences-fk.sql) - SQL de correção de FK
- [17-reimport-absences-upsert.mjs](scripts/migration/17-reimport-absences-upsert.mjs) - Script que inseriu 17.822 faltas
- [CORRECAO-FK-STUDENT-ABSENCES.md](docs/CORRECAO-FK-STUDENT-ABSENCES.md) - Documentação do problema original

---

**Próxima ação**: Executar Opção 2 para completar importação
