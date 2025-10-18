# 🗺️ MAPEAMENTO COMPLETO - Migração para API Routes

**Data**: 2025-10-17
**Objetivo**: Mapear todas as chamadas diretas ao Supabase para migrar para API Routes intermediárias
**Razão**: Resolver erro `ERR_QUIC_PROTOCOL_ERROR` e melhorar arquitetura

---

## 📊 SITUAÇÃO ATUAL

### ✅ API Routes Já Existentes

Você já possui uma estrutura bem organizada de API Routes:

```
src/app/api/
├── _middleware/
│   ├── auth.ts
│   └── validation.ts
├── _schemas/
│   ├── studentSchemas.ts
│   ├── contactSchemas.ts
│   ├── absenceSchemas.ts
│   └── medicalCertificateSchemas.ts
├── _utils/
│   ├── errorHandler.ts
│   └── response.ts
├── students/
│   ├── route.ts (GET, POST)
│   ├── [id]/route.ts (GET, PUT, DELETE)
│   ├── absence-multiples/route.ts
│   └── consecutive-absences/route.ts
├── contacts/
│   ├── route.ts (GET, POST)
│   └── [id]/route.ts (GET, PUT, DELETE)
├── absences/
│   ├── route.ts (GET, POST)
│   ├── [id]/route.ts (GET, PUT, DELETE)
│   └── bulk/route.ts
├── medical-certificates/
│   ├── route.ts
│   └── [id]/route.ts
├── suspensions/
│   ├── route.ts
│   └── [id]/route.ts
├── interactions/
│   ├── route.ts
│   └── [id]/route.ts
├── tasks/
│   └── create/route.ts
├── users/
│   ├── all-active/route.ts
│   ├── by-email/route.ts
│   ├── by-firebase-uid/route.ts
│   ├── create/route.ts
│   └── update/route.ts
├── automation/
│   ├── process-absences/route.ts
│   ├── resume/route.ts
│   ├── status/route.ts
│   └── watchdog/route.ts
├── evolution/ (WhatsApp)
│   ├── check/route.ts
│   ├── send/route.ts
│   └── webhooks/
└── whatsapp/
    ├── send/route.ts
    └── verify/route.ts
```

### ✅ Hooks de API Já Existentes

Você já tem hooks que **consomem essas APIs**:

```typescript
src/hooks/api/
├── index.ts (barrel export)
├── useStudents.ts
│   - useStudents()
│   - useStudent(id)
│   - useCreateStudent()
│   - useUpdateStudent()
│   - useDeleteStudent()
├── useContacts.ts
│   - useContacts()
│   - useContact(id)
│   - useCreateContact()
│   - useUpdateContact()
│   - useDeleteContact()
├── useAbsences.ts
│   - useAbsences()
│   - useAbsence(id)
│   - useCreateAbsence()
│   - useCreateBulkAbsences()
│   - useUpdateAbsence()
│   - useDeleteAbsence()
└── useOthers.ts
    - useSuspensions()
    - useMedicalCertificates()
    - useInteractions()
    - use[Create|Update|Delete] para cada entidade
```

---

## 🔍 PONTOS QUE AINDA FAZEM CHAMADAS DIRETAS AO SUPABASE

### 1. **Services que usam `supabaseClient` diretamente**

#### 📁 `src/services/supabase/`

| Serviço | Tabela | Operações | Status API |
|---------|--------|-----------|------------|
| **medicalCertificatesService.ts** | `medical_certificates` | CRUD | ✅ API existe |
| **studentSuspensionsService.ts** | `student_suspensions` | CRUD | ✅ API existe |
| **studentOccurrencesService.ts** | `student_occurrences` | CRUD | ❌ API falta |
| **userProfilesService.ts** | `users` | Read/Update | ✅ API existe |

#### 📁 `src/services/` (raiz)

| Serviço | Tabela | Operações | Status API |
|---------|--------|-----------|------------|
| **taskService.ts** | `user_tasks` | CRUD | ⚠️ API parcial (só create) |
| **messageHistoryService.ts** | ? | ? | ❓ Verificar |
| **whatsappDataService.ts** | `whatsapp_verified_numbers` | Read/Update | ❌ API falta |

#### 📁 `src/services/whatsapp/`

| Serviço | Função | Status API |
|---------|--------|------------|
| **messageStatusService.ts** | Atualiza status WhatsApp | ✅ Via webhooks |
| **interactionStatusService.ts** | Atualiza interactions | ✅ API existe |

### 2. **Hooks que usam `supabase` diretamente**

| Hook | Tabela | Uso | Precisa Migrar? |
|------|--------|-----|-----------------|
| **useSupabase.ts** | Genérico | Wrapper com cache | ✅ SIM - base para outros hooks |
| **useSupabaseDoc.ts** | Genérico | Single doc | ✅ SIM - base para outros hooks |
| **attendance/useDuplicateAbsences.ts** | `student_absences` | Remove duplicatas | ⚠️ Considerar API |

### 3. **Componentes que fazem queries diretas**

🔍 **Buscar componentes com**:
```bash
# Componentes que importam supabaseClient
grep -r "from '@/lib/supabaseClient'" src/components src/app --include="*.tsx"
```

---

## 🎯 PLANO DE MIGRAÇÃO

### Fase 1: APIs Faltantes (Alta Prioridade)

#### 1.1 **Tasks API Completa**

**Criar**: `src/app/api/tasks/route.ts`

```typescript
// GET /api/tasks - Listar tasks (com filtros)
// POST /api/tasks - Criar task
// GET /api/tasks/[id] - Task específica
// PUT /api/tasks/[id] - Atualizar task
// DELETE /api/tasks/[id] - Deletar task
```

**Migrar**:
- `src/services/taskService.ts` → usar API ao invés de Supabase direto

#### 1.2 **Student Occurrences API**

**Criar**: `src/app/api/occurrences/`

```typescript
// GET /api/occurrences?studentId=X
// POST /api/occurrences
// PUT /api/occurrences/[id]
// DELETE /api/occurrences/[id]
```

**Migrar**:
- `src/services/supabase/studentOccurrencesService.ts` → usar API

#### 1.3 **WhatsApp Verified Numbers API**

**Criar**: `src/app/api/whatsapp/verified/`

```typescript
// GET /api/whatsapp/verified?phone=X
// POST /api/whatsapp/verified
// PUT /api/whatsapp/verified/[id]
```

**Migrar**:
- `src/services/whatsappDataService.ts` → usar API

#### 1.4 **Message History API**

**Criar**: `src/app/api/messages/history/`

```typescript
// GET /api/messages/history?studentId=X&month=X
// POST /api/messages/history
```

**Migrar**:
- `src/services/messageHistoryService.ts` → usar API

### Fase 2: Refatorar Serviços Existentes (Média Prioridade)

Serviços que **já têm API**, mas ainda fazem chamadas diretas:

| Serviço | API Existente | Ação |
|---------|---------------|------|
| medicalCertificatesService.ts | `/api/medical-certificates` | Refatorar para usar API |
| studentSuspensionsService.ts | `/api/suspensions` | Refatorar para usar API |
| userProfilesService.ts | `/api/users` | Refatorar para usar API |

### Fase 3: Refatorar Hooks (Baixa Prioridade)

| Hook | Ação |
|------|------|
| useSupabase.ts | Criar wrapper que usa API ao invés de Supabase direto |
| useSupabaseDoc.ts | Criar wrapper que usa API ao invés de Supabase direto |

**Alternativa**: Manter hooks genéricos, mas **não usá-los diretamente** - sempre usar hooks de `/hooks/api/*`

### Fase 4: Auditar Componentes (Crítico)

```bash
# Encontrar componentes que importam supabaseClient
grep -r "from '@/lib/supabaseClient'" src/app src/components

# Encontrar queries diretas
grep -r "supabase\.from" src/app src/components
```

**Ação**: Substituir por hooks de `@/hooks/api`

---

## 📋 CHECKLIST DE MIGRAÇÃO

### APIs Faltantes

- [ ] `GET /api/tasks` - Listar tasks
- [ ] `GET /api/tasks/[id]` - Task específica
- [ ] `PUT /api/tasks/[id]` - Atualizar task
- [ ] `DELETE /api/tasks/[id]` - Deletar task
- [ ] `GET /api/occurrences` - Listar occurrences
- [ ] `POST /api/occurrences` - Criar occurrence
- [ ] `PUT /api/occurrences/[id]` - Atualizar occurrence
- [ ] `DELETE /api/occurrences/[id]` - Deletar occurrence
- [ ] `GET /api/whatsapp/verified` - Números verificados
- [ ] `POST /api/whatsapp/verified` - Adicionar verificado
- [ ] `PUT /api/whatsapp/verified/[id]` - Atualizar verificado
- [ ] `GET /api/messages/history` - Histórico de mensagens
- [ ] `POST /api/messages/history` - Adicionar histórico

### Serviços para Refatorar

- [ ] `medicalCertificatesService.ts` → usar `/api/medical-certificates`
- [ ] `studentSuspensionsService.ts` → usar `/api/suspensions`
- [ ] `userProfilesService.ts` → usar `/api/users`
- [ ] `taskService.ts` → usar `/api/tasks`
- [ ] `studentOccurrencesService.ts` → usar `/api/occurrences`
- [ ] `whatsappDataService.ts` → usar `/api/whatsapp/verified`
- [ ] `messageHistoryService.ts` → usar `/api/messages/history`

### Hooks para Criar/Atualizar

- [ ] `useTask()` - Consumir API tasks
- [ ] `useTasks()` - Listar tasks
- [ ] `useCreateTask()` - Criar task
- [ ] `useUpdateTask()` - Atualizar task
- [ ] `useDeleteTask()` - Deletar task
- [ ] `useOccurrences()` - Listar occurrences
- [ ] `useCreateOccurrence()` - Criar occurrence
- [ ] `useWhatsAppVerified()` - Números verificados
- [ ] `useMessageHistory()` - Histórico mensagens

### Auditoria de Componentes

- [ ] Buscar imports de `supabaseClient` em components
- [ ] Buscar imports de `supabaseClient` em app
- [ ] Substituir por hooks de `/hooks/api`
- [ ] Testar todos os fluxos

---

## 🔧 TEMPLATE DE API ROUTE

Use este template para criar novas APIs:

```typescript
// src/app/api/[entity]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { createErrorResponse, createSuccessResponse } from '@/app/api/_utils/response'
import { handleError } from '@/app/api/_utils/errorHandler'

/**
 * GET /api/[entity]
 * Lista entidades com filtros opcionais
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('[table_name]')
      .select('*', { count: 'exact' })

    if (studentId) {
      query = query.eq('student_id', studentId)
    }

    query = query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      return createErrorResponse(error.message, 500)
    }

    return createSuccessResponse({
      data,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * POST /api/[entity]
 * Cria nova entidade
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validação (usar Zod schema)
    // const validated = entitySchema.parse(body)

    const { data, error } = await supabase
      .from('[table_name]')
      .insert(body)
      .select()
      .single()

    if (error) {
      return createErrorResponse(error.message, 500)
    }

    return createSuccessResponse(data, 201)
  } catch (error) {
    return handleError(error)
  }
}
```

```typescript
// src/app/api/[entity]/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { createErrorResponse, createSuccessResponse } from '@/app/api/_utils/response'
import { handleError } from '@/app/api/_utils/errorHandler'

/**
 * GET /api/[entity]/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('[table_name]')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      return createErrorResponse(error.message, 404)
    }

    return createSuccessResponse(data)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * PUT /api/[entity]/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('[table_name]')
      .update(body)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return createErrorResponse(error.message, 500)
    }

    return createSuccessResponse(data)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * DELETE /api/[entity]/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from('[table_name]')
      .delete()
      .eq('id', params.id)

    if (error) {
      return createErrorResponse(error.message, 500)
    }

    return createSuccessResponse({ message: 'Deleted successfully' })
  } catch (error) {
    return handleError(error)
  }
}
```

---

## 🔧 TEMPLATE DE HOOK DE API

Use este template para criar hooks que consomem as APIs:

```typescript
// src/hooks/api/use[Entity].ts
"use client"

import { useState, useCallback } from 'react'

// ============================================================================
// TYPES
// ============================================================================

export interface Entity {
  id: string
  // ... outros campos
}

export interface EntityFilters {
  studentId?: string
  // ... outros filtros
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export interface ApiResponse<T> {
  data?: T
  error?: string
}

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

async function fetchEntities(filters?: EntityFilters): Promise<PaginatedResponse<Entity>> {
  const params = new URLSearchParams()

  if (filters?.studentId) params.append('studentId', filters.studentId)

  const response = await fetch(`/api/entities?${params}`)
  if (!response.ok) throw new Error('Failed to fetch entities')
  return response.json()
}

async function fetchEntity(id: string): Promise<Entity> {
  const response = await fetch(`/api/entities/${id}`)
  if (!response.ok) throw new Error('Failed to fetch entity')
  const result = await response.json()
  return result.data
}

async function createEntity(data: Partial<Entity>): Promise<Entity> {
  const response = await fetch('/api/entities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to create entity')
  const result = await response.json()
  return result.data
}

async function updateEntity(id: string, data: Partial<Entity>): Promise<Entity> {
  const response = await fetch(`/api/entities/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to update entity')
  const result = await response.json()
  return result.data
}

async function deleteEntity(id: string): Promise<void> {
  const response = await fetch(`/api/entities/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) throw new Error('Failed to delete entity')
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Lista entidades
 */
export function useEntities(filters?: EntityFilters) {
  const [data, setData] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchEntities(filters)
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

/**
 * Busca entidade específica
 */
export function useEntity(id: string | null) {
  const [data, setData] = useState<Entity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }

    fetchEntity(id)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  return { data, loading, error }
}

/**
 * Cria entidade
 */
export function useCreateEntity() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (data: Partial<Entity>) => {
    try {
      setLoading(true)
      setError(null)
      const result = await createEntity(data)
      return { data: result, error: null }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMsg)
      return { data: null, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }, [])

  return { create, loading, error }
}

/**
 * Atualiza entidade
 */
export function useUpdateEntity() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = useCallback(async (id: string, data: Partial<Entity>) => {
    try {
      setLoading(true)
      setError(null)
      const result = await updateEntity(id, data)
      return { data: result, error: null }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMsg)
      return { data: null, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }, [])

  return { update, loading, error }
}

/**
 * Deleta entidade
 */
export function useDeleteEntity() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remove = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      await deleteEntity(id)
      return { success: true, error: null }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }, [])

  return { remove, loading, error }
}
```

---

## 🚀 ORDEM DE IMPLEMENTAÇÃO RECOMENDADA

### Sprint 1: APIs Críticas (1-2 dias)
1. ✅ Tasks API completa (`/api/tasks/*`)
2. ✅ Occurrences API (`/api/occurrences/*`)
3. ✅ WhatsApp Verified API (`/api/whatsapp/verified/*`)

### Sprint 2: Refatorar Serviços (2-3 dias)
4. ✅ Migrar `taskService.ts` → API
5. ✅ Migrar `studentOccurrencesService.ts` → API
6. ✅ Migrar `medicalCertificatesService.ts` → API
7. ✅ Migrar `studentSuspensionsService.ts` → API

### Sprint 3: Criar Hooks (1-2 dias)
8. ✅ Criar hooks em `/hooks/api/useTasks.ts`
9. ✅ Criar hooks em `/hooks/api/useOccurrences.ts`
10. ✅ Atualizar barrel export em `/hooks/api/index.ts`

### Sprint 4: Auditoria e Testes (2-3 dias)
11. ✅ Buscar e substituir chamadas diretas em componentes
12. ✅ Buscar e substituir chamadas diretas em pages
13. ✅ Testar todos os fluxos
14. ✅ Deploy e monitorar

---

## 📊 MÉTRICAS DE SUCESSO

- [ ] **0 imports** de `supabaseClient` em `src/components`
- [ ] **0 imports** de `supabaseClient` em `src/app` (exceto APIs)
- [ ] **0 chamadas** `supabase.from()` fora de `src/app/api`
- [ ] **100% dos serviços** usando API Routes
- [ ] **Erro QUIC** não aparece mais em produção

---

## 📝 NOTAS IMPORTANTES

### Vantagens da Migração

✅ **Resolve ERR_QUIC_PROTOCOL_ERROR** - Chamadas são para mesmo domínio
✅ **Melhor controle** - Validação centralizada
✅ **Mais seguro** - Não expõe Supabase URL/Key
✅ **Cache/Retry** - Mais fácil de implementar
✅ **Logs centralizados** - Melhor observabilidade
✅ **Rate limiting** - Proteção contra abuso

### Desvantagens

⚠️ **Mais código** - Mais arquivos para manter
⚠️ **Latência extra** - 1 hop adicional (Next.js → Supabase)
⚠️ **Deploy maior** - Mais functions no Vercel

### Quando NÃO Migrar

Alguns casos podem permanecer com chamada direta:
- Webhooks recebendo dados externos
- Server Components que já rodam no backend
- Scripts one-off (migrations, seeds)

---

## 🔗 REFERÊNCIAS

- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
- [Vercel Functions](https://vercel.com/docs/functions/serverless-functions)

---

**Próximo passo**: Escolher por onde começar (Sprint 1, 2, 3 ou 4)?
