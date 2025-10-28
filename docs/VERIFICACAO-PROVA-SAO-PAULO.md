# 🔍 Verificação: Card Prova São Paulo

> **Data**: 2025-10-28
> **Objetivo**: Verificar se o card da Prova São Paulo está funcionando após migração

---

## ✅ Checklist de Verificação

### 1. Verificar Dados no Supabase

Execute esta query no Supabase SQL Editor:

```sql
-- Verificar estudante específico
SELECT
  name,
  class,
  jsonb_array_length(exam_scores) as total_exams,
  exam_scores
FROM students
WHERE name ILIKE '%ALICE%'
  AND exam_scores != '[]'::jsonb
LIMIT 5;
```

**Resultado esperado**:
- ✅ `total_exams` = 2 (Língua Portuguesa + Matemática)
- ✅ `exam_scores` mostra array JSON com dados

### 2. Verificar Carregamento no Frontend

1. Acesse: `http://localhost:3000/perfil-estudante`
2. Busque: "ALICE DA SILVA SOUSA" (ou outro estudante migrado)
3. Role até o final da página
4. Procure o card "Dados da Prova São Paulo"

**Resultado esperado**:
- ✅ Card aparece
- ✅ Mostra tabela com 2 disciplinas
- ✅ Mostra dados da edição 2024
- ✅ Mostra níveis de proficiência

### 3. Verificar Console do Navegador

Abra o DevTools (F12) e verifique se há erros:

```
❌ Erros possíveis:
- "Cannot read property 'provaSaoPaulo' of undefined"
- "exam_scores is not defined"
- "Invalid JSONB format"

✅ Sem erros = funcionando!
```

### 4. Testar Importação de Novos Dados

1. Acesse: `http://localhost:3000/prova-sao-paulo`
2. Importe um CSV com novos dados
3. Verifique se salva corretamente em `exam_scores`

---

## 🐛 Troubleshooting

### Problema: Card não aparece

**Verificar**:
1. Estudante tem dados em `exam_scores`?
   ```sql
   SELECT name, exam_scores FROM students WHERE name = 'ALICE DA SILVA SOUSA';
   ```

2. `useStudentProfile` está carregando `exam_scores`?
   - Adicionar `console.log(profile.student?.provaSaoPaulo)` na página

3. `ProvaSaoPauloSection` está sendo renderizado?
   - Verificar se está dentro do bloco `{profile.student && (...)}`

### Problema: Card mostra "Nenhum dado encontrado"

**Causa**: `student.provaSaoPaulo` é `[]` (array vazio)

**Verificar**:
1. `studentDataService.ts` linha 80 está usando `exam_scores`?
2. `useStudentProfile.ts` linhas 152 e 278 estão usando `exam_scores`?
3. Migration SQL foi executada?

### Problema: Erro "exam_scores is not defined"

**Causa**: Migration SQL não foi executada

**Solução**:
```sql
-- Executar no Supabase SQL Editor
ALTER TABLE students
ADD COLUMN IF NOT EXISTS exam_scores JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_students_exam_scores ON students USING GIN (exam_scores);
```

---

## 📊 Estudantes com Dados (Para Teste)

Estudantes que possuem dados da Prova São Paulo:

1. **ALICE DA SILVA SOUSA** - 2 exames (LP + MAT)
2. **ADSON GABRIEL SILVA DE SOUZA** - 2 exames
3. **AGATA EMANUELLE SILVA SILVA** - 2 exames
4. **ALANA BEATRIZ FERREIRA DE FREITAS** - 2 exames
5. **ALESSANDRA PEREIRA SANTOS** - 2 exames

Total: **512 estudantes** (69.7% do total)

---

## 🎯 Resultado Esperado Final

Após migração completa:

✅ Card "Prova São Paulo" aparece para 512 estudantes
✅ Mostra dados de Língua Portuguesa e Matemática
✅ Mostra edição 2024
✅ Mostra níveis de proficiência (Adequado, Básico, etc)
✅ Empty state para estudantes sem dados (223 estudantes)
✅ Importação de novos dados funciona (`/prova-sao-paulo`)

---

## 📚 Documentação Relacionada

- [MIGRATION-PROVA-SAO-PAULO.md](MIGRATION-PROVA-SAO-PAULO.md) - Documentação completa da migração
- [scripts/README-MIGRATE-PROVA.md](../scripts/README-MIGRATE-PROVA.md) - Guia do script de migração
- [migrations/009_add_exam_scores_column.sql](../migrations/009_add_exam_scores_column.sql) - Migration SQL

---

**Última Atualização**: 2025-10-28
