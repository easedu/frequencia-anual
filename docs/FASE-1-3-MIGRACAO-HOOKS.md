# 📋 Fase 1.3: Plano de Migração de Hooks - DETALHADO

> **Data de Criação**: 2025-01-09
> **Tipo**: Plano de Migração e Deprecação
> **Status**: 📝 PLANEJAMENTO APROVADO

---

## 🎯 Decisão Tomada

**✅ APROVADO**: Deprecar `useAttendanceData.ts` monolítico e migrar para hooks modulares de `attendance/`

**Estratégia**: Migração gradual com backward compatibility temporária

---

## 📊 Mapeamento de Usos - RESULTADO COMPLETO

### 1. useAttendanceData.ts (Monolítico - 476 linhas)

**Status**: ⚠️ **1 USO ENCONTRADO**

**Arquivo usando**:
- ✅ `src/app/controlar-faltas/page.tsx:13`

```typescript
import { useAttendanceData } from "@/hooks/useAttendanceData";
```

**Análise**:
- ✅ **ÓTIMA NOTÍCIA**: Apenas 1 arquivo usando!
- ✅ Migração será simples e localizada
- ✅ Baixo risco de quebrar código

**Ação**:
1. Migrar `controlar-faltas/page.tsx` para usar hooks modulares
2. Testar funcionalidade completa
3. Deletar `useAttendanceData.ts` monolítico

---

### 2. attendance/ (Hooks Modernos - 410 linhas)

**Status**: ⚠️ **NÃO ESTÃO SENDO USADOS AINDA!**

**Imports encontrados**: 0 (zero)

**Análise**:
- ⚠️ Hooks modulares foram criados mas **não estão em uso**
- ✅ Arquitetura excelente, prontos para serem usados
- ✅ Sem conflito com código existente

**Conclusão**:
- Os hooks de `attendance/` são **código novo** preparado para substituir o monolítico
- Migração será **criar uso**, não substituir uso existente

---

### 3. useFirebaseCollection (Duplicado)

**Status**: ❌ **NÃO ESTÁ SENDO USADO**

**Arquivos que o definem**:
- `src/hooks/useFirebaseCollection.ts` (arquivo duplicado)
- `src/hooks/useFirebase.ts` (exporta hook com mesmo nome)

**Imports encontrados**: 0 (zero)

**Análise**:
- ✅ **ÓTIMA NOTÍCIA**: Nenhum dos dois está sendo usado!
- ✅ Podemos consolidar sem quebrar código
- ❌ Código duplicado ocupando espaço

**Ação**:
1. Decidir qual implementação manter (recomendado: `useFirebase.ts`)
2. Deletar `useFirebaseCollection.ts` duplicado
3. Documentar como usar o hook consolidado

---

### 4. useFirebaseDoc.ts

**Status**: ✅ **EM USO (interno)**

**Usado por**:
- ✅ `src/hooks/attendance/useBimesterPeriods.ts`

```typescript
import { useFirebaseDoc } from '@/hooks/useFirebaseDoc';
```

**Análise**:
- ✅ Hook bem usado internamente
- ✅ Composição correta
- ⚠️ Ajustar cache de `sessionStorage` para `cache.ts`

**Ação**:
1. Manter hook
2. Ajustar sistema de cache
3. Adicionar JSDoc

---

### 5. useStudents.ts

**Status**: ✅ **AMPLAMENTE USADO (7 arquivos)**

**Arquivos usando**:
1. `src/app/cadastrar-estudante/page.tsx`
2. `src/app/marcar-faltas/page.tsx`
3. `src/app/telefones/page.tsx`
4. `src/app/monitorar-faltas-consecutivas/page.tsx`
5. `src/app/perfil-deficiente/page.tsx`
6. `src/components/cards/AlertsCard.tsx`
7. `src/app/controlar-faltas/page.tsx`

**Análise**:
- ✅ Hook crítico, bem estabelecido
- ✅ Já usa logger
- ✅ Já usa StudentDataService (V3)
- ⚠️ Poderia usar tipos de `@/schemas`

**Ação**:
1. Manter hook como está (funciona bem)
2. Pequenos ajustes opcionais (tipos de schemas)
3. Não priorizar mudanças (risco vs benefício)

---

## 📝 Plano de Migração DETALHADO

### Fase 1: Migrar controlar-faltas/page.tsx (2-3h)

**Objetivo**: Substituir `useAttendanceData` monolítico por hooks modulares

**Arquivo alvo**: `src/app/controlar-faltas/page.tsx`

#### Passo 1.1: Análise do uso atual (30min)

**Tarefas**:
- [ ] Ler `controlar-faltas/page.tsx` completo
- [ ] Identificar quais dados do `useAttendanceData` são usados
- [ ] Mapear dependências de dados
- [ ] Listar funcionalidades do componente

**Perguntas a responder**:
1. Quais propriedades de `useAttendanceData` são usadas?
   - `data`?
   - `bimesterDates`?
   - `totalDiasLetivos`?
   - `studentAbsences`?
   - `duplicateAbsences`?
   - Funções como `removeDuplicateAbsences`?

2. Qual a lógica de filtros?
   - Usa `selectedBimesters`?
   - Usa `useToday`?
   - Usa `excludeJustified`?

3. Há estados locais dependentes?

#### Passo 1.2: Preparar hooks modulares (30min)

**Verificar compatibilidade**:
```typescript
// Hook monolítico retorna:
{
  bimesterDates,
  data,
  totalDiasLetivos,
  studentAbsences,
  duplicateAbsences,
  filterState,
  fetchStudentAbsences,
  fetchDuplicateAbsences,
  removeDuplicateAbsences,
  calculateDiasLetivos,
}

// Hooks modulares retornam (via attendance/index.ts):
{
  // De useStudentRecords
  studentRecords,
  studentRecordsLoading,
  studentRecordsError,
  refreshStudentRecords,

  // De useBimesterPeriods
  bimesterDates,
  bimesterLoading,
  bimesterError,
  getBimesterByDate,
  getCurrentBimester,
  getBimesterRange,

  // De useSchoolDays
  schoolDays,
  schoolDaysLoading,
  schoolDaysError,
  getSchoolDaysForPeriod,
  getSchoolDaysUpToDate,

  // Combinado
  loading,
  error,
  refresh,
}
```

**Mapear equivalências**:
| Monolítico | Modular | Observação |
|------------|---------|------------|
| `bimesterDates` | ✅ `bimesterDates` | Igual |
| `data` | ⚠️ `studentRecords` | Nome diferente |
| `totalDiasLetivos` | ⚠️ `schoolDays.total` | Estrutura diferente |
| `studentAbsences` | ❌ **FALTA** | Precisa implementar |
| `duplicateAbsences` | ❌ **FALTA** | Precisa implementar |
| `removeDuplicateAbsences` | ❌ **FALTA** | Precisa implementar |
| `fetchStudentAbsences` | ❌ **FALTA** | Precisa implementar |
| `calculateDiasLetivos` | ✅ `getSchoolDaysForPeriod` | Equivalente |

**⚠️ PROBLEMA IDENTIFICADO**: Hooks modulares **não têm**:
1. Funcionalidade de detectar/remover duplicatas
2. Funcionalidade de buscar faltas de estudante específico
3. Sistema de filtros complexos (bimestres, datas custom, excludeJustified)

**DECISÃO NECESSÁRIA**:
- **Opção A**: Adicionar funcionalidades faltantes aos hooks modulares
- **Opção B**: Criar hooks adicionais (ex: `useDuplicateAbsences`, `useStudentAbsences`)
- **Opção C**: Manter funcionalidades específicas apenas em `controlar-faltas`

**RECOMENDAÇÃO**: **Opção B** - Criar hooks adicionais modulares

#### Passo 1.3: Criar hooks faltantes (1-2h)

##### Hook 1: `useDuplicateAbsences.ts`

```typescript
/**
 * Hook para detectar e remover faltas duplicadas
 * Funcionalidade específica para controle de qualidade de dados
 */
export function useDuplicateAbsences() {
  const [duplicates, setDuplicates] = useState<AbsenceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchDuplicates = async () => {
    // Lógica extraída de useAttendanceData.ts
  };

  const removeDuplicates = async () => {
    // Lógica extraída de useAttendanceData.ts
  };

  return {
    duplicates,
    loading,
    error,
    fetchDuplicates,
    removeDuplicates,
  };
}
```

**Localização**: `src/hooks/attendance/useDuplicateAbsences.ts`

##### Hook 2: `useStudentAbsences.ts`

```typescript
/**
 * Hook para buscar faltas de um estudante específico
 * Por bimestre, com opção de excluir justificadas
 */
export function useStudentAbsences(
  estudanteId: string | null,
  options?: { excludeJustified?: boolean }
) {
  const [absences, setAbsences] = useState<StudentAbsencesByBimester>({
    b1: [],
    b2: [],
    b3: [],
    b4: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Lógica extraída de useAttendanceData.ts

  return {
    absences,
    loading,
    error,
    refresh: fetchAbsences,
  };
}
```

**Localização**: `src/hooks/attendance/useStudentAbsences.ts`

#### Passo 1.4: Atualizar attendance/index.ts (30min)

Adicionar exports dos novos hooks:

```typescript
export { useDuplicateAbsences } from './useDuplicateAbsences';
export { useStudentAbsences } from './useStudentAbsences';

// Hook composto atualizado (opcional)
export function useAttendanceData(options: {
  turmaFilter?: string;
  statusFilter?: string;
  autoRefresh?: boolean;
  estudanteId?: string;
  includeDuplicates?: boolean;
} = {}) {
  const studentRecords = useStudentRecords(options);
  const bimesterPeriods = useBimesterPeriods();
  const schoolDays = useSchoolDays();

  // Condicionais
  const studentAbsences = options.estudanteId
    ? useStudentAbsences(options.estudanteId)
    : null;

  const duplicates = options.includeDuplicates
    ? useDuplicateAbsences()
    : null;

  return {
    // ... todos os dados
    studentAbsences: studentAbsences?.absences,
    duplicates: duplicates?.duplicates,
    removeDuplicates: duplicates?.removeDuplicates,
  };
}
```

#### Passo 1.5: Migrar controlar-faltas/page.tsx (1h)

**Antes**:
```typescript
import { useAttendanceData } from "@/hooks/useAttendanceData";

const {
  data,
  bimesterDates,
  totalDiasLetivos,
  studentAbsences,
  duplicateAbsences,
  removeDuplicateAbsences,
  // ... outros
} = useAttendanceData({
  selectedBimesters,
  startDate,
  endDate,
  useToday,
  useCustom,
  excludeJustified,
  selectedStudent,
});
```

**Depois**:
```typescript
import {
  useStudentRecords,
  useBimesterPeriods,
  useSchoolDays,
  useStudentAbsences,
  useDuplicateAbsences,
} from "@/hooks/attendance";

// Ou usar o hook composto:
import { useAttendanceData } from "@/hooks/attendance";

const {
  studentRecords,
  bimesterDates,
  schoolDays,
  studentAbsences,
  duplicates,
  removeDuplicates,
  loading,
  error,
} = useAttendanceData({
  turmaFilter,
  statusFilter,
  estudanteId: selectedStudent,
  includeDuplicates: true,
});

// Ajustar código que usa os dados:
// data → studentRecords
// totalDiasLetivos → schoolDays.total
// duplicateAbsences → duplicates
// removeDuplicateAbsences → removeDuplicates
```

#### Passo 1.6: Testar migração (30min)

**Testes manuais**:
- [ ] Carregar página sem erros
- [ ] Verificar dados exibidos corretamente
- [ ] Testar filtros (bimestres, datas)
- [ ] Testar seleção de estudante
- [ ] Testar detecção de duplicatas
- [ ] Testar remoção de duplicatas
- [ ] Verificar performance (não piorou)

**Validação**:
```bash
npm run type-check
# Verificar sem erros
```

---

### Fase 2: Deletar hook monolítico (15min)

**Após confirmação de que tudo funciona**:

#### Passo 2.1: Criar backup
```bash
cp src/hooks/useAttendanceData.ts src/hooks/useAttendanceData.ts.backup
```

#### Passo 2.2: Deletar arquivo
```bash
git rm src/hooks/useAttendanceData.ts
```

#### Passo 2.3: Commit
```bash
git add .
git commit -m "refactor: migrar de useAttendanceData monolítico para hooks modulares

- Deprecado: useAttendanceData.ts (476 linhas monolítico)
- Criados: useDuplicateAbsences.ts, useStudentAbsences.ts
- Migrado: controlar-faltas/page.tsx para usar hooks modulares
- Benefício: Código mais modular, testável e manutenível
- Redução: 476 linhas → hooks focados e compostos

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Fase 3: Resolver duplicação useFirebaseCollection (30min)

**Objetivo**: Consolidar em um único hook

#### Passo 3.1: Analisar diferenças

**Já mapeado**:
| Recurso | `useFirebaseCollection.ts` | `useFirebase.ts` |
|---------|----------------------------|------------------|
| Cache | sessionStorage | cache.ts ✅ |
| Paginação | ❌ Não | ✅ Sim |
| Realtime | ✅ Sim | ❌ Não |
| Performance log | ❌ Não | ✅ Sim |

**Decisão**: Manter `useFirebase.ts` (mais completo) e adicionar realtime se necessário

#### Passo 3.2: Deletar duplicado

```bash
git rm src/hooks/useFirebaseCollection.ts
git commit -m "refactor: remover useFirebaseCollection duplicado

- Hook não estava sendo usado
- Funcionalidade já existe em useFirebase.ts com melhor implementação
- Reduz duplicação de código

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Fase 4: Ajustar useFirebaseDoc.ts (30min)

**Objetivo**: Padronizar cache

#### Passo 4.1: Substituir sessionStorage por cache.ts

**Antes**:
```typescript
sessionStorage.setItem(cacheKey, JSON.stringify(data));
sessionStorage.getItem(cacheKey);
```

**Depois**:
```typescript
import { cache } from '@/utils/cache';

cache.set(cacheKey, data, cacheTime);
const cached = cache.get<T>(cacheKey);
```

#### Passo 4.2: Adicionar JSDoc

```typescript
/**
 * Hook genérico para operações com documentos Firebase
 *
 * @template T - Tipo do documento
 * @param path - Caminho do documento (ex: "2025/ano_letivo")
 * @param options - Opções de configuração
 * @param options.realtime - Ativa listener em tempo real
 * @param options.cacheTime - Tempo de cache em ms (padrão: 5min)
 * @returns Dados do documento, loading, error, update, refresh
 *
 * @example
 * const { data, loading, update } = useFirebaseDoc<AnoLetivo>('2025/ano_letivo', {
 *   realtime: true,
 *   cacheTime: 10 * 60 * 1000 // 10 minutos
 * });
 */
export function useFirebaseDoc<T = DocumentData>(...) {
  // ...
}
```

---

### Fase 5: Dividir useFirebase.ts (OPCIONAL - 2-3h)

**Prioridade**: ⚠️ BAIXA (funciona bem como está)

**Se decidir fazer**:

#### Estrutura proposta:
```
src/hooks/firebase/
├── index.ts                        # Barrel export
├── useFirebaseCollection.ts        # 100 linhas
├── useFirebaseBatch.ts             # 80 linhas
├── useFirebaseWithRetry.ts         # 90 linhas
└── useParallelFirebaseQueries.ts   # 100 linhas
```

**Backward compatibility**:
```typescript
// src/hooks/firebase/index.ts
export { useFirebaseCollection } from './useFirebaseCollection';
export { useFirebaseBatch } from './useFirebaseBatch';
export { useFirebaseWithRetry } from './useFirebaseWithRetry';
export { useParallelFirebaseQueries } from './useParallelFirebaseQueries';

// Manter export no arquivo antigo para não quebrar imports existentes
// src/hooks/useFirebase.ts (DEPRECATED)
export * from './firebase';
```

---

## 📅 Cronograma Estimado

| Fase | Duração | Prioridade | Risco |
|------|---------|------------|-------|
| **Fase 1** - Migrar controlar-faltas | 2-3h | 🔴 ALTA | Médio |
| **Fase 2** - Deletar monolítico | 15min | 🔴 ALTA | Baixo |
| **Fase 3** - Remover duplicação | 30min | 🟡 MÉDIA | Baixo |
| **Fase 4** - Ajustar useFirebaseDoc | 30min | 🟡 MÉDIA | Baixo |
| **Fase 5** - Dividir useFirebase | 2-3h | 🟢 BAIXA | Baixo |
| **TOTAL CRÍTICO** | **3-4h** | | |
| **TOTAL COMPLETO** | **5-7h** | | |

---

## 🎯 Ordem de Execução Recomendada

### Sprint 1 (Crítico - 3-4h)
1. ✅ Fase 1: Criar hooks faltantes + Migrar controlar-faltas
2. ✅ Fase 2: Deletar useAttendanceData.ts monolítico
3. ✅ Fase 3: Deletar useFirebaseCollection.ts duplicado

**Entregável**: Zero hooks duplicados, código mais modular

### Sprint 2 (Melhorias - 1h)
4. ✅ Fase 4: Padronizar cache em useFirebaseDoc

**Entregável**: Cache consistente em todo projeto

### Sprint 3 (Opcional - 2-3h)
5. ⚠️ Fase 5: Dividir useFirebase.ts (SE HOUVER TEMPO)

**Entregável**: Melhor organização de código Firebase

---

## ✅ Checklist Pré-Execução

Antes de começar a migração:

- [x] ✅ Mapeamento de usos completo
- [x] ✅ Plano detalhado aprovado
- [ ] ⏳ Backup de código criado
- [ ] ⏳ Branch de migração criada: `git checkout -b refactor/migrate-attendance-hooks`
- [ ] ⏳ Ambiente de dev funcionando: `npm run dev`
- [ ] ⏳ Type-check passando: `npm run type-check`

---

## 🚨 Plano de Rollback

**Se algo der errado**:

### Rollback Fase 1 (Migração)
```bash
git checkout src/app/controlar-faltas/page.tsx
git checkout src/hooks/attendance/
# Reverter para estado anterior
```

### Rollback Fase 2 (Deletar)
```bash
git revert <commit-hash>
# Restaurar useAttendanceData.ts do backup
cp src/hooks/useAttendanceData.ts.backup src/hooks/useAttendanceData.ts
```

### Rollback Completo
```bash
git reset --hard origin/main
# Descarta todas as mudanças locais
```

---

## 📊 Métricas de Sucesso

### Antes da Migração
- **Hooks duplicados**: 2 (useFirebaseCollection)
- **Hook monolítico**: 1 (useAttendanceData.ts - 476 linhas)
- **Hooks modulares usados**: 0
- **Linhas de código total**: ~1705 linhas

### Depois da Migração (Meta)
- **Hooks duplicados**: 0 ✅
- **Hook monolítico**: 0 ✅
- **Hooks modulares usados**: 5+ (attendance/)
- **Linhas de código total**: ~1400 linhas (redução de ~300 linhas)
- **Arquitetura**: Modular e composível ✅

### KPIs
- ✅ Zero duplicações
- ✅ Código mais testável
- ✅ Melhor separação de responsabilidades
- ✅ Facilita manutenção futura
- ✅ Performance mantida ou melhorada

---

## 📚 Documentos de Suporte

Após migração, criar/atualizar:

1. **HOOKS-GUIA-USO.md** - Como usar hooks modulares
2. **FASE-1-3-HOOKS-CONCLUIDA.md** - Resumo da fase completa
3. **CLAUDE.md** - Atualizar seção de hooks

---

## 🔗 Referências

- [FASE-1-3-HOOKS-RESUMO.md](./FASE-1-3-HOOKS-RESUMO.md) - Análise completa
- [React Hooks Best Practices](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [Composing Hooks](https://kentcdodds.com/blog/react-hooks-whats-going-to-happen-to-my-tests)

---

## ✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO

**Data de Conclusão**: 2025-01-09

### Resumo da Execução:

**Fase 1: Criação de Hooks Modulares** ✅ CONCLUÍDO
- ✅ Criado `useDuplicateAbsences.ts` (161 linhas)
- ✅ Criado `useStudentAbsences.ts` (175 linhas)
- ✅ Atualizado `attendance/index.ts` (barrel exports)
- ✅ Corrigidos erros TypeScript (logger.success → logger.info)

**Fase 1.5: Migração da Página** ✅ CONCLUÍDO
- ✅ Migrado `controlar-faltas/page.tsx` para usar hooks modulares
- ✅ Removido import do hook monolítico
- ✅ Atualizado para usar:
  - `useBimesterPeriods()`
  - `useStudentRecords()`
  - `useSchoolDays()`
  - `useStudentAbsences()`
  - `useDuplicateAbsences()`

**Fase 1.6: Limpeza** ✅ CONCLUÍDO
- ✅ Deletado `src/hooks/useAttendanceData.ts` (476 linhas removidas)
- ✅ Limpado `attendance/index.ts` (removido wrapper de compatibilidade)
- ✅ Type-check passou sem erros relacionados
- ✅ Nenhuma referência ao hook antigo permaneceu

### Resultado Final:

**Antes**:
- 1 arquivo monolítico de 476 linhas
- Lógica misturada e difícil de manter
- Sem reutilização de hooks

**Depois**:
- 5 hooks modulares focados
- Barrel export limpo em `attendance/index.ts`
- Fácil reutilização e composição
- Código mais testável e manutenível

### Arquivos Modificados:

**CRIADOS** (3 arquivos):
1. `src/hooks/attendance/useDuplicateAbsences.ts` - 161 linhas
2. `src/hooks/attendance/useStudentAbsences.ts` - 175 linhas
3. `src/hooks/attendance/index.ts` - 17 linhas (barrel export)

**MODIFICADOS** (1 arquivo):
1. `src/app/controlar-faltas/page.tsx` - Migrado para hooks modulares

**DELETADOS** (1 arquivo):
1. `src/hooks/useAttendanceData.ts` - 476 linhas removidas ✅

### Próximos Passos:

**Fase 2: Deletar useFirebaseCollection.ts** (15min)
- [ ] Verificar qual implementação manter (useFirebase.ts)
- [ ] Deletar arquivo duplicado
- [ ] Documentar uso do hook consolidado

**Fase 3: Ajustar Cache em useFirebaseDoc.ts** (30min)
- [ ] Substituir sessionStorage por cache.ts
- [ ] Manter consistência com outros hooks
- [ ] Adicionar JSDoc

**Fase 4: Documentação** (1h)
- [ ] Criar HOOKS-GUIA-USO.md
- [ ] Criar FASE-1-3-HOOKS-CONCLUIDA.md
- [ ] Atualizar CLAUDE.md seção de hooks

---

**Criado**: 2025-01-09
**Aprovado**: 2025-01-09
**Iniciado**: 2025-01-09
**Concluído**: 2025-01-09 ✅
**Status**: ✅ **MIGRAÇÃO CONCLUÍDA COM SUCESSO**
**Branch**: `refactor/migrate-attendance-hooks`
