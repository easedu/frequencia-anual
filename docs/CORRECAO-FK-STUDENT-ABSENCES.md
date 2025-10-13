# 🚨 CORREÇÃO CRÍTICA: FK de student_absences

**Data**: 2025-10-11
**Prioridade**: CRÍTICA
**Status**: SOLUÇÃO PRONTA

---

## 📋 RESUMO EXECUTIVO

A FK da tabela `student_absences` estava apontando para o campo **errado**, causando:
- ❌ **Perda de 11% das faltas** (2.000 de 18.071)
- ❌ **Apenas 42 estudantes** com faltas vinculadas (de 718!)
- ❌ **Dashboard mostrando totais completamente incorretos**

## 🔍 PROBLEMA IDENTIFICADO

### Schema Incorreto (ATUAL)

```sql
-- ❌ ERRADO
CREATE TABLE student_absences (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL,  -- Aponta para students.id (UUID interno Postgres)
  absence_date DATE NOT NULL,
  -- ...
  CONSTRAINT fk_student_absences_student
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
```

### Por que está errado?

A tabela `students` tem **2 UUIDs**:
1. `students.id` → UUID interno do Postgres (gerado automaticamente)
2. `students.student_id` → UUID do Firebase (original, usado em todo o código)

**O código usa `students.student_id` (Firebase UUID) em todo lugar**, mas a FK aponta para `students.id` (UUID interno).

### Evidência do Bug

Query do absenceService retorna:

```json
{
  "student_id": "12251adf-e865-4801-8e64-3fe396a8a5ad",  // FK na tabela absences
  "students": {
    "student_id": "0063f718-1379-4191-8396-19269cf857d8"  // ❌ UUID DIFERENTE!
  }
}
```

Os UUIDs **não batem**! 🚨

## 📊 IMPACTO

### Dados Antes da Correção

| Métrica | Firebase Backup | Supabase Atual | Diferença |
|---------|----------------|----------------|-----------|
| Total de Faltas | 18.071 | 16.071 | -2.000 (11%) |
| Estudantes com Faltas | 718 | **42** | -676 (94%) |
| Faltas Justificadas | ? | 1.637 | ? |
| Faltas Não Justificadas | ? | 14.434 | ? |

### Exemplo de Estudante Afetado

**Estudante**: KAUE GABRIEL RODRIGUES DE LIMA
- `students.student_id` (Firebase): `0063f718-1379-4191-8396-19269cf857d8`
- `student_absences.student_id` (FK): `12251adf-e865-4801-8e64-3fe396a8a5ad` ❌

**Resultado**: As faltas do KAUE estão associadas ao UUID interno errado e não aparecem no dashboard!

## ✅ SOLUÇÃO

### 1. Corrigir Schema

```sql
-- ✅ CORRETO
CREATE TABLE student_absences (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL,  -- Aponta para students.student_id (Firebase UUID)
  absence_date DATE NOT NULL,
  -- ...
  CONSTRAINT fk_student_absences_student_id
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
);
```

### 2. Re-importar Dados

Com a FK corrigida, re-importar todas as faltas do backup Firebase usando `students.student_id` (Firebase UUID).

---

## 🚀 PASSOS PARA EXECUTAR A CORREÇÃO

### Passo 1: Aplicar SQL de Correção

```bash
# Conectar ao Supabase
psql postgresql://postgres:[SENHA]@[HOST]:5432/postgres

# Rodar script de correção
\i supabase-migrations/fix-absences-fk.sql
```

**O que faz**:
1. ✅ Cria backup de `student_absences` atual
2. ✅ Dropa constraint FK antiga
3. ✅ Limpa tabela `student_absences`
4. ✅ Recria FK apontando para `students.student_id` (correto!)
5. ✅ Recria índice único

### Passo 2: Re-importar Faltas

```bash
# Re-importar com FK correto
node scripts/migration/16-reimport-absences-correct-fk.mjs
```

**O que faz**:
1. ✅ Lê backup Firebase (`firestore-backup-2025-10-11.json`)
2. ✅ Para cada falta, usa `students.student_id` (Firebase UUID)
3. ✅ Insere em lotes de 500
4. ✅ Gera relatório final

### Passo 3: Verificar Correção

```bash
# Acessar API de debug
curl http://localhost:3000/api/debug-absences
```

**Esperado após correção**:
```json
{
  "supabase": {
    "totalAbsences": 18071,        // ✅ Bate com Firebase
    "uniqueStudents": 718           // ✅ Bate com Firebase
  },
  "firebaseBackup": {
    "totalAbsences": 18071,
    "studentsWithAbsences": 718
  },
  "differences": {
    "absences": 0,                  // ✅ Zero diferença!
    "students": 0                   // ✅ Zero diferença!
  }
}
```

### Passo 4: Verificar Dashboard

Acessar [/controlar-faltas](http://localhost:3000/controlar-faltas) e confirmar:
- ✅ Total de faltas correto (18.071)
- ✅ KPIs corretos (Conformes, Em Risco, etc)
- ✅ Estudantes com faltas aparecem corretamente

---

## 📝 CHECKLIST DE VALIDAÇÃO

Após aplicar a correção, verificar:

- [ ] Total de faltas no Supabase = 18.071
- [ ] Estudantes únicos com faltas = 718
- [ ] API `/api/debug-absences` mostra diferença zero
- [ ] Dashboard `/controlar-faltas` mostra totais corretos
- [ ] Query com JOIN retorna `students.student_id` correto:
  ```sql
  SELECT
    sa.student_id,
    s.student_id as student_uuid,
    s.name,
    sa.absence_date
  FROM student_absences sa
  JOIN students s ON sa.student_id = s.student_id
  LIMIT 5;
  ```
  - ✅ `sa.student_id` deve ser **igual** a `s.student_id`

---

## 🔧 TROUBLESHOOTING

### Erro: constraint "fk_student_absences_student" does not exist

**Causa**: FK já foi dropada ou tem nome diferente.

**Solução**: Verificar nome da constraint:
```sql
SELECT conname FROM pg_constraint
WHERE conrelid = 'student_absences'::regclass;
```

### Erro: duplicate key value violates unique constraint

**Causa**: Faltas duplicadas no backup.

**Solução**: Adicionar `ON CONFLICT DO NOTHING` no INSERT:
```sql
INSERT INTO student_absences (student_id, absence_date, ...)
VALUES (...)
ON CONFLICT (student_id, absence_date) DO NOTHING;
```

### Erro: insert or update on table "student_absences" violates foreign key

**Causa**: `students.student_id` não existe para alguma falta.

**Solução**:
1. Verificar se estudante existe:
   ```sql
   SELECT student_id FROM students WHERE student_id = '...';
   ```
2. Se não existir, importar estudante primeiro.

---

## 📚 DOCUMENTAÇÃO RELACIONADA

- [Backup do Firebase (2025-10-11)](../firestore-backup-2025-10-11.json)
- [Schema Supabase V2](../supabase-schema-v2-padronizado.sql)
- [AbsenceService](../src/services/supabase/absenceService.ts)
- [useStudentRecords Hook](../src/hooks/attendance/useStudentRecords.ts)

---

## ✅ STATUS FINAL

- [x] Problema identificado
- [x] Solução criada
- [ ] SQL executado no Supabase
- [ ] Dados re-importados
- [ ] Validação completa
- [ ] Dashboard verificado

**Próxima ação**: Executar Passo 1 (Aplicar SQL)
