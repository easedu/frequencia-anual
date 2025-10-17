# 📋 ESTRATÉGIA DE REFATORAÇÃO: perfil-deficiente

**Data**: 2025-01-17
**Status**: ⏳ **PLANEJAMENTO ESTRATÉGICO**
**Complexidade**: 🔴 **ALTA** (1474 linhas, 23 estados, 5 effects, 7 memos, 6 gráficos)
**Tempo estimado**: 1.5-2 horas
**Redução esperada**: 1474 → ~500 linhas (-66%)

---

## 📊 ANÁLISE DA COMPLEXIDADE ATUAL

### Métricas
- **Total de linhas**: 1474
- **Estados (useState)**: 23
- **Effects (useEffect)**: 5
- **Memos (useMemo)**: 7
- **Gráficos (Recharts)**: 6

### Categorias de Estados

#### 1. Filtros (11 estados)
```typescript
filtroTipoDeficiencia, setFiltroTipoDeficiencia
filtroInstituicao, setFiltroInstituicao
filtroAee, setFiltroAee
filtroHorario, setFiltroHorario
filtroEstagiario, setFiltroEstagiario
filtroAve, setFiltroAve
filtroTurma, setFiltroTurma
filtroTabelaEstagiario, setFiltroTabelaEstagiario
filtroTabelaAve, setFiltroTabelaAve
filtroTabelaEstudantes, setFiltroTabelaEstudantes
filtroTabelaOcorrencias, setFiltroTabelaOcorrencias
```

#### 2. Ordenação (2 estados)
```typescript
sortEstagiario, setSortEstagiario
sortAve, setSortAve
```

#### 3. Ocorrências (8 estados)
```typescript
selectedStudent, setSelectedStudent
occurrenceDate, setOccurrenceDate
occurrenceDescription, setOccurrenceDescription
occurrenceSensitive, setOccurrenceSensitive
editingOccurrence, setEditingOccurrence
occurrences, setOccurrences
showDeleteOccurrenceDialog, setShowDeleteOccurrenceDialog
isOccurrenceSectionVisible, setIsOccurrenceSectionVisible
```

#### 4. Autenticação/Permissões (1 estado)
```typescript
userRole, setUserRole
```

### Categorias de useMemo

#### 1. Filtros de Dados (3 memos)
```typescript
filteredStudents (379 linhas) - Filtra estudantes com deficiência
filteredEstagiarios (459 linhas) - Agrupa por estagiário
filteredAves (484 linhas) - Agrupa por AVE
```

#### 2. Dados para Gráficos (6 charts - processados inline)
- Tipo de Deficiência
- Instituição de Apoio
- AEE (PAEE/PAAI)
- Horário AEE
- Estagiário
- AVE

---

## 🎯 ESTRATÉGIA DE REFATORAÇÃO

### Fase 1: Hook Centralizado (Prioridade MÁXIMA)

**Arquivo**: `src/hooks/useDisabilityProfile.ts` (~600 linhas)

**Responsabilidades**:
- ✅ Gerenciar 23 estados
- ✅ 5 useEffects
- ✅ 7 useMemos (filteredStudents, charts, etc)
- ✅ Handlers de filtros
- ✅ Handlers de ocorrências (CRUD completo)
- ✅ Lógica de permissões (userRole)

**Benefício**: **ENORME** - Consolida ~800-900 linhas de lógica

---

### Fase 2: Componentes de UI

#### 2.1 DisabilityFilters.tsx (~120 linhas)

**Localização**: `src/components/disability/DisabilityFilters.tsx`

**Responsabilidades**:
- ✅ StudentSelector (turma)
- ✅ Filtros de características (6 selects)
  - Tipo de Deficiência
  - Instituição
  - AEE
  - Horário
  - Estagiário
  - AVE

**Props**:
```typescript
interface DisabilityFiltersProps {
  // Seletor de estudante/turma
  students: Estudante[];
  selectedClass: string | null;
  onClassChange: (turma: string) => void;

  // Filtros
  filtroTipoDeficiencia: string;
  onFiltroTipoDeficienciaChange: (value: string) => void;
  filtroInstituicao: string;
  onFiltroInstituicaoChange: (value: string) => void;
  filtroAee: string;
  onFiltroAeeChange: (value: string) => void;
  filtroHorario: string;
  onFiltroHorarioChange: (value: string) => void;
  filtroEstagiario: string;
  onFiltroEstagiarioChange: (value: string) => void;
  filtroAve: string;
  onFiltroAveChange: (value: string) => void;
}
```

---

#### 2.2 DisabilityStats.tsx (~100 linhas)

**Localização**: `src/components/disability/DisabilityStats.tsx`

**Responsabilidades**:
- ✅ Cards de estatísticas (4 cards principais)
  - Total de Estudantes com Deficiência
  - Tipos de Deficiência
  - Com Barreiras de Acesso
  - Com AEE

**Props**:
```typescript
interface DisabilityStatsProps {
  totalComDeficiencia: number;
  totalTiposDeficiencia: number;
  totalComBarreiras: number;
  totalComAee: number;
}
```

---

#### 2.3 DisabilityCharts.tsx (~200 linhas)

**Localização**: `src/components/disability/DisabilityCharts.tsx`

**Responsabilidades**:
- ✅ 6 gráficos de pizza (Recharts PieChart)
  - Tipo de Deficiência
  - Instituição de Apoio
  - AEE (PAEE/PAAI)
  - Horário AEE
  - Estagiário
  - AVE

**Props**:
```typescript
interface DisabilityChartsProps {
  chartTipoDeficiencia: ChartData[];
  chartInstituicao: ChartData[];
  chartAee: ChartData[];
  chartHorario: ChartData[];
  chartEstagiario: ChartData[];
  chartAve: ChartData[];
}

interface ChartData {
  name: string;
  value: number;
}
```

**Benefício**: Consolida ~300 linhas de código de gráficos repetitivos

---

#### 2.4 DisabilityTables.tsx (~200 linhas)

**Localização**: `src/components/disability/DisabilityTables.tsx`

**Responsabilidades**:
- ✅ Tabela de Estagiários (com busca e ordenação)
- ✅ Tabela de AVEs (com busca e ordenação)

**Props**:
```typescript
interface DisabilityTablesProps {
  // Estagiários
  filteredEstagiarios: EstagiarioGroup[];
  filtroTabelaEstagiario: string;
  onFiltroTabelaEstagiarioChange: (value: string) => void;
  sortEstagiario: "asc" | "desc" | null;
  onSortEstagiarioChange: (sort: "asc" | "desc" | null) => void;

  // AVEs
  filteredAves: AveGroup[];
  filtroTabelaAve: string;
  onFiltroTabelaAveChange: (value: string) => void;
  sortAve: "asc" | "desc" | null;
  onSortAveChange: (sort: "asc" | "desc" | null) => void;
}
```

---

#### 2.5 OccurrenceManager.tsx (~250 linhas)

**Localização**: `src/components/disability/OccurrenceManager.tsx`

**Responsabilidades**:
- ✅ Formulário de ocorrências (criar/editar)
- ✅ Lista de ocorrências do estudante
- ✅ Ações (editar, deletar)
- ✅ Dialog de confirmação de exclusão

**Props**:
```typescript
interface OccurrenceManagerProps {
  selectedStudent: Estudante | null;
  occurrences: Ocorrencia[];
  occurrenceDate: string;
  onOccurrenceDateChange: (date: string) => void;
  occurrenceDescription: string;
  onOccurrenceDescriptionChange: (desc: string) => void;
  occurrenceSensitive: boolean;
  onOccurrenceSensitiveChange: (sensitive: boolean) => void;
  editingOccurrence: Ocorrencia | null;
  userRole: string | null;
  onAddOccurrence: () => Promise<void>;
  onEditOccurrence: () => Promise<void>;
  onDeleteOccurrence: (id: string) => Promise<void>;
  onStartEdit: (occ: Ocorrencia) => void;
  onCancelEdit: () => void;
}
```

---

### Fase 3: Arquivo Principal Refatorado

**Arquivo**: `src/app/perfil-deficiente/page.tsx` (~500 linhas)

**Estrutura**:
```typescript
export default function DashboardDeficiencia() {
  // 1. Hooks básicos
  const { students, loading, error } = useStudents();

  // 2. Hook centralizado (TODA lógica)
  const {
    // Filtros
    filtroTipoDeficiencia, setFiltroTipoDeficiencia,
    filtroTurma, setFiltroTurma,
    // ... todos os 23 estados

    // Computed
    filteredStudents,
    filteredEstagiarios,
    filteredAves,
    chartData, // 6 gráficos
    stats, // 4 estatísticas

    // Handlers
    handleAddOccurrence,
    handleEditOccurrence,
    handleDeleteOccurrence,
  } = useDisabilityProfile({ students });

  // 3. Loading state
  if (loading) return <Skeleton />;

  // 4. Renderização limpa (composição)
  return (
    <div>
      {/* Header */}

      {/* Stats */}
      <DisabilityStats {...stats} />

      {/* Filters */}
      <DisabilityFilters
        students={students}
        selectedClass={filtroTurma}
        onClassChange={setFiltroTurma}
        filtroTipoDeficiencia={filtroTipoDeficiencia}
        onFiltroTipoDeficienciaChange={setFiltroTipoDeficiencia}
        {...otherFilters}
      />

      {/* Charts */}
      <DisabilityCharts {...chartData} />

      {/* Tables */}
      <DisabilityTables
        filteredEstagiarios={filteredEstagiarios}
        filteredAves={filteredAves}
        {...tableProps}
      />

      {/* Occurrences */}
      {isOccurrenceSectionVisible && (
        <OccurrenceManager
          selectedStudent={selectedStudent}
          occurrences={occurrences}
          {...occurrenceProps}
        />
      )}
    </div>
  );
}
```

---

## 📊 ESTIMATIVA DE REDUÇÃO

| Componente | Antes | Depois | Redução |
|------------|-------|--------|---------|
| **Hook** | - | 600 linhas | +600 (novo) |
| **DisabilityFilters** | - | 120 linhas | +120 (novo) |
| **DisabilityStats** | - | 100 linhas | +100 (novo) |
| **DisabilityCharts** | - | 200 linhas | +200 (novo) |
| **DisabilityTables** | - | 200 linhas | +200 (novo) |
| **OccurrenceManager** | - | 250 linhas | +250 (novo) |
| **page.tsx (principal)** | 1474 | ~500 | **-974 linhas** |
| **TOTAL** | 1474 | 1970 | +496 linhas |

**Redução no arquivo principal**: **-66%** (1474 → 500)

---

## 💰 ROI ESPERADO

### Métricas

| Métrica | Valor |
|---------|-------|
| **Tempo estimado** | 1.5-2 horas |
| **Linhas no principal reduzidas** | 974 linhas (-66%) |
| **Componentes criados** | 5 reutilizáveis |
| **Hook criado** | 1 (useDisabilityProfile) |
| **Complexidade antes** | 🔴 MUITO ALTA |
| **Complexidade depois** | 🟢 BAIXA |
| **Manutenibilidade** | ⭐⭐⭐⭐⭐ |

---

## 🎯 PRIORIDADES DE EXECUÇÃO

### Prioridade 1 (CRÍTICA)
✅ **useDisabilityProfile Hook**
- Consolida 23 estados
- Maior impacto na simplificação
- Facilita todas as outras extrações

### Prioridade 2 (ALTA)
✅ **DisabilityCharts**
- Código repetitivo (~300 linhas)
- Alto impacto visual
- Reutilizável em outros dashboards

### Prioridade 3 (MÉDIA)
✅ **OccurrenceManager**
- Lógica complexa de CRUD
- Estado isolado
- Reutilizável em perfil-estudante

### Prioridade 4 (BAIXA)
✅ **DisabilityFilters, DisabilityStats, DisabilityTables**
- Complementam a refatoração
- Menor complexidade

---

## 🔄 LIÇÕES DAS REFATORAÇÕES ANTERIORES

### Do marcar-faltas (Sucesso #1):
- ✅ Hook-first funciona perfeitamente
- ✅ Componentes pequenos são mais reutilizáveis
- ✅ Memoização em tudo

### Do telefones (Sucesso #2):
- ✅ Segunda refatoração foi mais rápida (45min vs 1h)
- ✅ Padrões já estabelecidos
- ✅ ContactFilters pode ser base para DisabilityFilters

### Para perfil-deficiente:
- ✅ Usar mesma estrutura de componentes
- ✅ Hook será o maior (600 linhas) mas vale a pena
- ✅ Charts podem usar mesmo componente base

---

## 📝 CHECKLIST DE EXECUÇÃO

### Fase Preparatória
- [ ] Criar pasta `src/components/disability/`
- [ ] Criar barrel export `src/components/disability/index.ts`
- [ ] Backup do arquivo original

### Fase 1: Hook
- [ ] Criar `useDisabilityProfile.ts`
- [ ] Migrar 23 estados
- [ ] Migrar 5 useEffects
- [ ] Migrar 7 useMemos
- [ ] Migrar handlers de ocorrências
- [ ] Testar isoladamente

### Fase 2: Componentes
- [ ] Criar `DisabilityFilters.tsx`
- [ ] Criar `DisabilityStats.tsx`
- [ ] Criar `DisabilityCharts.tsx`
- [ ] Criar `DisabilityTables.tsx`
- [ ] Criar `OccurrenceManager.tsx`
- [ ] Adicionar React.memo em todos

### Fase 3: Integração
- [ ] Refatorar `page.tsx`
- [ ] Integrar hook
- [ ] Integrar componentes
- [ ] Testar funcionalidade
- [ ] Verificar TypeScript
- [ ] Contar linhas

### Fase 4: Validação
- [ ] Testar todos os filtros
- [ ] Testar gráficos
- [ ] Testar ocorrências (CRUD)
- [ ] Testar permissões (user roles)
- [ ] Verificar performance

---

## 🎓 CONCLUSÃO

A refatoração de `perfil-deficiente` seguirá o **mesmo padrão de sucesso** de marcar-faltas e telefones, mas com **maior complexidade** devido a:

1. **23 estados** (vs 14 em marcar-faltas, 18 em telefones)
2. **6 gráficos** (código muito repetitivo)
3. **Sistema de ocorrências** (CRUD completo)
4. **3 tabelas** com filtros e ordenação

**Porém**, a estratégia já está **comprovada** e **madura**. Com os padrões estabelecidos nas 2 refatorações anteriores, esta será executada com **alta confiança** e **previsibilidade**.

**Estimativa final**: 1.5-2h de trabalho para reduzir 66% do código principal e criar 5 componentes altamente reutilizáveis.

---

**Status**: ⏳ **PRONTO PARA EXECUÇÃO**
**Próximo Passo**: Executar Fase 1 (Hook) ou aguardar confirmação do usuário.
