# 🔄 SPRINT 2 - Serviços Refatorados para usar APIs

**Data**: 2025-10-17
**Objetivo**: Refatorar serviços para consumir API Routes ao invés de Supabase direto
**Status**: 🔄 **Em Andamento** (1/7 completo)

---

## 📊 PROGRESSO

| Serviço | Status | API Usada | Observações |
|---------|--------|-----------|-------------|
| **taskService.ts** | ✅ **CONCLUÍDO** | `/api/tasks` | 100% refatorado |
| **studentOccurrencesService.ts** | 🔄 Pendente | `/api/occurrences` | Prioridade Alta |
| **whatsappDataService.ts** | 🔄 Pendente | `/api/whatsapp/verified` | Prioridade Alta |
| **messageHistoryService.ts** | 🔄 Pendente | `/api/messages/history` | Prioridade Alta |
| **medicalCertificatesService.ts** | 🔄 Pendente | `/api/medical-certificates` | API já existe |
| **studentSuspensionsService.ts** | 🔄 Pendente | `/api/suspensions` | API já existe |
| **userProfilesService.ts** | 🔄 Pendente | `/api/users` | API já existe |

---

## ✅ 1. taskService.ts - CONCLUÍDO

### Mudanças Realizadas:

**Antes** (chamadas diretas ao Supabase):
```typescript
const { data, error } = await supabase
  .from('user_tasks')
  .insert(insertData)
  .select()
  .single();
```

**Depois** (via API):
```typescript
const response = await fetch('/api/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(insertData),
});
const result = await response.json();
```

### Métodos Refatorados:

- ✅ `generateTasksForUser()` - Criação de tasks
- ✅ `getPendingTasks()` - GET /api/tasks?is_resolved=false
- ✅ `completeTask()` - PUT /api/tasks/[id]
- ✅ `getTaskById()` - GET /api/tasks/[id]
- ✅ `getCompletedTasks()` - GET /api/tasks?is_resolved=true
- ✅ `createTask()` - POST /api/tasks
- ✅ `getUserTasksForUserId()` - GET /api/tasks?created_by=X
- ✅ `updateTask()` - PUT /api/tasks/[id]
- ✅ `deleteTask()` - DELETE /api/tasks/[id]
- ✅ `clearAllTasks()` - Bulk delete via API

### Benefícios:
- ✅ 0 chamadas diretas ao Supabase
- ✅ Validação centralizada na API
- ✅ Error handling padronizado
- ✅ Logs centralizados

---

## 🔄 2. studentOccurrencesService.ts - PENDENTE

### Análise:

**Arquivo**: `src/services/supabase/studentOccurrencesService.ts`
**Linhas**: ~200
**Métodos principais**:
- `getOccurrencesByStudentId()` - Buscar occurrences
- `createOccurrence()` - Criar occurrence
- `updateOccurrence()` - Atualizar occurrence
- `deleteOccurrence()` - Deletar occurrence

### Refatoração Necessária:

```typescript
// ANTES
const { data, error } = await supabase
  .from('student_occurrences')
  .select('*')
  .eq('student_id', studentId);

// DEPOIS
const response = await fetch(`/api/occurrences?student_id=${studentId}`);
const result = await response.json();
return result.data;
```

### Estimativa:
- **Tempo**: 30 minutos
- **Complexidade**: Baixa (métodos diretos)
- **Prioridade**: Alta

---

## 🔄 3. whatsappDataService.ts - PENDENTE

### Análise:

**Arquivo**: `src/services/whatsappDataService.ts`
**Linhas**: ~100
**Métodos principais**:
- `getVerifiedNumber()` - Buscar número verificado
- `saveVerifiedNumber()` - Salvar verificação
- `updateVerificationStatus()` - Atualizar status

### Refatoração Necessária:

```typescript
// ANTES
const { data, error } = await supabase
  .from('whatsapp_verified_numbers')
  .select('*')
  .eq('phone_number', phoneNumber)
  .single();

// DEPOIS
const response = await fetch(`/api/whatsapp/verified?phone_number=${phoneNumber}`);
const result = await response.json();
return result.data[0]; // API retorna array
```

### Estimativa:
- **Tempo**: 20 minutos
- **Complexidade**: Baixa
- **Prioridade**: Alta

---

## 🔄 4. messageHistoryService.ts - PENDENTE

### Análise:

**Arquivo**: `src/services/messageHistoryService.ts`
**Linhas**: ~150
**Métodos principais**:
- `wasAlreadySent()` - Verificar duplicata
- `recordSent()` - Registrar envio

### Refatoração Necessária:

```typescript
// ANTES - wasAlreadySent()
const { data, error } = await supabase
  .from('whatsapp_message_history')
  .select('id')
  .eq('estudante_id', estudanteId)
  .eq('contato_telefone', contatoTelefone)
  // ... outros filtros
  .limit(1);

return data && data.length > 0;

// DEPOIS
const params = new URLSearchParams({
  estudante_id: estudanteId,
  contato_telefone: contatoTelefone,
  ano_referencia: anoReferencia.toString(),
  mes_referencia: mesReferencia.toString(),
  quantidade_faltas: quantidadeFaltas.toString(),
  limit: '1'
});

const response = await fetch(`/api/messages/history?${params}`);
const result = await response.json();
return result.data.length > 0;
```

```typescript
// ANTES - recordSent()
const { data, error } = await supabase
  .from('whatsapp_message_history')
  .insert(historyRecord)
  .select()
  .single();

// DEPOIS
const response = await fetch('/api/messages/history', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(historyRecord),
});

const result = await response.json();
return result.data.id;
```

### Estimativa:
- **Tempo**: 30 minutos
- **Complexidade**: Baixa
- **Prioridade**: Alta

---

## 🔄 5. medicalCertificatesService.ts - PENDENTE

### Análise:

**Arquivo**: `src/services/supabase/medicalCertificatesService.ts`
**API Existente**: ✅ `/api/medical-certificates`
**Métodos principais**:
- `getByStudentId()` - GET /api/medical-certificates?studentId=X
- `create()` - POST /api/medical-certificates
- `update()` - PUT /api/medical-certificates/[id]
- `delete()` - DELETE /api/medical-certificates/[id]

### Refatoração:

Simples substituição de chamadas Supabase por fetch da API existente.

### Estimativa:
- **Tempo**: 30 minutos
- **Complexidade**: Baixa
- **Prioridade**: Média

---

## 🔄 6. studentSuspensionsService.ts - PENDENTE

### Análise:

**Arquivo**: `src/services/supabase/studentSuspensionsService.ts`
**API Existente**: ✅ `/api/suspensions`
**Métodos principais**:
- `getByStudentId()` - GET /api/suspensions?studentId=X
- `create()` - POST /api/suspensions
- `update()` - PUT /api/suspensions/[id]
- `delete()` - DELETE /api/suspensions/[id]

### Refatoração:

Simples substituição de chamadas Supabase por fetch da API existente.

### Estimativa:
- **Tempo**: 30 minutos
- **Complexidade**: Baixa
- **Prioridade**: Média

---

## 🔄 7. userProfilesService.ts - PENDENTE

### Análise:

**Arquivo**: `src/services/supabase/userProfilesService.ts`
**API Existente**: ✅ `/api/users`
**Métodos principais**:
- `getUserByFirebaseUid()` - GET /api/users/by-firebase-uid?uid=X
- `getUserByEmail()` - GET /api/users/by-email?email=X
- `createUser()` - POST /api/users/create
- `updateUser()` - POST /api/users/update

### Refatoração:

Substituir chamadas Supabase pela API existente.

### Estimativa:
- **Tempo**: 20 minutos
- **Complexidade**: Baixa
- **Prioridade**: Baixa (menos usado)

---

## 📋 PLANO DE EXECUÇÃO

### Ordem Recomendada:

1. ✅ **taskService.ts** - CONCLUÍDO
2. **messageHistoryService.ts** - Usado na automação (crítico)
3. **whatsappDataService.ts** - Usado na automação (crítico)
4. **studentOccurrencesService.ts** - Menos usado mas completa o Sprint
5. **medicalCertificatesService.ts** - API já existe
6. **studentSuspensionsService.ts** - API já existe
7. **userProfilesService.ts** - Menos usado

### Tempo Estimado Total:
- **Já feito**: taskService (1h)
- **Restante**: 6 serviços × 30min = **3h**
- **Total Sprint 2**: **4h**

---

## 🎯 TEMPLATE DE REFATORAÇÃO

### Para facilitar, use este template:

```typescript
// ============================================================================
// ANTES (Supabase direto)
// ============================================================================
static async getItems(filter: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('filter_field', filter);

  if (error) throw error;
  return data.map(item => this.mapToInterface(item));
}

// ============================================================================
// DEPOIS (API)
// ============================================================================
static async getItems(filter: string): Promise<Item[]> {
  try {
    const response = await fetch(`/api/items?filter=${encodeURIComponent(filter)}`);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const result = await response.json();
    return (result.data || []).map((item: any) => this.mapToInterface(item));
  } catch (error) {
    logger.error('getItems falhou', { filter }, error as Error);
    throw error;
  }
}
```

---

## 🔍 COMO IDENTIFICAR O QUE PRECISA MUDAR

### Buscar por padrões:

```bash
# Buscar importações do supabaseClient
grep -r "from '@/lib/supabaseClient'" src/services

# Buscar chamadas .from()
grep -r "supabase.from" src/services

# Buscar .insert, .update, .delete
grep -r "\.insert\(" src/services
grep -r "\.update\(" src/services
grep -r "\.delete\(" src/services
```

---

## ✅ BENEFÍCIOS APÓS SPRINT 2 COMPLETO

- ✅ **0 chamadas diretas** ao Supabase em serviços
- ✅ **Validação centralizada** nas APIs
- ✅ **Error handling** padronizado
- ✅ **Logs centralizados**
- ✅ **Cache** mais fácil de implementar
- ✅ **Rate limiting** possível
- ✅ **Resolve ERR_QUIC_PROTOCOL_ERROR** completamente

---

## 📊 MÉTRICAS

### Antes:
- ❌ 7 serviços com chamadas diretas ao Supabase
- ❌ Validação duplicada
- ❌ Error handling inconsistente

### Após Sprint 2:
- ✅ 7 serviços usando APIs
- ✅ Validação centralizada
- ✅ Error handling padronizado
- ✅ Base sólida para Sprint 3 (Hooks)

---

**Última atualização**: 2025-10-17 20:45
**Status**: 1/7 serviços refatorados
**Próximo**: messageHistoryService.ts
