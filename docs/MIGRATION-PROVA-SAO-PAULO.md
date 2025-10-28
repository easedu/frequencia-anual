# 🎓 Migração: Prova São Paulo (Firebase → Supabase)

> **Status**: ✅ Código Pronto (aguardando execução de migration SQL)
> **Data**: 2025-10-28
> **Prioridade**: Alta (feature visível não funciona)

---

## 📋 Problema Identificado

O card da Prova São Paulo na página de perfil do estudante **não mostra dados** porque:

1. ❌ Campo `provaSaoPaulo` ainda não foi migrado para Supabase
2. ❌ `StudentDataService.updateStudent()` não salva esses dados
3. ❌ `StudentDataService.convertSupabaseStudentToLegacy()` retorna sempre `[]`
4. ❌ `useStudentProfile` força `provaSaoPaulo: []` (linhas 150 e 275)

**Evidência**:
- `src/services/studentDataService.ts:79`: `provaSaoPaulo: [], // Not migrated`
- `docs/FASE-1-SERVICES-MIGRACAO-SUPABASE.md:320`: "**Risco**: `provaSaoPaulo` não foi migrado para Supabase"

---

## 🎯 Solução

### Fase 1: Schema do Banco de Dados ✅

**Arquivo**: `migrations/009_add_exam_scores_column.sql`

```sql
ALTER TABLE students
ADD COLUMN IF NOT EXISTS exam_scores JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_students_exam_scores ON students USING GIN (exam_scores);
```

**Estrutura JSONB**:
```json
[
  {
    "matricula": "12345",
    "edicao": "2024",
    "mediaAluno": 7.5,
    "nivelProficiencia": "Adequado",
    "anoEscolar": "5A",
    "disciplina": "Língua Portuguesa",
    "dataImportacao": "2024-10-28"
  }
]
```

### Fase 2: StudentDataService

#### 2.1. Atualizar `convertSupabaseStudentToLegacy`

```typescript
// ANTES:
provaSaoPaulo: [], // Not migrated

// DEPOIS:
provaSaoPaulo: student.exam_scores as ProvaSaoPaulo[] || [],
```

#### 2.2. Atualizar `updateStudent`

```typescript
const studentUpdate: StudentUpdate = {
  // ... campos existentes
  exam_scores: updatedStudent.provaSaoPaulo || [],
};
```

### Fase 3: useStudentProfile

```typescript
// ANTES (linha 150):
provaSaoPaulo: [],

// DEPOIS:
provaSaoPaulo: apiStudent.exam_scores || [],
```

### Fase 4: Types

Adicionar em `StudentUpdate` interface:

```typescript
interface StudentUpdate {
  // ... campos existentes
  exam_scores?: ProvaSaoPaulo[];
}
```

---

## 📊 Estrutura de Dados

### Firebase (LEGACY)
```javascript
// Firestore: students/{estudanteId}
{
  estudanteId: "uuid-v4",
  nome: "João Silva",
  provaSaoPaulo: [
    {
      matricula: "12345",
      edicao: "2024",
      mediaAluno: 7.5,
      nivelProficiencia: "Adequado",
      anoEscolar: "5A",
      disciplina: "Língua Portuguesa",
      dataImportacao: "2024-10-28"
    }
  ]
}
```

### Supabase (NOVO)
```sql
-- Tabela: students
id                UUID PRIMARY KEY
student_id        UUID UNIQUE (Firebase UUID)
name              TEXT
exam_scores       JSONB DEFAULT '[]'  -- 🆕 NOVO CAMPO
```

```json
{
  "id": "internal-uuid",
  "student_id": "firebase-uuid",
  "name": "João Silva",
  "exam_scores": [
    {
      "matricula": "12345",
      "edicao": "2024",
      "mediaAluno": 7.5,
      "nivelProficiencia": "Adequado",
      "anoEscolar": "5A",
      "disciplina": "Língua Portuguesa",
      "dataImportacao": "2024-10-28"
    }
  ]
}
```

---

## 🚀 Plano de Execução

### Passo 1: Executar Migration ✅

```bash
# Conectar ao Supabase via psql ou Dashboard
psql $SUPABASE_DATABASE_URL -f migrations/009_add_exam_scores_column.sql
```

Ou via Supabase Dashboard:
1. SQL Editor → New Query
2. Copiar conteúdo de `migrations/009_add_exam_scores_column.sql`
3. Run

**Verificar**:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'students' AND column_name = 'exam_scores';
```

### Passo 2: Atualizar StudentDataService

**Arquivos**:
- `src/services/studentDataService.ts`

**Mudanças**:
1. Linha 79: `provaSaoPaulo: student.exam_scores as ProvaSaoPaulo[] || []`
2. Método `updateStudent`: Adicionar `exam_scores` ao `studentUpdate`

### Passo 3: Atualizar useStudentProfile

**Arquivo**:
- `src/hooks/useStudentProfile.ts`

**Mudanças**:
1. Linha 150: `provaSaoPaulo: apiStudent.exam_scores || []`
2. Linha 275: `provaSaoPaulo: apiStudent.exam_scores || []`

### Passo 4: Testar

1. **Importar dados**: Acessar `/prova-sao-paulo` e importar CSV
2. **Verificar save**: Checar no Supabase se `exam_scores` foi populado
3. **Verificar load**: Abrir perfil do estudante e verificar se o card aparece com dados

---

## 🧪 Testes

### Teste 1: Importação de Dados

```bash
# 1. Acessar /prova-sao-paulo
# 2. Upload CSV com dados de teste
# 3. Processar
# 4. Verificar no Supabase:

SELECT id, name, exam_scores
FROM students
WHERE exam_scores != '[]'::jsonb
LIMIT 5;
```

**Resultado esperado**: Dados aparecendo no `exam_scores`

### Teste 2: Visualização no Perfil

```bash
# 1. Acessar /perfil-estudante
# 2. Buscar estudante que tem dados da Prova São Paulo
# 3. Verificar se o card ProvaSaoPauloSection aparece
# 4. Verificar se os dados são exibidos corretamente
```

**Resultado esperado**: Card exibindo tabela com resultados

### Teste 3: Edição Preserva Dados

```bash
# 1. Editar estudante que tem dados da Prova São Paulo
# 2. Modificar nome ou turma
# 3. Salvar
# 4. Verificar se exam_scores foi preservado

SELECT name, exam_scores
FROM students
WHERE student_id = 'uuid-do-estudante';
```

**Resultado esperado**: Dados da prova **não** foram perdidos

---

## ⚠️ Pontos de Atenção

### 1. Compatibilidade com Firebase (Dual-Write)

**NÃO** implementar dual-write para Prova São Paulo porque:
- ✅ Dados são importados via CSV (não criados manualmente)
- ✅ Importação já usa `StudentDataService.updateStudent()`
- ✅ Não há CRUD manual de Prova São Paulo no sistema

**Decisão**: Manter apenas em Supabase após migration.

### 2. Dados Existentes no Firebase

**Pergunta**: Existem dados da Prova São Paulo no Firebase que precisam ser migrados?

**Verificar**:
```javascript
// Firebase Console → Firestore → students
// Buscar documentos com campo 'provaSaoPaulo' != []
```

**Se SIM**:
- Criar script de migração de dados (Firebase → Supabase)
- Rodar antes de deploy

**Se NÃO**:
- Apenas criar a coluna e atualizar o código

### 3. Performance

**Índice GIN** criado para:
- Queries por `edicao` (ano)
- Queries por `disciplina`
- Queries por `nivelProficiencia`

**Exemplo**:
```sql
-- Buscar estudantes com nível "Insuficiente" em Matemática
SELECT id, name
FROM students
WHERE exam_scores @> '[{"disciplina": "Matemática", "nivelProficiencia": "Insuficiente"}]';
```

---

## 📁 Arquivos Afetados

### NOVOS (1 arquivo)
1. `migrations/009_add_exam_scores_column.sql` (migration SQL)

### MODIFICADOS (2 arquivos)
1. `src/services/studentDataService.ts`
   - Linha 79: Carregar de `exam_scores`
   - Método `updateStudent`: Salvar em `exam_scores`

2. `src/hooks/useStudentProfile.ts`
   - Linha 150: Usar `exam_scores` ao invés de `[]`
   - Linha 275: Usar `exam_scores` ao invés de `[]`

---

## ✅ Checklist de Implementação

- [x] Criar migration SQL (009_add_exam_scores_column.sql)
- [x] Atualizar `studentDataService.ts` (load) - linha 80
- [x] Atualizar `studentDataService.ts` (save) - linha 659
- [x] Atualizar `useStudentProfile.ts` (linha 152)
- [x] Atualizar `useStudentProfile.ts` (linha 278)
- [x] Adicionar import de `ProvaSaoPaulo` em ambos arquivos
- [x] Adicionar `@ts-expect-error` comments (temporário até migration)
- [x] Corrigir `ProvaSaoPauloSection` para sempre renderizar
- [x] Verificar com `npm run type-check` ✅
- [x] **Executar migration no Supabase** ✅
- [x] **Migrar dados do backup (512 estudantes)** ✅
- [ ] Testar visualização no perfil
- [ ] Testar importação de CSV
- [ ] Testar preservação em edição
- [ ] Commitar mudanças
- [ ] Deploy

---

## 📚 Referências

- **CLAUDE.md**: Padrão de migração de dados
- **docs/FASE-1-SERVICES-MIGRACAO-SUPABASE.md**: Riscos conhecidos
- **docs/archives/FIREBASE_DATABASE_GUIDE.md**: Estrutura original
- **Supabase JSONB**: https://supabase.com/docs/guides/database/json

---

**Status Atual**: ✅ **MIGRAÇÃO CONCLUÍDA COM SUCESSO!**

### O que foi feito:

1. ✅ **Migration SQL**: `migrations/009_add_exam_scores_column.sql` ✅ EXECUTADO
2. ✅ **ProvaSaoPauloSection**: Sempre renderiza (dados ou empty state)
3. ✅ **StudentDataService**: Carrega/salva `exam_scores`
4. ✅ **useStudentProfile**: Usa `exam_scores` em ambas computações
5. ✅ **Migração de Dados**: 512 estudantes migrados do backup Firebase → Supabase ✅ **100% SUCESSO**

### Resultado da Migração:

```
============================================================
📊 RESUMO DA MIGRAÇÃO
============================================================
Total de estudantes:     512
✅ Migrados com sucesso:  512
⏭️  Já possuíam dados:     0
⚠️  Não encontrados:       0
❌ Erros:                 0
============================================================
```

**Dados migrados**: 69.7% dos estudantes (512 de 735) possuem dados da Prova São Paulo
**Disciplinas**: Língua Portuguesa e Matemática
**Edição**: 2024

### Próximos passos:

```bash
# 1. ✅ Migration SQL executada (coluna exam_scores criada)
# 2. ✅ Dados migrados (512 estudantes)

# 3. Testar visualização no perfil
# Acessar /perfil-estudante
# Buscar estudante que foi migrado (ex: "ALICE DA SILVA SOUSA")
# Verificar se card "Prova São Paulo" aparece com dados

# 4. Testar importação (/prova-sao-paulo)
# 4. Verificar perfil (/perfil-estudante)
```

---

## 📦 Dados Encontrados no Backup

**Backup analisado**: `backups/students-backup-2025-09-30T10-26-57-332Z.json`

**Resultado**:
- ✅ **Total de estudantes**: 735
- ✅ **Com dados da Prova São Paulo**: **512 estudantes** (69.7%)
- ⚠️ **Sem dados**: 223 estudantes (30.3%)

**Estrutura dos dados** (exemplo):
```json
[
  {
    "anoEscolar": "2A",
    "matricula": "7712586",
    "mediaAluno": 126.7,
    "nivelProficiencia": "Adequado",
    "disciplina": "Língua Portuguesa",
    "dataImportacao": "15/07/2025",
    "edicao": "2024"
  },
  {
    "anoEscolar": "2A",
    "edicao": "2024",
    "disciplina": "Matemática",
    "dataImportacao": "15/07/2025",
    "mediaAluno": 135.8,
    "matricula": "7712586",
    "nivelProficiencia": "Básico"
  }
]
```

---

## 🔧 Script de Migração

**Arquivo**: `scripts/migrate-prova-sao-paulo.mjs`

**Características**:
- ✅ Processa em lotes de 50 estudantes
- ✅ Modo `--dry-run` para simular
- ✅ Pula estudantes que já têm dados
- ✅ Relatório detalhado ao final
- ✅ Tratamento de erros robusto

**Uso**:
```bash
# Simular (recomendado primeiro)
node scripts/migrate-prova-sao-paulo.mjs --dry-run

# Executar migração
node scripts/migrate-prova-sao-paulo.mjs
```

**Resultado esperado**:
```
📊 RESUMO DA MIGRAÇÃO
============================================================
Total de estudantes:     512
✅ Migrados com sucesso:  512
⏭️  Já possuíam dados:     0
⚠️  Não encontrados:       0
❌ Erros:                 0
============================================================
```
