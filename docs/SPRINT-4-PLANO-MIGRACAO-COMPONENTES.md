# 🎯 SPRINT 4 - PLANO DE MIGRAÇÃO DE COMPONENTES (ELIMINAR SUPABASE DIRETO NO FRONTEND)

**Data de Criação**: 2025-10-17
**Última Atualização**: 2025-10-17 (Fase 4 Concluída)
**Status**: ✅ **CONCLUÍDO**
**Objetivo**: Garantir que **NENHUM** componente/hook do frontend faça chamadas diretas ao Supabase

---

## 🎉 SPRINT 4 - STATUS FINAL

### ✅ Fase 1 - API Routes (CONCLUÍDA)
- Criação de 10 endpoints REST completos
- Documentação: `docs/SPRINT-2-COMPLETO-FINAL.md`

### ✅ Fase 2 - Hooks Customizados (CONCLUÍDA)
- Criação de 10 módulos de hooks
- Documentação: `docs/SPRINT-3-HOOKS-CONCLUIDO.md`

### ✅ Fase 3 - Migração de Componentes (CONCLUÍDA)
- 4 páginas principais migradas
- Documentação: `docs/SPRINT-4-FASE-3-CONCLUIDA.md`

### ✅ Fase 4 - Finalização (CONCLUÍDA)
- 9 services marcados como `@deprecated`
- Documentação final criada
- Validação completa executada

**Detalhes**: Ver `docs/SPRINT-4-CONCLUIDO.md` para resumo executivo completo.

---

## 📋 PLANO ORIGINAL (HISTÓRICO)

---

## 📊 ANÁLISE ATUAL

### Situação Atual
Após Sprint 3, temos:
- ✅ **7/7 APIs REST** criadas (Sprint 2)
- ✅ **34 hooks customizados** criados (Sprint 3)
- ❌ **~15 arquivos** ainda usando Supabase diretamente no frontend
- ❌ **6 serviços legados** em `src/services/supabase/` que precisam de APIs REST

### Risco Atual
- 🔴 **Alto**: Componentes fazendo chamadas diretas ao Supabase
- 🔴 **Alto**: Credenciais Supabase expostas no bundle do cliente
- 🟡 **Médio**: Inconsistência entre hooks novos (Sprint 3) e serviços legados
- 🟡 **Médio**: Difícil manutenção (duas formas de buscar dados)

---

## 🎯 OBJETIVO DA SPRINT 4

**Meta Principal**: Eliminar **100%** das chamadas diretas ao Supabase no frontend.

**Resultado Esperado**:
```
Frontend (React) ← APENAS hooks da Sprint 3
    ↓
API Routes (Sprint 2) ← APENAS eles chamam Supabase
    ↓
Supabase Database
```

---

## 📁 MAPEAMENTO COMPLETO - O QUE PRECISA SER MIGRADO

### 1. HOOKS LEGADOS (3 arquivos - DEPRECAR)

#### 1.1. `src/hooks/useSupabase.ts`
**Status**: 🔴 DEPRECAR
**Substituir por**: Hooks específicos da Sprint 3
**Usado em**:
- `src/app/cadastrar-ano-letivo/page.tsx`
- `src/app/relatorio-bolsa-familia/page.tsx`
- `src/components/cards/DayOfWeekDistributionCard.tsx`

**Plano de Migração**:
```typescript
// ANTES (useSupabase)
const { data, loading, error } = useSupabase('students', {
  filters: { school_year: '2025' }
});

// DEPOIS (Hook específico da Sprint 3)
import { useStudents } from '@/hooks/api';

const { students, loading, error } = useStudents({
  school_year: '2025'
});
```

**Estimativa**: 1 hora (3 arquivos)

---

#### 1.2. `src/hooks/useSupabaseDoc.ts`
**Status**: 🔴 DEPRECAR
**Substituir por**: Hooks específicos da Sprint 3
**Usado em**:
- `src/app/utils.ts`
- Possivelmente outros componentes

**Plano de Migração**:
```typescript
// ANTES (useSupabaseDoc)
const { data, loading } = useSupabaseDoc('students', studentId);

// DEPOIS (Hook específico)
import { useStudent } from '@/hooks/api';

const { student, loading } = useStudent(studentId);
```

**Estimativa**: 30 min

---

#### 1.3. `src/hooks/attendance/useDuplicateAbsences.ts`
**Status**: 🟡 REFATORAR
**Problema**: Usa `supabase.from('student_absences')` direto
**Substituir por**: API REST `/api/absences` (já existe - Sprint 2)

**Plano de Migração**:
```typescript
// ANTES (Supabase direto)
import { supabase } from '@/lib/supabaseClient';

const { data } = await supabase
  .from('student_absences')
  .select('*')
  .eq('student_id', studentId);

// DEPOIS (Hook da Sprint 3)
import { useAbsences } from '@/hooks/api';

const { absences, loading } = useAbsences({
  student_id: studentId
});
```

**Estimativa**: 1 hora

---

### 2. SERVIÇOS LEGADOS EM `src/services/supabase/` (6 arquivos)

#### 2.1. `absenceControlService.ts`
**Status**: 🔴 PRECISA DE API REST NOVA
**Tabela**: `absence_control`
**Usado em**:
- `src/app/cadastrar-ano-letivo/page.tsx`
- Componentes de dashboard

**Ação Necessária**:
1. **Criar API REST**: `/api/absence-control` (CRUD completo)
2. **Criar Hook**: `useAbsenceControl.ts` (~300 linhas)
3. **Migrar componentes**: Usar novo hook

**Métodos a Migrar** (5):
- `getControlsByYear(year)` → `useAbsenceControls({ academic_year: year })`
- `getControlByBimester(year, bimester)` → `useAbsenceControl({ year, bimester })`
- `createControl(data)` → `useCreateAbsenceControl()`
- `updateControl(id, data)` → `useUpdateAbsenceControl()`
- `deleteControl(id)` → `useDeleteAbsenceControl()`

**Estimativa**: 3 horas (API + Hook + Migração)

---

#### 2.2. `academicYearService.ts`
**Status**: 🔴 PRECISA DE API REST NOVA
**Tabela**: `academic_years`
**Usado em**:
- `src/app/cadastrar-ano-letivo/page.tsx`
- Sistema de controle de anos letivos

**Ação Necessária**:
1. **Criar API REST**: `/api/academic-years` (CRUD completo)
2. **Criar Hook**: `useAcademicYears.ts` (~250 linhas)
3. **Migrar componentes**: Usar novo hook

**Métodos a Migrar** (6):
- `getAcademicYear(year)` → `useAcademicYear(year)`
- `getAllAcademicYears()` → `useAcademicYears()`
- `createAcademicYear(data)` → `useCreateAcademicYear()`
- `updateAcademicYear(year, data)` → `useUpdateAcademicYear()`
- `deleteAcademicYear(year)` → `useDeleteAcademicYear()`
- `getCurrentAcademicYear()` → `useCurrentAcademicYear()`

**Estimativa**: 3 horas (API + Hook + Migração)

---

#### 2.3. `absenceService.ts`
**Status**: 🟡 PARCIALMENTE MIGRADO
**Tabela**: `student_absences`
**API Existente**: ✅ `/api/absences` (já criada - Sprint 2)
**Hook Existente**: ✅ `useAbsences.ts` (já existe em `src/hooks/api/`)

**Ação Necessária**:
1. ~~Criar API~~ (JÁ EXISTE)
2. ~~Criar Hook~~ (JÁ EXISTE)
3. **Migrar componentes**: Substituir `absenceService` por hook

**Componentes a Migrar**:
- `src/components/attendance/RegisteredAbsencesCard.tsx`
- `src/components/RegisteredAbsencesCard.tsx`
- `src/app/monitorar-faltas-consecutivas/page.tsx`

**Plano de Migração**:
```typescript
// ANTES
import { AbsenceService } from '@/services/supabase/absenceService';

const absences = await AbsenceService.getByStudent(studentId);

// DEPOIS
import { useAbsences } from '@/hooks/api';

const { absences, loading } = useAbsences({
  student_id: studentId
});
```

**Estimativa**: 2 horas (Migração de componentes)

---

#### 2.4. `interactionService.ts`
**Status**: ✅ JÁ MIGRADO
**API Existente**: ✅ `/api/interactions` (Sprint 2)
**Hook Existente**: ✅ `useInteractions` (Sprint 3 - useOthers.ts)

**Ação Necessária**:
1. ~~Criar API~~ (JÁ EXISTE)
2. ~~Criar Hook~~ (JÁ EXISTE)
3. **Migrar componentes**: Substituir `interactionService` por hook

**Componentes a Migrar**:
- `src/app/relatorio-interacoes/page.tsx`
- Componentes de interações familiares

**Plano de Migração**:
```typescript
// ANTES
import { InteractionService } from '@/services/supabase/interactionService';

const interactions = await InteractionService.getByStudent(studentId);

// DEPOIS
import { useInteractions } from '@/hooks/api';

const { interactions, loading } = useInteractions({
  estudanteId: studentId
});
```

**Estimativa**: 1 hora (Migração de componentes)

---

#### 2.5. `resolvedCasesService.ts`
**Status**: 🔴 PRECISA DE API REST NOVA
**Tabela**: `resolved_cases` (?)
**Usado em**: Sistema de casos resolvidos (tarefas?)

**Análise Necessária**:
- ⚠️ **Verificar se tabela `resolved_cases` existe no Supabase**
- ⚠️ **Verificar se pode ser consolidado com `user_tasks`**
- ⚠️ **Se for legado, pode ser descontinuado**

**Ação Necessária** (se necessário):
1. **Criar API REST**: `/api/resolved-cases`
2. **Criar Hook**: `useResolvedCases.ts`
3. **Migrar componentes**

**Estimativa**: 3 horas (se necessário) | 0 horas (se descontinuado)

---

#### 2.6. `automationExecutionService.ts`
**Status**: 🔴 PRECISA DE API REST NOVA
**Tabela**: `automation_executions`
**Usado em**: Sistema de automação (logs de execução)

**Ação Necessária**:
1. **Criar API REST**: `/api/automation-executions` (CRUD completo)
2. **Criar Hook**: `useAutomationExecutions.ts` (~200 linhas)
3. **Migrar componentes**: Usar novo hook

**Métodos a Migrar** (3):
- `getExecutions(filters)` → `useAutomationExecutions(filters)`
- `createExecution(data)` → `useCreateAutomationExecution()`
- `getExecutionsByType(type)` → `useAutomationExecutions({ type })`

**Estimativa**: 2 horas (API + Hook + Migração)

---

### 3. SERVIÇOS WHATSAPP LEGADOS (2 arquivos)

#### 3.1. `src/services/whatsapp/interactionStatusService.ts`
**Status**: 🟡 ANALISAR
**Problema**: Pode usar Supabase direto

**Ação Necessária**:
1. Verificar se usa Supabase direto
2. Se sim, migrar para usar `/api/interactions`

**Estimativa**: 30 min (análise) + 1 hora (migração se necessário)

---

#### 3.2. `src/services/whatsapp/messageStatusService.ts`
**Status**: 🟡 ANALISAR
**Problema**: Pode usar Supabase direto

**Ação Necessária**:
1. Verificar se usa Supabase direto
2. Se sim, migrar para usar `/api/messages/history`

**Estimativa**: 30 min (análise) + 1 hora (migração se necessário)

---

### 4. UTILITÁRIOS (1 arquivo)

#### 4.1. `src/utils/studentIdResolver.ts`
**Status**: 🟡 REFATORAR
**Problema**: Usa `supabase.from('students')` direto

**Plano de Migração**:
```typescript
// ANTES
import { supabase } from '@/lib/supabaseClient';

const { data } = await supabase
  .from('students')
  .select('id')
  .eq('student_id', firebaseUid)
  .single();

// DEPOIS (usar API)
const response = await fetch(`/api/students?student_id=${firebaseUid}&limit=1`, {
  headers: { Authorization: `Bearer ${token}` }
});
const { data } = await response.json();
const internalId = data[0]?.id;
```

**Estimativa**: 1 hora

---

### 5. OUTROS SERVIÇOS (1 arquivo)

#### 5.1. `src/services/studentDataService.ts`
**Status**: 🟢 HYBRID (Firebase + Supabase)
**Problema**: Usa Supabase direto para algumas operações

**Análise**:
- ⚠️ **Dual-write** (Firebase V2/V3 + Supabase)
- ⚠️ Precisa continuar usando Supabase para sincronização
- ✅ **Parte da lógica dual-write, PODE usar Supabase direto**

**Ação Necessária**:
- 🟢 **MANTER COMO ESTÁ** (é serviço backend, não frontend)
- 🟢 Componentes devem usar hooks, não este serviço diretamente

**Estimativa**: 0 horas (já está correto)

---

## 📋 PLANO DE EXECUÇÃO POR FASES

### FASE 1: APIs REST Faltantes (8-10 horas)

**Prioridade**: 🔴 ALTA

1. **Criar `/api/absence-control`** (2h)
   - CRUD completo
   - Validação Zod
   - Filtros por ano/bimestre

2. **Criar `/api/academic-years`** (2h)
   - CRUD completo
   - Validação Zod
   - getCurrentAcademicYear endpoint

3. **Criar `/api/automation-executions`** (1.5h)
   - CRUD completo
   - Filtros por tipo/status
   - Logs de automação

4. **Analisar `resolved_cases`** (30min)
   - Verificar se tabela existe
   - Decidir se consolida com `user_tasks` ou descontinua

5. **Criar `/api/resolved-cases` (se necessário)** (2h)
   - CRUD completo
   - Ou consolidar com tasks

---

### FASE 2: Hooks Customizados (6-8 horas)

**Prioridade**: 🔴 ALTA

1. **Criar `useAbsenceControl.ts`** (2h)
   - 5 hooks (CRUD + getByBimester)
   - JSDoc completo
   - Seguir padrão Sprint 3

2. **Criar `useAcademicYears.ts`** (2h)
   - 6 hooks (CRUD + getCurrentYear)
   - JSDoc completo
   - Seguir padrão Sprint 3

3. **Criar `useAutomationExecutions.ts`** (1.5h)
   - 3 hooks (Get, Create, Filter)
   - JSDoc completo
   - Seguir padrão Sprint 3

4. **Criar `useResolvedCases.ts` (se necessário)** (1.5h)
   - CRUD completo
   - Ou usar `useTasks` existente

5. **Atualizar `src/hooks/api/index.ts`** (30min)
   - Barrel export dos novos hooks

---

### FASE 3: Migração de Componentes (8-12 horas)

**Prioridade**: 🟡 MÉDIA

#### 3.1. Páginas (6h)

1. **`src/app/cadastrar-ano-letivo/page.tsx`** (2h)
   - Substituir `useSupabase` → `useAcademicYears`
   - Substituir `absenceControlService` → `useAbsenceControl`
   - Testar CRUD completo

2. **`src/app/relatorio-bolsa-familia/page.tsx`** (1h)
   - Substituir `useSupabase` → `useStudents`
   - Testar filtros

3. **`src/app/relatorio-interacoes/page.tsx`** (1h)
   - Substituir `interactionService` → `useInteractions`
   - Testar busca e filtros

4. **`src/app/monitorar-faltas-consecutivas/page.tsx`** (1h)
   - Substituir `absenceService` → `useAbsences`
   - Testar lógica de faltas consecutivas

5. **`src/app/telefones/page_backup.tsx`** (30min)
   - Analisar se ainda é usado
   - Se não, deletar

6. **`src/app/utils.ts`** (30min)
   - Refatorar para usar hooks ou mover lógica

#### 3.2. Componentes (4h)

1. **`src/components/attendance/RegisteredAbsencesCard.tsx`** (1h)
   - Substituir `absenceService` → `useAbsences`
   - Testar exibição de faltas

2. **`src/components/RegisteredAbsencesCard.tsx`** (1h)
   - Mesmo do anterior (duplicado?)
   - Consolidar se necessário

3. **`src/components/cards/DayOfWeekDistributionCard.tsx`** (1h)
   - Substituir `useSupabase` → `useAbsences`
   - Testar gráfico de distribuição

4. **`src/components/tasks/TaskDashboard.tsx`** (30min)
   - Verificar se já usa hooks
   - Migrar se necessário

5. **`src/components/tasks/TaskManager.tsx`** (30min)
   - Verificar se já usa hooks
   - Migrar se necessário

#### 3.3. Hooks de Attendance (2h)

1. **`src/hooks/attendance/useDuplicateAbsences.ts`** (1h)
   - Refatorar para usar `useAbsences`
   - Manter lógica de detecção de duplicatas
   - Remover Supabase direto

2. **Testar hooks de attendance** (1h)
   - Verificar integração completa
   - Garantir compatibilidade

---

### FASE 4: Limpeza e Descontinuação (2-3 horas)

**Prioridade**: 🟢 BAIXA

1. **Deprecar `useSupabase.ts`** (30min)
   - Marcar como @deprecated
   - Adicionar warning no console
   - Documentar migração

2. **Deprecar `useSupabaseDoc.ts`** (30min)
   - Marcar como @deprecated
   - Adicionar warning no console
   - Documentar migração

3. **Deprecar serviços em `src/services/supabase/`** (1h)
   - Marcar como @deprecated
   - Manter temporariamente para compatibilidade
   - Planejar remoção futura (Sprint 5)

4. **Criar guia de migração** (1h)
   - Documentar mudanças
   - Before/After examples
   - FAQ de migração

---

## 📊 ESTIMATIVAS TOTAIS

### Por Fase

| Fase | Descrição | Tempo Estimado | Prioridade |
|------|-----------|----------------|------------|
| **Fase 1** | APIs REST Faltantes | 8-10h | 🔴 Alta |
| **Fase 2** | Hooks Customizados | 6-8h | 🔴 Alta |
| **Fase 3** | Migração de Componentes | 8-12h | 🟡 Média |
| **Fase 4** | Limpeza e Descontinuação | 2-3h | 🟢 Baixa |
| **TOTAL** | | **24-33h** | |

### Por Tipo de Trabalho

| Tipo | Horas |
|------|-------|
| Backend (APIs) | 8-10h (30%) |
| Frontend (Hooks) | 6-8h (25%) |
| Componentes | 8-12h (35%) |
| Documentação | 2-3h (10%) |

---

## ✅ CRITÉRIOS DE SUCESSO

### Técnicos

- [ ] **0 imports** de `@/lib/supabaseClient` em componentes/hooks do frontend
- [ ] **0 chamadas** diretas ao Supabase fora de `/api/*`
- [ ] **100% dos componentes** usando hooks da Sprint 3/4
- [ ] **0 erros** de TypeScript
- [ ] **0 warnings** de hooks deprecados (após cleanup)
- [ ] **Todos os testes** passando

### Funcionais

- [ ] **Todas as páginas** funcionando normalmente
- [ ] **Todos os componentes** carregando dados corretamente
- [ ] **Performance** mantida ou melhorada
- [ ] **UX** mantida (loading states, error handling)

### Arquiteturais

- [ ] **Arquitetura clara**: Frontend → Hooks → APIs → Supabase
- [ ] **Consistência**: Todos usam mesmo padrão
- [ ] **Documentação**: JSDoc em todos os novos hooks
- [ ] **Manutenibilidade**: Código limpo e organizado

---

## 🚨 RISCOS E MITIGAÇÕES

### Risco 1: Quebrar funcionalidades existentes
**Probabilidade**: Média
**Impacto**: Alto
**Mitigação**:
- Migrar um componente por vez
- Testar cada migração antes de prosseguir
- Manter serviços legados marcados como @deprecated (não deletar imediatamente)
- Criar branch separada para Sprint 4

### Risco 2: Performance piorar
**Probabilidade**: Baixa
**Impacto**: Médio
**Mitigação**:
- Medir performance antes/depois
- Usar React Profiler
- Implementar caching se necessário
- Otimizar queries nas APIs

### Risco 3: Descobrir dependências não mapeadas
**Probabilidade**: Média
**Impacto**: Médio
**Mitigação**:
- Fazer análise detalhada antes de começar (esta sprint planning)
- Usar TypeScript errors como guia
- Testar em staging antes de produção
- Ter rollback plan pronto

### Risco 4: Tempo estimado insuficiente
**Probabilidade**: Média
**Impacto**: Baixo
**Mitigação**:
- Trabalhar em fases (pode pausar entre fases)
- Priorizar por impacto (Fase 1 e 2 são críticas)
- Fase 3 e 4 podem ser incrementais

---

## 📝 CHECKLIST DE EXECUÇÃO

### Antes de Começar
- [ ] Criar branch `sprint-4-migrate-components`
- [ ] Backup do código atual
- [ ] Documentar estado atual (screenshots, métricas)
- [ ] Configurar ambiente de testes

### Durante Fase 1 (APIs)
- [ ] Criar cada API seguindo padrão Sprint 2
- [ ] Validação Zod completa
- [ ] Error handling padronizado
- [ ] Testar cada endpoint com Postman/Thunder Client
- [ ] Documentar endpoints

### Durante Fase 2 (Hooks)
- [ ] Criar cada hook seguindo padrão Sprint 3
- [ ] JSDoc completo com exemplos
- [ ] Type-safe TypeScript
- [ ] Testar hooks isoladamente
- [ ] Atualizar barrel export

### Durante Fase 3 (Componentes)
- [ ] Migrar um componente por vez
- [ ] Testar após cada migração
- [ ] Verificar loading states
- [ ] Verificar error handling
- [ ] Comparar comportamento antes/depois
- [ ] Commit após cada componente migrado

### Durante Fase 4 (Cleanup)
- [ ] Marcar código legado como @deprecated
- [ ] Adicionar warnings no console (dev mode)
- [ ] Criar guia de migração
- [ ] Atualizar CLAUDE.md
- [ ] Criar documentação Sprint 4

### Ao Final
- [ ] `npm run type-check` - 0 erros
- [ ] `npm run lint` - 0 erros críticos
- [ ] `npm run build` - build com sucesso
- [ ] Testes manuais completos
- [ ] Performance check
- [ ] Criar PR com resumo detalhado

---

## 📚 DOCUMENTAÇÃO A CRIAR

1. **SPRINT-4-CONCLUIDO.md** (ao final)
   - Resumo executivo
   - Métricas antes/depois
   - Componentes migrados
   - Hooks criados
   - Lições aprendidas

2. **GUIA-MIGRACAO-HOOKS.md**
   - Before/After para cada padrão
   - FAQ de migração
   - Troubleshooting comum

3. **API-REFERENCE-COMPLETE.md**
   - Todas as APIs (Sprint 2 + Sprint 4)
   - Todos os hooks (Sprint 3 + Sprint 4)
   - Exemplos de uso

4. **ARCHITECTURE-FINAL.md**
   - Diagrama da arquitetura final
   - Fluxo de dados completo
   - Boas práticas aplicadas

---

## 🎯 PRÓXIMOS PASSOS APÓS SPRINT 4

### Sprint 5: Otimizações (Opcional)
1. **React Query** - Cache automático, invalidation, retry
2. **Optimistic Updates** - UX instantânea
3. **Infinite Scroll** - Substituir paginação clássica
4. **Service Worker** - Offline support

### Sprint 6: Testes (Opcional)
1. **Unit Tests** - Jest + Testing Library
2. **Integration Tests** - Componente + Hook + API
3. **E2E Tests** - Cypress/Playwright

### Sprint 7: Performance (Opcional)
1. **Code Splitting** - Lazy loading avançado
2. **Bundle Optimization** - Tree shaking, dead code elimination
3. **Caching Strategy** - Redis, CDN
4. **Monitoring** - Sentry, Analytics

---

## 🏆 RESULTADO ESPERADO

### Antes (Situação Atual)
```
Frontend (Components)
    ↓ useSupabase (genérico)
    ↓ absenceService.getByStudent() (Supabase direto)
    ↓ supabase.from('table').select() (Supabase direto)
Supabase Database
```
❌ Múltiplos caminhos
❌ Inconsistente
❌ Credenciais expostas no bundle

### Depois (Sprint 4 Completa)
```
Frontend (Components)
    ↓ useAbsences({ student_id }) (Hook específico)
    ↓
API Route (/api/absences)
    ↓ Zod validation
    ↓ supabaseAdmin (server-side)
    ↓
Supabase Database
```
✅ Caminho único
✅ Consistente
✅ Credenciais seguras no servidor
✅ Type-safe de ponta a ponta
✅ Fácil manutenção

---

**Status**: 📋 PRONTO PARA EXECUÇÃO
**Próxima Ação**: Aprovar plano e começar Fase 1 (APIs REST)

---

**Documentação gerada**: 2025-10-17
**Versão**: 1.0.0
**Autor**: Claude AI Agent (planejamento detalhado)
