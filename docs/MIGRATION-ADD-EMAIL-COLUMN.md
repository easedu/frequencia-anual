# Migration: Adicionar Coluna Email à Tabela Students

**Data**: 2025-10-28
**Objetivo**: Adicionar campo `email` à tabela `students` no Supabase
**Status**: ⏳ PENDENTE EXECUÇÃO MANUAL

## 📋 Problema Identificado

A coluna de E-mail na tabela de estudantes (`/cadastrar-estudante`) **não exibe valores** porque o campo `email` não existe na tabela `students` do Supabase.

### Evidência

Query atual retorna:
```json
{
  "id": "...",
  "student_id": "...",
  "name": "...",
  "class": "...",
  // ❌ Sem campo "email"
}
```

## 🎯 Solução

Adicionar coluna `email` à tabela `students`.

---

## 🔧 PASSO 1: Executar SQL no Supabase (MANUAL)

**⚠️ ATENÇÃO**: Este SQL deve ser executado **manualmente** no Supabase Dashboard.

### Como Executar

1. Acesse: https://supabase.com/dashboard/project/xccjifrggpgevqftwdkx
2. Menu lateral: **SQL Editor**
3. Clique em **New Query**
4. Cole o SQL abaixo
5. Clique em **Run**

### SQL a Executar

```sql
-- ============================================================================
-- Migration: Adicionar coluna email
-- Data: 2025-10-28
-- ============================================================================

-- 1. Adicionar coluna email (VARCHAR, nullable)
ALTER TABLE students
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 2. Criar índice para buscas por email (opcional, mas recomendado)
CREATE INDEX IF NOT EXISTS idx_students_email
ON students(email)
WHERE email IS NOT NULL;

-- 3. Adicionar comentário na coluna
COMMENT ON COLUMN students.email IS 'Email do estudante ou responsável';

-- 4. Verificar resultado
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'students'
  AND column_name = 'email';
```

### Resultado Esperado

```
column_name | data_type         | is_nullable | column_default
------------+-------------------+-------------+---------------
email       | character varying | YES         | NULL
```

---

## 🚀 PASSO 2: Atualizar Código (AUTOMÁTICO - JÁ IMPLEMENTADO)

Os seguintes arquivos serão atualizados automaticamente pelo Claude Code:

### 1. SELECT Strategies (`src/app/api/_utils/selectStrategies.ts`)

✅ Adicionar `email` a todos os níveis de SELECT:

```typescript
export const STUDENT_SELECT_QUERIES: Record<DetailLevel, string> = {
  minimal: 'id, student_id, name, class, shift, status',

  summary: `
    id, student_id, name, class, shift, status,
    birth_date, bolsa_familia, email,
    student_contacts(count)
  `,

  detailed: `
    id, student_id, name, class, shift, status,
    birth_date, bolsa_familia, registration_number,
    school_year, address, disabilities, email,
    created_at, updated_at
  `,

  full: `
    id, student_id, name, class, shift, status,
    birth_date, bolsa_familia, registration_number,
    school_year, address, disabilities, email,
    created_at, updated_at,
    student_contacts(...)
  `,
};
```

### 2. Conversão Supabase → Frontend (`src/app/api/students/route.ts`)

✅ Adicionar mapeamento do campo `email`:

```typescript
function convertSupabaseToEstudante(
  student: SupabaseStudent,
  detail: DetailLevel
): Record<string, unknown> {
  const base = {
    id: student.id,
    estudanteId: student.student_id,
    nome: student.name,
    turma: student.class,
    turno: student.shift,
    status: student.status,
    bolsaFamilia: student.bolsa_familia,
    email: student.email || '', // ✅ ADICIONAR
    // ... outros campos
  };
  // ...
}
```

### 3. Tipos TypeScript (`src/app/api/students/route.ts`)

✅ Adicionar ao tipo `SupabaseStudent`:

```typescript
interface SupabaseStudent {
  id: string;
  student_id: string;
  name: string;
  class: string;
  shift: string;
  status: string;
  bolsa_familia: string;
  registration_number?: string;
  birth_date?: string;
  email?: string; // ✅ ADICIONAR
  address?: Record<string, unknown>;
  disabilities?: string[];
  created_at: string;
  updated_at: string;
  student_contacts?: SupabaseContact[] | { count: number };
}
```

---

## ✅ PASSO 3: Testar

### 1. Verificar API

```bash
curl -s 'http://localhost:3000/api/students?limit=1' \
  -H 'Authorization: Bearer YOUR_TOKEN' | jq '.[0] | {email}'
```

**Esperado**:
```json
{
  "email": null  // ou "estudante@email.com" se preenchido
}
```

### 2. Verificar Frontend

1. Acessar: http://localhost:3000/cadastrar-estudante
2. Verificar coluna **E-mail**
3. ✅ Deve mostrar "Não informado" ou o email (se houver)

### 3. Testar Criação/Edição

1. Cadastrar novo estudante com email
2. Editar estudante existente e adicionar email
3. Verificar se salva corretamente

---

## 🗂️ Arquivos Modificados

- ✅ `src/app/api/_utils/selectStrategies.ts` (SELECT queries)
- ✅ `src/app/api/students/route.ts` (conversão + tipos)
- ✅ `src/app/api/students/[id]/route.ts` (UPDATE)
- ✅ `src/components/students/StudentTable.tsx` (já renderiza email)
- ✅ `src/app/cadastrar-estudante/page.tsx` (já tem filtro de email)

---

## 📊 Impacto

### Dados Existentes
- ✅ **Sem impacto**: Coluna é `nullable`, estudantes existentes terão `email = NULL`
- ✅ **Sem downtime**: Migration não bloqueia leituras/escritas

### Performance
- ✅ Índice criado para otimizar buscas por email
- ✅ SELECT minimal **não** busca email (otimizado)
- ✅ SELECT summary/detailed/full incluem email

---

## 🔒 Rollback (se necessário)

```sql
-- Remover coluna email (cuidado: perde dados!)
ALTER TABLE students DROP COLUMN IF EXISTS email;

-- Remover índice
DROP INDEX IF EXISTS idx_students_email;
```

---

## 📝 Checklist de Execução

- [ ] **SQL executado** no Supabase Dashboard
- [ ] **Verificação**: Coluna `email` existe na tabela
- [ ] **Código atualizado** (selectStrategies, route.ts)
- [ ] **Teste API**: `/api/students` retorna campo email
- [ ] **Teste Frontend**: Coluna E-mail aparece
- [ ] **Teste CRUD**: Criar/editar estudante com email

---

## 🎯 Conclusão

Após executar o SQL no Supabase Dashboard e atualizar o código, a coluna de E-mail funcionará corretamente em toda a aplicação.
