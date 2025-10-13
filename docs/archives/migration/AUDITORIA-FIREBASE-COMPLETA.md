# 🔍 AUDITORIA COMPLETA: Referências ao Firebase

> **Data**: 2025-10-12
> **Objetivo**: Identificar TODAS as referências ao Firebase para migração completa ao Supabase
> **Status**: 🚨 **ATENÇÃO - 348 chamadas Firebase encontradas**

---

## 📊 RESUMO EXECUTIVO

### Estatísticas Gerais
- **Total de arquivos com imports Firebase**: 44 arquivos
- **Total de linhas com chamadas Firestore**: 348 linhas
- **Categorias identificadas**:
  - 🔴 **Crítico**: Código em produção usando Firestore
  - 🟡 **Admin**: Páginas admin (possivelmente deprecadas)
  - 🟢 **Legado**: Services antigos (.firebase/) não usados
  - 🔵 **Firebase Admin**: APIs automation (backend)

---

## 🔴 CRÍTICO - Código em Produção

### 1. Páginas Principais

#### `/monitorar-faltas-consecutivas`
**Arquivo**: `src/app/monitorar-faltas-consecutivas/page.tsx`
**Status**: 🔴 **EM USO - PRECISA MIGRAR**
```typescript
import { collection, getDocs, query, where, doc, getDoc, addDoc, setDoc, deleteDoc } from 'firebase/firestore';
```
**Ação**: Migrar para Supabase

---

#### `/telefones`
**Arquivo**: `src/app/telefones/page.tsx`
**Status**: 🔴 **EM USO - PRECISA MIGRAR**
```typescript
import { collection, getDocs, query, where } from 'firebase/firestore';
```
**Ação**: Migrar para Supabase

---

#### `/cadastrar-ano-letivo`
**Arquivo**: `src/app/cadastrar-ano-letivo/page.tsx`
**Status**: 🔴 **EM USO - PRECISA MIGRAR**
```typescript
import { doc, getDoc, setDoc } from 'firebase/firestore';
```
**Ação**: Migrar para Supabase (já existe no Supabase: `academic_years`)

---

### 2. Componentes

#### `TaskDashboard.tsx`
**Arquivo**: `src/components/tasks/TaskDashboard.tsx`
**Status**: 🔴 **EM USO - PRECISA MIGRAR**
```typescript
import { collection, getDocs, query, where, doc, deleteDoc, writeBatch, addDoc, updateDoc, getDoc } from 'firebase/firestore';
```
**Ação**: Migrar para Supabase (`tasks` table)

---

#### `TaskManager.tsx` (2 arquivos)
**Arquivos**:
- `src/components/tasks/TaskManager.tsx`
- `src/components/TaskManager.tsx`

**Status**: 🔴 **EM USO - PRECISA MIGRAR**
```typescript
import { collection, addDoc, getDocs } from 'firebase/firestore';
```
**Ação**: Migrar para Supabase

---

#### `StudentForm.tsx`
**Arquivo**: `src/components/students/StudentForm.tsx`
**Status**: 🔴 **EM USO - PRECISA MIGRAR**
```typescript
import { doc, getDoc } from 'firebase/firestore';
```
**Ação**: Migrar para Supabase (provavelmente apenas leitura)

---

### 3. Hooks

#### `useStudentAbsences.ts`
**Arquivo**: `src/hooks/attendance/useStudentAbsences.ts`
**Status**: 🔴 **EM USO - PRECISA MIGRAR**
```typescript
import { collection, getDocs } from 'firebase/firestore';
```
**Ação**: ⚠️ **ATENÇÃO** - Este hook deveria usar Supabase!

---

#### `useFirebaseDoc.ts`
**Arquivo**: `src/hooks/useFirebaseDoc.ts`
**Status**: 🔴 **EM USO - PRECISA MIGRAR**
```typescript
import { doc, getDoc, setDoc, onSnapshot, DocumentData } from 'firebase/firestore';
```
**Ação**: Criar `useSupabaseDoc.ts` equivalente

---

#### `useFirebase.ts`
**Arquivo**: `src/hooks/useFirebase.ts`
**Status**: 🔴 **EM USO - PRECISA MIGRAR**
**Ação**: Criar `useSupabase.ts` equivalente

---

#### `useFirebaseCollection.ts`
**Arquivo**: `src/hooks/useFirebaseCollection.ts`
**Status**: 🔴 **EM USO - PRECISA MIGRAR**
```typescript
import { collection, getDocs, query, where, orderBy, limit, onSnapshot, QueryConstraint } from 'firebase/firestore';
```
**Ação**: Criar `useSupabaseCollection.ts` equivalente

---

### 4. Services

#### `taskService.ts`
**Arquivo**: `src/services/taskService.ts`
**Status**: 🔴 **EM USO - PRECISA MIGRAR**
**Ação**: Migrar para Supabase (`tasks` table)

---

#### `whatsappDataService.ts`
**Arquivo**: `src/services/whatsappDataService.ts`
**Status**: 🔴 **EM USO - PRECISA MIGRAR**
```typescript
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { collection, getDocs, query, where, orderBy, limit, getDoc } from 'firebase/firestore';
```
**Ação**: Migrar para Supabase (`whatsapp_messages` table?)

---

#### `messageHistoryService.ts`
**Arquivo**: `src/services/messageHistoryService.ts`
**Status**: 🔴 **EM USO - PRECISA MIGRAR**
```typescript
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
```
**Ação**: ⚠️ **JÁ EXISTE EM SUPABASE** (`whatsappMessageHistory` table)

---

### 5. Utilitários

#### `auditHelpers.ts`
**Arquivo**: `src/utils/auditHelpers.ts`
**Status**: 🟡 **USAR `Date` OU REMOVER**
```typescript
import { Timestamp } from 'firebase/firestore';
```
**Ação**: Substituir `Timestamp` por `Date` ou ISO string

---

#### `softDeleteHelpers.ts`
**Arquivo**: `src/utils/softDeleteHelpers.ts`
**Status**: 🟡 **USAR `Date` OU REMOVER**
```typescript
import { Timestamp } from 'firebase/firestore';
```
**Ação**: Substituir `Timestamp` por `Date` ou ISO string

---

## 🟡 ADMIN - Páginas de Administração

### Possivelmente Deprecadas (Verificar se ainda são usadas)

1. ✅ `src/app/admin/clean-atestados/page.tsx`
2. ✅ `src/app/admin/verificar-v1-interactions/page.tsx`
3. ✅ `src/app/admin/update-pode-receber/page.tsx`
4. ✅ `src/app/admin/migrate-contacts/page.tsx`
5. ✅ `src/app/admin/investigar-todas-interacoes/page.tsx`
6. ✅ `src/app/admin/descobrir-schema-firestore/page.tsx`
7. ✅ `src/app/admin/debug-contacts/page.tsx`
8. ✅ `src/app/admin/backup-dados/page.tsx`

**Ação Recomendada**:
- Se são páginas antigas de migração → **DELETAR**
- Se ainda são usadas → **MIGRAR PARA SUPABASE**

---

## 🔵 FIREBASE ADMIN - Backend APIs

### Automation APIs

#### `process-absences/route.ts`
**Arquivo**: `src/app/api/automation/process-absences/route.ts`
**Status**: 🔵 **FIREBASE ADMIN - BACKEND**
```typescript
import { FieldValue } from 'firebase-admin/firestore';
```
**Uso**: Backend para automation (GitHub Actions)
**Ação**: ⚠️ **VERIFICAR** - Pode estar usando Firebase Admin para escrever no Firestore

---

#### Outros automation:
- `src/app/api/automation/resume/route.ts`
- `src/app/api/automation/watchdog/route.ts`

**Ação**: Verificar se usam Firestore Admin (backend)

---

#### `automationOrchestrator.ts`
**Arquivo**: `src/services/automationOrchestrator.ts`
**Status**: 🔵 **FIREBASE ADMIN**
```typescript
import { FieldValue } from 'firebase-admin/firestore';
```
**Ação**: Migrar para Supabase Admin Client

---

### API Routes Admin

1. `src/app/api/tasks/create/route.ts` - 🔴 **MIGRAR**
2. `src/app/api/migrate-contacts/route.ts` - 🟡 **DELETAR?**
3. `src/app/api/admin/normalize-contacts/route.ts` - 🟡 **DELETAR?**
4. `src/app/api/admin/migration-whatsapp-*` (3 arquivos) - 🟡 **DELETAR?**
5. `src/app/api/admin/clean-duplicate-atestados/route.ts` - 🟡 **DELETAR?**

---

### API Routes de Debug/Produção

1. `src/app/api/students/consecutive-absences/route.ts` - 🔴 **MIGRAR**
2. `src/app/api/debug-emilly/route.ts` - 🟡 **DELETAR?**
3. `src/app/api/debug-contacts/route.ts` - 🟡 **DELETAR?**

---

## 🟢 LEGADO - Services Firebase Antigos

### Pasta `src/services/firebase/`

Estes services **não deveriam estar sendo usados**:

1. ✅ `attendanceService.ts` - **SUBSTITUÍDO** por `src/services/supabase/absenceService.ts`
2. ✅ `studentService.ts` - **SUBSTITUÍDO** por `StudentDataService`
3. ✅ `studentServiceV2.ts` - **SUBSTITUÍDO** por `StudentDataService`
4. ✅ `BaseFirestoreService.ts` - **BASE LEGADA**

**Ação**: 🗑️ **DELETAR TODA A PASTA** `src/services/firebase/` (após confirmação)

---

## 📋 PLANO DE AÇÃO

### Fase 1: Verificação (1-2 horas)

1. **Confirmar arquivos em uso**:
   ```bash
   # Verificar quais páginas admin ainda são acessadas
   grep -r "href.*admin" src/
   ```

2. **Confirmar imports ativos**:
   ```bash
   # Ver se services antigos são importados
   grep -r "from '@/services/firebase" src/
   ```

3. **Listar hooks Firebase usados**:
   ```bash
   grep -r "useFirebase\|useFirebaseDoc\|useFirebaseCollection" src/
   ```

---

### Fase 2: Migração Crítica (8-12 horas)

#### Prioridade 1 - Hooks (Base para tudo)
- [ ] Migrar `useFirebaseDoc` → `useSupabaseDoc`
- [ ] Migrar `useFirebase` → `useSupabase`
- [ ] Migrar `useFirebaseCollection` → `useSupabaseCollection`
- [ ] ⚠️ **CRÍTICO**: Migrar `useStudentAbsences` (ainda usa Firebase!)

#### Prioridade 2 - Services
- [ ] Migrar `taskService.ts` → Supabase
- [ ] Migrar `whatsappDataService.ts` → Supabase
- [ ] Verificar `messageHistoryService.ts` (pode já estar em Supabase)

#### Prioridade 3 - Páginas Principais
- [ ] Migrar `/monitorar-faltas-consecutivas`
- [ ] Migrar `/telefones`
- [ ] Migrar `/cadastrar-ano-letivo`

#### Prioridade 4 - Componentes
- [ ] Migrar `TaskDashboard.tsx`
- [ ] Migrar `TaskManager.tsx` (ambos)
- [ ] Migrar `StudentForm.tsx`

#### Prioridade 5 - APIs
- [ ] Migrar `/api/tasks/create`
- [ ] Migrar `/api/students/consecutive-absences`
- [ ] Migrar APIs automation (se usam Firestore)

---

### Fase 3: Limpeza (2-3 horas)

- [ ] Deletar pasta `src/services/firebase/`
- [ ] Deletar páginas admin antigas (se não usadas)
- [ ] Deletar APIs de migração antigas
- [ ] Substituir `Timestamp` por `Date` em utils

---

## 🚨 ATENÇÃO ESPECIAL

### `useStudentAbsences.ts` - AINDA USA FIREBASE!

**Arquivo**: `src/hooks/attendance/useStudentAbsences.ts`

Este hook faz parte do módulo de attendance mas **ainda usa Firebase**:
```typescript
import { collection, getDocs } from 'firebase/firestore';
```

**Impacto**: Se `/controlar-faltas` usa este hook, pode estar **buscando dados do Firebase em paralelo com Supabase**!

**Ação Urgente**: Verificar se este hook é usado e migrar para Supabase.

---

## 📊 ESTIMATIVA TOTAL

### Esforço de Migração Completa

| Categoria | Arquivos | Horas Estimadas |
|-----------|----------|-----------------|
| Hooks | 4 | 4h |
| Services | 3 | 6h |
| Páginas | 3 | 4h |
| Componentes | 3 | 3h |
| APIs | 5 | 5h |
| Limpeza | - | 2h |
| **TOTAL** | **~18 arquivos críticos** | **~24 horas** |

---

## ✅ PRÓXIMOS PASSOS RECOMENDADOS

### Opção 1: Migração Completa (Recomendado)
- Dedicar 3-4 dias para migrar **TUDO** para Supabase
- Deletar Firebase completamente
- Sistema 100% Supabase

### Opção 2: Migração Incremental
1. **Agora**: Migrar apenas hooks críticos (4h)
2. **Semana 1**: Migrar services e páginas principais (10h)
3. **Semana 2**: Migrar APIs e componentes (8h)
4. **Semana 3**: Limpeza final (2h)

### Opção 3: Manter Híbrido (Não Recomendado)
- Manter Firebase para algumas features
- ⚠️ **Risco**: Duplicação de dados, inconsistências, custos duplos

---

## 🎯 RECOMENDAÇÃO FINAL

**Migrar TUDO para Supabase**:
- ✅ Elimina dependência Firebase
- ✅ Reduz custos (1 banco vs 2)
- ✅ Simplifica arquitetura
- ✅ Melhora performance (1 fonte de dados)
- ✅ Facilita manutenção

**Custo**: ~24 horas de desenvolvimento
**Benefício**: Sistema unificado, escalável e mantível

---

**Gerado por**: Claude (Engenheiro Sênior)
**Data**: 2025-10-12
**Status**: 🔍 **AUDITORIA COMPLETA - AGUARDANDO DECISÃO**
