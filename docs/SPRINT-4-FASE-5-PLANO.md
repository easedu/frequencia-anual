# 🔥 SPRINT 4 - Fase 5: Migração Crítica do useStudentProfile

**Data**: 2025-10-17
**Severidade**: 🔴 **CRÍTICA - BLOQUEADOR DE PRODUÇÃO**
**Objetivo**: Migrar `useStudentProfile.ts` para eliminar chamadas diretas ao Supabase

---

## 📋 Problema Identificado

### Browser Console Error
```
GET https://xccjifrggpgevqftwdkx.supabase.co/rest/v1/students 401 (Unauthorized)
Error: No API key found in request
```

### Causa Raiz
O hook `useStudentProfile.ts` (1.557 linhas) ainda importa e usa **6 services legados** diretamente:

| Service | Linha | Uso |
|---------|-------|-----|
| `StudentDataService` | 22 | `getStudents()`, `getStudentById()` |
| `UserProfilesService` | 23 | `getByFirebaseUid()` |
| `AbsenceControlService` | 24 | `getByYear()` |
| `AbsenceService` | 25 | `getStudentAbsences()`, `addAbsence()`, `deleteAbsence()` |
| `MedicalCertificatesService` | 26 | `getByStudentId()`, `create()`, `update()`, `delete()` |
| `StudentSuspensionsService` | 27 | `getByStudentId()`, `create()`, `update()`, `delete()` |
| `InteractionService` | 28 | `getStudentInteractions()`, `createInteraction()`, `updateInteraction()`, `deleteInteraction()` |

### Impacto
- 🔴 **Segurança**: Credenciais Supabase expostas no bundle do cliente
- 🔴 **Produção**: Página `/perfil-estudante` **quebrada** (401 Unauthorized)
- 🔴 **Sprint 4**: Objetivo de 100% **NÃO atingido**

---

## 🎯 Estratégia de Migração

### Princípios
1. ✅ **Incremental**: Migrar service por service
2. ✅ **Segurança**: Validar após cada mudança
3. ✅ **Type-Safety**: Manter tipagem correta
4. ✅ **Performance**: Não degradar UX

### Abordagem

```
ANTES (❌ INSEGURO):
useStudentProfile
    ↓ (import direto)
StudentDataService, AbsenceService, etc.
    ↓ (chamada direta)
Supabase Client (frontend) 🔴 EXPOSTO

DEPOIS (✅ SEGURO):
useStudentProfile
    ↓ (import hooks)
useStudents, useAbsences, etc.
    ↓ (fetch)
API Routes (/api/*)
    ↓ (server-side)
Supabase Services
    ↓
Supabase Client (backend) ✅ PROTEGIDO
```

---

## 📝 Plano de Execução

### Fase 5.1: Students (StudentDataService)

#### Chamadas Identificadas
```typescript
// Linha 303
const allStudentsData = await StudentDataService.getStudents(false, false);

// Linha 359
const studentData = await StudentDataService.getStudentById(studentId);
```

#### Migração
```typescript
// ❌ ANTES
import { StudentDataService } from "@/services/studentDataService";
const allStudentsData = await StudentDataService.getStudents(false, false);

// ✅ DEPOIS
import { useStudents } from "@/hooks/api";
const { students, loading } = useStudents({ status: "ATIVO" });
// Não precisa de await - hook retorna dados síncronos
```

**Arquivos afetados**:
- `src/hooks/useStudentProfile.ts` (linhas 22, 298-320, 351-407)

---

### Fase 5.2: User Profiles (UserProfilesService)

#### Chamadas Identificadas
```typescript
// Linha 167
const userProfile = await UserProfilesService.getByFirebaseUid(user.uid);
```

#### Migração
```typescript
// ❌ ANTES
import { UserProfilesService } from "@/services/supabase/userProfilesService";
const userProfile = await UserProfilesService.getByFirebaseUid(user.uid);

// ✅ DEPOIS
import { useUsers } from "@/hooks/api";
const { users, loading } = useUsers({ firebase_uid: user.uid });
const userProfile = users.length > 0 ? users[0] : null;
```

**Arquivos afetados**:
- `src/hooks/useStudentProfile.ts` (linhas 23, 157-183)

---

### Fase 5.3: Absence Controls (AbsenceControlService)

#### Chamadas Identificadas
```typescript
// Linha 325
const absenceControlData = await AbsenceControlService.getByYear(year);
```

#### Migração
```typescript
// ❌ ANTES
import { AbsenceControlService } from "@/services/supabase/absenceControlService";
const absenceControlData = await AbsenceControlService.getByYear(year);

// ✅ DEPOIS
import { useAbsenceControls } from "@/hooks/api";
const { absenceControls, loading } = useAbsenceControls({ academic_year: year });
```

**Arquivos afetados**:
- `src/hooks/useStudentProfile.ts` (linhas 24, 322-349)

---

### Fase 5.4: Absences (AbsenceService)

#### Chamadas Identificadas
```typescript
// Linha 365
const absencesData = await AbsenceService.getStudentAbsences(studentId);

// Linha 676, 779, 867, 1039, 1114
const supabaseAbsences = await AbsenceService.getStudentAbsences(selectedStudentId);

// Linha 705, 786, 827, 874, etc.
await AbsenceService.deleteAbsence(selectedStudentId, dataFirebase);

// Linha 706, 788, 837, etc.
await AbsenceService.addAbsence({ ... });
```

#### Migração
```typescript
// ❌ ANTES
import { AbsenceService } from "@/services/supabase/absenceService";
const absencesData = await AbsenceService.getStudentAbsences(studentId);

// ✅ DEPOIS
import { useAbsences, useCreateAbsence, useDeleteAbsence } from "@/hooks/api";
const { absences, loading } = useAbsences({ student_id: studentId });
const createAbsence = useCreateAbsence();
const deleteAbsence = useDeleteAbsence();
```

**Arquivos afetados**:
- `src/hooks/useStudentProfile.ts` (linhas 25, 365-366, 676-725, 779-860, 867-892, 1039-1107, 1114-1139)

---

### Fase 5.5: Medical Certificates (MedicalCertificatesService)

#### Chamadas Identificadas
```typescript
// Linha 369
const atestadosData = await MedicalCertificatesService.getByStudentId(studentId);

// Linha 644
const existingAtestados = await MedicalCertificatesService.getByStudentId(selectedStudentId);

// Linha 660
const newCertificate = await MedicalCertificatesService.create({ ... });

// Linha 772
await MedicalCertificatesService.update(editingAtestado.id, { ... });

// Linha 865
await MedicalCertificatesService.delete(atestadoId);
```

#### Migração
```typescript
// ❌ ANTES
import { MedicalCertificatesService } from "@/services/supabase/medicalCertificatesService";
const atestadosData = await MedicalCertificatesService.getByStudentId(studentId);

// ✅ DEPOIS
import { useMedicalCertificates, useCreateMedicalCertificate, useUpdateMedicalCertificate, useDeleteMedicalCertificate } from "@/hooks/api";
const { certificates, loading } = useMedicalCertificates({ student_id: studentId });
const createCertificate = useCreateMedicalCertificate();
const updateCertificate = useUpdateMedicalCertificate();
const deleteCertificate = useDeleteMedicalCertificate();
```

**Arquivos afetados**:
- `src/hooks/useStudentProfile.ts` (linhas 26, 369-377, 644-741, 772-860, 865-892)

---

### Fase 5.6: Suspensions (StudentSuspensionsService)

#### Chamadas Identificadas
```typescript
// Linha 380
const suspensoesData = await StudentSuspensionsService.getByStudentId(studentId);

// Linha 926
const newSuspension = await StudentSuspensionsService.create({ ... });

// Linha 1032
await StudentSuspensionsService.update(editingSuspensao.id, { ... });

// Linha 1112
await StudentSuspensionsService.delete(suspensaoId);
```

#### Migração
```typescript
// ❌ ANTES
import { StudentSuspensionsService } from "@/services/supabase/studentSuspensionsService";
const suspensoesData = await StudentSuspensionsService.getByStudentId(studentId);

// ✅ DEPOIS
import { useSuspensions, useCreateSuspension, useUpdateSuspension, useDeleteSuspension } from "@/hooks/api";
const { suspensions, loading } = useSuspensions({ student_id: studentId });
const createSuspension = useCreateSuspension();
const updateSuspension = useUpdateSuspension();
const deleteSuspension = useDeleteSuspension();
```

**Arquivos afetados**:
- `src/hooks/useStudentProfile.ts` (linhas 27, 380-388, 926-1001, 1032-1107, 1112-1139)

---

### Fase 5.7: Interactions (InteractionService)

#### Chamadas Identificadas
```typescript
// Linha 391
const interactionsData = await InteractionService.getStudentInteractions(studentId);

// Linha 514
await InteractionService.createInteraction(selectedStudentId, { ... });

// Linha 568
await InteractionService.updateInteraction(editingInteraction.id, { ... });

// Linha 593
await InteractionService.deleteInteraction(interactionId);

// Linha 1322
await InteractionService.createInteraction(selectedStudentId, { ... });
```

#### Migração
```typescript
// ❌ ANTES
import { InteractionService } from "@/services/supabase/interactionService";
const interactionsData = await InteractionService.getStudentInteractions(studentId);

// ✅ DEPOIS
import { useInteractions, useCreateInteraction, useUpdateInteraction, useDeleteInteraction } from "@/hooks/api";
const { interactions, loading } = useInteractions({ student_id: studentId });
const createInteraction = useCreateInteraction();
const updateInteraction = useUpdateInteraction();
const deleteInteraction = useDeleteInteraction();
```

**Arquivos afetados**:
- `src/hooks/useStudentProfile.ts` (linhas 28, 391-392, 514-553, 568-588, 593-603, 1322-1360)

---

## ⚠️ Desafios e Soluções

### Desafio 1: Hook dentro de Hook (Rules of Hooks)

**Problema**: `useStudentProfile` já é um hook, não pode usar outros hooks condicionalmente.

**Solução**: Mover lógica para o componente que usa `useStudentProfile`.

#### Opção A: Refatorar para Componente Pai
```typescript
// ❌ ANTES (useStudentProfile.ts)
const fetchAllStudents = async () => {
  const allStudentsData = await StudentDataService.getStudents(false, false);
  setAllStudents(allStudentsData);
};

// ✅ DEPOIS (page.tsx que usa o hook)
function PerfilEstudantePage() {
  const { students } = useStudents({ status: "ATIVO" });
  const studentProfile = useStudentProfile(students); // Passa dados
  // ...
}
```

#### Opção B: Criar Hook Wrapper (RECOMENDADO)
```typescript
// src/hooks/useStudentProfileWithData.ts
export function useStudentProfileWithData() {
  const { students, loading: loadingStudents } = useStudents({ status: "ATIVO" });
  const { absences, loading: loadingAbsences } = useAbsences({});
  const { certificates } = useMedicalCertificates({});
  const { suspensions } = useSuspensions({});
  const { interactions } = useInteractions({});

  // Lógica do useStudentProfile aqui (sem calls assíncronas)
  return {
    students,
    absences,
    certificates,
    suspensions,
    interactions,
    loading: loadingStudents || loadingAbsences,
    // ... outros estados e handlers
  };
}
```

### Desafio 2: Funções Assíncronas (fetchStudentData, etc.)

**Problema**: Hooks não retornam Promises, são síncronos.

**Solução**: Remover `async/await`, usar dados do hook diretamente.

```typescript
// ❌ ANTES
const fetchStudentData = async (studentId: string) => {
  const studentData = await StudentDataService.getStudentById(studentId);
  setStudent(studentData);
};

// ✅ DEPOIS
// Não precisa de função - hook já fornece dados
const { students } = useStudents({ student_id: selectedStudentId });
const student = students.length > 0 ? students[0] : null;

// Se precisar de side-effect:
useEffect(() => {
  if (selectedStudentId && students.length > 0) {
    setStudent(students[0]);
  }
}, [selectedStudentId, students]);
```

### Desafio 3: Refetch após Mutações

**Problema**: Hooks de mutação (create, update, delete) não refetch automaticamente.

**Solução**: Usar callback de sucesso ou state refresh.

```typescript
// ❌ ANTES
await AbsenceService.addAbsence({ ... });
await fetchStudentData(selectedStudentId); // Refetch manual

// ✅ DEPOIS
const createAbsence = useCreateAbsence();
await createAbsence.mutate({ ... }, {
  onSuccess: () => {
    // Invalidar cache ou refetch
    queryClient.invalidateQueries(['absences', selectedStudentId]);
  }
});
```

---

## 📊 Estimativa de Esforço

| Fase | Complexidade | Tempo Estimado | Arquivos |
|------|--------------|----------------|----------|
| 5.1 - Students | Alta | 45min | 1 |
| 5.2 - User Profiles | Baixa | 15min | 1 |
| 5.3 - Absence Controls | Baixa | 15min | 1 |
| 5.4 - Absences | Alta | 1h | 1 |
| 5.5 - Medical Certificates | Média | 45min | 1 |
| 5.6 - Suspensions | Média | 45min | 1 |
| 5.7 - Interactions | Média | 30min | 1 |
| **Validação e Testes** | - | 30min | - |
| **TOTAL** | **Alta** | **~5 horas** | **1 arquivo** |

---

## ✅ Checklist de Validação

Após migração, validar:

- [ ] `npm run type-check` - 0 erros TypeScript
- [ ] `npm run build` - Build sem erros
- [ ] **Browser test**: Acessar `/perfil-estudante`
  - [ ] Buscar estudante por nome
  - [ ] Selecionar estudante
  - [ ] Carregar dados do perfil
  - [ ] Ver histórico de faltas
  - [ ] Ver atestados
  - [ ] Ver suspensões
  - [ ] Ver interações
  - [ ] **Console do navegador**: 0 erros 401
  - [ ] **Network tab**: 0 chamadas diretas ao Supabase

---

## 🎯 Critérios de Sucesso

### Técnicos
- ✅ 0 imports de services legados em `useStudentProfile.ts`
- ✅ 0 chamadas diretas ao Supabase do frontend
- ✅ Página `/perfil-estudante` funciona 100%
- ✅ Type-check e build passam
- ✅ 0 erros no console do navegador

### Negócio
- ✅ Credenciais Supabase **NÃO expostas** no bundle do cliente
- ✅ Página crítica do sistema **funcional**
- ✅ Sprint 4 objetivo de 100% **ATINGIDO**

---

## 📚 Documentação a Atualizar

Após conclusão da Fase 5:

1. **SPRINT-4-CONCLUIDO.md**
   - Atualizar métricas: 4/4 páginas → **5/5 hooks críticos migrados**
   - Status: 95% → **100%**
   - Adicionar seção "Fase 5 - Migração Crítica"

2. **SPRINT-4-ITEM-CRITICO-PENDENTE.md**
   - Marcar como ✅ **RESOLVIDO**
   - Adicionar link para SPRINT-4-FASE-5-CONCLUIDA.md

3. **SPRINT-4-FASE-5-CONCLUIDA.md** (criar)
   - Resumo da migração
   - Padrões aplicados
   - Validações executadas

---

**Status**: ⚠️ **EM EXECUÇÃO**
**Responsável**: Claude (Fase 5)
**Próxima etapa**: Migrar imports e chamadas incrementalmente
