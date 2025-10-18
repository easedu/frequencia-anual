# 🎯 SPRINT 4 - Fase 6: Migração Completa (100% Limpo)

**Data**: 2025-10-17
**Objetivo**: Migrar **TODOS** os hooks e componentes restantes que ainda fazem chamadas diretas ao Supabase
**Motivação**: Arquitetura 100% limpa, zero chamadas diretas ao Supabase no frontend

---

## 📋 Arquivos Identificados

### 🔴 Hooks de Attendance (4 arquivos) - **ALTA PRIORIDADE**

Usados na página crítica `/controlar-faltas`:

1. **`src/hooks/attendance/useStudentRecords.ts`**
   - Services: `AbsenceService`, `AcademicYearService`, `StudentDataService`
   - Chamadas: `getStudentAbsences()`, `getAcademicYearComplete()`
   - Linhas: ~200

2. **`src/hooks/attendance/useSchoolDays.ts`**
   - Services: `AcademicYearService`
   - Chamadas: `getAcademicYearComplete()`
   - Linhas: ~100

3. **`src/hooks/attendance/useStudentAbsences.ts`**
   - Services: `AbsenceService`
   - Chamadas: `getStudentAbsences()`
   - Linhas: ~150

4. **`src/hooks/attendance/useBimesterPeriods.ts`**
   - Services: `AcademicYearService`
   - Chamadas: `getAcademicYearComplete()`
   - Linhas: ~100

### 🟡 Outros Hooks (2 arquivos) - **MÉDIA PRIORIDADE**

5. **`src/hooks/useWhatsAppStatusPolling.ts`**
   - Services: `InteractionService`
   - Chamadas: `updateInteraction()` (polling de status)
   - Linhas: ~150

6. **`src/hooks/useContactsManagement.ts`**
   - Services: `InteractionService`
   - Chamadas: `createInteraction()`, `updateInteraction()`
   - Linhas: ~200

### 🟢 Componentes (2 arquivos) - **BAIXA PRIORIDADE**

7. **`src/components/tasks/TaskDashboard.tsx`**
   - Services: `InteractionService`
   - Chamadas: `createInteraction()`
   - Linhas: ~300

8. **`src/components/tasks/TaskManager.tsx`**
   - Services: `InteractionService`
   - Chamadas: `createInteraction()`
   - Linhas: ~400

### ⚪ Arquivo Backup (1 arquivo) - **DELETAR**

9. **`src/app/telefones/page_backup.tsx`**
   - Arquivo de backup não usado
   - Ação: Deletar

---

## 🎯 Estratégia de Migração

### Fase 6.1: Hooks de Attendance (Críticos)

**Abordagem**: Usar **hooks da API** já criados na Sprint 4

#### Para `useStudentRecords.ts`, `useSchoolDays.ts`, `useBimesterPeriods.ts`

**ANTES**:
```typescript
import { AcademicYearService } from '@/services/supabase/academicYearService';
const yearData = await AcademicYearService.getAcademicYearComplete(year);
```

**DEPOIS**:
```typescript
import { useAcademicYearComplete } from '@/hooks/api';
const { academicYear, loading } = useAcademicYearComplete(year);
```

**Desafio**: Hooks que fazem `await` em `useEffect` precisam ser refatorados.

**Solução**:
- Substituir `useEffect` + `async/await` por hooks da API que já gerenciam estado
- Ou usar `fetch` direto dentro do `useEffect` (sem services)

#### Para `useStudentAbsences.ts`

**ANTES**:
```typescript
import { AbsenceService } from '@/services/supabase/absenceService';
const absences = await AbsenceService.getStudentAbsences(studentId);
```

**DEPOIS**:
```typescript
import { useAbsences } from '@/hooks/api';
const { absences, loading } = useAbsences({ student_id: studentId });
```

---

### Fase 6.2: Hooks Auxiliares

#### `useWhatsAppStatusPolling.ts`

**ANTES**:
```typescript
import { InteractionService } from '@/services/supabase/interactionService';
await InteractionService.updateInteraction(id, { whatsappStatus: newStatus });
```

**DEPOIS**:
```typescript
// Usar fetch direto para polling (mais leve)
const token = await auth.currentUser?.getIdToken();
await fetch(`/api/interactions/${id}`, {
  method: 'PUT',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ whatsapp_status: newStatus }),
});
```

#### `useContactsManagement.ts`

**ANTES**:
```typescript
import { InteractionService } from '@/services/supabase/interactionService';
await InteractionService.createInteraction(studentId, data);
```

**DEPOIS**:
```typescript
const token = await auth.currentUser?.getIdToken();
await fetch('/api/interactions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ student_id: studentId, ...data }),
});
```

---

### Fase 6.3: Componentes Tasks

#### `TaskDashboard.tsx` e `TaskManager.tsx`

**Abordagem**: Extrair lógica para custom hook ou usar `fetch` direto

**ANTES**:
```typescript
import { InteractionService } from '@/services/supabase/interactionService';
await InteractionService.createInteraction(studentId, { ... });
```

**DEPOIS - Opção 1** (hook):
```typescript
import { useCreateInteraction } from '@/hooks/api';
const createInteraction = useCreateInteraction();
await createInteraction.mutate({ student_id: studentId, ... });
```

**DEPOIS - Opção 2** (fetch direto):
```typescript
const token = await auth.currentUser?.getIdToken();
await fetch('/api/interactions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ student_id: studentId, ... }),
});
```

---

## 📊 Estimativa de Esforço

| Fase | Arquivos | Complexidade | Tempo Estimado |
|------|----------|--------------|----------------|
| 6.1 - Hooks Attendance | 4 | Alta | 2h |
| 6.2 - Hooks Auxiliares | 2 | Média | 45min |
| 6.3 - Componentes Tasks | 2 | Baixa | 45min |
| 6.4 - Validações | - | - | 30min |
| 6.5 - Cleanup | 1 | - | 5min |
| **TOTAL** | **9** | **Média-Alta** | **~4h** |

---

## 🗺️ Plano de Execução Detalhado

### Fase 6.1: Hooks de Attendance (2h)

#### Passo 1: Analisar dependências
- [ ] Verificar quais hooks da API já existem
- [ ] Mapear calls de services → endpoints API

#### Passo 2: Migrar `useBimesterPeriods.ts`
- [ ] Substituir `AcademicYearService.getAcademicYearComplete()` por `useAcademicYearComplete()`
- [ ] Atualizar lógica para usar dados do hook
- [ ] Testar funcionamento

#### Passo 3: Migrar `useSchoolDays.ts`
- [ ] Substituir `AcademicYearService.getAcademicYearComplete()` por `useAcademicYearComplete()`
- [ ] Atualizar lógica de cálculo de dias letivos
- [ ] Testar funcionamento

#### Passo 4: Migrar `useStudentAbsences.ts`
- [ ] Substituir `AbsenceService.getStudentAbsences()` por `useAbsences()`
- [ ] Atualizar property mapping
- [ ] Testar funcionamento

#### Passo 5: Migrar `useStudentRecords.ts` (mais complexo)
- [ ] Substituir `AbsenceService.getStudentAbsences()` por `useAbsences()`
- [ ] Substituir `AcademicYearService.getAcademicYearComplete()` por `useAcademicYearComplete()`
- [ ] Substituir `StudentDataService.getStudents()` por fetch ou hook
- [ ] Atualizar property mapping
- [ ] Testar funcionamento

---

### Fase 6.2: Hooks Auxiliares (45min)

#### Passo 1: Migrar `useWhatsAppStatusPolling.ts`
- [ ] Substituir `InteractionService.updateInteraction()` por fetch
- [ ] Manter lógica de polling
- [ ] Testar polling funciona

#### Passo 2: Migrar `useContactsManagement.ts`
- [ ] Substituir `InteractionService.createInteraction()` por fetch
- [ ] Substituir `InteractionService.updateInteraction()` por fetch
- [ ] Testar CRUD funciona

---

### Fase 6.3: Componentes Tasks (45min)

#### Passo 1: Migrar `TaskDashboard.tsx`
- [ ] Substituir `InteractionService.createInteraction()` por fetch
- [ ] Testar criação de interação funciona

#### Passo 2: Migrar `TaskManager.tsx`
- [ ] Substituir `InteractionService.createInteraction()` por fetch
- [ ] Testar criação de interação funciona

---

### Fase 6.4: Validações (30min)

- [ ] `npm run type-check` - 0 erros de projeto
- [ ] `npm run build` - Build sem erros
- [ ] Testar página `/controlar-faltas` no browser
- [ ] Testar página `/gerenciador-tarefas` no browser

---

### Fase 6.5: Cleanup (5min)

- [ ] Deletar `src/app/telefones/page_backup.tsx`
- [ ] Verificar nenhum import de `@/services/supabase` no frontend

---

## ✅ Checklist de Validação

### Antes da Migração
- [ ] Backup dos arquivos originais (`.bak`)
- [ ] Confirmar hooks da API existem
- [ ] Confirmar endpoints da API funcionam

### Durante a Migração
- [ ] Type-check após cada arquivo migrado
- [ ] Commits incrementais

### Após a Migração
- [ ] 0 imports de `@/services/supabase` em `src/app`, `src/components`, `src/hooks`
- [ ] Type-check passando
- [ ] Build passando
- [ ] Testes de browser em páginas críticas

---

## 🎯 Critérios de Sucesso

### Técnicos
- ✅ 0 imports de services Supabase no frontend
- ✅ 0 erros TypeScript de projeto
- ✅ Build sem erros
- ✅ Todas as páginas críticas funcionais

### Arquitetura
- ✅ 100% das chamadas via API REST
- ✅ Nenhuma credencial Supabase exposta no bundle
- ✅ Arquitetura limpa: Frontend → Hooks → API → Services → Supabase

### Negócio
- ✅ Página `/controlar-faltas` funcional
- ✅ Página `/gerenciador-tarefas` funcional
- ✅ Polling de WhatsApp funcional
- ✅ Criação de interações funcional

---

## 📚 Recursos Disponíveis

### Hooks da API (Sprint 4)
- `useAbsences({ student_id, ... })`
- `useAcademicYearComplete(year)`
- `useCreateInteraction()`
- `useUpdateInteraction()`
- `useStudents({ status, ... })`

### Endpoints da API
- `GET /api/absences?student_id=...`
- `GET /api/academic-years/:year/complete`
- `POST /api/interactions`
- `PUT /api/interactions/:id`
- `GET /api/students?status=...`

### Helper Function (já criado na Fase 5)
```typescript
const apiCall = useCallback(async (endpoint: string, options?: RequestInit) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado");

  const token = await user.getIdToken();
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro na API' }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  return response.json();
}, [auth]);
```

---

**Status**: ⚠️ **PRONTO PARA INICIAR**

**Responsável**: Claude (Fase 6)

**Próxima etapa**: Migrar hooks de attendance (começar por `useBimesterPeriods.ts` - o mais simples)
