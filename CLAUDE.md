# 🎯 CLAUDE.md - Guia de Desenvolvimento do Projeto Frequência Anual

> **Instruções para Claude Code**: Este documento contém todas as diretrizes, padrões e melhores práticas para desenvolvimento e manutenção deste projeto.

---

## 📋 ÍNDICE

1. [Visão Geral do Projeto](#-visão-geral-do-projeto)
2. [Arquitetura e Tecnologias](#-arquitetura-e-tecnologias)
3. [Estrutura de Diretórios](#-estrutura-de-diretórios)
4. [Padrões de Código](#-padrões-de-código)
5. [🚫 REGRA CRÍTICA: ZERO TOLERÂNCIA COM `any`](#-regra-crítica-zero-tolerância-com-any)
6. [Boas Práticas de Desenvolvimento](#-boas-práticas-de-desenvolvimento)
7. [Níveis de Planejamento](#-níveis-de-planejamento)
8. [Guias de Implementação](#-guias-de-implementação)
9. [MCPs Configurados](#-mcps-configurados)
10. [Workflows Comuns](#-workflows-comuns)
11. [Prompts Efetivos](#-prompts-efetivos)
12. [Modo Planning (/plan)](#-modo-planning-plan)
13. [Documentações do Projeto](#-documentações-do-projeto)
14. [Comandos Úteis](#-comandos-úteis)
15. [Troubleshooting](#-troubleshooting)
16. [Checklists](#-checklists)
17. [Glossário](#-glossário)
18. [Não Fazer](#-não-fazer)

---

## 🎓 VISÃO GERAL DO PROJETO

### Descrição
Sistema de gerenciamento de frequência escolar anual desenvolvido como micro-SaaS, focado em controlar faltas, interações familiares, ocorrências e análises pedagógicas de estudantes.

### Objetivos Principais
- **Controle de Frequência**: Gerenciar faltas por bimestre com justificativas (atestados)
- **Gestão de Estudantes**: Cadastro completo com dados pessoais, contatos, endereço e deficiências
- **Interações Familiares**: Registro de comunicações com responsáveis
- **Análises e Relatórios**: Dashboards e visualizações de dados
- **Integração WhatsApp**: Envio automatizado de mensagens
- **Gerenciamento de Tarefas**: Sistema de follow-up pedagógico

### Público-Alvo
Escolas públicas municipais (EMEF - Ensino Médio e Fundamental)

---

## 🏗️ ARQUITETURA E TECNOLOGIAS

### Stack Principal

#### Frontend
- **Framework**: Next.js 15.3.1 (App Router)
- **React**: 19.1.0
- **TypeScript**: 5.x
- **Estilização**: Tailwind CSS 3.4.1
- **UI Components**:
  - shadcn/ui (Radix UI primitives)
  - Lucide React (ícones)
- **Formulários**: React Hook Form + Zod
- **Gráficos**: Recharts
- **Tabelas**: TanStack Table

#### Backend / Infraestrutura
- **Database**: Supabase PostgreSQL ✅ **MIGRADO**
- **Autenticação**: Firebase Auth (⏳ **temporário**, migrar para Supabase Auth)
- **Hosting**: Vercel
- **File Processing**:
  - PapaParse (CSV)
  - XLSX (Excel)

#### Ferramentas de Desenvolvimento
- **Linting**: ESLint 9
- **Type Checking**: TypeScript Compiler
- **Bundle Analysis**: @next/bundle-analyzer
- **Migration Tools**: tsx

### ✅ Migração Firestore → Supabase CONCLUÍDA

**Status**: Todos os dados agora usam **Supabase PostgreSQL**

- ✅ **Estudantes**: Tabela `students` (UUID v4)
- ✅ **Contatos**: Tabela `student_contacts` (FK para students)
- ✅ **Faltas**: Tabela `student_absences`
- ✅ **Atestados**: Tabela `medical_certificates`
- ✅ **Suspensões**: Tabela `student_suspensions`
- ✅ **Interações**: Tabela `family_interactions`
- ✅ **Tarefas**: Tabela `user_tasks`
- ✅ **WhatsApp**: Dados integrados em `student_contacts.whatsapp_data`

**Firebase**: Usado **APENAS para Auth** (próximo passo: migrar auth para Supabase)

---

## 📁 ESTRUTURA DE DIRETÓRIOS

```
frequencia-anual/
├── docs/                          # Documentações técnicas
│   ├── MIGRATION_PLAN_V3.md      # Plano de migração V2 → V3
│   ├── MCPs-CONFIGURADOS.md      # MCPs configurados no projeto
│   ├── GITHUB-TOKEN-SETUP.md     # Setup de tokens
│   └── ...                       # Outras documentações
│
├── public/                        # Arquivos estáticos
│
├── scripts/                       # Scripts de automação
│   ├── migrate-student-id.mjs    # Migração de IDs de estudantes
│   └── bundle-monitor.js         # Monitoramento de bundle
│
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx            # Layout raiz
│   │   ├── page.tsx              # Homepage/Landing
│   │   ├── login/                # Página de login
│   │   ├── home/                 # Dashboard principal
│   │   ├── cadastrar-estudante/  # CRUD de estudantes
│   │   ├── controlar-faltas/     # Controle de ausências
│   │   ├── gerenciador-tarefas/  # Sistema de tarefas
│   │   ├── relatorio-interacoes/ # Relatórios de interações
│   │   ├── perfil-deficiente/    # Perfil de estudantes com deficiência
│   │   ├── prova-sao-paulo/      # Importação de resultados
│   │   └── api/                  # API Routes
│   │       └── whatsapp/send/    # Endpoint WhatsApp
│   │
│   ├── components/               # Componentes React
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── cards/                # Cards de dashboard
│   │   ├── charts/               # Componentes de gráficos
│   │   ├── attendance/           # Componentes de frequência
│   │   ├── Header.tsx            # Cabeçalho
│   │   ├── Footer.tsx            # Rodapé
│   │   ├── StudentDialog.tsx     # Modal de estudante
│   │   ├── StudentForm.tsx       # Formulário de estudante
│   │   ├── StudentTable.tsx      # Tabela de estudantes
│   │   └── ...                   # Outros componentes
│   │
│   ├── hooks/                    # Custom React Hooks (✅ Fase 1.3 Concluída)
│   │   ├── useAuth.ts            # Autenticação Firebase
│   │   ├── useStudents.ts        # Lista de estudantes
│   │   ├── useFirebase.ts        # Coleções Firebase (genérico, com cache)
│   │   ├── useFirebaseDoc.ts     # Documentos Firebase (genérico, com cache)
│   │   └── attendance/           # Módulo de frequência (5 hooks modulares)
│   │       ├── index.ts          # Barrel export
│   │       ├── useBimesterPeriods.ts     # Períodos dos bimestres
│   │       ├── useSchoolDays.ts          # Dias letivos
│   │       ├── useStudentRecords.ts      # Registros de frequência
│   │       ├── useDuplicateAbsences.ts   # Detectar/remover duplicatas
│   │       └── useStudentAbsences.ts     # Faltas por estudante/bimestre
│   │
│   ├── services/                 # Camada de serviços
│   │   ├── studentDataService.ts # CRUD de estudantes
│   │   ├── whatsappService.ts    # Integração WhatsApp
│   │   ├── taskService.ts        # Gerenciamento de tarefas
│   │   └── ...                   # Outros serviços
│   │
│   ├── types/                    # Definições TypeScript
│   │   ├── index.ts              # Tipos centralizados
│   │   ├── tasks.ts              # Tipos de tarefas
│   │   └── dashboardTasks.ts     # Tipos de tarefas do dashboard
│   │
│   ├── utils/                    # Utilitários
│   │   ├── dateUtils.ts          # Manipulação de datas
│   │   ├── formatters/           # Formatadores
│   │   ├── cache.ts              # Sistema de cache
│   │   ├── security.ts           # Validações de segurança
│   │   └── ...                   # Outros utilitários
│   │
│   ├── firebase.config.ts        # Configuração Firebase
│   └── middleware.ts             # Middleware Next.js
│
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── CLAUDE.md                     # Este arquivo
└── README.md
```

---

## 💻 PADRÕES DE CÓDIGO

### TypeScript

#### 1. **Tipos Sempre Explícitos**
```typescript
// ✅ BOM
interface Student {
  estudanteId: string;
  nome: string;
  turma: string;
}

function getStudent(id: string): Promise<Student | null> {
  // ...
}

// ❌ RUIM
function getStudent(id: any) {
  // ...
}
```

#### 2. **Tipos Centralizados**
- **SEMPRE use os tipos de** `src/types/index.ts`
- Não crie interfaces duplicadas
- Use `export interface` para tipos reutilizáveis

```typescript
// ✅ BOM
import { Student, Contato, Deficiencia } from '@/types';

// ❌ RUIM
interface Student { ... } // Duplicação!
```

#### 3. **Union Types e Enums**
```typescript
// ✅ BOM - Union types literais
type Turno = 'MANHÃ' | 'TARDE';
type Status = 'ATIVO' | 'INATIVO';

// ❌ EVITAR - Strings abertas
type Turno = string;
```

#### 4. **Indexação Type-Safe**
```typescript
// ✅ BOM
const value = student[column as keyof Student];

// ❌ RUIM
const value = student[column]; // Erro TS7053
```

---

## 🚫 REGRA CRÍTICA: ZERO TOLERÂNCIA COM `any`

### ⚠️ POLÍTICA DE TYPE SAFETY

**ATENÇÃO**: Este projeto mantém **100% type safety** - qualquer uso de `any` é considerado um **BUG CRÍTICO**.

#### Regras Absolutas

1. ❌ **NUNCA use `any`** em qualquer código novo
2. ❌ **NUNCA use `as any`** para resolver erros de tipo
3. ❌ **NUNCA adicione `// @ts-ignore`** sem justificativa documentada
4. ✅ **SEMPRE use `unknown`** quando o tipo é realmente desconhecido
5. ✅ **SEMPRE use type guards** para narrowing de tipos
6. ✅ **SEMPRE use type assertions explícitas** com interfaces concretas

#### Processo Obrigatório Antes de Commit

**ANTES de cada commit, execute:**

```bash
# 1. Verificar erros TypeScript
npm run type-check 2>&1 | grep "^src/"

# 2. Verificar uso de 'any'
npm run lint 2>&1 | grep "Unexpected any"

# 3. Ambos devem retornar 0 erros
```

Se houver **QUALQUER erro**, corrija antes de commitar.

---

### 📚 Guia de Substituição de `any`

#### 1. **Para Tipos Realmente Desconhecidos**

```typescript
// ❌ NUNCA
function process(data: any) {
  return data.value;
}

// ✅ SEMPRE
function process(data: unknown) {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as { value: unknown }).value;
  }
  throw new Error('Invalid data structure');
}
```

#### 2. **Para Objetos Dinâmicos**

```typescript
// ❌ NUNCA
const config: Record<string, any> = { ... };

// ✅ SEMPRE
const config: Record<string, unknown> = { ... };

// Ou melhor ainda, interface explícita
interface Config {
  apiUrl: string;
  timeout: number;
  headers?: Record<string, string>;
}
const config: Config = { ... };
```

#### 3. **Para Respostas de API**

```typescript
// ❌ NUNCA
const response = await fetch('/api/students');
const data: any = await response.json();

// ✅ SEMPRE
interface ApiResponse {
  students: Student[];
  total: number;
}

const response = await fetch('/api/students');
const data = await response.json() as ApiResponse;
```

#### 4. **Para Parâmetros de Funções**

```typescript
// ❌ NUNCA
function handleError(error: any) {
  console.error(error.message);
}

// ✅ SEMPRE
function handleError(error: unknown) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

#### 5. **Para Generics**

```typescript
// ❌ NUNCA
function cache<T = any>(key: string, value: T) { ... }

// ✅ SEMPRE
function cache<T = unknown>(key: string, value: T) { ... }

// Ou melhor, sem default
function cache<T>(key: string, value: T) { ... }
```

#### 6. **Para Supabase Operations**

```typescript
// ❌ NUNCA
const { data } = await (supabaseAdmin.from('students') as any)
  .update(updateData);

// ✅ SEMPRE - Padrão estabelecido
const { data } = await supabaseAdmin
  .from('students')
  .update(updateData as never)  // Type assertion explícita
  .eq('id', studentId);

// Tipo do resultado
const result = data as Student[] | null;
```

**Nota**: `as never` é o **único** padrão aceito para operações Supabase devido a limitações do SDK.

#### 7. **Para Event Handlers**

```typescript
// ❌ NUNCA
function handleChange(e: any) {
  console.log(e.target.value);
}

// ✅ SEMPRE
function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
  console.log(e.target.value);
}
```

#### 8. **Para Logger Calls**

```typescript
// ❌ NUNCA
logger.error('Erro', error);  // error pode ser any

// ✅ SEMPRE
logger.error('Erro', {}, error as Error);
// ou
logger.error('Erro', { context: 'dados' }, error instanceof Error ? error : new Error(String(error)));
```

---

### 🔍 Type Guards Comuns

#### Verificação de Tipos Primitivos

```typescript
// String
if (typeof value === 'string') { ... }

// Number
if (typeof value === 'number' && !isNaN(value)) { ... }

// Boolean
if (typeof value === 'boolean') { ... }

// Object (não null)
if (typeof value === 'object' && value !== null) { ... }

// Array
if (Array.isArray(value)) { ... }

// Error
if (error instanceof Error) { ... }

// Propriedade existe
if (typeof obj === 'object' && obj !== null && 'prop' in obj) { ... }
```

#### Type Narrowing com Union Types

```typescript
type Status = 'ATIVO' | 'INATIVO' | 'PENDENTE';

function processStatus(status: string): Status {
  // ✅ Validar antes de assertar
  if (status === 'ATIVO' || status === 'INATIVO' || status === 'PENDENTE') {
    return status as Status;
  }

  // Fallback seguro
  return 'PENDENTE';
}
```

#### Custom Type Guards

```typescript
// Define um type guard
function isStudent(obj: unknown): obj is Student {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'estudanteId' in obj &&
    'nome' in obj &&
    'turma' in obj
  );
}

// Uso
function process(data: unknown) {
  if (isStudent(data)) {
    // TypeScript sabe que data é Student aqui
    console.log(data.nome);
  }
}
```

---

### 🛠️ Casos Especiais Permitidos

#### 1. **Supabase SDK Type Limitations**

```typescript
// ✅ ÚNICO caso onde 'as never' é permitido
const { data } = await supabaseAdmin
  .from('students')
  .update(updateData as never)  // Necessário devido ao SDK
  .eq('id', id);
```

**Justificativa**: O Supabase SDK tem problemas com inferência de tipos genéricos em operações insert/update.

#### 2. **@ts-expect-error com Justificativa**

```typescript
// ✅ Permitido com comentário explicativo
// @ts-expect-error - Supabase RPC não gera tipos automaticamente para funções customizadas
const { data } = await supabase.rpc('custom_function');
```

**Regra**: `@ts-expect-error` deve **SEMPRE** ter um comentário na linha anterior explicando o motivo.

#### 3. **Type Assertion para Unknown**

```typescript
// ✅ Permitido quando necessário
const data = unknownValue as unknown as KnownInterface;
```

**Regra**: Sempre passar por `unknown` primeiro para garantir que você sabe o que está fazendo.

---

### ⚡ Automação e Validação

#### Pre-commit Hook (Recomendado)

Adicione ao `.git/hooks/pre-commit`:

```bash
#!/bin/bash

echo "🔍 Verificando type safety..."

# Check TypeScript errors
TS_ERRORS=$(npm run type-check 2>&1 | grep "^src/" | wc -l)

if [ $TS_ERRORS -gt 0 ]; then
  echo "❌ Encontrados $TS_ERRORS erros TypeScript em src/"
  echo "Execute: npm run type-check 2>&1 | grep '^src/'"
  exit 1
fi

# Check 'any' usage
ANY_ERRORS=$(npm run lint 2>&1 | grep "Unexpected any" | wc -l)

if [ $ANY_ERRORS -gt 0 ]; then
  echo "❌ Encontrados $ANY_ERRORS usos de 'any'"
  echo "Execute: npm run lint 2>&1 | grep 'Unexpected any'"
  exit 1
fi

echo "✅ Type safety verificada - commit permitido"
exit 0
```

#### CI/CD Integration

Adicione ao GitHub Actions:

```yaml
- name: Type Safety Check
  run: |
    npm run type-check 2>&1 | grep "^src/" && exit 1 || exit 0
    npm run lint 2>&1 | grep "Unexpected any" && exit 1 || exit 0
```

---

### 📊 Métricas de Qualidade

**Status Atual do Projeto** (2025-01-10):
- ✅ Erros TypeScript em src/: **0**
- ✅ Usos de `any`: **0**
- ✅ Arquivos corrigidos: **122+**
- ✅ Type safety: **100%**

**Meta para Novos Commits**:
- 🎯 Manter 0 erros TypeScript
- 🎯 Manter 0 usos de `any`
- 🎯 100% coverage em type definitions

---

### 🚨 Processo de Code Review

**Checklist Obrigatória**:

- [ ] ✅ `npm run type-check` sem erros em src/
- [ ] ✅ `npm run lint` sem "Unexpected any"
- [ ] ✅ Todos os parâmetros tipados explicitamente
- [ ] ✅ Todas as funções com return type explícito
- [ ] ✅ Type guards para valores unknown/nullable
- [ ] ✅ Interfaces concretas ao invés de Record<string, unknown>
- [ ] ✅ Sem uso de `@ts-ignore` (usar `@ts-expect-error` com comentário)

**Se houver QUALQUER violação, o PR deve ser rejeitado até correção.**

---

### React e Next.js

#### 1. **Componentes Funcionais**
```typescript
// ✅ BOM - Componente funcional tipado
interface StudentCardProps {
  student: Student;
  onEdit: (id: string) => void;
}

export function StudentCard({ student, onEdit }: StudentCardProps) {
  // ...
}

// ❌ RUIM - Sem tipos
export function StudentCard({ student, onEdit }) {
  // ...
}
```

#### 2. **Server vs Client Components**
```typescript
// Client Component - usa hooks, eventos
'use client';
import { useState } from 'react';

export function InteractiveButton() {
  const [count, setCount] = useState(0);
  // ...
}

// Server Component - sem 'use client'
export async function DataList() {
  const data = await fetchData();
  // ...
}
```

#### 3. **Hooks Customizados**
```typescript
// ✅ BOM - Hook bem tipado
export function useStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // ...

  return { students, loading, error, setStudents };
}
```

#### 4. **Memoização**
```typescript
// Use useMemo para cálculos pesados
const filteredStudents = useMemo(() => {
  return students.filter(s => s.turma === selectedTurma);
}, [students, selectedTurma]);

// Use useCallback para funções passadas como props
const handleEdit = useCallback((id: string) => {
  // ...
}, [dependencies]);
```

### Firebase / Firestore

#### 1. **Dual-Write Durante Migração**
```typescript
// ✅ BOM - Escreve em V2 e V3
await StudentDataService.addStudent(studentData);

// ❌ RUIM - Escreve apenas em V2
await setDoc(doc(db, 'estudantes', oldId), data);
```

#### 2. **IDs de Estudante**
```typescript
// V3 - UUID (NOVO)
import { v4 as uuidv4 } from 'uuid';
const estudanteId = uuidv4(); // "550e8400-e29b-41d4-a716-446655440000"

// V2 - Timestamp (LEGACY - não usar)
const estudanteId = Date.now().toString(); // "1759711348806"
```

#### 3. **Queries Otimizadas**
```typescript
// ✅ BOM - Query com índice
const q = query(
  collection(db, 'estudantes'),
  where('turma', '==', '5A'),
  orderBy('nome')
);

// ⚠️ ATENÇÃO - Pode precisar de índice composto
const q = query(
  collection(db, 'estudantes'),
  where('turma', '==', '5A'),
  where('status', '==', 'ATIVO'),
  orderBy('nome')
);
// Verificar: https://console.firebase.google.com/project/_/firestore/indexes
```

### APIs REST e Supabase

---

## ⚠️ **REGRA CRÍTICA: DUAL ID SYSTEM** ⚠️

**LEIA ISTO PRIMEIRO ANTES DE MEXER EM QUALQUER API OU QUERY!**

O sistema usa **DOIS tipos de IDs** para estudantes:

### 🆔 Tipos de ID

| Tipo | Campo Supabase | Descrição | Uso |
|------|---------------|-----------|-----|
| **Internal ID** | `id` (Primary Key) | UUID gerado pelo Supabase | Queries internas, JOINs, FKs |
| **Firebase UUID** | `student_id` (Unique) | UUID do Firebase (legacy) | APIs públicas, Frontend, URLs |

### 🎯 **REGRA DE OURO**: SEMPRE use Firebase UUID em APIs públicas

```typescript
// ✅ SEMPRE CORRETO - API Route Pattern
export const GET = withAuth(async (req: NextRequest, userId: string, context?: RouteParams) => {
  const params = await context?.params;
  const firebaseUUID = params?.id; // Firebase UUID da URL

  // 1️⃣ Query por student_id (Firebase UUID)
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('*')
    .eq('student_id', firebaseUUID)  // ✅ CORRETO!
    .single();
});

// ❌ NUNCA FAZER - Query errada
export const GET = withAuth(async (req: NextRequest, userId: string, context?: RouteParams) => {
  const params = await context?.params;
  const firebaseUUID = params?.id;

  // Query por 'id' com Firebase UUID - VAI DAR 404!
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('*')
    .eq('id', firebaseUUID)  // ❌ ERRADO! 'id' é Internal ID!
    .single();
});
```

### 📋 Checklist de APIs

**TODA vez que criar/modificar uma API Route, seguir este checklist:**

- [ ] **GET `/api/resource/[id]`**: Query por `student_id`, não por `id`
- [ ] **PUT/DELETE `/api/resource/[id]`**:
  1. Buscar por `student_id` para validar
  2. Pegar o `id` (Internal ID) do resultado
  3. Usar Internal ID para UPDATE/DELETE
- [ ] **POST/GET list**: Retornar AMBOS os IDs no response:
  ```typescript
  {
    id: student.id,              // Internal ID
    student_id: student.student_id,  // Firebase UUID (snake_case)
    estudanteId: student.student_id  // Firebase UUID (camelCase legacy)
  }
  ```
- [ ] **JOINs**: Sempre incluir `student_id` no SELECT explícito

### 🔍 Exemplo Completo: GET por ID

```typescript
// /api/students/[id]/route.ts
export const GET = withAuth(
  async (req: NextRequest, userId: string, context?: RouteParams) => {
    const params = await context?.params;
    const firebaseUUID = params?.id; // ce5ac93c-bad9-4f82-af87-ffac12eb395f

    // ✅ PASSO 1: Query por student_id
    const { data, error } = await supabaseAdmin
      .from('students')
      .select('*, student_contacts(*)')
      .eq('student_id', firebaseUUID)  // ✅ Firebase UUID
      .eq('deleted', false)
      .single();

    // ✅ PASSO 2: Retornar com ambos os IDs
    return successResponse({
      id: data.id,                    // Internal ID
      estudanteId: data.student_id,   // Firebase UUID
      nome: data.name,
      // ...
    });
  }
);
```

### 🔧 Exemplo Completo: PUT/DELETE por ID

```typescript
// /api/students/[id]/route.ts
export const PUT = withAuth(
  async (req: NextRequest, userId: string, context?: RouteParams) => {
    const params = await context?.params;
    const firebaseUUID = params?.id;

    // ✅ PASSO 1: Buscar por student_id para validar
    const { data: existing, error } = await supabaseAdmin
      .from('students')
      .select('id, student_id')  // Buscar ambos os IDs
      .eq('student_id', firebaseUUID)
      .eq('deleted', false)
      .single();

    if (error || !existing) {
      return notFoundResponse('Estudante', firebaseUUID);
    }

    // ✅ PASSO 2: Pegar Internal ID
    const internalId = existing.id;

    // ✅ PASSO 3: UPDATE usando Internal ID
    const { error: updateError } = await supabaseAdmin
      .from('students')
      .update({ name: 'Novo Nome' })
      .eq('id', internalId);  // ✅ Internal ID para UPDATE

    // ✅ PASSO 4: Operações de FK também usam Internal ID
    await supabaseAdmin
      .from('student_contacts')
      .delete()
      .eq('student_id', internalId);  // ✅ FK usa Internal ID
  }
);
```

### 🚨 Erros Comuns

| ❌ Erro | ✅ Correção |
|---------|-------------|
| `.eq('id', firebaseUUID)` | `.eq('student_id', firebaseUUID)` |
| `.select('*')` sem `student_id` | `.select('*, student_contacts(*)')` explícito |
| UPDATE com Firebase UUID | Buscar Internal ID primeiro |
| Retornar só `id` | Retornar `id` + `student_id` + `estudanteId` |
| Frontend resolver UUID | Backend sempre resolve |

### 🧪 Como Testar

```bash
# ✅ Deve funcionar (Firebase UUID)
curl http://localhost:3000/api/students/ce5ac93c-bad9-4f82-af87-ffac12eb395f

# ❌ Vai dar 404 (Internal ID)
curl http://localhost:3000/api/students/d2b76d89-660f-4179-961a-1ea294bd14ca
```

---

#### 1. **Pattern: Backend API Routes (✅ NOVO - Jan 2025)**

**IMPORTANTE**: Todas as APIs REST devem seguir este padrão estabelecido nas Fases 1-4 de refatoração.

```typescript
// Backend API: /api/students/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/api/_middleware/auth';
import { resolveFirebaseUUIDToInternal } from '@/app/api/_utils/studentIdResolver';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { successResponse, errorResponse } from '@/app/api/_utils/response';

// ✅ BOM - API aceita Firebase UUID e resolve no backend
export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const estudanteId = searchParams.get('estudanteId'); // Firebase UUID

    // Resolver Firebase UUID → Internal ID (backend)
    const internalId = await resolveFirebaseUUIDToInternal(estudanteId);

    if (!internalId) {
      return errorResponse('NOT_FOUND', 'Estudante não encontrado', 404);
    }

    // Query usando Internal ID
    const { data, error } = (await supabaseAdmin
      .from('students')
      .select('*')
      .eq('id', internalId)
      .single()) as { data: any; error: any };

    if (error) {
      return errorResponse('DATABASE_ERROR', 'Erro ao buscar', 500);
    }

    return successResponse(data);
  } catch (error) {
    return handleError(error, 'GET /api/students');
  }
});

// ❌ RUIM - API espera Internal ID (frontend precisa resolver)
export const GET = async (req: NextRequest) => {
  const studentId = searchParams.get('studentId'); // Internal ID!
  // Frontend teve que chamar resolveToInternalId() antes!
};
```

#### 2. **Pattern: Frontend Service (✅ NOVO - Jan 2025)**

**IMPORTANTE**: Frontend **não deve** resolver UUID manualmente. Enviar Firebase UUID direto.

```typescript
// Frontend Service: src/services/MyService.ts
import { getAuthHeaders } from '@/utils/authToken';
import { logger } from '@/utils/logger';

export class MyService {
  // ✅ BOM - Envia Firebase UUID direto, backend resolve
  static async getData(firebaseStudentId: string) {
    try {
      const headers = await getAuthHeaders(); // JWT do Firebase

      const response = await fetch(`/api/students?estudanteId=${firebaseStudentId}`, {
        headers, // Bearer Token
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      logger.error('Erro ao buscar dados', { firebaseStudentId }, error as Error);
      throw error;
    }
  }

  // ❌ RUIM - Resolve UUID no frontend (padrão antigo)
  static async getDataOLD(firebaseStudentId: string) {
    const internalId = await resolveToInternalId(firebaseStudentId); // ❌
    const response = await fetch(`/api/students?studentId=${internalId}`);
  }
}
```

#### 3. **Type Safety com Supabase Admin**

```typescript
// ✅ BOM - Type casting explícito
const { data, error } = (await supabaseAdmin
  .from('students')
  .select('id, student_id')
  .eq('student_id', firebaseUUID)
  .maybeSingle()) as { data: { id: string; student_id: string } | null; error: any };

// ❌ RUIM - TypeScript infere como 'never'
const { data, error } = await supabaseAdmin
  .from('students')
  .select('id, student_id')
  .eq('student_id', firebaseUUID)
  .maybeSingle();
```

#### 4. **Middleware de Autenticação**

```typescript
// ✅ BOM - Usar withAuth para proteger APIs
import { withAuth } from '@/app/api/_middleware/auth';

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  // userId já validado pelo middleware
});

// ❌ RUIM - API sem autenticação
export async function POST(req: NextRequest) {
  // Qualquer um pode chamar!
}
```

**📖 Documentação Completa**: `docs/REFATORACAO-SUPABASE-FRONTEND-FASES-1-4-COMPLETA.md`

### Formulários e Validação

#### 1. **React Hook Form + Zod**
```typescript
// Schema Zod
const studentSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  turma: z.string().min(1, "Turma é obrigatória"),
  turno: z.enum(["MANHÃ", "TARDE"]),
  email: z.string().email().optional().or(z.literal("")),
});

// Formulário
const form = useForm({
  resolver: zodResolver(studentSchema),
  defaultValues: { ... }
});
```

#### 2. **Validação de Dados**
```typescript
// ✅ BOM - Validação antes de salvar
if (!data.nome?.trim()) {
  toast.error("Nome é obrigatório");
  return;
}

// Sanitização
const cleanPhone = phone.replace(/\D/g, ''); // Remove não-dígitos
const cleanCEP = cep.replace(/\D/g, '');
```

### Estilização

#### 1. **Tailwind Classes**
```tsx
// ✅ BOM - Classes utilitárias
<div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm">
  <Icon className="w-5 h-5 text-blue-600" />
  <span className="text-sm font-medium">Texto</span>
</div>

// ❌ RUIM - Inline styles
<div style={{ display: 'flex', padding: '1rem' }}>
```

#### 2. **Responsividade**
```tsx
// ✅ BOM - Mobile-first
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

#### 3. **Dark Mode**
```tsx
// ✅ BOM - Dark mode support
<div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
```

### Nomenclatura

#### 1. **Arquivos**
- **Componentes**: PascalCase → `StudentCard.tsx`
- **Hooks**: camelCase com 'use' → `useStudents.ts`
- **Utilitários**: camelCase → `dateUtils.ts`
- **Tipos**: camelCase → `index.ts`
- **Pages**: kebab-case → `cadastrar-estudante/page.tsx`

#### 2. **Variáveis e Funções**
```typescript
// ✅ BOM
const studentName = "João";
function calculateTotalAbsences() { ... }
const handleSubmit = () => { ... };

// ❌ RUIM
const StudentName = "João";
function CalculateTotalAbsences() { ... }
```

#### 3. **Constantes**
```typescript
// ✅ BOM
const MAX_ABSENCES_PER_BIMESTER = 50;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// ❌ RUIM
const maxAbsences = 50;
```

---

## ✅ BOAS PRÁTICAS DE DESENVOLVIMENTO

### 0. **🔥 SEMPRE USE FIREBASE EMULATORS** ⚠️

**REGRA CRÍTICA**: Durante desenvolvimento, **SEMPRE** use Firebase Emulators (banco local).

#### Por que?
- ✅ **Quota ILIMITADA** (0 reads consumidos)
- ✅ **Velocidade** (50ms vs 8000ms)
- ✅ **Dados reais** (não mock, estrutura idêntica)
- ✅ **Segurança** (não afeta produção)

#### Como Usar

```bash
# Terminal 1: SEMPRE iniciar emulators primeiro
npm run emulators

# Terminal 2: Next.js
npm run dev
```

Confirme no console do navegador:
```
🔥 Conectado aos Firebase Emulators (Firestore: 8080, Auth: 9099)
```

#### Quando NÃO usar Emulators
- ❌ **Nunca** durante desenvolvimento normal
- ✅ **Apenas** em validação final pré-deploy
- ✅ **Apenas** em produção (Vercel)

**Detecção é automática**: `localhost` → Emulators | `vercel.app` → Produção

📖 **Ver**: `docs/EMULATORS-QUICK-START.md`

---

### 1. **Antes de Qualquer Implementação**

#### Checklist Pré-Desenvolvimento
- [ ] **🔥 Iniciar Firebase Emulators** (`npm run emulators`)
- [ ] Ler a issue/tarefa completamente
- [ ] Verificar documentações relacionadas em `docs/`
- [ ] Entender o contexto (V2 vs V3, dual-write?)
- [ ] Identificar tipos existentes em `src/types/`
- [ ] Verificar se já existe componente/hook similar
- [ ] Planejar a solução antes de codificar
- [ ] **⚠️ NUNCA DEIXAR TODOs** - Implementar TUDO antes de commitar

#### Planejamento
```markdown
1. **Objetivo**: O que precisa ser feito?
2. **Análise**:
   - Quais arquivos serão modificados?
   - Quais tipos/interfaces preciso?
   - Há dependências?
3. **Implementação**:
   - Etapa 1: ...
   - Etapa 2: ...
4. **Testes**:
   - Caso 1: ...
   - Caso 2: ...
```

### 2. **Durante o Desenvolvimento**

#### Git e Commits
```bash
# ✅ BOM - Commits pequenos e descritivos
git commit -m "feat: adicionar filtro por turma no dashboard"
git commit -m "fix: corrigir validação de data de nascimento"
git commit -m "refactor: extrair lógica de cálculo de faltas"

# ❌ RUIM
git commit -m "updates"
git commit -m "fix"
```

#### Error Handling
```typescript
// ✅ BOM
try {
  const data = await fetchStudents();
  return data;
} catch (error) {
  console.error('Erro ao buscar estudantes:', error);
  toast.error('Erro ao carregar estudantes. Tente novamente.');
  return [];
}

// ❌ RUIM
const data = await fetchStudents(); // Sem try-catch
```

#### Performance

**Evitar Re-renders Desnecessários**
```typescript
// ✅ BOM
const MemoizedComponent = memo(function StudentCard({ student }) {
  // ...
});

// Use useMemo para cálculos
const totalAbsences = useMemo(() => {
  return calculateTotal(absences);
}, [absences]);
```

**Lazy Loading**
```typescript
// ✅ BOM - Componentes pesados
const HeavyChart = lazy(() => import('./HeavyChart'));
```

**Paginação**
```typescript
// ✅ BOM - Não carregar todos os dados de uma vez
const [page, setPage] = useState(1);
const pageSize = 20;
const paginatedData = data.slice((page-1)*pageSize, page*pageSize);
```

### 3. **Segurança**

#### Validação de Entrada
```typescript
// ✅ BOM
function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, ''); // Remove tags HTML
}

// Validar CPF, telefone, etc
import { isValidCPF } from '@/utils/security';
```

#### Proteção de Rotas
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('authToken');

  if (!token && request.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

#### Env Variables
```typescript
// ✅ BOM
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (!apiKey) {
  throw new Error('Firebase API Key não configurada');
}

// ❌ RUIM - Hardcoded
const apiKey = "AIzaSyC...";
```

### 4. **Acessibilidade**

```tsx
// ✅ BOM
<button
  aria-label="Editar estudante"
  onClick={handleEdit}
  className="..."
>
  <EditIcon />
</button>

<input
  id="nome"
  name="nome"
  aria-describedby="nome-error"
  aria-invalid={!!errors.nome}
/>
```

### 5. **Testes Manuais**

Sempre testar:
- [ ] Happy path (fluxo normal)
- [ ] Validações (campos obrigatórios)
- [ ] Edge cases (valores limites)
- [ ] Error handling (erros de rede, etc)
- [ ] Responsividade (mobile, tablet, desktop)
- [ ] Dark mode

---

## 🎯 NÍVEIS DE PLANEJAMENTO

### Filosofia: "Planeje na Medida Certa"

> **Princípio**: Nem todo código precisa de planejamento extensivo. Use o nível apropriado para cada situação.

**Objetivos**:
- ⚡ Velocidade em tarefas simples
- 🎯 Precisão em tarefas complexas
- 🔄 Flexibilidade para ajustar abordagem
- 📊 Transparência sobre o processo

---

### 📊 Flowchart de Decisão

```
Tarefa recebida
    │
    ├─ É apenas pergunta/consulta?
    │   └─ SIM → Nível 0: Resposta Direta ⚡
    │
    ├─ Usuário pediu "pare e planeje"?
    │   └─ SIM → Usar nível que ele pediu
    │
    ├─ É typo/correção óbvia? (1 arquivo, <5 linhas)
    │   └─ SIM → Nível 1: Execução Direta 🏃
    │
    ├─ É tarefa pequena-média? (1-2 arquivos, 30min-2h)
    │   └─ SIM → Nível 2: Planning Simples 📝
    │
    ├─ É tarefa complexa? (3+ arquivos, 2-8h)
    │   └─ SIM → Nível 3: Planning Detalhado 📋
    │
    └─ É feature grande/refactoring? (8+ horas)
        └─ SIM → Nível 4: Modo /plan 🗺️
```

---

### Nível 0: Resposta Direta ⚡

**Quando usar**:
- ✅ Perguntas sobre código/arquitetura
- ✅ Consultas à documentação
- ✅ Explicações de conceitos
- ✅ Ajuda com comandos
- ✅ Recomendações técnicas

**Não usar**:
- ❌ Implementação de código
- ❌ Modificações em arquivos

**Características**:
- 🚫 Sem TODO list
- 🚫 Sem execução de ferramentas
- ✅ Resposta clara e direta
- ✅ Referências quando necessário

**Exemplos**:

```
Pergunta: "O que faz o StudentDataService?"
Resposta: O StudentDataService é responsável pelo CRUD de estudantes
com dual-write V2/V3. Principais métodos:
- addStudent(): Cria novo estudante (UUID)
- updateStudent(): Atualiza existente
- getStudents(): Busca com filtros
Localização: src/services/studentDataService.ts
```

```
Pergunta: "Como rodar o projeto?"
Resposta: npm run dev
Abre em http://localhost:3000
```

```
Pergunta: "Qual a diferença entre V2 e V3?"
Resposta: V2 usa IDs numéricos (timestamp), V3 usa UUID v4.
Estamos em migração com dual-write ativo.
Ver: docs/MIGRATION_PLAN_V3.md
```

---

### Nível 1: Execução Direta 🏃

**Quando usar**:
- ✅ Typos e correções simples
- ✅ 1 arquivo, < 10 linhas modificadas
- ✅ Bugs óbvios com causa clara
- ✅ Ajustes de estilo/formatação
- ✅ Imports faltando

**Não usar**:
- ❌ Múltiplos arquivos
- ❌ Lógica complexa
- ❌ Possibilidade de quebrar código

**Características**:
- 🚫 Sem TODO list visível
- ✅ Comunicação breve do que vai fazer
- ✅ Execução imediata
- ✅ Confirmação após concluir

**Exemplos**:

```
Pedido: "Corrige o typo 'estudate' na linha 45 de StudentForm.tsx"
Ação: Vou corrigir o typo.
[Usa Edit para corrigir]
Resultado: Corrigido 'estudate' → 'estudante' em StudentForm.tsx:45
```

```
Pedido: "Adiciona o import de toast que está faltando"
Ação: Vou adicionar o import do toast.
[Usa Edit]
Resultado: Adicionado import { toast } from 'sonner' em page.tsx:5
```

```
Pedido: "Remove esse console.log esquecido"
Ação: Vou remover o console.log.
[Usa Edit]
Resultado: Removido console.log da linha 127
```

---

### Nível 2: Planning Simples 📝

**Quando usar**:
- ✅ 1-2 arquivos
- ✅ 30 minutos - 2 horas estimadas
- ✅ Mudanças médias (nova validação, componente simples)
- ✅ Requer alguns passos ordenados
- ✅ Baixo risco mas não trivial

**Não usar**:
- ❌ Tarefas de 5 minutos (usar Nível 1)
- ❌ Tarefas de 4+ horas (usar Nível 3 ou 4)

**Características**:
- ✅ TODO list visível (3-5 itens)
- ✅ Fases claras mas simples
- ✅ Execução incremental
- ✅ Comunicação de progresso

**Template**:
```
Vou [ação] seguindo estes passos:
1. [Passo 1]
2. [Passo 2]
3. [Passo 3]
4. [Passo 4]
5. [Passo 5]

[Executa passo a passo, marcando concluídos]
```

**Exemplos**:

```
Pedido: "Adiciona validação de CPF no formulário de estudante"

TODO:
1. Verificar se já existe helper de CPF em @/utils/security
2. Atualizar schema Zod em page.tsx
3. Adicionar validação no campo CPF
4. Testar com CPF válido e inválido
5. Verificar mensagem de erro

[Executa cada passo marcando como concluído]
```

```
Pedido: "Cria um filtro de estudantes por deficiência no dashboard"

TODO:
1. Adicionar estado de filtro em page.tsx
2. Adicionar Select no StudentFilters.tsx
3. Implementar lógica de filtro no useMemo
4. Testar com estudantes com/sem deficiência
5. Verificar performance

[Executa incrementalmente]
```

```
Pedido: "Extrai essa lógica de cálculo para um hook"

TODO:
1. Criar arquivo src/hooks/useAbsenceCalculation.ts
2. Mover lógica de cálculo para o hook
3. Adicionar tipos TypeScript
4. Substituir uso no componente original
5. Testar se comportamento permanece igual

[Executa passo a passo]
```

---

### Nível 3: Planning Detalhado 📋

**Quando usar**:
- ✅ 3+ arquivos afetados
- ✅ 2-8 horas estimadas
- ✅ Múltiplas integrações
- ✅ Refactoring médio
- ✅ Features com dependências
- ✅ Risco médio de quebrar código

**Não usar**:
- ❌ Tarefas simples de 1-2 arquivos (usar Nível 2)
- ❌ Features arquiteturais grandes (usar Nível 4)

**Características**:
- ✅ TODO list detalhada (5-15 itens)
- ✅ Fases bem definidas
- ✅ Lista de arquivos afetados
- ✅ Pontos de atenção identificados
- ✅ Execução passo a passo com confirmação

**Template**:
```
Vou implementar [feature] com o seguinte plano:

ANÁLISE:
- Arquivos afetados: X, Y, Z
- Dependências: A, B
- Pontos de atenção: [riscos]

PLANO:
Fase 1: Preparação
1. [Passo]
2. [Passo]

Fase 2: Implementação Core
3. [Passo]
4. [Passo]
5. [Passo]

Fase 3: Integração
6. [Passo]
7. [Passo]

Fase 4: Validação
8. [Passo]
9. [Passo]

[Executa fase por fase]
```

**Exemplos**:

```
Pedido: "Implementa exportação de dados para Excel"

ANÁLISE:
- Arquivos afetados:
  • src/services/exportService.ts (NOVO)
  • src/app/cadastrar-estudante/page.tsx (botão)
  • src/types/index.ts (interface Export)
  • package.json (biblioteca xlsx)
- Dependências: xlsx
- Pontos de atenção: Performance com 700+ estudantes, Formato de datas

PLANO:
Fase 1: Setup (30min)
1. Instalar biblioteca xlsx
2. Criar tipos em src/types/index.ts
3. Criar src/services/exportService.ts

Fase 2: Implementação (1h)
4. Implementar função formatDataForExcel()
5. Implementar função exportToExcel()
6. Adicionar tratamento de erros
7. Testar com dados mockados

Fase 3: UI (30min)
8. Adicionar botão "Exportar" em page.tsx
9. Adicionar loading state
10. Adicionar toast de sucesso/erro

Fase 4: Testes (30min)
11. Testar com 10 estudantes
12. Testar com 700+ estudantes
13. Verificar formatação de dados
14. Testar em diferentes browsers

[Executa fase por fase, marcando cada item]
```

```
Pedido: "Refatora lógica de cálculo de faltas para melhorar performance"

ANÁLISE:
- Arquivos afetados:
  • src/hooks/useAttendanceData.ts (principal)
  • src/utils/attendanceUtils.ts (helpers)
  • src/app/home/page.tsx (uso)
  • src/components/cards/KPIsCard.tsx (uso)
- Problemas atuais: Cálculos em cada render, Sem memoização
- Pontos de atenção: Não quebrar cálculos existentes, Manter precisão

PLANO:
Fase 1: Análise (30min)
1. Mapear todos os cálculos atuais
2. Identificar cálculos pesados
3. Medir performance atual (baseline)

Fase 2: Otimização (2h)
4. Adicionar useMemo em useAttendanceData
5. Extrair cálculos puros para attendanceUtils
6. Implementar cache de resultados
7. Adicionar useCallback em funções passadas

Fase 3: Testes (1h)
8. Testar cálculos com dados de teste
9. Comparar resultados com versão antiga
10. Medir performance nova (comparar)
11. Testar com 700+ estudantes

Fase 4: Validação (30min)
12. Verificar KPIs no dashboard
13. Verificar relatórios
14. Code review de performance

[Executa incrementalmente]
```

---

### Nível 4: Modo /plan Completo 🗺️

**Quando usar**:
- ✅ Features grandes (8+ horas)
- ✅ Refactoring arquitetural
- ✅ Mudanças em múltiplos módulos
- ✅ Alto risco de impacto
- ✅ Necessita análise de trade-offs
- ✅ Quando usuário pede `/plan`

**Não usar**:
- ❌ Tarefas de < 8 horas (usar Níveis 1-3)
- ❌ Urgências (apresentar plano leva tempo)

**Características**:
- ✅ Template completo de planning (seção anterior)
- ✅ Análise com MCPs
- ✅ Múltiplas alternativas consideradas
- ✅ Estimativas detalhadas
- ✅ Análise de riscos
- ✅ **AGUARDA APROVAÇÃO antes de executar**

**Ver**: [Seção Modo Planning (/plan)](#-modo-planning-plan) para templates completos

**Quando Usar /plan**:
```
Você: /plan
Eu: [Tarefa complexa]

Claude:
1. Apresenta plano de 200-800 linhas
2. Análise completa
3. Arquitetura proposta
4. Fases detalhadas
5. Riscos identificados
6. Aguarda aprovação

Você responde:
✅ "Aprovado" → Começa execução
✅ "Mude X e Y" → Ajusta plano
❌ "Muito grande" → Sugere alternativa
```

---

### 🎛️ Como Claude Decide o Nível

#### Decisão Automática:

```typescript
function escolherNivel(tarefa: string): Nivel {
  // 1. Usuário pediu nível específico?
  if (tarefa.includes("/plan")) return Nivel.PLAN_COMPLETO;
  if (tarefa.includes("pare") && tarefa.includes("planeje")) {
    return analisarComplexidade(tarefa); // Escolhe 2, 3 ou 4
  }

  // 2. É pergunta/consulta?
  if (éPergunta(tarefa) && !requerCódigo(tarefa)) {
    return Nivel.RESPOSTA_DIRETA;
  }

  // 3. Análise de complexidade
  const analise = analisarTarefa(tarefa);

  if (analise.arquivos === 1 && analise.linhas < 10) {
    return Nivel.EXECUCAO_DIRETA; // Typo, import
  }

  if (analise.arquivos <= 2 && analise.horas < 2) {
    return Nivel.PLANNING_SIMPLES; // Validação, filtro
  }

  if (analise.arquivos <= 5 && analise.horas < 8) {
    return Nivel.PLANNING_DETALHADO; // Export, refactor médio
  }

  return Nivel.PLAN_COMPLETO; // Feature grande
}
```

#### Sinais de Complexidade:

**Nível 1 (Direto)**:
- "corrige", "remove", "adiciona import"
- Menção a linha específica
- Typo/formatação

**Nível 2 (Simples)**:
- "adiciona validação", "cria filtro"
- "extrai para hook"
- Componente simples

**Nível 3 (Detalhado)**:
- "implementa", "refatora", "otimiza"
- Múltiplos arquivos mencionados
- "integração", "export"

**Nível 4 (Plan)**:
- "sistema de", "arquitetura"
- "/plan" explícito
- "nova feature", "migração"

---

### 🔄 Flexibilidade: Você Sempre Pode Pedir Nível Específico

```
Você: "Adiciona validação de CPF"
Claude: [Nível 2 automático]

Você: "Adiciona validação de CPF, mas me mostre o plano completo antes"
Claude: [Muda para Nível 3, apresenta plano detalhado]

Você: "/plan implementar validação de CPF com biblioteca externa"
Claude: [Nível 4 completo]

Você: "Só corrige esse typo, sem explicação"
Claude: [Nível 1 direto]
```

---

### 📈 Tabela Resumo de Níveis

| Nível | Nome | Arquivos | Tempo | TODO | Aprovação | Uso |
|-------|------|----------|-------|------|-----------|-----|
| **0** | Resposta Direta ⚡ | 0 | 0 | Não | Não | Perguntas |
| **1** | Execução Direta 🏃 | 1 | <30min | Não | Não | Typos, fixes |
| **2** | Planning Simples 📝 | 1-2 | 30min-2h | Sim (3-5) | Não | Validações, filtros |
| **3** | Planning Detalhado 📋 | 3-5 | 2-8h | Sim (5-15) | Não | Exports, refactors |
| **4** | Modo /plan 🗺️ | 5+ | 8h+ | Sim (completo) | **Sim** | Features, arquitetura |

---

### ✅ Boas Práticas por Nível

#### Nível 0-1: Velocidade
- ✅ Responda ou execute imediatamente
- ✅ Seja conciso
- ❌ Não sobre-explique

#### Nível 2: Clareza
- ✅ Mostre os passos antes
- ✅ Execute incrementalmente
- ✅ Comunique progresso

#### Nível 3: Completude
- ✅ Análise antes de executar
- ✅ Identifique riscos
- ✅ Fases bem definidas
- ✅ Validação ao final

#### Nível 4: Excelência
- ✅ Pesquisa com MCPs
- ✅ Múltiplas alternativas
- ✅ Análise de trade-offs
- ✅ **Aguarda aprovação**

---

### 🎯 Exemplos Práticos Lado a Lado

#### Tarefa: "Adicionar campo telefone em estudante"

**Nível 1 (se já existe estrutura)**:
```
Vou adicionar o campo telefone.
[Edit em types/index.ts]
[Edit em StudentForm.tsx]
Campo adicionado.
```

**Nível 2 (tarefa completa)**:
```
TODO:
1. Adicionar tipo em types/index.ts
2. Adicionar campo no schema Zod
3. Adicionar input no formulário
4. Testar salvamento no Firestore
5. Validar formatação de telefone

[Executa passo a passo]
```

**Nível 3 (com migração)**:
```
ANÁLISE:
- Arquivos: types, schema, form, service
- Migração: Estudantes existentes sem telefone
- Validação: Formato brasileiro (11 dígitos)

PLANO:
Fase 1: Tipos e Validação (30min)
1-3. [...]

Fase 2: UI (30min)
4-6. [...]

Fase 3: Migração de Dados (1h)
7-9. [...]

[Executa fase por fase]
```

**Nível 4 (/plan)**:
```
[Plano completo de 300 linhas]
- Análise de impacto
- Alternativas (campo único vs array)
- Migração de 700+ estudantes
- Testes extensivos
- Rollback plan

Aguarda aprovação.
```

---

## 📖 GUIAS DE IMPLEMENTAÇÃO

### Criar Novo Componente

```typescript
// 1. Criar arquivo: src/components/MyComponent.tsx
import React from 'react';
import { MyComponentProps } from './types'; // ou inline

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  return (
    <div className="p-4">
      <h2>{title}</h2>
      <button onClick={onAction}>Ação</button>
    </div>
  );
}

// 2. Exportar (se necessário)
export { MyComponent } from '@/components/MyComponent';
```

### Criar Novo Hook

```typescript
// src/hooks/useMyData.ts
import { useState, useEffect } from 'react';

export function useMyData(params: ParamsType) {
  const [data, setData] = useState<DataType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const result = await fetchFromAPI(params);
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [params]);

  return { data, loading, error, refetch: fetchData };
}
```

### Adicionar Nova Página

```typescript
// src/app/minha-pagina/page.tsx
'use client';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function MinhaPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto p-4">
        <h1>Minha Página</h1>
        {/* Conteúdo */}
      </main>

      <Footer />
    </div>
  );
}
```

### Adicionar Serviço Firebase

```typescript
// src/services/myService.ts
import { db } from '@/firebase.config';
import { collection, getDocs, query, where } from 'firebase/firestore';

export class MyService {
  static async fetchItems(filter: string): Promise<ItemType[]> {
    try {
      const q = query(
        collection(db, 'items'),
        where('status', '==', filter)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ItemType));
    } catch (error) {
      console.error('Erro ao buscar items:', error);
      throw error;
    }
  }
}
```

### Adicionar API Route

```typescript
// src/app/api/my-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validação
    if (!body.requiredField) {
      return NextResponse.json(
        { error: 'Campo obrigatório faltando' },
        { status: 400 }
      );
    }

    // Processamento
    const result = await processData(body);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
```

---

## 🔧 MCPs CONFIGURADOS

### O que são MCPs?

**MCP (Model Context Protocol)** permite que Claude Code se conecte com ferramentas e serviços externos durante o desenvolvimento, ampliando suas capacidades.

### MCPs Ativos no Projeto

#### 1. Firebase MCP ✅

**Quando usar**: Consultas rápidas no Firestore durante desenvolvimento

**Capabilities**:
- Listar coleções
- Query em documentos
- Ler dados específicos
- Verificar estrutura de dados

**Exemplos de uso**:
```
"Quantos estudantes têm mais de 10 faltas no 1º bimestre?"
"Mostra a estrutura da coleção 'absences'"
"Lista os 5 estudantes mais recentes cadastrados"
"Qual o total de estudantes por turma?"
"Mostra todos os estudantes da turma 5A que têm deficiência"
```

**Documentação**: `docs/MCPs-CONFIGURADOS.md`

#### 2. Filesystem MCP ✅

**Quando usar**: Navegação, busca e refatoração de código

**Capabilities**:
- Buscar arquivos por padrão
- Ler estrutura de diretórios
- Encontrar referências de código
- Análise de imports

**Exemplos de uso**:
```
"Onde está a lógica de cálculo de faltas por bimestre?"
"Quantos componentes usam StudentDataService?"
"Lista todos os hooks customizados do projeto"
"Encontra todos os arquivos que importam de '@/types'"
"Mostra a estrutura completa de src/components/"
```

#### 3. GitHub MCP ✅

**Quando usar**: Gestão de código, PRs e issues

**Capabilities**:
- Ver commits recentes
- Criar e gerenciar PRs
- Buscar issues
- Verificar histórico

**Exemplos de uso**:
```
"Mostra os últimos 5 commits"
"Quais foram as mudanças na última semana?"
"Busca issues relacionadas a 'migração V3'"
"Cria um PR dessa feature com título e descrição detalhada"
"Quem trabalhou no arquivo StudentDataService?"
```

#### 4. SQLite MCP ✅

**Quando usar**: Desenvolvimento local com banco SQL (se necessário)

**Capabilities**:
- Criar tabelas
- Executar queries
- Gerenciar dados locais

**Uso**: Principalmente para testes e prototipagem local

#### 5. Fetch MCP ✅

**Quando usar**: Buscar informações externas ou testar APIs

**Capabilities**:
- Fazer requisições HTTP
- Testar endpoints
- Buscar documentação online

**Exemplos de uso**:
```
"Busca a documentação do Next.js sobre App Router"
"Testa o endpoint da API do WhatsApp"
"Faz uma request para https://api.github.com"
```

#### 6. Supabase MCP ✅ (NOVO!)

**Quando usar**: Análise de dados, debugging, schema management, migrations

**Capabilities**:
- Consultar dados usando linguagem natural
- Executar queries SQL
- Gerenciar schema (criar/alterar tabelas)
- Visualizar logs e configurações
- Gerar migrations
- Verificar integridade referencial

**Configuração**:
```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp",
      "read_only": true,
      "features": ["database", "logs"]
    }
  }
}
```

**Exemplos de uso**:
```
"Quantos estudantes da turma 5A têm mais de 15 faltas?"
"Mostra a estrutura da tabela student_absences"
"Verifica se há faltas órfãs (sem student_id válido)"
"Cria índice para melhorar performance em buscas por data"
"Quantos atestados foram registrados esta semana?"
"Quais turmas têm maior índice de faltas?"
"Por que este estudante não aparece nas queries?"
"Gera migration para adicionar campo 'observacoes' em interactions"
```

**Segurança** ⚠️:
- ✅ **read_only: true** - Configurado para apenas leitura
- ✅ Usar apenas para **análise** e **debugging**
- ❌ **Não modificar** dados sem supervisão
- ✅ Revisar queries antes de executar

**Autenticação**:
- Ao iniciar o Claude Code, será solicitado login no Supabase
- Navegador abrirá automaticamente
- Selecione a organização/projeto apropriado

**Documentação**:
- Oficial: https://supabase.com/docs/guides/getting-started/mcp
- GitHub: https://github.com/supabase-community/supabase-mcp

### Como Usar MCPs Efetivamente

#### Durante Desenvolvimento
```
Você: "Antes de implementar, mostra quantos estudantes já estão cadastrados
      e qual a estrutura de dados atual no Firestore"

Claude (via Firebase MCP): [executa query e mostra estrutura]
```

#### Durante Debugging
```
Você: "Encontra todos os lugares onde usamos setDoc() diretamente
      (sem StudentDataService)"

Claude (via Filesystem MCP): [lista arquivos e linhas]
```

#### Durante Code Review
```
Você: "Compara o código atual de StudentForm.tsx com a versão
      do último commit"

Claude (via GitHub MCP): [mostra diff]
```

### Limitações dos MCPs

- **Firebase MCP**: Apenas leitura (não modifica dados)
- **Filesystem MCP**: Não executa código, apenas analisa
- **GitHub MCP**: Requer autenticação (token configurado)

**Ver configuração completa**: `docs/MCPs-CONFIGURADOS.md`

---

## 📋 WORKFLOWS COMUNS

### 1. Adicionar Nova Funcionalidade de Relatório

**Objetivo**: Criar um novo tipo de relatório no sistema

**Etapas**:
1. **Definir Tipos**
   ```typescript
   // src/types/reports.ts
   export interface RelatorioFrequencia {
     tipo: 'mensal' | 'bimestral' | 'anual';
     dataInicio: string;
     dataFim: string;
     turmas: string[];
   }
   ```

2. **Criar Hook de Dados**
   ```typescript
   // src/hooks/useReportData.ts
   export function useReportData(filters: RelatorioFrequencia) {
     // Lógica de fetch
   }
   ```

3. **Criar Componentes**
   ```
   src/components/reports/
   ├── ReportFilters.tsx
   ├── ReportChart.tsx
   └── ReportTable.tsx
   ```

4. **Adicionar Rota**
   ```typescript
   // src/app/relatorios/[tipo]/page.tsx
   ```

5. **Atualizar Navegação**
   ```typescript
   // src/components/Header.tsx (adicionar link)
   ```

6. **Testar com Dados Reais**
   - Usar Firebase MCP para verificar dados disponíveis
   - Testar edge cases (turma vazia, período sem faltas)

7. **Documentar**
   - Atualizar CLAUDE.md se necessário
   - Adicionar comentários no código

### 2. Corrigir Bug de Performance

**Sintoma**: Página lenta ou travando

**Diagnóstico**:
1. **Identificar Bundle Size**
   ```bash
   npm run analyze
   npm run bundle:report
   ```

2. **Usar Filesystem MCP**
   ```
   "Encontra todos os imports de 'recharts' no projeto"
   "Lista componentes que não usam memo ou useCallback"
   ```

3. **Análise de Queries Firestore**
   ```
   "Mostra todas as queries que não usam limit()"
   ```

**Solução**:
1. **Lazy Loading**
   ```typescript
   const HeavyChart = lazy(() => import('./HeavyChart'));
   ```

2. **Memoização**
   ```typescript
   const data = useMemo(() => processData(raw), [raw]);
   ```

3. **Paginação**
   ```typescript
   const q = query(collection(db, 'estudantes'), limit(50));
   ```

4. **Verificar Índices**
   - Conferir Firebase Console → Firestore → Indexes
   - Ver `docs/FIRESTORE-INDEXES-INSTRUCTIONS.md`

### 3. Adicionar Novo Campo em Estudante

**Exemplo**: Adicionar campo "responsavelFinanceiro"

**Etapas**:
1. **Atualizar Tipo**
   ```typescript
   // src/types/index.ts
   export interface Student {
     // ... campos existentes
     responsavelFinanceiro?: {
       nome: string;
       cpf: string;
       telefone: string;
     };
   }
   ```

2. **Atualizar Schema de Validação**
   ```typescript
   // src/app/cadastrar-estudante/page.tsx
   const studentSchema = z.object({
     // ... campos existentes
     responsavelFinanceiro: z.object({
       nome: z.string().min(1),
       cpf: z.string().length(11),
       telefone: z.string().min(10)
     }).optional()
   });
   ```

3. **Atualizar Formulário**
   ```typescript
   // src/components/StudentForm.tsx
   // Adicionar campos do formulário
   ```

4. **Atualizar StudentDataService**
   ```typescript
   // Garantir que dual-write funcione com novo campo
   ```

5. **Testar**
   - Criar estudante com novo campo
   - Editar estudante existente
   - Verificar salvamento no Firestore (Firebase MCP)

6. **Migração de Dados Existentes** (se necessário)
   - Criar script em `scripts/`
   - Testar em dev primeiro
   - Backup antes de rodar em prod

### 4. Implementar Nova Integração (API Externa)

**Exemplo**: Integração com SMS Gateway

**Etapas**:
1. **Pesquisar Documentação**
   ```
   "Busca a documentação da API X usando Fetch MCP"
   ```

2. **Criar Serviço**
   ```typescript
   // src/services/smsService.ts
   export class SMSService {
     static async send(phone: string, message: string) {
       // Implementação
     }
   }
   ```

3. **Variáveis de Ambiente**
   ```bash
   # .env.local
   NEXT_PUBLIC_SMS_API_KEY=...
   NEXT_PUBLIC_SMS_API_URL=...
   ```

4. **Criar API Route** (se necessário)
   ```typescript
   // src/app/api/sms/send/route.ts
   ```

5. **Testar**
   - Testar com Fetch MCP primeiro
   - Implementar error handling
   - Adicionar logs

6. **Documentar**
   - Criar `docs/SMS_INTEGRATION.md`
   - Atualizar CLAUDE.md

### 5. Deploy de Nova Versão

**Checklist completo**:

```bash
# 1. Validações locais
npm run type-check
npm run lint
npm run build

# 2. Testar build localmente
npm start
# Navegar pelo app e testar features

# 3. Verificar env vars em Vercel
# (Ver se todas as NEXT_PUBLIC_* estão configuradas)

# 4. Commit e push
git add .
git commit -m "release: versão X.Y.Z"
git push origin main

# 5. Verificar deploy no Vercel
# (Auto-deploy via GitHub integration)

# 6. Smoke tests em produção
# - Login
# - Carregar dashboard
# - Criar/editar estudante
# - Enviar WhatsApp (se aplicável)

# 7. Monitorar logs
# Vercel Dashboard → Logs
# Firebase Console → Firestore
```

---

## 💬 PROMPTS EFETIVOS

### ✅ BONS PROMPTS

#### Implementação com Contexto
```
"Implementa validação de CPF no formulário de estudante,
seguindo o padrão usado em StudentForm.tsx e usando
o helper de @/utils/security"
```

**Por que é bom**: Especifica onde olhar e qual padrão seguir

#### Performance com Métricas
```
"Analisa a performance do dashboard e sugere otimizações,
considerando que temos 700+ estudantes carregados.
Foca em memoização e lazy loading"
```

**Por que é bom**: Dá contexto (700+ estudantes) e direção (memoização, lazy loading)

#### Refactoring com Objetivo
```
"Refatora StudentTable.tsx para usar TanStack Table v8,
mantendo as funcionalidades de ordenação, filtro e paginação.
Migra uma coluna por vez e mantém compatibilidade"
```

**Por que é bom**: Objetivo claro, biblioteca específica, estratégia incremental

#### Debugging Detalhado
```
"Estou tendo erro 'Cannot read property length of undefined'
em StudentForm.tsx linha 468 ao editar estudante sem contatos.
Analisa o código e sugere fix com validação defensiva"
```

**Por que é bom**: Erro específico, localização, contexto do problema

#### Consulta com MCPs
```
"Usa Firebase MCP para mostrar quantos estudantes da turma 5A
têm mais de 15 faltas no bimestre atual. Depois sugere como
implementar um alerta automático pra isso"
```

**Por que é bom**: Combina MCP com implementação prática

### ❌ PROMPTS VAGOS

#### Sem Contexto
```
"Melhora o código"
```
**Problema**: Qual código? Como melhorar? Critério?

#### Sem Especificidade
```
"Adiciona validação"
```
**Problema**: Validação de quê? Onde? Que tipo?

#### Sem Objetivo
```
"Otimiza performance"
```
**Problema**: Performance de quê? Qual métrica? Onde está lento?

#### Sem Direção
```
"Corrige o bug"
```
**Problema**: Qual bug? Onde? Como reproduz?

### 🎯 PROMPTS PARA SITUAÇÕES COMUNS

#### Aprendizado de Código Existente
```
"Explica a arquitetura de StudentDataService.ts,
especialmente como funciona o dual-write V2/V3"
```

#### Criação de Feature
```
"Cria um componente de filtro avançado para a tabela de estudantes,
similar ao usado em FrequencyTableCard.tsx, mas com filtros de:
- Turma (select)
- Status (checkboxes)
- Faixa de faltas (range slider)
Usa shadcn/ui components e Tailwind"
```

#### Code Review
```
"Revisa o PR #123 focando em:
1. Tipos TypeScript
2. Performance (useMemo/useCallback)
3. Acessibilidade
4. Padrões do CLAUDE.md"
```

#### Migração
```
"Planeja migração de React Hook Form v7 para v8,
lista breaking changes e cria checklist de arquivos a atualizar"
```

---

## 🗺️ MODO PLANNING (/plan)

### O que é o Modo Planning?

O **Modo Planning** (`/plan`) é uma funcionalidade do Claude Code que permite **planejar implementações complexas** antes de executá-las. É ideal para:

- 📋 Tarefas com múltiplas etapas
- 🏗️ Refatorações grandes
- 🆕 Novas features complexas
- 🔍 Análise arquitetural
- 📊 Mapeamento de dependências
- 🗺️ Criação de roadmaps

### Quando Usar /plan

#### ✅ USE /plan quando:

1. **Feature Nova e Complexa**
   - Envolve múltiplos arquivos
   - Precisa de novos tipos/interfaces
   - Requer integração com serviços
   - Afeta arquitetura existente

2. **Refactoring Grande**
   - Mudança de biblioteca (ex: React Hook Form v7 → v8)
   - Reestruturação de código
   - Migração de padrões
   - Otimização de performance em larga escala

3. **Debugging Complexo**
   - Bug afeta múltiplos componentes
   - Problema de performance sistêmico
   - Erro difícil de reproduzir
   - Necessita análise de fluxo de dados

4. **Análise Técnica**
   - Avaliar impacto de mudança
   - Mapear dependências
   - Estimar esforço
   - Identificar riscos

#### ❌ NÃO use /plan quando:

- Tarefa simples de 1-2 arquivos
- Bug pontual já identificado
- Mudança trivial (typo, estilo)
- Resposta rápida necessária

### Como Usar /plan Efetivamente

#### Template Básico de Planning

```markdown
/plan

# [TIPO DE TAREFA]: [Título Descritivo]

## 📋 Contexto
- **Objetivo**: O que precisa ser feito?
- **Motivação**: Por que fazer isso?
- **Escopo**: Até onde vai a mudança?

## 🔍 Análise Inicial
- [ ] Verificar arquivos existentes relacionados
- [ ] Identificar dependências
- [ ] Mapear pontos de integração
- [ ] Listar possíveis riscos

## 📚 Pesquisa
- [ ] Consultar CLAUDE.md
- [ ] Verificar docs/ relacionadas
- [ ] Usar MCPs para entender código atual
- [ ] Checar implementações similares

## 🎯 Estratégia
### Abordagem Escolhida
[Descrever a abordagem]

### Alternativas Consideradas
1. [Alternativa 1] - Descartada por [motivo]
2. [Alternativa 2] - Descartada por [motivo]

## 📝 Plano de Execução
### Fase 1: Preparação
- [ ] Criar branch
- [ ] Criar tipos necessários
- [ ] Preparar testes

### Fase 2: Implementação
- [ ] Passo 1
- [ ] Passo 2
- [ ] Passo 3

### Fase 3: Validação
- [ ] Testes manuais
- [ ] Type-check
- [ ] Build

## 🗂️ Arquivos Afetados
- `src/types/index.ts` - Adicionar interfaces
- `src/services/myService.ts` - Novo serviço
- `src/components/MyComponent.tsx` - Novo componente
- `src/app/my-page/page.tsx` - Nova página

## ⚠️ Pontos de Atenção
- Dual-write V2/V3
- Performance com 700+ estudantes
- Validação de entrada
- Tratamento de erros

## 📊 Estimativa
- **Complexidade**: Média/Alta/Baixa
- **Tempo Estimado**: X horas
- **Arquivos Modificados**: ~N arquivos
- **Arquivos Novos**: ~M arquivos
```

### Templates por Tipo de Tarefa

#### 1. Template: Nova Feature

```markdown
/plan Implementar [Nome da Feature]

## 📋 Contexto
**Feature**: Sistema de notificações push para responsáveis
**Objetivo**: Alertar responsáveis sobre faltas em tempo real
**Escopo**: Frontend + Backend + Integração Firebase

## 🔍 Análise Inicial
### Usar MCPs para pesquisa:
- Firebase MCP: "Mostra a estrutura de coleções atuais"
- Filesystem MCP: "Lista todos os serviços existentes"
- GitHub MCP: "Busca issues relacionadas a notificações"

### Verificar:
- [ ] Como funciona o WhatsApp atual (base para notificações)
- [ ] Estrutura de dados de estudantes e contatos
- [ ] Sistema de permissões e autenticação

## 📚 Dependências e Integrações
### Bibliotecas Necessárias
- Firebase Cloud Messaging (FCM)
- Service Worker para notificações
- Push API

### Integrações
- Firestore: criar coleção `notifications`
- Firebase Auth: verificar permissões
- WhatsAppService: usar como referência

## 🎯 Estratégia

### Arquitetura Proposta
```
src/
├── services/
│   └── notificationService.ts (NOVO)
├── hooks/
│   └── useNotifications.ts (NOVO)
├── types/
│   └── index.ts (ATUALIZAR - adicionar Notification)
├── app/
│   └── api/
│       └── notifications/
│           └── send/route.ts (NOVO)
└── components/
    └── NotificationSettings.tsx (NOVO)
```

### Abordagem
1. **Fase 1**: Configurar FCM no Firebase
2. **Fase 2**: Criar service worker
3. **Fase 3**: Implementar backend (API route)
4. **Fase 4**: Criar serviço frontend
5. **Fase 5**: Criar UI de configuração
6. **Fase 6**: Integrar com sistema de faltas

## 📝 Plano Detalhado

### Fase 1: Setup Firebase (1h)
- [ ] Habilitar FCM no Firebase Console
- [ ] Gerar VAPID keys
- [ ] Configurar env vars
- [ ] Atualizar firebase.config.ts

### Fase 2: Service Worker (2h)
- [ ] Criar public/sw.js
- [ ] Implementar listener de notificações
- [ ] Registrar SW em layout.tsx
- [ ] Testar SW em dev

### Fase 3: Backend API (2h)
- [ ] Criar src/app/api/notifications/send/route.ts
- [ ] Implementar validação de dados
- [ ] Integrar com FCM
- [ ] Adicionar error handling
- [ ] Testar com Postman/Thunder Client

### Fase 4: Serviço Frontend (3h)
- [ ] Criar NotificationService.ts
  - requestPermission()
  - subscribe()
  - unsubscribe()
  - sendNotification()
- [ ] Criar hook useNotifications
- [ ] Adicionar gerenciamento de tokens
- [ ] Salvar tokens em Firestore (users/{uid}/fcmTokens)

### Fase 5: UI (2h)
- [ ] Criar NotificationSettings.tsx
- [ ] Toggle enable/disable
- [ ] Teste de notificação
- [ ] Integrar com perfil do usuário
- [ ] Adicionar em configurações

### Fase 6: Integração (2h)
- [ ] Modificar lógica de registro de faltas
- [ ] Enviar notificação quando falta > threshold
- [ ] Criar template de mensagem
- [ ] Adicionar debounce (não spam)
- [ ] Logs e analytics

## 🗂️ Arquivos Detalhados

### NOVOS (8 arquivos)
1. `src/services/notificationService.ts`
2. `src/hooks/useNotifications.ts`
3. `src/components/NotificationSettings.tsx`
4. `src/app/api/notifications/send/route.ts`
5. `public/sw.js`
6. `public/firebase-messaging-sw.js`
7. `docs/NOTIFICATION_INTEGRATION.md`

### MODIFICADOS (5 arquivos)
1. `src/types/index.ts` - Adicionar interface Notification
2. `src/firebase.config.ts` - Configurar messaging
3. `src/app/layout.tsx` - Registrar SW
4. `src/app/controlar-faltas/page.tsx` - Integrar notificação
5. `package.json` - Adicionar dependências (se necessário)

## ⚠️ Pontos de Atenção

### Segurança
- ✅ Validar permissões antes de enviar
- ✅ Não enviar dados sensíveis em notificações
- ✅ Verificar autenticação na API route

### Performance
- ✅ Debounce de notificações (1 por estudante por dia)
- ✅ Batch notifications se múltiplos estudantes
- ✅ Cache de tokens FCM

### UX
- ✅ Pedir permissão no momento certo (não no load)
- ✅ Explicar benefício antes de pedir
- ✅ Permitir fácil desativação

### Compatibilidade
- ✅ Safari tem limitações com PWA
- ✅ iOS requer adicionar à tela inicial
- ✅ Fallback para email se push não disponível

## 🧪 Estratégia de Testes

### Testes Manuais
1. **Permissão**
   - [ ] Aceitar permissão
   - [ ] Negar permissão
   - [ ] Bloquear depois de aceitar

2. **Envio**
   - [ ] Notificação única
   - [ ] Múltiplas notificações
   - [ ] Offline → online

3. **Integração**
   - [ ] Registrar falta → receber notificação
   - [ ] Múltiplas faltas → apenas 1 notificação/dia
   - [ ] Desabilitar → não receber

### Devices
- [ ] Chrome Desktop
- [ ] Firefox Desktop
- [ ] Chrome Android
- [ ] Safari iOS (se suportado)

## 📊 Estimativa Final

- **Complexidade**: Alta
- **Tempo Total**: ~12-15 horas
- **Arquivos Novos**: 8
- **Arquivos Modificados**: 5
- **Riscos**: Médio (compatibilidade iOS)
- **Impacto**: Alto (feature principal)

## 📚 Referências
- FCM Docs: https://firebase.google.com/docs/cloud-messaging
- Web Push Protocol: https://web.dev/push-notifications-overview/
- Service Workers: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- Similar: WhatsAppService.ts (nossa implementação)
```

#### 2. Template: Refactoring

```markdown
/plan Refatorar [Componente/Módulo]

## 📋 Contexto
**Alvo**: StudentTable.tsx
**Problema Atual**:
- 800+ linhas
- Lógica misturada
- Difícil manutenção
- Performance ruim com 700+ estudantes

**Objetivo**: Dividir em componentes menores e otimizar

## 🔍 Análise do Código Atual

### Usar MCPs:
```
Filesystem MCP: "Mostra todos os componentes que importam StudentTable"
Filesystem MCP: "Lista todos os hooks usados em StudentTable"
```

### Estrutura Atual
- Renderização: ~200 linhas
- Lógica de negócio: ~300 linhas
- Handlers: ~200 linhas
- Estilos inline: ~100 linhas

### Problemas Identificados
1. ❌ Re-renders desnecessários (sem memo)
2. ❌ Cálculos pesados sem useMemo
3. ❌ Componentes não separados
4. ❌ Props drilling

## 🎯 Estratégia de Refactoring

### Nova Estrutura Proposta
```
src/components/StudentTable/
├── index.tsx (barrel export)
├── StudentTable.tsx (orchestrator - 100 linhas)
├── StudentTableHeader.tsx (memo)
├── StudentTableRow.tsx (memo)
├── StudentTableFilters.tsx (memo)
├── StudentTablePagination.tsx (memo)
├── hooks/
│   ├── useStudentTable.ts (lógica)
│   └── useStudentFilters.ts (filtros)
└── types.ts (tipos locais)
```

### Princípios
- ✅ Separação de responsabilidades
- ✅ Memoização agressiva
- ✅ Custom hooks para lógica
- ✅ Composição > Props drilling

## 📝 Plano de Execução

### Fase 1: Preparação (30min)
- [ ] Criar branch refactor/student-table
- [ ] Criar pasta src/components/StudentTable/
- [ ] Mover StudentTable.tsx atual para StudentTable.old.tsx (backup)
- [ ] Criar types.ts com interfaces locais

### Fase 2: Extrair Lógica (2h)
- [ ] Criar useStudentTable.ts
  - Estado de seleção
  - Handlers de ação
  - Lógica de ordenação
- [ ] Criar useStudentFilters.ts
  - Lógica de filtros
  - Estado de filtros
  - Apply filters
- [ ] Testar hooks isoladamente

### Fase 3: Dividir Componentes (3h)
- [ ] StudentTableHeader.tsx
  - Colunas
  - Ordenação
  - Seleção all
- [ ] StudentTableRow.tsx (CRITICAL - memo!)
  - Renderização de linha
  - Actions
  - Seleção
- [ ] StudentTableFilters.tsx
  - UI de filtros
  - Apply/Clear
- [ ] StudentTablePagination.tsx
  - Controles
  - Info

### Fase 4: Orquestrador (1h)
- [ ] StudentTable.tsx (main)
  - Composição de subcomponentes
  - Uso dos hooks
  - Props mínimas
  - Context se necessário

### Fase 5: Otimização (2h)
- [ ] Adicionar React.memo em todos os componentes
- [ ] useMemo em cálculos pesados
- [ ] useCallback em handlers
- [ ] Verificar com React DevTools Profiler

### Fase 6: Migração (1h)
- [ ] Atualizar imports em páginas que usam
- [ ] Testar cada página
- [ ] Deletar StudentTable.old.tsx
- [ ] Atualizar exports

## 🗂️ Arquivos

### NOVOS (9 arquivos)
1. src/components/StudentTable/index.tsx
2. src/components/StudentTable/StudentTable.tsx
3. src/components/StudentTable/StudentTableHeader.tsx
4. src/components/StudentTable/StudentTableRow.tsx
5. src/components/StudentTable/StudentTableFilters.tsx
6. src/components/StudentTable/StudentTablePagination.tsx
7. src/components/StudentTable/hooks/useStudentTable.ts
8. src/components/StudentTable/hooks/useStudentFilters.ts
9. src/components/StudentTable/types.ts

### MODIFICADOS (2 arquivos)
1. src/app/cadastrar-estudante/page.tsx (atualizar import)
2. src/components/StudentTable.tsx → DELETAR após migração

## ⚠️ Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Quebrar páginas existentes | Média | Alto | Manter .old.tsx até confirmar tudo OK |
| Performance pior | Baixa | Alto | Profilear antes e depois |
| Bugs em edge cases | Média | Médio | Testes manuais extensivos |

## 🧪 Checklist de Testes

### Funcionalidades
- [ ] Ordenação por coluna
- [ ] Filtros funcionam
- [ ] Paginação funciona
- [ ] Seleção de linhas
- [ ] Ações (editar, deletar)
- [ ] Responsividade

### Performance
- [ ] Renderização inicial < 1s
- [ ] Scroll suave
- [ ] Re-render apenas do necessário
- [ ] Sem memory leaks

### Edge Cases
- [ ] 0 estudantes
- [ ] 1 estudante
- [ ] 1000+ estudantes
- [ ] Todos os filtros ativos
- [ ] Mudança rápida de página

## 📊 Métricas de Sucesso

### Antes
- Linhas de código: 800
- Re-renders por ação: ~50
- Tempo de renderização: ~500ms

### Depois (Meta)
- Linhas de código: < 600 (total)
- Re-renders por ação: < 10
- Tempo de renderização: < 200ms

## 📚 Referências
- React.memo: https://react.dev/reference/react/memo
- useMemo: https://react.dev/reference/react/useMemo
- Component composition: Ver StudentFilters.tsx (bom exemplo)
```

#### 3. Template: Debugging Complexo

```markdown
/plan Debug: [Descrição do Problema]

## 🐛 Problema
**Sintoma**: Dashboard trava ao carregar com 500+ estudantes
**Frequência**: Sempre
**Ambiente**: Produção e dev
**Impacto**: Alto (UX ruim)

## 🔍 Investigação Inicial

### 1. Reproduzir
- [ ] Criar cenário com 500+ estudantes (usar Firebase MCP)
- [ ] Abrir dashboard
- [ ] Observar comportamento
- [ ] Capturar screenshot/video

### 2. Coletar Dados
```
React DevTools Profiler:
- Componente mais lento: ?
- Tempo de renderização: ?
- Número de re-renders: ?

Network Tab:
- Tamanho da resposta: ?
- Tempo de carregamento: ?

Console:
- Erros: ?
- Warnings: ?
```

### 3. Usar MCPs
```
Filesystem MCP: "Mostra a estrutura de useStudents hook"
Filesystem MCP: "Lista todos os useMemo e useCallback no dashboard"
Firebase MCP: "Mostra o tamanho médio de documento de estudante"
```

## 🎯 Hipóteses

### Hipótese 1: Query Firestore muito grande
**Probabilidade**: Alta
**Como testar**:
- [ ] Verificar tamanho da resposta no Network
- [ ] Contar documentos retornados
- [ ] Verificar se usa limit()

**Solução se confirmada**:
- Implementar paginação server-side
- Adicionar limit(50) na query
- Lazy load conforme scroll

### Hipótese 2: Re-renders em cascata
**Probabilidade**: Média
**Como testar**:
- [ ] React DevTools Profiler
- [ ] Adicionar console.log em componentes
- [ ] Verificar uso de memo/useCallback

**Solução se confirmada**:
- Adicionar React.memo nos componentes
- useMemo em cálculos
- useCallback em handlers

### Hipótese 3: Cálculos síncronos pesados
**Probabilidade**: Média
**Como testar**:
- [ ] Adicionar console.time() nos cálculos
- [ ] Performance tab do Chrome
- [ ] Identificar gargalos

**Solução se confirmada**:
- Mover cálculos para Web Worker
- Usar useMemo
- Simplificar algoritmos

## 📝 Plano de Debug

### Etapa 1: Medição (30min)
- [ ] Setup React DevTools Profiler
- [ ] Registrar métricas baseline
- [ ] Identificar componente problemático

### Etapa 2: Isolamento (1h)
- [ ] Criar versão minimalista do dashboard
- [ ] Adicionar features incrementalmente
- [ ] Identificar quando problema aparece

### Etapa 3: Análise (1h)
- [ ] Analisar código do componente problemático
- [ ] Verificar queries Firestore
- [ ] Verificar lógica de processamento
- [ ] Identificar causa raiz

### Etapa 4: Fix (2h)
- [ ] Implementar solução
- [ ] Testar com 50 estudantes
- [ ] Testar com 500 estudantes
- [ ] Testar com 1000 estudantes

### Etapa 5: Validação (30min)
- [ ] Comparar métricas antes/depois
- [ ] Testar em diferentes browsers
- [ ] Testar em mobile

## 🗂️ Arquivos Suspeitos
1. src/app/home/page.tsx
2. src/hooks/useStudents.ts
3. src/components/cards/KPIsCard.tsx
4. src/services/studentDataService.ts

## 📊 Critérios de Sucesso
- [ ] Dashboard carrega em < 2s
- [ ] Sem travamentos
- [ ] Scroll suave
- [ ] Funcional com 1000+ estudantes
```

#### 4. Template: Análise de Impacto

```markdown
/plan Análise: [Mudança Proposta]

## 📋 Mudança Proposta
**O que**: Migrar de React Hook Form v7 para v8
**Por que**: Melhor performance e novas features
**Quando**: Sprint atual

## 🔍 Análise de Impacto

### 1. Mapeamento de Uso Atual
```
Filesystem MCP: "Lista todos os arquivos que importam react-hook-form"
Filesystem MCP: "Conta quantas vezes useForm é usado"
```

### 2. Arquivos Afetados
- [ ] Listar TODOS os formulários
- [ ] Identificar padrões de uso
- [ ] Mapear dependências

### 3. Breaking Changes
- [ ] Listar breaking changes da v8
- [ ] Verificar quais afetam nosso código
- [ ] Identificar incompatibilidades

## 📊 Estimativa de Esforço

| Categoria | Quantidade | Esforço/Item | Total |
|-----------|------------|--------------|-------|
| Formulários simples | X | 30min | Xh |
| Formulários complexos | Y | 2h | Yh |
| Testes a atualizar | Z | 15min | Zh |
| **TOTAL** | - | - | **Nh** |

## ⚠️ Riscos
1. Quebrar formulários críticos
2. Bugs em validações
3. Regressão de UX

## 🎯 Recomendação
- [ ] Fazer ou não fazer?
- [ ] Quando fazer?
- [ ] Como fazer (estratégia)?
```

### Práticas Recomendadas para /plan

#### 1. **Sempre Comece com Pesquisa**
```markdown
## 🔍 Pesquisa Inicial
- [ ] Consultar CLAUDE.md
- [ ] Verificar docs/ relacionadas
- [ ] Usar Firebase MCP para ver dados
- [ ] Usar Filesystem MCP para mapear código
- [ ] Usar GitHub MCP para ver histórico
```

#### 2. **Seja Específico em Arquivos**
```markdown
## 🗂️ Arquivos Afetados
❌ RUIM: "Alguns componentes"
✅ BOM:
- src/components/StudentForm.tsx (linhas 45-120)
- src/types/index.ts (adicionar interface Notification)
- src/services/notificationService.ts (NOVO)
```

#### 3. **Quebre em Fases Pequenas**
```markdown
❌ RUIM:
- [ ] Implementar feature completa

✅ BOM:
### Fase 1: Setup (30min)
- [ ] Passo específico 1
- [ ] Passo específico 2

### Fase 2: Core (2h)
- [ ] Passo específico 3
- [ ] Passo específico 4
```

#### 4. **Sempre Considere Riscos**
```markdown
## ⚠️ Riscos e Mitigações
| Risco | Como Mitigar |
|-------|--------------|
| Quebrar V2 durante migração | Manter dual-write ativo |
| Performance pior | Profilear antes e depois |
| Bugs em prod | Deploy em staging primeiro |
```

#### 5. **Defina Critérios de Sucesso**
```markdown
## ✅ Definição de Done
- [ ] Feature funciona conforme spec
- [ ] Testes passam
- [ ] Performance dentro do esperado
- [ ] Documentação atualizada
- [ ] Code review aprovado
```

### Exemplos Reais de Uso

#### Exemplo 1: Feature Simples
```
Você: /plan
Eu: Adicionar filtro de "Estudantes com Deficiência" no dashboard

Claude (Planning Mode):
1. Analisa código atual do dashboard
2. Verifica estrutura de dados de deficiência
3. Identifica onde adicionar filtro
4. Cria plano passo a passo
5. Lista arquivos a modificar
6. Estima tempo (30min-1h)
7. Aguarda aprovação antes de implementar
```

#### Exemplo 2: Refactoring Médio
```
Você: /plan
Eu: Otimizar performance do StudentTable para 1000+ estudantes

Claude (Planning Mode):
1. Usa React DevTools para analisar (simula)
2. Identifica problemas (re-renders, cálculos)
3. Pesquisa padrões (Filesystem MCP)
4. Propõe soluções (memo, useMemo, virtualização)
5. Cria plano faseado
6. Define métricas de sucesso
7. Aguarda aprovação
```

#### Exemplo 3: Debugging Complexo
```
Você: /plan
Eu: Debug: WhatsApp não envia para alguns contatos

Claude (Planning Mode):
1. Mapeia fluxo de envio (Filesystem MCP)
2. Verifica dados no Firestore (Firebase MCP)
3. Analisa WhatsAppService.ts
4. Lista possíveis causas
5. Cria plano de investigação
6. Define testes para cada hipótese
7. Aguarda direção
```

### Quando Sair do Planning Mode

Use `/plan` para planejar, depois **confirme** para implementar:

```
Claude: [Apresenta plano detalhado]

Você:
✅ "Aprovado, pode implementar"
✅ "OK, mas mude X e Y"
✅ "Comece pela Fase 1 apenas"

❌ "Não entendi" → Claude explica mais
❌ "Mudança muito grande" → Claude sugere alternativas
```

### Integração com CLAUDE.md

Durante o planning, Claude deve **SEMPRE**:

1. ✅ Consultar padrões de código deste arquivo
2. ✅ Seguir estrutura de diretórios documentada
3. ✅ Verificar "Não Fazer" antes de propor
4. ✅ Usar MCPs para pesquisa
5. ✅ Referenciar docs/ existentes
6. ✅ Seguir convenções de nomenclatura
7. ✅ Considerar dual-write V2/V3
8. ✅ Lembrar de validações de segurança

### Checklist do Planning Perfeito

- [ ] **Contexto claro**: Problema e objetivo bem definidos
- [ ] **Pesquisa completa**: Usou MCPs e consultou docs
- [ ] **Arquivos mapeados**: Lista exata de arquivos afetados
- [ ] **Fases definidas**: Quebrado em etapas pequenas
- [ ] **Riscos identificados**: E mitigações propostas
- [ ] **Estimativa realista**: Tempo e complexidade
- [ ] **Critérios de sucesso**: Como saber que funcionou
- [ ] **Referências**: Links para docs e código similar
- [ ] **Aprovação solicitada**: Não assume, pergunta!

---

## 🎣 HOOKS CUSTOMIZADOS

### Arquitetura de Hooks (✅ Fase 1.3 Concluída)

O projeto utiliza uma arquitetura **modular e composicional** de hooks customizados, otimizada para performance e reutilização.

#### Princípios

✅ **Modularidade**: Cada hook tem uma responsabilidade única
✅ **Composição**: Hooks podem ser combinados para criar funcionalidades complexas
✅ **Type-Safety**: TypeScript genérico em todos os hooks
✅ **Cache Padronizado**: Sistema centralizado via `cache.ts`
✅ **Performance**: Memoização e otimizações aplicadas

#### Estrutura

```
src/hooks/
├── useAuth.ts                    # Autenticação Firebase
├── useStudents.ts                # Lista de estudantes
├── useFirebase.ts                # Coleções Firebase (cache + paginação)
├── useFirebaseDoc.ts             # Documentos Firebase (cache padronizado)
└── attendance/                   # Módulo de frequência (5 hooks)
    ├── index.ts                  # Barrel export
    ├── useBimesterPeriods.ts     # Períodos dos bimestres
    ├── useSchoolDays.ts          # Dias letivos
    ├── useStudentRecords.ts      # Registros de frequência
    ├── useDuplicateAbsences.ts   # Detectar/remover duplicatas
    └── useStudentAbsences.ts     # Faltas por estudante/bimestre
```

### Como Usar

#### Imports

```typescript
// Hooks gerais
import { useAuth } from '@/hooks/useAuth';
import { useStudents } from '@/hooks/useStudents';
import { useFirebaseDoc } from '@/hooks/useFirebaseDoc';

// Hooks de frequência (usar barrel export)
import {
  useBimesterPeriods,
  useSchoolDays,
  useStudentRecords,
  useDuplicateAbsences,
  useStudentAbsences
} from '@/hooks/attendance';
```

#### Exemplo: Dashboard de Frequência

```typescript
function FrequencyDashboard() {
  const { students } = useStudents();
  const { bimesterDates, getCurrentBimester } = useBimesterPeriods();
  const { studentRecords, loading } = useStudentRecords({ autoRefresh: true });
  const { getSchoolDaysForPeriod } = useSchoolDays();
  const { duplicates, removeDuplicates } = useDuplicateAbsences();

  const currentBimester = getCurrentBimester();
  const totalDays = getSchoolDaysForPeriod('01/02/2025', '30/12/2025');

  if (loading) return <Skeleton />;

  return (
    <div>
      <h1>Bimestre Atual: {currentBimester}</h1>
      <p>Dias Letivos: {totalDays}</p>
      <p>Total de Estudantes: {students.length}</p>

      {duplicates.length > 0 && (
        <Alert>
          {duplicates.length} duplicatas encontradas.
          <button onClick={removeDuplicates}>Remover</button>
        </Alert>
      )}

      <FrequencyTable data={studentRecords} />
    </div>
  );
}
```

#### Exemplo: Perfil de Estudante

```typescript
function StudentProfile({ estudanteId }: { estudanteId: string }) {
  const { absences, loading } = useStudentAbsences(estudanteId, {
    excludeJustified: true
  });

  if (loading) return <Skeleton />;

  return (
    <div>
      <h3>Faltas por Bimestre</h3>
      <div>1º Bimestre: {absences.b1.length} faltas</div>
      <div>2º Bimestre: {absences.b2.length} faltas</div>
      <div>3º Bimestre: {absences.b3.length} faltas</div>
      <div>4º Bimestre: {absences.b4.length} faltas</div>
    </div>
  );
}
```

### Boas Práticas

#### 1. **Sempre Tipar Hooks**

```typescript
// ✅ BOM
const { data } = useFirebaseDoc<AnoLetivo>('2025/ano_letivo');

// ❌ RUIM
const { data } = useFirebaseDoc('2025/ano_letivo');
```

#### 2. **Use useMemo para Derivações**

```typescript
// ✅ BOM
const { studentRecords } = useStudentRecords();
const activeStudents = useMemo(() =>
  studentRecords.filter(s => s.totalFaltas < 10),
  [studentRecords]
);

// ❌ RUIM - Recalcula toda renderização
const activeStudents = studentRecords.filter(s => s.totalFaltas < 10);
```

#### 3. **Evite Chamadas Duplicadas**

```typescript
// ✅ BOM - Compartilha hook no componente pai
function Parent() {
  const { students } = useStudents();
  return (
    <>
      <StudentList students={students} />
      <StudentCount students={students} />
    </>
  );
}

// ❌ RUIM - Cada filho chama o hook (2x queries!)
function StudentList() {
  const { students } = useStudents(); // Duplicado!
}
```

#### 4. **Composição de Hooks**

```typescript
function useDashboardData() {
  const { students } = useStudents();
  const { studentRecords } = useStudentRecords();
  const { duplicates } = useDuplicateAbsences();

  return useMemo(() => ({
    totalStudents: students.length,
    totalAbsences: studentRecords.reduce((sum, r) => sum + r.totalFaltas, 0),
    duplicatesCount: duplicates.length
  }), [students, studentRecords, duplicates]);
}
```

### Documentação Completa

Para guias detalhados de cada hook com exemplos e troubleshooting:

📖 **Ver**: [`docs/HOOKS-GUIA-USO.md`](docs/HOOKS-GUIA-USO.md) - Guia Completo de Hooks

### Histórico de Refatoração

✅ **Fase 1.3 Concluída** (2025-01-09):
- Migrado hook monolítico `useAttendanceData.ts` (476 linhas) → 5 hooks modulares
- Removido hook duplicado `useFirebaseCollection.ts` (181 linhas)
- Padronizado cache em `useFirebaseDoc.ts` (sessionStorage → cache.ts)
- Total: **657 linhas de código legado removidas**

📄 **Ver**: [`docs/FASE-1-3-CONCLUIDA.md`](docs/FASE-1-3-CONCLUIDA.md) - Resumo Executivo

---

## 📚 DOCUMENTAÇÕES DO PROJETO

### Documentações Principais

| Documento | Descrição | Caminho |
|-----------|-----------|---------|
| **MIGRATION_PLAN_V3.md** | Plano completo de migração V2 → V3 | `docs/MIGRATION_PLAN_V3.md` |
| **MCPs-CONFIGURADOS.md** | MCPs habilitados no projeto | `docs/MCPs-CONFIGURADOS.md` |
| **GITHUB-TOKEN-SETUP.md** | Como configurar tokens do GitHub | `docs/GITHUB-TOKEN-SETUP.md` |
| **WHATSAPP_INTEGRATION.md** | Integração com WhatsApp API | `WHATSAPP_INTEGRATION.md` |
| **FIRESTORE-INDEXES** | Instruções para índices Firestore | `docs/FIRESTORE-INDEXES-INSTRUCTIONS.md` |

### Documentações de Migração

| Fase | Documento | Status |
|------|-----------|--------|
| Fase 1 | `docs/FASE-1-RESUMO.md` | ✅ Concluída |
| Fase 2 | `docs/FASE-2-GUIA-EXECUCAO.md` | ✅ Concluída |
| Fase 3 | `docs/fase3-relatorio-final-completo.md` | ✅ Concluída |
| Fase 4 | `docs/FASE-4-CONCLUIDA.md` | ✅ Concluída |

**Status Atual**: Migração V3 concluída com sucesso

### Quando Consultar Cada Doc

- **Trabalhando com estudantes**: `MIGRATION_PLAN_V3.md`
- **Configurando MCPs**: `MCPs-CONFIGURADOS.md`, `GUIA-NOVOS-MCPs.md`
- **Enviando WhatsApp**: `WHATSAPP_INTEGRATION.md`
- **Erro de índice Firestore**: `FIRESTORE-INDEXES-INSTRUCTIONS.md`
- **Deploy**: `docs/INSTALL_AND_DEPLOY.md`

---

## 🛠️ COMANDOS ÚTEIS

### Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Build de produção
npm run build

# Iniciar servidor de produção
npm start

# Limpar e reinstalar tudo
npm run clean-all-and-restart
```

### Qualidade de Código

```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Verificar anos hard-coded (evitar!)
npm run check:years

# Suite completa de qualidade
npm run quality
```

### Bundle e Performance

```bash
# Análise de bundle
npm run analyze

# Relatório de tamanho
npm run bundle:report

# Monitor de bundle
npm run bundle:monitor
```

### Migração e Scripts

```bash
# Executar migração de estudante específico
NEXT_PUBLIC_FIREBASE_API_KEY=... \
NEXT_PUBLIC_FIREBASE_PROJECT_ID=... \
node scripts/migrate-student-id.mjs

# Migration completa (se necessário)
npm run migrate
```

### Firebase

```bash
# Login no Firebase
firebase login

# Deploy (se configurado)
firebase deploy

# Emuladores locais
firebase emulators:start
```

### Git

```bash
# Status do repositório
git status

# Ver últimos commits
git log -5 --oneline

# Criar branch
git checkout -b feature/minha-feature

# Commit
git add .
git commit -m "feat: descrição da feature"

# Push
git push origin feature/minha-feature
```

---

## 🐛 TROUBLESHOOTING

### Erros Comuns

#### 1. **Firebase: Missing or insufficient permissions**

**Causa**: Regras de segurança do Firestore

**Solução**:
- Verificar se usuário está autenticado
- Conferir regras em Firebase Console → Firestore → Rules
- Em desenvolvimento, pode usar regras permissivas:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

#### 2. **Error: 9 FAILED_PRECONDITION: The query requires an index**

**Causa**: Falta índice composto no Firestore

**Solução**:
- Clicar no link fornecido no erro
- Ou criar manualmente: Firebase Console → Firestore → Indexes
- Aguardar criação do índice (~2-5 min)

**Documentação**: `docs/FIRESTORE-INDEXES-INSTRUCTIONS.md`

#### 3. **TypeError: Cannot read property 'length' of undefined**

**Causa**: Array/objeto opcional não verificado

**Solução**:
```typescript
// ❌ RUIM
if (student.contatos.length > 0) { ... }

// ✅ BOM
if (student.contatos && student.contatos.length > 0) { ... }
// ou
if (student.contatos?.length > 0) { ... }
```

#### 4. **Module not found: Can't resolve '@/...'**

**Causa**: Path alias não configurado

**Solução**:
- Verificar `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```
- Reiniciar servidor dev: `npm run dev`

#### 5. **Build Error: Type error in production**

**Causa**: Erro TypeScript passando em dev mas falhando em build

**Solução**:
```bash
# Verificar erros de tipo
npm run type-check

# Fix erros antes de build
npm run lint
npm run type-check
npm run build
```

#### 6. **WhatsApp: API not configured**

**Causa**: Variáveis de ambiente faltando

**Solução**:
- Criar/verificar `.env.local`:
```bash
NEXT_PUBLIC_WHATSAPP_API_URL=https://api.whatsapp.com/...
NEXT_PUBLIC_WHATSAPP_API_TOKEN=seu_token_aqui
```
- Reiniciar servidor

**Documentação**: `WHATSAPP_INTEGRATION.md`

#### 7. **Problemas de Carregamento em Redes Lentas (2G/3G)** ✅ RESOLVIDO (24/10/2025)

**Status**: ✅ **COMPLETAMENTE RESOLVIDO** - Sistema agora funciona perfeitamente em redes lentas

##### 7.1. Ano Letivo (Datas) ✅

**Sintoma**: Em redes 2G/3G, aparece warning no console:
```
⚠️ Dados vazios ou não encontrados. O ano letivo 2025 não estar cadastrado no sistema.
```

**Causa**: Timeout do carregamento de ano letivo (5 queries sequenciais = 20s em 2G, timeout 8s)

**Solução Implementada**:
- ✅ **Nova API Route**: `/api/academic-years/[year]/complete`
- ✅ **Cache de 1 hora** (resposta instantânea após 1ª carga)
- ✅ **Queries paralelas** server-side (5s ao invés de 20s)
- ✅ **Supabase Admin** (sem RLS overhead)
- ✅ **Feedback progressivo** ("Conexão lenta detectada" após 8s)

**Performance**:
- **Antes**: 20s → Timeout ❌
- **Depois (1ª carga)**: 5-10s ✅
- **Depois (cached)**: < 1s ⚡

**Arquivos**:
- `src/app/api/academic-years/[year]/complete/route.ts` (NOVO - 288 linhas)
- `src/services/supabase/academicYearService.ts` (+método getAcademicYearCompleteViaAPI)
- `src/hooks/useAttendanceMarking.ts` (usa nova API)
- `src/utils/serverCache.ts` (cache server-side)

##### 7.2. Estudantes (Turmas) ✅

**Sintoma**: Após resolver item 7.1, datas aparecem mas **turmas não** em redes 2G/3G.
Console mostra: `ERR_CONNECTION_RESET`

**Causa**: Carregamento de estudantes via queries Supabase diretas (client-side) sofre connection resets em 2G/3G

**Solução Implementada**:
- ✅ **Nova API Route**: `/api/students/all`
- ✅ **Cache de 30 minutos** (estudantes mudam menos que ano letivo)
- ✅ **Query única otimizada** (Supabase Admin - sem RLS overhead)
- ✅ **Server-side rendering** (mais estável que client-to-server)
- ✅ **Fallback automático** (se API falhar, tenta método legado)
- ✅ **Feedback progressivo** ("Conexão lenta" após 5s)

**Performance**:
- **Antes**: ERR_CONNECTION_RESET (falha) ❌
- **Depois (1ª carga)**: 3-8s ✅
- **Depois (cached)**: < 500ms ⚡

**Arquivos**:
- `src/app/api/students/all/route.ts` (NOVO - 395 linhas)
- `src/services/studentDataService.ts` (+método getStudentsViaAPI, deprecia getStudents)
- `src/hooks/useStudents.ts` (usa nova API com fallback)

##### Resumo da Solução Completa

**Problema original**: Em redes 2G/3G, `/marcar-faltas` mostrava aviso falso de "ano letivo não encontrado" e turmas não apareciam.

**Solução**: Duas API Routes otimizadas com cache server-side:
1. `/api/academic-years/[year]/complete` → Datas dos bimestres
2. `/api/students/all` → Lista de estudantes

**Resultado Final**:
- ✅ **Ano letivo carrega**: 5-10s (1ª vez) ou < 1s (cached)
- ✅ **Estudantes carregam**: 3-8s (1ª vez) ou < 500ms (cached)
- ✅ **Sistema funciona em 2G/3G** sem erros ou timeouts
- ✅ **Cache server-side persistente** entre requests

**Documentação detalhada**:
- `docs/FIX-ANO-LETIVO-REDES-LENTAS.md`
- `docs/SOLUCAO-2-IMPLEMENTADA-ANO-LETIVO.md`

---

### Performance Issues

#### Lentidão no Dashboard
- Verificar queries Firestore (índices?)
- Implementar paginação
- Usar `useMemo` para cálculos pesados
- Considerar cache (`src/utils/cache.ts`)

#### Bundle muito grande
```bash
npm run analyze
npm run bundle:report
# Identificar pacotes grandes e considerar:
# - Lazy loading
# - Tree shaking
# - Alternativas mais leves
```

---

## ✅ CHECKLISTS

### Checklist: Nova Feature

- [ ] Ler issue/requisito completamente
- [ ] Verificar docs relacionadas
- [ ] Planejar implementação (listar etapas)
- [ ] Criar branch: `git checkout -b feature/nome`
- [ ] Implementar seguindo padrões deste doc
- [ ] **CRÍTICO**: Adicionar tipos TypeScript explícitos (ZERO `any`)
- [ ] Testar localmente (casos felizes + edge cases)
- [ ] Verificar responsividade
- [ ] **CRÍTICO**: `npm run type-check 2>&1 | grep "^src/"` → **DEVE retornar 0 erros**
- [ ] **CRÍTICO**: `npm run lint 2>&1 | grep "Unexpected any"` → **DEVE retornar 0 erros**
- [ ] `npm run build` → Verificar se compila sem erros
- [ ] Commitar: `git commit -m "feat: descrição"`
- [ ] Push e criar PR
- [ ] Documentar se necessário

### Checklist: Bug Fix

- [ ] Reproduzir o bug
- [ ] Identificar causa raiz
- [ ] Criar branch: `git checkout -b fix/nome`
- [ ] Implementar correção (sem usar `any`)
- [ ] Adicionar validação para prevenir recorrência
- [ ] Testar fix + casos relacionados
- [ ] **CRÍTICO**: `npm run type-check 2>&1 | grep "^src/"` → **0 erros**
- [ ] **CRÍTICO**: `npm run lint 2>&1 | grep "Unexpected any"` → **0 erros**
- [ ] Commitar: `git commit -m "fix: descrição"`
- [ ] Push e criar PR
- [ ] Atualizar issue com detalhes

### Checklist: Refactoring

- [ ] Documentar estado atual
- [ ] Planejar mudanças
- [ ] Criar branch: `git checkout -b refactor/nome`
- [ ] Refatorar incrementalmente (ZERO `any`)
- [ ] Testar após cada mudança
- [ ] **CRÍTICO**: Garantir tipos TypeScript explícitos e corretos
- [ ] Verificar performance (antes vs depois)
- [ ] **CRÍTICO**: `npm run type-check 2>&1 | grep "^src/"` → **0 erros**
- [ ] **CRÍTICO**: `npm run lint 2>&1 | grep "Unexpected any"` → **0 erros**
- [ ] `npm run build` → Verificar se compila sem erros
- [ ] Commitar: `git commit -m "refactor: descrição"`
- [ ] Documentar mudanças

### Checklist: Pré-Deploy

- [ ] **CRÍTICO**: `npm run type-check 2>&1 | grep "^src/"` → **DEVE ser 0**
- [ ] **CRÍTICO**: `npm run lint 2>&1 | grep "Unexpected any"` → **DEVE ser 0**
- [ ] **CRÍTICO**: `npm run build` → **DEVE compilar sem erros** ✅
- [ ] Testar build localmente: `npm start`
- [ ] Verificar env variables em produção
- [ ] Conferir regras Firestore
- [ ] Verificar índices Firestore criados
- [ ] Backup de dados (se necessário)
- [ ] Deploy
- [ ] Testar em produção
- [ ] Monitorar logs/erros

### Checklist: Code Review

**🚨 BLOQUEADORES (deve reprovar PR se falhar)**:
- [ ] **CRÍTICO**: `npm run type-check 2>&1 | grep "^src/"` retorna **0 erros**
- [ ] **CRÍTICO**: `npm run lint 2>&1 | grep "Unexpected any"` retorna **0 erros**
- [ ] **CRÍTICO**: ZERO uso de `any` no código (ver seção Type Safety)
- [ ] **CRÍTICO**: Todos parâmetros de função com tipos explícitos
- [ ] **CRÍTICO**: Todas funções com return type explícito

**✅ Verificações Adicionais**:
- [ ] Código segue padrões deste doc?
- [ ] Type guards para valores unknown/nullable?
- [ ] Imports organizados?
- [ ] Sem console.logs desnecessários?
- [ ] Error handling adequado?
- [ ] Validações de entrada?
- [ ] Acessibilidade (aria-labels, etc)?
- [ ] Responsivo?
- [ ] Performance (useMemo, useCallback)?
- [ ] Segurança (XSS, injection)?
- [ ] Documentação atualizada?

---

## 📖 GLOSSÁRIO

### Termos do Projeto

| Termo | Significado | Exemplo/Contexto |
|-------|-------------|------------------|
| **V2** | Versão 2 do schema Firestore (LEGACY) | IDs numéricos baseados em timestamp |
| **V3** | Versão 3 do schema Firestore (ATUAL) | IDs UUID v4 |
| **Dual-write** | Estratégia de escrever simultaneamente em V2 e V3 | Durante período de migração |
| **Estudante ID** | Identificador único do estudante | UUID v4: "550e8400-e29b-41d4-..." |
| **EMEF** | Escola Municipal de Ensino Fundamental | Tipo de escola pública |
| **Turno** | Período de aula (MANHÃ ou TARDE) | Não há turno NOITE |
| **Bimestre** | Período de ~2 meses do ano letivo | 4 bimestres por ano (B1, B2, B3, B4) |
| **Falta** | Ausência do estudante | Pode ser justificada (atestado) ou não |
| **Atestado** | Justificativa médica de faltas | Cobre múltiplos dias consecutivos |
| **Interação** | Comunicação com família | Telefonema, reunião, visita domiciliar |
| **Ocorrência** | Registro de evento do estudante | Comportamento, indisciplina, etc |
| **Bolsa Família** | Programa social do governo | Campo binário: SIM/NÃO |
| **AEE** | Atendimento Educacional Especializado | PAEE ou PAAI |
| **AVE** | Auxiliar de Vida Escolar | Profissional de apoio |
| **Prova São Paulo** | Avaliação externa municipal | Importada via CSV |
| **Task** | Tarefa de follow-up pedagógico | Associada a estudante |
| **MCP** | Model Context Protocol | Integrações externas (Firebase, GitHub) |

### Termos Técnicos

| Termo | Significado | Uso no Projeto |
|-------|-------------|----------------|
| **shadcn/ui** | Biblioteca de componentes React | Base de todos os componentes UI |
| **Radix UI** | Primitivos de UI acessíveis | Usados internamente pelo shadcn |
| **Firestore** | Banco NoSQL do Firebase | Armazenamento principal de dados |
| **App Router** | Sistema de roteamento do Next.js 15 | Estrutura de páginas em `src/app/` |
| **Server Component** | Componente renderizado no servidor | Padrão, sem 'use client' |
| **Client Component** | Componente renderizado no cliente | Com 'use client' |
| **Type-safe** | Com verificação de tipos | TypeScript strict mode |
| **Memoization** | Cache de cálculos/renderizações | useMemo, useCallback, memo() |
| **Lazy Loading** | Carregamento sob demanda | Para chunks de código pesados |
| **Bundle** | Pacote JavaScript final | Gerado no build |
| **Dual-write** | Escrita em 2 locais simultaneamente | V2 + V3 durante migração |
| **UUID** | Universal Unique Identifier | Padrão v4 para IDs de estudantes |
| **Sanitização** | Limpeza/validação de entrada | Remove caracteres perigosos |
| **XSS** | Cross-Site Scripting | Tipo de vulnerabilidade evitada |

### Abreviações Comuns no Código

| Abreviação | Significado |
|------------|-------------|
| `est` | Estudante |
| `freq` | Frequência |
| `B1, B2, B3, B4` | Bimestre 1, 2, 3, 4 |
| `db` | Database (Firestore) |
| `doc` | Documento Firestore |
| `col` | Coleção Firestore |
| `ref` | Referência |
| `fn` | Função |
| `cb` | Callback |
| `ctx` | Context |
| `props` | Propriedades de componente |
| `env` | Environment variables |

### Conceitos do Domínio

**Calendário Escolar**:
- **Ano Letivo**: ~200 dias letivos
- **Bimestre**: ~50 dias letivos cada
- **Dia Letivo**: Dia com aula (não conta sábado/domingo/feriados)

**Regras de Frequência**:
- **Mínimo de Frequência**: 75% (máximo 25% de faltas)
- **Cálculo**: `frequência = (diasLetivos - faltas) / diasLetivos * 100`
- **Alerta Vermelho**: < 75% de frequência
- **Alerta Amarelo**: 75-85% de frequência

**Status de Estudante**:
- **ATIVO**: Estudante regular
- **INATIVO**: Desligado/transferido (não deletar!)
- **TRANSFERIDO**: Mudou de escola
- **DESLIGADO**: Saiu do sistema

---

## ⛔ NÃO FAZER

### 🚨 REGRA #1: ZERO TOLERÂNCIA COM `any`

**⚠️ ANTES DE LER ESTA SEÇÃO**: Leia primeiro a seção [🚫 REGRA CRÍTICA: ZERO TOLERÂNCIA COM `any`](#-regra-crítica-zero-tolerância-com-any) que contém o guia completo de type safety.

**Resumo Executivo**:
- ❌ **NUNCA use `any`** em código novo
- ❌ **NUNCA use `as any`** para resolver erros
- ✅ **SEMPRE use `unknown`** + type guards
- ✅ **SEMPRE execute `npm run type-check` antes de commit**
- ✅ **SEMPRE execute `npm run lint` antes de commit**

**Se houver QUALQUER erro TypeScript ou uso de `any`, NÃO COMMITE até corrigir.**

---

### 🚫 Código - NUNCA

```typescript
// ❌ ⚠️ NUNCA CRIAR TODOs - IMPLEMENTAR TUDO IMEDIATAMENTE ⚠️
// REGRA CRÍTICA: Se você identificou algo que precisa ser feito, FAÇA AGORA!
// NÃO deixe comentários TODO, FIXME, HACK ou similares.
// Se não pode fazer agora, crie uma issue ou tarefa no sistema de tasks.

// ❌ PÉSSIMO - Deixar TODO no código
const summary = {
  tasksSkippedDuplicate: 0, // TODO: contar (quando implementar detecção de task duplicada)
};

// ✅ BOM - Implementar imediatamente
const summary = {
  tasksSkippedDuplicate: results.tasksSkippedDuplicate, // ✅ Implementado!
};

// ❌ NUNCA usar setDoc() diretamente
import { setDoc } from 'firebase/firestore';
await setDoc(doc(db, 'estudantes', id), data);
// ✅ SEMPRE usar StudentDataService
await StudentDataService.addStudent(data);

// ❌ NUNCA hardcoded anos
const ano = 2024;
const proximoAno = 2025;
// ✅ SEMPRE calcular dinamicamente
const ano = new Date().getFullYear();
const proximoAno = ano + 1;

// ❌ NUNCA deixar console.log em produção
console.log('Debug:', data);
// ✅ Usar logger ou remover antes de commit
import { logger } from '@/utils/logger';
logger.debug('Debug:', data);

// ❌ NUNCA usar any sem motivo
function process(data: any) { ... }
// ✅ Tipar corretamente
function process(data: Student) { ... }

// ❌ NUNCA acessar propriedades sem verificar
student.contatos.length
// ✅ Verificação defensiva
student.contatos?.length ?? 0
```

### 🚫 Dados - NUNCA

```typescript
// ❌ NUNCA deletar estudantes
await deleteDoc(doc(db, 'estudantes', id));
// ✅ Marcar como INATIVO
await updateDoc(doc(db, 'estudantes', id), { status: 'INATIVO' });

// ❌ NUNCA modificar estudanteId após criação
const estudante = { ...existente, estudanteId: newId };
// ✅ ID é imutável - criar novo estudante se necessário

// ❌ NUNCA usar dados de produção em dev
const prodDb = getFirestore(prodApp);
// ✅ Usar projeto Firebase separado para dev/staging

// ❌ NUNCA commitar dados sensíveis
const apiKey = "AIzaSyC...";
// ✅ Usar variáveis de ambiente
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
```

### 🚫 APIs REST e Supabase - NUNCA (✅ NOVO - Jan 2025)

#### ⚠️ DUAL ID SYSTEM - ERROS MAIS COMUNS ⚠️

**ATENÇÃO**: Este é o erro #1 que você comete repetidamente! Leia com ATENÇÃO!

```typescript
// ❌ ERRO CRÍTICO #1 - Query com campo errado
export const GET = withAuth(async (req: NextRequest, userId: string, context?: RouteParams) => {
  const params = await context?.params;
  const firebaseUUID = params?.id; // Firebase UUID da URL

  // ERRADO! 'id' é Internal ID, não Firebase UUID!
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('*')
    .eq('id', firebaseUUID);  // ❌ VAI DAR 404 SEMPRE!
});

// ✅ CORRETO - Query por student_id
export const GET = withAuth(async (req: NextRequest, userId: string, context?: RouteParams) => {
  const params = await context?.params;
  const firebaseUUID = params?.id;

  // CORRETO! Usar student_id para Firebase UUID
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('*')
    .eq('student_id', firebaseUUID);  // ✅ CORRETO!
});

// ❌ ERRO CRÍTICO #2 - UPDATE/DELETE com Firebase UUID direto
export const PUT = withAuth(async (req: NextRequest, userId: string, context?: RouteParams) => {
  const params = await context?.params;
  const firebaseUUID = params?.id;

  // ERRADO! UPDATE precisa de Internal ID
  const { error } = await supabaseAdmin
    .from('students')
    .update({ name: 'Novo' })
    .eq('id', firebaseUUID);  // ❌ VAI DAR 404!
});

// ✅ CORRETO - Buscar Internal ID primeiro
export const PUT = withAuth(async (req: NextRequest, userId: string, context?: RouteParams) => {
  const params = await context?.params;
  const firebaseUUID = params?.id;

  // PASSO 1: Buscar por student_id para pegar Internal ID
  const { data: existing } = await supabaseAdmin
    .from('students')
    .select('id, student_id')
    .eq('student_id', firebaseUUID)
    .single();

  const internalId = existing.id; // ✅ Pegar Internal ID

  // PASSO 2: UPDATE com Internal ID
  const { error } = await supabaseAdmin
    .from('students')
    .update({ name: 'Novo' })
    .eq('id', internalId);  // ✅ CORRETO!
});

// ❌ ERRO CRÍTICO #3 - SELECT * sem incluir student_id
const { data } = await supabaseAdmin
  .from('students')
  .select('*');  // ❌ Pode não incluir student_id!

// ✅ CORRETO - SELECT explícito
const { data } = await supabaseAdmin
  .from('students')
  .select('id, student_id, name, class, shift, status');  // ✅ Explícito!

// ❌ ERRO CRÍTICO #4 - FK operations sem Internal ID
await supabaseAdmin
  .from('student_contacts')
  .delete()
  .eq('student_id', firebaseUUID);  // ❌ FK espera Internal ID!

// ✅ CORRETO - FK com Internal ID
await supabaseAdmin
  .from('student_contacts')
  .delete()
  .eq('student_id', internalId);  // ✅ Internal ID!
```

#### 📝 Outros Erros Comuns

```typescript
// ❌ NUNCA resolver UUID no frontend
import { resolveToInternalId } from '@/utils/studentIdResolver'; // DEPRECIADO!
const internalId = await resolveToInternalId(firebaseUUID);
const response = await fetch(`/api/students?studentId=${internalId}`);
// ✅ SEMPRE enviar Firebase UUID direto (backend resolve)
import { getAuthHeaders } from '@/utils/authToken';
const headers = await getAuthHeaders();
const response = await fetch(`/api/students?estudanteId=${firebaseUUID}`, { headers });

// ❌ NUNCA criar API que espera Internal ID do frontend
export const GET = async (req: NextRequest) => {
  const studentId = searchParams.get('studentId'); // Internal ID - ruim!
  const { data } = await supabaseAdmin.from('students').eq('id', studentId);
};
// ✅ SEMPRE aceitar Firebase UUID e resolver no backend
export const GET = withAuth(async (req: NextRequest, userId: string) => {
  const estudanteId = searchParams.get('estudanteId'); // Firebase UUID
  const internalId = await resolveFirebaseUUIDToInternal(estudanteId);
  const { data } = await supabaseAdmin.from('students').eq('id', internalId);
});

// ❌ NUNCA usar supabase (client) em services para dados críticos
import { supabase } from '@/lib/supabaseClient';
const { data } = await supabase.from('students').select('*'); // RLS pode bloquear!
// ✅ SEMPRE usar API REST com supabaseAdmin
const response = await fetch('/api/students', { headers: await getAuthHeaders() });

// ❌ NUNCA esquecer autenticação em APIs
export async function POST(req: NextRequest) {
  // Qualquer um pode chamar!
}
// ✅ SEMPRE usar middleware withAuth
export const POST = withAuth(async (req: NextRequest, userId: string) => {
  // userId já validado!
});
```

**🔗 LEMBRE-SE**: Antes de mexer em QUALQUER API, leia a seção "⚠️ REGRA CRÍTICA: DUAL ID SYSTEM ⚠️" no início deste documento!

**Ver documentação completa**: `docs/REFATORACAO-SUPABASE-FRONTEND-FASES-1-4-COMPLETA.md`

### 🚫 Firebase - NUNCA

```typescript
// ❌ NUNCA modificar regras de segurança sem backup
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write; // PERIGOSO!
    }
  }
}

// ❌ NUNCA deletar índices sem confirmar uso
// Sempre verificar queries antes de deletar índice

// ❌ NUNCA rodar scripts de migração sem backup
node scripts/migrate-all.js // SEM TESTE?!
// ✅ Sempre:
// 1. Backup de dados
// 2. Testar em dev
// 3. Rodar um por vez
// 4. Verificar resultados
```

### 🔥 Firebase Emulators - Banco Local (RECOMENDADO)

**SOLUÇÃO DEFINITIVA**: Use Firebase Emulators durante desenvolvimento para **quota ilimitada**.

#### Vantagens sobre Mocks

- ✅ **Dados REAIS** (não mockados, estrutura idêntica)
- ✅ **Queries funcionam** (não simulação)
- ✅ **Quota ILIMITADA** (0 reads consumidos)
- ✅ **Velocidade** (50ms local vs 8000ms cloud)
- ✅ **Interface visual** (explorar dados)

#### Quick Start

```bash
# Terminal 1: Iniciar Emulators
npm run emulators

# Terminal 2: Next.js
npm run dev

# Console do navegador mostrará:
🔥 Conectado aos Firebase Emulators (Firestore: 8080, Auth: 9099)
```

#### Sincronização de Dados

**Manter Emulators atualizados com dados de produção:**

1. **Firebase Console** → Firestore → Import/Export → Export
2. Baixar ZIP e extrair em `./firebase-data/`
3. `npm run emulators:import`

**Frequência**: 1x por semana (segunda-feira)
**Consumo de quota**: **0 reads** (Export não consome quota!)

#### Documentação Completa

- **Quick Start**: `docs/EMULATORS-QUICK-START.md`
- **Guia Completo**: `docs/FIREBASE-EMULATORS-GUIA.md`
- **Sincronização**: `docs/SYNC-PROD-TO-LOCAL.md`
- **Detecção Automática**: `docs/DETECCAO-AUTOMATICA-AMBIENTE.md`

---

### 🚫 Testes em Produção - NUNCA

```bash
# ❌ NUNCA testar APIs pesadas múltiplas vezes em produção
curl /api/students/absence-multiples?multiple=8  # 1ª vez
curl /api/students/absence-multiples?multiple=8  # 2ª vez
curl /api/students/absence-multiples?multiple=8  # 3ª vez
# ⚠️ RISCO: Exceder quota do Firestore (50k reads/dia)

# ✅ SEMPRE usar dry-run em testes
curl "/api/automation/process-absences?dryRun=true&multiple=8"

# ✅ OU testar em ambiente local/staging
# Criar projeto Firebase separado para testes

# ❌ NUNCA chamar APIs de automação sem dryRun em testes
curl /api/automation/process-absences?multiple=8
# ✅ Dry-run primeiro, produção depois
curl "/api/automation/process-absences?dryRun=true&multiple=8"

# ❌ NUNCA testar com clearCache=true repetidamente
curl "/api/students/absence-multiples?clearCache=true"  # Ignora cache!
# ✅ Usar cache (comportamento padrão)
curl "/api/students/absence-multiples?multiple=8"

# ⚠️ ATENÇÃO: Quota do Firebase (Plano Gratuito)
# - Reads: 50,000/dia
# - Writes: 20,000/dia
# - Testes massivos podem exceder e bloquear a aplicação
# - Quota reseta às 04:00 AM (horário de Brasília)
#
# Ver análise completa: docs/ANALISE-QUOTA-FIRESTORE.md
```

**Regras de Ouro para Testes**:
1. ✅ **SEMPRE usar Firebase Emulators** durante desenvolvimento (`npm run emulators`)
2. ✅ **Sempre usar `dryRun=true`** em testes de automação
3. ✅ **Evitar múltiplas chamadas** à mesma API em ambiente de produção
4. ✅ **Sincronizar dados semanalmente** (produção → local)
5. ✅ **Monitorar quota** diariamente no Firebase Console
6. ✅ **Perguntar antes de executar** APIs pesadas sem Emulators

### 🚫 Git - NUNCA

```bash
# ❌ NUNCA commit sem verificar tipos
git add .
git commit -m "fix"
# ✅ Sempre rodar antes
npm run type-check
npm run lint
git add .
git commit -m "fix: descrição específica"

# ❌ NUNCA force push em main
git push --force origin main
# ✅ Criar PR e merge normalmente

# ❌ NUNCA commit de .env ou secrets
git add .env
# ✅ Usar .gitignore
echo ".env*" >> .gitignore

# ❌ NUNCA commits gigantes
git add . # 50 arquivos modificados
# ✅ Commits pequenos e focados
git add src/components/StudentForm.tsx
git commit -m "feat: adicionar validação de CPF"
```

### 🚫 Performance - NUNCA

```typescript
// ❌ NUNCA carregar todos os dados de uma vez
const allStudents = await getDocs(collection(db, 'estudantes'));
// ✅ Usar paginação
const q = query(collection(db, 'estudantes'), limit(50));

// ❌ NUNCA re-renderizar desnecessariamente
function Component({ data }) {
  const processed = processHeavyData(data); // Roda toda renderização!
  // ✅ Usar useMemo
  const processed = useMemo(() => processHeavyData(data), [data]);
}

// ❌ NUNCA importar biblioteca inteira
import _ from 'lodash'; // 70kb!
// ✅ Import específico
import { debounce } from 'lodash-es';
```

### 🚫 Segurança - NUNCA

```typescript
// ❌ NUNCA confiar em input do usuário
const html = `<div>${userInput}</div>`; // XSS!
// ✅ Sanitizar sempre
import { sanitize } from '@/utils/security';
const html = `<div>${sanitize(userInput)}</div>`;

// ❌ NUNCA expor tokens/secrets no frontend
const token = "ghp_abc123..."; // No código!
// ✅ Usar env variables ou backend
const token = process.env.GITHUB_TOKEN; // Backend only

// ❌ NUNCA desabilitar validação
const schema = z.any(); // Aceita qualquer coisa!
// ✅ Validar estritamente
const schema = z.object({
  nome: z.string().min(1),
  // ... campos específicos
});
```

### 🚫 Deploy - NUNCA

```bash
# ❌ NUNCA deploy sem testar build
git push # Auto-deploy!
# ✅ Testar build localmente primeiro
npm run build
npm start # Testar
git push

# ❌ NUNCA deploy em prod sem staging
git push origin main # Direto pra prod!
# ✅ Testar em staging primeiro
git push origin staging
# Verificar staging
# Depois merge pra main

# ❌ NUNCA ignorar erros de build
# Build failed mas deploy mesmo assim?!
# ✅ Corrigir erros antes de deploy
npm run build # Verificar erros
npm run type-check # Verificar tipos
npm run lint # Verificar linting
```

### 🚫 Manutenção - NUNCA

```typescript
// ❌ NUNCA deixar código comentado
// const oldCode = () => { ... }
// function deprecated() { ... }
// ✅ Deletar código não usado (Git guarda histórico)

// ❌ NUNCA deixar TODOs sem contexto
// TODO: fix this
// ✅ TODOs específicos com issues
// TODO(#123): Implementar validação de CPF quando API estiver pronta

// ❌ NUNCA código duplicado
function calcA() { /* mesma lógica */ }
function calcB() { /* mesma lógica */ }
// ✅ Extrair função comum
function calc() { /* lógica compartilhada */ }

// ❌ NUNCA ignorar warnings
// 23 warnings... mas funciona!
// ✅ Resolver warnings (podem virar erros)
```

### ⚠️ Exceções (Quando PODE fazer)

Algumas regras têm exceções:

1. **console.log em desenvolvimento local** - OK para debug rápido, mas remover antes de commit
2. **any temporário durante refactoring** - OK se há um plano para tipar depois
3. **Ignorar teste de um arquivo** - OK se documento o motivo e crio issue
4. **Force push em branch pessoal** - OK se é sua branch e não afeta ninguém
5. **Código comentado durante debug ativo** - OK temporariamente, deletar depois

**Regra de ouro**: Se você hesitou antes de fazer, pergunte antes!

---

## 🎯 DIRETRIZES ESPECIAIS

### Dual-Write (V2 + V3)

**IMPORTANTE**: Durante período de migração, SEMPRE usar `StudentDataService`:

```typescript
// ✅ SEMPRE USAR (Dual-write automático)
import { StudentDataService } from '@/services/studentDataService';

await StudentDataService.addStudent(studentData);
await StudentDataService.updateStudent(studentData);

// ❌ NUNCA USAR DIRETAMENTE
import { setDoc } from 'firebase/firestore';
await setDoc(...); // Escreve só em V2 ou V3!
```

### IDs de Estudante

**Novo padrão**: UUID v4

```typescript
import { v4 as uuidv4 } from 'uuid';

const estudanteId = uuidv4(); // "550e8400-e29b-41d4-a716-446655440000"
```

**Não usar**:
```typescript
const estudanteId = Date.now().toString(); // LEGACY V2
```

### Datas

**Formato padrão**: `DDMMYYYY` (string numérica sem separadores)

```typescript
// ✅ BOM
dataNascimento: "15012010" // 15/01/2010

// ❌ RUIM
dataNascimento: "15/01/2010"
dataNascimento: "2010-01-15"
```

**Utilitário**:
```typescript
import { formatDate, parseDate } from '@/utils/dateUtils';

const formatted = formatDate(new Date()); // "15012025"
const date = parseDate("15012025"); // Date object
```

### Telefones

**Formato**: Apenas dígitos (sem formatação)

```typescript
// ✅ BOM
telefone: "11987654321"

// ❌ RUIM
telefone: "(11) 98765-4321"
```

**Sanitização**:
```typescript
const cleanPhone = phone.replace(/\D/g, ''); // Remove não-dígitos
```

### Mensagens ao Usuário

**Use toast (Sonner)**:
```typescript
import { toast } from 'sonner';

// Sucesso
toast.success("Estudante cadastrado com sucesso!");

// Erro
toast.error("Erro ao salvar dados. Tente novamente.");

// Info
toast.info("Processando...");

// Warning
toast.warning("Alguns dados podem estar incompletos.");
```

---

## 📝 OBSERVAÇÕES FINAIS

### Para Claude Code

1. **Sempre consultar este documento antes de:**
   - Iniciar nova implementação
   - Modificar código existente
   - Criar novos componentes/serviços
   - Fazer refactoring

2. **Prioridades na ordem:**
   - ✅ Funcionalidade correta
   - ✅ Tipagem TypeScript
   - ✅ Padrões do projeto
   - ✅ Performance
   - ✅ Acessibilidade
   - ✅ Documentação

3. **Sempre perguntar se em dúvida sobre:**
   - Qual abordagem usar (V2 vs V3)
   - Se precisa dual-write
   - Qual tipo usar
   - Onde colocar código novo

4. **Manter atualizado:**
   - Este documento deve evoluir com o projeto
   - Adicionar novos padrões descobertos
   - Documentar decisões arquiteturais

---

## 🤖 AUTOMAÇÃO DE ALERTAS DE FALTAS

### Visão Geral

Sistema automatizado de envio de alertas por WhatsApp para responsáveis de estudantes com múltiplos de faltas no mês atual.

**Trigger**: GitHub Actions (cron diário - 9h AM São Paulo)
**Execução**: Segunda a Sexta (dias úteis)
**API**: `/api/automation/process-absences`

### Componentes

```
GitHub Actions (Cron)
    ↓
API Orquestradora
    ↓
1. Buscar estudantes (absence-multiples)
2. Verificar histórico (whatsappMessageHistory)
3. Enviar WhatsApp (retry 3x, delay 5s)
4. Criar Tasks (fechada/aberta)
5. Registrar histórico
6. Enviar relatório (admin)
```

### Arquivos Principais

```
src/
├── app/api/automation/
│   └── process-absences/route.ts    # API Orquestradora
├── services/
│   ├── messageHistoryService.ts     # Histórico de envios
│   └── whatsappRetryService.ts      # Retry com delay
├── utils/
│   └── messageTemplates.ts          # Templates WhatsApp
└── types/index.ts                   # Interfaces

.github/workflows/
└── daily-absence-automation.yml     # GitHub Actions

docs/
├── AUTOMACAO-FALTAS-PLANO-DETALHADO.md
├── AUTOMACAO-ENV-VARS.md
├── AUTOMACAO-TESTES.md
├── AUTOMACAO-FALTAS-README.md
└── FIRESTORE-INDEX-WHATSAPP-HISTORY.md
```

### Configuração

#### Variáveis de Ambiente (`.env.local`)

```bash
NEXT_PUBLIC_WHATSAPP_API_URL=https://...
NEXT_PUBLIC_API_URL=http://localhost:3000
AUTOMATION_NOTIFICATION_PHONE=5511988384664
API_HABIB_KYRILLOS_USERNAME=...
API_HABIB_KYRILLOS_PASSWORD=...
```

#### GitHub Secrets

Configurar em: Settings → Secrets and variables → Actions

- `NEXT_PUBLIC_API_URL`
- `API_HABIB_KYRILLOS_USERNAME`
- `API_HABIB_KYRILLOS_PASSWORD`
- `AUTOMATION_NOTIFICATION_PHONE`

#### Firestore - Índice Composto (OBRIGATÓRIO)

Coleção: `whatsappMessageHistory`

Campos (em ordem):
1. estudanteId (Ascending)
2. contatoTelefone (Ascending)
3. anoReferencia (Ascending)
4. mesReferencia (Ascending)
5. quantidadeFaltas (Ascending)

**Ver**: `docs/FIRESTORE-INDEX-WHATSAPP-HISTORY.md`

### Uso

#### Execução Manual (Dry-Run)

```bash
curl -X GET \
  "http://localhost:3000/api/automation/process-absences?dryRun=true&multiple=3" \
  -H "Authorization: Basic $(echo -n 'user:pass' | base64)"
```

#### Executar via GitHub Actions

1. Actions → "Daily Absence Alerts Automation"
2. Run workflow
3. Configurar:
   - Dry-run: `true` (teste) ou `false` (produção)
   - Multiple: `3` (ou 6, 9, 12...)

### Regras de Negócio

#### Unicidade
Mensagem enviada **apenas 1x** por combinação:
- Ano + Mês + Faltas + Estudante + Contato

**Exemplo**:
- Estudante com 3 faltas, 2 contatos → 2 mensagens
- Mesmo estudante, mesmo mês, 3 faltas → NÃO envia (duplicata)
- Mesmo estudante, mesmo mês, 6 faltas → ENVIA (nova quantidade)

#### Retry
- 3 tentativas automáticas
- Delay de 5 segundos entre tentativas
- Após 3 falhas → Task ABERTA

#### Tasks
- **FECHADA**: Mensagem enviada com sucesso
  - `created_by: "AUTOMAÇÃO"`
  - `action_taken: "Contato digital"`
  - `is_resolved: true`
  - `whatsapp_phone: "11xxxxx"`

- **ABERTA**: Falha no envio OU sem contato
  - `created_by: "AUTOMAÇÃO"`
  - `recommended_action: "Contato telefônico"`
  - `is_resolved: false`

#### Relatório
Enviado **sempre** para admin (5511988384664):
- Resumo da execução
- Quantidade de mensagens enviadas
- Falhas
- Tempo de execução

### Firestore - Coleções

#### `whatsappMessageHistory`
Histórico de mensagens enviadas (prevenção de duplicatas)

```typescript
{
  estudanteId: string;
  contatoTelefone: string;
  anoReferencia: number;
  mesReferencia: number;
  quantidadeFaltas: number;
  estudanteNome: string;
  contatoNome: string;
  taskId: string;
  dataPrimeiroEnvio: string;
  status: 'SUCCESS' | 'FAILED' | 'NO_CONTACT';
  messageId?: string;
  sentAt?: number;
  retryCount?: number;
  isDryRun?: boolean;
}
```

### Troubleshooting

#### Mensagens duplicadas
❌ Índice composto faltando ou incorreto
✅ Verificar: Firebase Console → Firestore → Indexes
✅ Campos exatos (ordem importa!)

#### Workflow não executa
❌ Cron incorreto (UTC vs BRT)
✅ 9h AM BRT = 12h UTC
✅ Cron: `0 12 * * 1-5`
✅ Verificar secrets no GitHub

#### API retorna 401
❌ Basic Auth incorreto
✅ Verificar env vars
✅ Testar: `echo -n 'user:pass' | base64`

#### Mensagem não enviada
❌ Dry-run ativo
✅ Usar `dryRun=false`
❌ Contato sem WhatsApp verificado
✅ Verificar `verifiedWhatsAppContacts`

### Monitoramento

#### Ver Tasks Criadas
- Acessar: `/painel-tarefas`
- Filtrar por `created_by: "AUTOMAÇÃO"`

#### Ver Histórico de Envios
- Firebase Console → Firestore → `whatsappMessageHistory`

#### Ver Logs
- **GitHub Actions**: https://github.com/repo/actions
- **Vercel**: https://vercel.com/dashboard/logs

### Documentação Completa

- 📖 **Plano Detalhado**: `docs/AUTOMACAO-FALTAS-PLANO-DETALHADO.md`
- 🔧 **Variáveis de Ambiente**: `docs/AUTOMACAO-ENV-VARS.md`
- 🧪 **Guia de Testes**: `docs/AUTOMACAO-TESTES.md`
- 📚 **README Rápido**: `docs/AUTOMACAO-FALTAS-README.md`
- 🔥 **Índice Firestore**: `docs/FIRESTORE-INDEX-WHATSAPP-HISTORY.md`

---

## 📞 SUPORTE

### Recursos

- **Docs do Projeto**: `docs/`
- **Código-fonte**: `src/`
- **Issues**: GitHub Issues
- **Firebase Console**: [https://console.firebase.google.com](https://console.firebase.google.com)
- **Vercel Dashboard**: [https://vercel.com](https://vercel.com)

### Contatos

- **Desenvolvedor Principal**: [Informação a ser preenchida]
- **Email**: [Informação a ser preenchida]

---

**Última Atualização**: 2025-01-10
**Versão**: 2.0.0
**Status do Projeto**: ✅ Produção (Migração V3 Concluída + Type Safety 100%)

---

## 🎯 RESUMO EXECUTIVO PARA IMPLEMENTAÇÕES

**Antes de começar QUALQUER implementação, lembre-se:**

1. ❌ **ZERO `any`** - Use `unknown` + type guards
2. ✅ **SEMPRE tipar explicitamente** - Parâmetros e return types
3. ✅ **SEMPRE validar antes de commit**:
   ```bash
   npm run type-check 2>&1 | grep "^src/"  # Deve ser 0
   npm run lint 2>&1 | grep "Unexpected any"  # Deve ser 0
   ```
4. ✅ **Use `as never` APENAS para Supabase** insert/update
5. ✅ **Type guards para unknown/nullable** - Sempre
6. ✅ **Interfaces explícitas** ao invés de Record<string, unknown>

**Se houver QUALQUER erro TypeScript ou `any`, NÃO commite até corrigir.**

**Este projeto mantém 100% type safety. Qualquer degradação é considerada bug crítico.**
