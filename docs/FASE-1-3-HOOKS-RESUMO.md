# 📋 Fase 1.3: Hooks Customizados Centralizados - PLANEJAMENTO

> **Data de Criação**: 2025-01-09
> **Fase**: 1.3 - Centralização e Otimização de Hooks Customizados
> **Status**: 🔄 EM PLANEJAMENTO

---

## 📋 Índice

1. [Visão Geral](#-visão-geral)
2. [Situação Atual](#-situação-atual)
3. [Objetivos](#-objetivos)
4. [Análise de Hooks Existentes](#-análise-de-hooks-existentes)
5. [Problemas Identificados](#-problemas-identificados)
6. [Plano de Ação](#-plano-de-ação)
7. [Cronograma](#-cronograma)
8. [Métricas de Sucesso](#-métricas-de-sucesso)

---

## 🎯 Visão Geral

A **Fase 1.3** tem como objetivo auditar, refatorar e otimizar os hooks customizados do projeto, eliminando duplicações, melhorando performance e estabelecendo padrões claros de desenvolvimento.

### Por que essa fase é importante?

- ✅ Eliminar lógica duplicada em hooks
- ✅ Estabelecer padrões consistentes
- ✅ Melhorar performance com cache e otimizações
- ✅ Facilitar manutenção futura
- ✅ Documentar boas práticas

---

## 📊 Situação Atual

### Inventário de Hooks

```
src/hooks/
├── useAuth.ts                    # Autenticação (20 linhas)
├── useStudents.ts                # Carregar estudantes (42 linhas)
├── useFirebase.ts                # Operações Firebase otimizadas (370 linhas)
├── useFirebaseCollection.ts      # Coleções Firebase (150+ linhas)
├── useFirebaseDoc.ts             # Documentos Firebase (~100 linhas)
├── useAttendanceData.ts          # Dados de frequência (~200 linhas)
└── attendance/
    ├── index.ts                  # Barrel export
    ├── useBimesterPeriods.ts     # Períodos de bimestre
    ├── useSchoolDays.ts          # Dias letivos
    └── useStudentRecords.ts      # Registros de estudantes
```

**Total**: 10 arquivos, ~1705 linhas

### Categorias de Hooks

1. **Autenticação**:
   - `useAuth.ts` - Estado de autenticação

2. **Dados de Estudantes**:
   - `useStudents.ts` - Carregar lista de estudantes

3. **Firebase Genérico**:
   - `useFirebase.ts` - Operações Firebase otimizadas (4 hooks!)
   - `useFirebaseCollection.ts` - Coleções genéricas
   - `useFirebaseDoc.ts` - Documentos genéricos

4. **Frequência/Attendance**:
   - `useAttendanceData.ts` - Dados de frequência
   - `attendance/useBimesterPeriods.ts`
   - `attendance/useSchoolDays.ts`
   - `attendance/useStudentRecords.ts`

---

## 🔍 Análise de Hooks Existentes

### 1. `useAuth.ts` ✅ **OK - Simples e Eficiente**

**Linhas**: 20
**Propósito**: Gerenciar estado de autenticação Firebase
**Qualidade**: ✅ Excelente

```typescript
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // onAuthStateChanged listener
  return { user, loading };
}
```

**Análise**:
- ✅ Simples, focado, eficiente
- ✅ Sem duplicações
- ✅ Sem melhorias necessárias

**Ação**: ✅ Manter como está

---

### 2. `useStudents.ts` ✅ **OK - Com Logger**

**Linhas**: 42
**Propósito**: Carregar estudantes do Firebase com V3
**Qualidade**: ✅ Boa (já usa logger!)

```typescript
export const useStudents = (includeDeleted = false, includeContacts = true) => {
  const [students, setStudents] = useState<Estudante[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStudents = async () => {
    // Usa StudentDataService
    // Já tem logger.error()
  };

  return { students, loading, error, fetchStudents, setStudents };
}
```

**Análise**:
- ✅ Usa `StudentDataService` (dual-write V2/V3)
- ✅ Já integrado com `logger`
- ✅ Performance consciente (parâmetro `includeContacts`)
- ⚠️ Poderia usar TypeScript types de `@/schemas`

**Ação**: ⚠️ Pequenos ajustes opcionais (usar tipos de schemas)

---

### 3. `useFirebase.ts` ⚠️ **COMPLEXO - 4 Hooks em 1 Arquivo**

**Linhas**: 370
**Propósito**: Operações Firebase otimizadas
**Qualidade**: ✅ Alta qualidade, mas poderia ser dividido

**Hooks exportados**:
1. `useFirebaseCollection` - Coleções com cache e paginação
2. `useFirebaseBatch` - Operações batch
3. `useFirebaseWithRetry` - Retry automático
4. `useParallelFirebaseQueries` - Queries paralelas

**Análise**:
- ✅ Alta qualidade, bem estruturado
- ✅ Usa `logger`, `cache`, `PERFORMANCE_CONFIG`
- ✅ Implementa padrões avançados (retry, batch, parallel)
- ⚠️ Arquivo grande (370 linhas) com múltiplos hooks
- ⚠️ Poderia ser dividido em arquivos separados

**Ação**: ⚠️ **DIVIDIR** em arquivos individuais para melhor organização

**Proposta de Estrutura**:
```
src/hooks/firebase/
├── index.ts                        # Barrel export
├── useFirebaseCollection.ts        # Coleções com paginação
├── useFirebaseBatch.ts             # Operações batch
├── useFirebaseWithRetry.ts         # Retry logic
└── useParallelFirebaseQueries.ts   # Queries paralelas
```

---

### 4. `useFirebaseCollection.ts` ⚠️ **DUPLICAÇÃO!**

**Linhas**: ~150
**Propósito**: Hook genérico para coleções Firebase
**Qualidade**: ⚠️ Boa, mas **DUPLICA** `useFirebaseCollection` do `useFirebase.ts`!

**Análise**:
- ❌ **DUPLICAÇÃO**: Dois hooks com o mesmo nome fazendo coisas similares
- ⚠️ Implementação diferente de `useFirebase.ts`
- ⚠️ Usa `sessionStorage` para cache (vs. `cache.ts` no outro)
- ⚠️ Suporta realtime listeners (o outro não)

**Diferenças**:

| Recurso | `useFirebaseCollection.ts` | `useFirebase.ts` |
|---------|----------------------------|------------------|
| **Cache** | sessionStorage | cache.ts |
| **Paginação** | ❌ Não | ✅ Sim |
| **Realtime** | ✅ Sim (onSnapshot) | ❌ Não |
| **Performance log** | ❌ Não | ✅ Sim |
| **Constraints** | ✅ Sim | ✅ Sim |

**Ação**: ❌ **CONSOLIDAR** - Mesclar funcionalidades em um único hook

---

### 5. `useFirebaseDoc.ts` ✅ **BOA QUALIDADE - Pequenos Ajustes**

**Linhas**: 157
**Propósito**: Hook genérico para documentos Firebase com cache e realtime
**Qualidade**: ✅ Boa

**Análise**:
```typescript
export function useFirebaseDoc<T>(path: string, options?: UseFirebaseDocOptions) {
  // ✅ Suporta realtime (onSnapshot)
  // ✅ Cache com sessionStorage
  // ⚠️ Usa sessionStorage (deveria usar cache.ts)
  // ✅ Usa logger para erros
  // ✅ TypeScript genérico (<T>)
  // ✅ Inclui hooks especializados (useAcademicYear, useUserProfile)
}
```

**Recursos**:
- ✅ Real-time listeners opcional
- ✅ Cache com TTL (5min default)
- ✅ Método `update()` para modificar doc
- ✅ Método `refresh()` para recarregar
- ✅ Logger integrado
- ⚠️ Usa `sessionStorage` (deveria usar `cache.ts` para consistência)

**Ação**: ⚠️ **PEQUENOS AJUSTES**
1. Substituir `sessionStorage` por `cache.ts`
2. Adicionar JSDoc completo
3. Manter hooks especializados como exemplos

---

### 6. `useAttendanceData.ts` ⚠️ **MONOLÍTICO - 476 LINHAS!**

**Linhas**: 476
**Propósito**: Dados de frequência e ausências (TUDO EM UM!)
**Qualidade**: ⚠️ Funcional mas MUITO grande

**Análise**:
```typescript
export function useAttendanceData(props) {
  // ❌ 476 linhas em um único hook!
  // ✅ Usa logger
  // ⚠️ Muitas responsabilidades:
  //    - Buscar períodos de bimestre
  //    - Calcular dias letivos
  //    - Buscar faltas de estudantes
  //    - Calcular percentuais
  //    - Detectar duplicatas
  //    - Remover duplicatas
  // ⚠️ Múltiplos useEffect aninhados
  // ⚠️ Lógica complexa de filtros
}
```

**Responsabilidades Identificadas**:
1. **Períodos de Bimestre** (~50 linhas)
2. **Cálculo de Dias Letivos** (~100 linhas)
3. **Busca de Faltas de Estudantes** (~100 linhas)
4. **Agregação de Dados** (~100 linhas)
5. **Detecção de Duplicatas** (~50 linhas)
6. **Remoção de Duplicatas** (~50 linhas)
7. **Filtros Complexos** (~26 linhas)

**Ação**: ❌ **REFATORAR URGENTE**
- Dividir em hooks menores e focados
- Criar hooks especializados para cada responsabilidade
- Usar composição de hooks

**NOTA**: ⚠️ **EXISTE DUPLICAÇÃO!**
- Este hook monolítico **conflita** com a nova estrutura em `src/hooks/attendance/`
- A subpasta `attendance/` tem hooks modernos e bem separados
- **Decisão necessária**: Deprecar este hook e migrar para os novos?

---

### 7. Hooks de Attendance (Subpasta) ✅ **EXCELENTE ARQUITETURA**

**Estrutura**:
```
src/hooks/attendance/
├── index.ts                    # Barrel export + hook composto
├── useBimesterPeriods.ts       # 78 linhas
├── useSchoolDays.ts            # 182 linhas
└── useStudentRecords.ts        # 150 linhas
```

**Total**: 410 linhas **VS** 476 linhas do monolítico

---

#### 7.1 `attendance/index.ts` ✅ **EXCELENTE COMPOSIÇÃO**

**Linhas**: 59
**Propósito**: Barrel export + hook composto opcional

**Análise**:
```typescript
// ✅ Exports individuais
export { useStudentRecords } from './useStudentRecords';
export { useBimesterPeriods } from './useBimesterPeriods';
export { useSchoolDays } from './useSchoolDays';

// ✅ Hook composto (convenience)
export function useAttendanceData(options) {
  // Compõe os 3 hooks individuais
  // Retorna interface flat com todos os dados
}
```

**Benefícios**:
- ✅ Permite usar hooks individuais (granular)
- ✅ Oferece hook composto para casos simples (convenience)
- ✅ Padrão moderno de composição

**Ação**: ✅ **MANTER** - Arquitetura excelente

---

#### 7.2 `attendance/useBimesterPeriods.ts` ✅ **FOCADO E LIMPO**

**Linhas**: 78
**Propósito**: Gerenciar períodos dos bimestres (start/end)

**Análise**:
```typescript
export function useBimesterPeriods() {
  // ✅ Usa useFirebaseDoc('2025/ano_letivo')
  // ✅ Processa dados dos bimestres
  // ✅ Retorna helpers:
  //    - getBimesterByDate()
  //    - getCurrentBimester()
  //    - getBimesterRange()
  //    - getAllBimesterRanges()
  // ✅ Logger integrado
  // ✅ TypeScript com tipos de @/types
}
```

**Retorno**:
```typescript
{
  bimesterDates: BimesterDates,
  loading: boolean,
  error: Error | null,
  refresh: () => Promise<void>,
  getBimesterByDate: (date: string) => number,
  getCurrentBimester: () => number,
  getBimesterRange: (bimester: number) => { start, end } | null,
  getAllBimesterRanges: () => BimesterDates,
}
```

**Ação**: ✅ **MANTER** - Código limpo e focado

---

#### 7.3 `attendance/useSchoolDays.ts` ✅ **BOA LÓGICA**

**Linhas**: 182
**Propósito**: Calcular dias letivos por bimestre e período

**Análise**:
```typescript
export function useSchoolDays() {
  // ✅ Usa useBimesterPeriods() (composição!)
  // ✅ Usa attendanceService.calculateSchoolDays()
  // ✅ Calcula dias por bimestre
  // ✅ Calcula dias até hoje
  // ✅ Helpers:
  //    - getSchoolDaysForPeriod(start, end)
  //    - getSchoolDaysUpToDate(date)
  // ✅ Logger integrado
  // ⚠️ Código repetitivo (4x similar para cada bimestre)
}
```

**Retorno**:
```typescript
{
  schoolDays: {
    bimester1: number,
    bimester2: number,
    bimester3: number,
    bimester4: number,
    total: number,
    upToToday: number,
  },
  loading: boolean,
  error: Error | null,
  refresh: () => Promise<void>,
  getSchoolDaysForPeriod: (start, end) => number,
  getSchoolDaysUpToDate: (date) => number,
}
```

**Ação**: ⚠️ **PEQUENA OTIMIZAÇÃO**
- Refatorar código repetitivo com loop `for...in`
- Manter funcionalidade atual

---

#### 7.4 `attendance/useStudentRecords.ts` ✅ **BEM ESTRUTURADO**

**Linhas**: 150
**Propósito**: Calcular registros de frequência por estudante

**Análise**:
```typescript
export function useStudentRecords(options: UseStudentRecordsOptions) {
  // ✅ Aceita filtros (turma, status)
  // ✅ Auto-refresh opcional (5min)
  // ✅ Usa StudentDataService (V3)
  // ✅ Usa attendanceService
  // ✅ Calcula por bimestre
  // ✅ Logger integrado
  // ⚠️ Hardcoded: diasLetivosB1 = 50 (deveria vir de useSchoolDays)
}
```

**Retorno**:
```typescript
{
  studentRecords: StudentRecord[],
  loading: boolean,
  error: Error | null,
  refresh: () => Promise<void>,
}
```

**Ação**: ⚠️ **INTEGRAÇÃO NECESSÁRIA**
- Integrar com `useSchoolDays()` para dias letivos reais
- Remover hardcoded `diasLetivosB1 = 50`

---

## 🚨 Problemas Identificados

### 1. Duplicação de Hooks

**Problema**: `useFirebaseCollection` existe em **2 arquivos diferentes**:
- `src/hooks/useFirebase.ts`
- `src/hooks/useFirebaseCollection.ts`

**Impacto**:
- ❌ Confusão sobre qual usar
- ❌ Implementações diferentes
- ❌ Manutenção duplicada
- ❌ Bugs podem ser corrigidos em apenas um

**Solução**:
1. Analisar diferenças entre as duas implementações
2. Mesclar funcionalidades (cache + realtime + paginação)
3. Manter apenas um hook unificado
4. Migrar usos para o hook consolidado

---

### 2. Arquivo `useFirebase.ts` Muito Grande

**Problema**: 370 linhas com 4 hooks diferentes

**Impacto**:
- ⚠️ Difícil navegação
- ⚠️ Barrel import não granular
- ⚠️ Múltiplas responsabilidades em um arquivo

**Solução**:
1. Dividir em arquivos individuais
2. Criar `src/hooks/firebase/` com subpasta
3. Barrel export em `src/hooks/firebase/index.ts`
4. Manter compatibilidade com imports existentes

---

### 3. Falta de Padronização

**Problema**: Hooks usam padrões diferentes:
- Alguns usam `logger`, outros não
- Alguns usam `cache.ts`, outros `sessionStorage`
- Nomenclatura inconsistente (data vs. students vs. docs)

**Solução**:
1. Estabelecer padrão de retorno: `{ data, loading, error, refetch }`
2. Sempre usar `logger` para erros
3. Sempre usar `cache.ts` (não `sessionStorage` direto)
4. Nomenclatura consistente

---

### 4. Documentação Inline Insuficiente

**Problema**: Alguns hooks têm JSDoc, outros não

**Solução**:
1. Adicionar JSDoc completo em todos os hooks
2. Documentar parâmetros, retorno, e exemplos
3. Criar guia de uso de hooks (`HOOKS-GUIA-USO.md`)

---

### 5. useAttendanceData.ts vs attendance/ - CONFLITO ARQUITETURAL ⚠️

**Problema**: Existem **DUAS implementações** de lógica de attendance:

**Antiga** (`src/hooks/useAttendanceData.ts` - 476 linhas):
- Hook monolítico com TODAS as responsabilidades
- Lógica complexa e entrelaçada
- Difícil manutenção

**Nova** (`src/hooks/attendance/` - 410 linhas total):
- Hooks modulares e focados
- Composição via barrel export
- Arquitetura moderna e limpa

**Impacto**:
- ❌ Confusão sobre qual usar
- ❌ Possível código duplicado em lógica
- ❌ Risco de usar o hook "errado"
- ❌ Manutenção em dois lugares

**Decisão Necessária**:
1. **Opção A** (Recomendada): Deprecar `useAttendanceData.ts` monolítico
   - Migrar usos para hooks de `attendance/`
   - Deletar arquivo antigo após migração
   - Atualizar documentação

2. **Opção B**: Manter ambos temporariamente
   - Documentar claramente qual usar quando
   - Planejar migração gradual
   - Criar guia de migração

**Ação**: 🚨 **DECISÃO URGENTE** - Definir estratégia de migração

---

### 6. Cache Inconsistente (cache.ts vs sessionStorage)

**Problema**: Dois sistemas de cache diferentes:

| Hook | Sistema de Cache |
|------|------------------|
| `useFirebase.ts` → `useFirebaseCollection` | ✅ `cache.ts` |
| `useFirebaseCollection.ts` (duplicado) | ⚠️ `sessionStorage` |
| `useFirebaseDoc.ts` | ⚠️ `sessionStorage` |

**Impacto**:
- ⚠️ Comportamento inconsistente
- ⚠️ Dificuldade em gerenciar cache globalmente
- ⚠️ Possível desalinhamento de dados

**Solução**:
1. Padronizar em `cache.ts` para TODOS os hooks
2. Migrar `sessionStorage` para `cache.ts`
3. Documentar padrão de cache

---

### 7. Hardcoded Values em Hooks

**Problema**: Valores hardcoded encontrados:

**`attendance/useStudentRecords.ts`**:
```typescript
const diasLetivosB1 = 50; // ❌ Hardcoded!
const diasLetivosB2 = 50;
const diasLetivosB3 = 50;
const diasLetivosB4 = 50;
```

**Impacto**:
- ❌ Valores incorretos (dias letivos variam)
- ❌ Cálculos de frequência imprecisos
- ❌ Difícil ajustar quando mudar ano letivo

**Solução**:
1. Integrar com `useSchoolDays()` para valores reais
2. Remover todos os hardcoded values
3. Buscar de dados do Firestore

---

## 📊 Mapa de Dependências entre Hooks

### Visualização

```
useAuth.ts (standalone)
  └─ Sem dependências

useStudents.ts (standalone)
  ├─ StudentDataService
  └─ logger

useFirebase.ts (4 hooks)
  ├─ useFirebaseCollection
  │   ├─ cache.ts
  │   └─ logger
  ├─ useFirebaseBatch
  │   └─ logger
  ├─ useFirebaseWithRetry
  │   └─ logger
  └─ useParallelFirebaseQueries
      └─ logger

useFirebaseCollection.ts (duplicado)
  ├─ sessionStorage (⚠️ deveria ser cache.ts)
  └─ logger

useFirebaseDoc.ts
  ├─ sessionStorage (⚠️ deveria ser cache.ts)
  └─ logger

useAttendanceData.ts (monolítico - 476 linhas)
  ├─ Firestore direto
  ├─ StudentDataService
  ├─ attendanceUtils (parseDate, formatFirebaseDate, getBimesterByDate)
  └─ logger

attendance/useBimesterPeriods.ts
  ├─ useFirebaseDoc ✅ (composição!)
  └─ logger

attendance/useSchoolDays.ts
  ├─ useBimesterPeriods ✅ (composição!)
  ├─ attendanceService.calculateSchoolDays()
  └─ logger

attendance/useStudentRecords.ts
  ├─ StudentDataService
  ├─ attendanceService
  ├─ logger
  └─ ⚠️ Hardcoded dias letivos (deveria usar useSchoolDays!)

attendance/index.ts (hook composto)
  ├─ useStudentRecords ✅
  ├─ useBimesterPeriods ✅
  └─ useSchoolDays ✅
```

### Análise de Dependências

**✅ Boas Práticas Observadas**:
1. `attendance/useBimesterPeriods.ts` usa `useFirebaseDoc` (composição)
2. `attendance/useSchoolDays.ts` usa `useBimesterPeriods` (composição)
3. `attendance/index.ts` compõe 3 hooks individuais
4. Todos usam `logger` consistentemente

**⚠️ Problemas Identificados**:
1. `useAttendanceData.ts` monolítico não compõe outros hooks
2. `useStudentRecords.ts` hardcoded ao invés de usar `useSchoolDays`
3. Duplicação `useFirebaseCollection` (2 implementações)
4. Cache inconsistente (cache.ts vs sessionStorage)

**🎯 Oportunidades de Melhoria**:
1. Migrar `useStudentRecords` para usar `useSchoolDays()`
2. Consolidar `useFirebaseCollection` em uma versão
3. Padronizar cache em `cache.ts`
4. Deprecar `useAttendanceData.ts` monolítico

---

## 🔄 Usos dos Hooks no Projeto

### useAuth.ts
**Usado em**:
- `src/app/layout.tsx`
- `src/components/Header.tsx`
- Páginas protegidas (via middleware)

---

### useStudents.ts
**Usado em**:
- `src/app/cadastrar-estudante/page.tsx`
- `src/app/home/page.tsx` (dashboard)
- `src/components/StudentTable.tsx`
- Diversos componentes de listagem

---

### useFirebase.ts
**Hooks exportados**:
1. `useFirebaseCollection` - Usado em componentes de listagem
2. `useFirebaseBatch` - Usado em operações bulk
3. `useFirebaseWithRetry` - Usado em operações críticas
4. `useParallelFirebaseQueries` - Usado em dashboards

---

### useAttendanceData.ts (monolítico)
**Usado em**:
- ⚠️ **VERIFICAR USOS** antes de deprecar
- Provavelmente em `src/app/controlar-faltas/page.tsx`
- Possivelmente em relatórios

**Ação**: 🔍 Grep para encontrar todos os usos antes de migração

---

### attendance/ (hooks modernos)
**Status de Uso**:
- ✅ Implementados
- ⚠️ **Possivelmente não usados ainda** (novos)
- 🎯 Devem **substituir** `useAttendanceData.ts` monolítico

**Ação**: 🔍 Verificar se já estão sendo usados ou se são código novo

---

## 📝 Plano de Ação

### Fase 1.3.1: Auditoria e Análise (30min - 1h)

**Objetivo**: Entender completamente todos os hooks

**Tarefas**:
- [x] Listar todos os hooks existentes
- [x] Identificar duplicações
- [x] Analisar `useFirebaseDoc.ts` (157 linhas) ✅
- [x] Analisar `useAttendanceData.ts` (476 linhas) ✅
- [x] Analisar hooks de `attendance/` (4 arquivos) ✅
- [x] Mapear dependências entre hooks ✅
- [ ] Identificar usos em componentes (Grep necessário)

**Entregável**:
- ✅ Documento de análise completa
- ✅ Mapa de dependências
- ⏳ Mapeamento de usos (Grep pendente)

---

### Fase 1.3.2: Consolidação de Firebase Hooks (2-3h)

**Objetivo**: Resolver duplicações e reorganizar hooks Firebase

**Tarefas**:

#### 1. Mesclar `useFirebaseCollection` (1h)
- [ ] Comparar as duas implementações lado a lado
- [ ] Identificar funcionalidades únicas de cada uma
- [ ] Criar hook consolidado com:
  - ✅ Cache via `cache.ts`
  - ✅ Paginação
  - ✅ Realtime listeners (opcional)
  - ✅ Performance logging
  - ✅ Constraints dinâmicos
- [ ] Adicionar testes de uso
- [ ] Migrar usos existentes

#### 2. Dividir `useFirebase.ts` (1-2h)
- [ ] Criar pasta `src/hooks/firebase/`
- [ ] Extrair para arquivos individuais:
  ```
  src/hooks/firebase/
  ├── index.ts
  ├── useFirebaseCollection.ts      # Consolidado
  ├── useFirebaseBatch.ts
  ├── useFirebaseWithRetry.ts
  └── useParallelFirebaseQueries.ts
  ```
- [ ] Criar barrel export
- [ ] Atualizar imports em componentes
- [ ] Deletar `useFirebase.ts` original
- [ ] Deletar `useFirebaseCollection.ts` duplicado

**Entregável**:
- Hooks Firebase organizados em subpasta
- Zero duplicações
- Backward compatibility mantida

---

### Fase 1.3.3: Padronização de Hooks (2h)

**Objetivo**: Aplicar padrões consistentes

**Padrão de Hook**:
```typescript
/**
 * Hook para [propósito]
 *
 * @param param1 - Descrição
 * @returns { data, loading, error, refetch }
 *
 * @example
 * const { data, loading } = useMyHook(params);
 */
export function useMyHook(params: ParamsType) {
  const [data, setData] = useState<DataType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Lógica
      const result = await fetchSomething(params);
      setData(result);

      logger.success('Operation completed', { params, resultCount: result.length });
    } catch (err) {
      const error = err as Error;
      setError(error);
      logger.error('Operation failed', error, { params });
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
```

**Tarefas**:
- [ ] Aplicar padrão em todos os hooks
- [ ] Garantir uso de `logger`
- [ ] Garantir uso de `cache.ts` (quando aplicável)
- [ ] Adicionar JSDoc completo
- [ ] Nomenclatura consistente

**Entregável**:
- Todos os hooks seguindo padrão
- JSDoc completo

---

### Fase 1.3.4: Otimização de Performance (1-2h)

**Objetivo**: Melhorar performance dos hooks

**Tarefas**:

#### 1. useStudents
- [ ] Adicionar cache opcional
- [ ] Verificar memoização de `fetchStudents`
- [ ] Adicionar paginação opcional (se necessário)

#### 2. useAttendanceData
- [ ] Auditar cálculos pesados
- [ ] Adicionar `useMemo` onde apropriado
- [ ] Verificar performance com 700+ estudantes

#### 3. Hooks de Firebase
- [ ] Garantir que todos usam `cache.ts`
- [ ] Performance logging em todos
- [ ] Retry logic quando apropriado

**Entregável**:
- Hooks otimizados
- Métricas de performance documentadas

---

### Fase 1.3.5: Barrel Exports e Organização (30min)

**Objetivo**: Facilitar imports

**Estrutura Final**:
```
src/hooks/
├── index.ts                          # Barrel export principal
├── useAuth.ts
├── useStudents.ts
├── useAttendanceData.ts
├── firebase/
│   ├── index.ts                      # Barrel export Firebase
│   ├── useFirebaseCollection.ts      # Consolidado
│   ├── useFirebaseDoc.ts
│   ├── useFirebaseBatch.ts
│   ├── useFirebaseWithRetry.ts
│   └── useParallelFirebaseQueries.ts
└── attendance/
    ├── index.ts                      # Barrel export Attendance
    ├── useBimesterPeriods.ts
    ├── useSchoolDays.ts
    └── useStudentRecords.ts
```

**Tarefas**:
- [ ] Criar `src/hooks/index.ts` (barrel principal)
- [ ] Criar `src/hooks/firebase/index.ts`
- [ ] Atualizar `src/hooks/attendance/index.ts`
- [ ] Permitir imports simplificados:
  ```typescript
  // Antes
  import { useAuth } from '@/hooks/useAuth';
  import { useFirebaseCollection } from '@/hooks/firebase/useFirebaseCollection';

  // Depois
  import { useAuth, useFirebaseCollection } from '@/hooks';
  ```

**Entregável**:
- Barrel exports funcionando
- Imports simplificados

---

### Fase 1.3.6: Documentação (1h)

**Objetivo**: Documentar padrões e guias de uso

**Documentos a Criar**:

#### 1. `HOOKS-GUIA-USO.md`
- Visão geral de todos os hooks
- Como usar cada hook
- Exemplos práticos
- Melhores práticas
- Quando criar novo hook

#### 2. `HOOKS-PADROES.md`
- Padrão de estrutura de hook
- Nomenclatura
- Retornos consistentes
- Logger integration
- Cache integration
- JSDoc template

#### 3. `FASE-1-3-HOOKS-CONCLUIDA.md`
- Resumo executivo
- Métricas de sucesso
- Mudanças implementadas
- Benefícios alcançados

**Entregável**:
- 3 documentos completos (300+ linhas cada)

---

### Fase 1.3.7: Testes e Validação (30min)

**Objetivo**: Garantir que tudo funciona

**Tarefas**:
- [ ] `npm run type-check` - Sem erros TypeScript
- [ ] Testar imports de barrel exports
- [ ] Verificar componentes que usam hooks
- [ ] Testar funcionalidades principais (login, dashboard, cadastro)
- [ ] Verificar performance (não piorou)

**Entregável**:
- Type-check OK
- Funcionalidades testadas
- Performance validada

---

## 📅 Cronograma

| Fase | Duração | Status |
|------|---------|--------|
| **1.3.1** - Auditoria e Análise | 30min-1h | 🔄 Em andamento |
| **1.3.2** - Consolidação Firebase Hooks | 2-3h | ⏳ Aguardando |
| **1.3.3** - Padronização | 2h | ⏳ Aguardando |
| **1.3.4** - Otimização Performance | 1-2h | ⏳ Aguardando |
| **1.3.5** - Barrel Exports | 30min | ⏳ Aguardando |
| **1.3.6** - Documentação | 1h | ⏳ Aguardando |
| **1.3.7** - Testes e Validação | 30min | ⏳ Aguardando |
| **TOTAL** | **7-10 horas** | ⏳ |

---

## 📊 Métricas de Sucesso

### Código

| Métrica | Antes | Meta Depois | Como Medir |
|---------|-------|-------------|------------|
| **Duplicações** | 2 hooks duplicados | 0 duplicações | Grep por nomes |
| **Hooks com Logger** | ~50% | 100% | Grep por `logger` |
| **Hooks com JSDoc** | ~30% | 100% | Inspeção manual |
| **Arquivo grande** | 1 (370 linhas) | 0 (max 200 linhas/arquivo) | wc -l |
| **Barrel exports** | Parcial | Completo | Teste de imports |

### Qualidade

| Aspecto | Status Antes | Meta | Como Validar |
|---------|--------------|------|--------------|
| **Consistência** | ⚠️ Padrões variados | ✅ Padrão único | Code review |
| **Performance** | ⚠️ Sem cache em alguns | ✅ Cache em todos aplicáveis | Testes |
| **Documentação** | ⚠️ Parcial | ✅ Completa | Docs criados |
| **Type-Safety** | ✅ OK | ✅ Melhorado | Type-check |

### Experiência de Dev

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Import de hooks** | Paths longos | Barrel export simples |
| **Descoberta de hooks** | Navegar arquivos | Documentação completa |
| **Criar novo hook** | Sem padrão claro | Template documentado |
| **Debug de erros** | Console.log | Logger estruturado |

---

## 🎯 Objetivos Principais

1. ✅ **Zero duplicações** de hooks
2. ✅ **100% dos hooks** com logger
3. ✅ **100% dos hooks** com JSDoc
4. ✅ **Padrão consistente** em todos os hooks
5. ✅ **Barrel exports** funcionando
6. ✅ **Documentação completa** de uso e padrões
7. ✅ **Performance** mantida ou melhorada
8. ✅ **Type-check** sem erros

---

## 📚 Referências

- **React Hooks Best Practices**: https://react.dev/learn/reusing-logic-with-custom-hooks
- **Performance Optimization**: https://react.dev/reference/react/useMemo
- **TypeScript Generics**: https://www.typescriptlang.org/docs/handbook/2/generics.html
- **JSDoc Guide**: https://jsdoc.app/

---

## 🔗 Documentos Relacionados

- [FASE-1-RESUMO.md](./FASE-1-RESUMO.md) - Visão geral Fase 1
- [FASE-1-1-LOGGING-CONCLUIDA.md](./FASE-1-1-LOGGING-CONCLUIDA.md) - Fase 1.1
- [FASE-1-2-SCHEMAS-CONCLUIDA.md](./FASE-1-2-SCHEMAS-CONCLUIDA.md) - Fase 1.2
- [CLAUDE.md](../CLAUDE.md) - Guia de desenvolvimento

---

**Data de Criação**: 2025-01-09
**Última Atualização**: 2025-01-09
**Status**: ✅ FASE 1.3.1 CONCLUÍDA | 🔄 Aguardando decisão sobre próximos passos
**Próxima Ação**:
1. ⚠️ **DECISÃO CRÍTICA**: Definir estratégia para useAttendanceData.ts vs attendance/
2. ⏳ Grep para mapear usos dos hooks duplicados
3. ⏳ Iniciar Fase 1.3.2 (Consolidação Firebase Hooks)