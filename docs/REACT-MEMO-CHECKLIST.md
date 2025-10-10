# ✅ React.memo - Checklist de Otimização

> **Data**: 2025-10-10
> **Objetivo**: Evitar re-renders desnecessários em componentes críticos

## 🎯 Componentes que DEVEM ter React.memo

### Prioridade ALTA (renderizados em listas/repetidamente)

#### Dashboard Cards
- [x] `KPIsCard.tsx` - Dashboard principal
- [ ] `FrequencyTableCard.tsx` - Tabela de frequência
- [ ] `ComparativeChartsCard.tsx` - Gráficos comparativos
- [ ] `TemporalAnalysisCard.tsx` - Análise temporal
- [ ] `FiltersCard.tsx` - Card de filtros
- [ ] `StudentAbsencesCard.tsx` - Faltas por estudante
- [ ] `DayOfWeekDistributionCard.tsx` - Distribuição semanal
- [ ] `DuplicateAbsencesCard.tsx` - Duplicatas
- [ ] `AlertsCard.tsx` - Alertas

#### Charts (renderizados repetidamente)
- [ ] `DistributionChart.tsx`
- [ ] `TurmaFrequencyGrid.tsx`
- [ ] `TurmaComparisonChart.tsx`
- [ ] `EvolutionChart.tsx`
- [ ] `HeatmapFaltas.tsx`

#### Students (lista de 700+ itens)
- [ ] `StudentTable.tsx` - Linha da tabela (CRÍTICO!)
- [ ] `StudentInfoCard.tsx` - Card de info
- [ ] `StudentFilters.tsx` - Filtros

#### Attendance
- [ ] `RegisteredAbsencesCard.tsx`
- [ ] `FrequencyAllAbsencesCard.tsx`
- [ ] `FrequencyNoJustifiedCard.tsx`
- [ ] `RegisterAtestadoCard.tsx`
- [ ] `AtestadoHistoryCard.tsx`
- [ ] `RegisterSuspensaoCard.tsx`
- [ ] `BimesterAbsences.tsx`

#### Interactions
- [ ] `RegisterInteractionCard.tsx`
- [ ] `InteractionHistoryCard.tsx`
- [ ] `InteractionChartsCard.tsx`
- [ ] `RegisterOccurrenceCard.tsx`
- [ ] `OccurrenceHistoryCard.tsx`
- [ ] `SuspensaoHistoryCard.tsx`

#### Tasks
- [ ] `TaskManager.tsx`
- [ ] `TaskDashboard.tsx`

### Prioridade MÉDIA

#### Shared
- [ ] `CustomCard.tsx`

#### WhatsApp
- [ ] `WhatsAppModal.tsx` - Apenas se usado repetidamente
- [ ] `WhatsAppContactSelector.tsx`

### ⚠️ NÃO adicionar React.memo

- Layout components (Header, Footer) - Renderizam 1x
- Páginas (page.tsx) - Não são reusados
- Componentes muito simples (< 10 linhas)
- Componentes que sempre recebem props diferentes

## 📝 Como Adicionar React.memo

### Template:

```typescript
// ANTES
export default function MyComponent({ prop1, prop2 }: Props) {
  return <div>...</div>;
}

// DEPOIS
import { memo } from 'react';

const MyComponent = memo(function MyComponent({ prop1, prop2 }: Props) {
  return <div>...</div>;
});

export default MyComponent;
```

### Com displayName (recomendado para debugging):

```typescript
import { memo } from 'react';

const MyComponent = memo(function MyComponent({ prop1, prop2 }: Props) {
  return <div>...</div>;
});

MyComponent.displayName = 'MyComponent';

export default MyComponent;
```

### Com comparação customizada (avançado):

```typescript
import { memo } from 'react';

const MyComponent = memo(
  function MyComponent({ data }: Props) {
    return <div>{data.name}</div>;
  },
  (prevProps, nextProps) => {
    // Retorna true se NÃO deve re-renderizar
    return prevProps.data.id === nextProps.data.id;
  }
);

export default MyComponent;
```

## 🔍 Como Identificar Componentes que Precisam

### Sinais:
1. Renderizado em lista/loop
2. Props raramente mudam
3. Computação pesada no render
4. Re-renders frequentes (ver React DevTools Profiler)

### React DevTools Profiler:
1. Abrir DevTools → Profiler
2. Clicar em "Record"
3. Interagir com app
4. Parar recording
5. Ver componentes que re-renderizam muito

## ⚡ Impacto Esperado

### Antes (sem memo):
- Mudança em 1 card → Todos os cards re-renderizam
- Filtro muda → 700 linhas de tabela re-renderizam
- Estado global muda → Dashboard inteiro re-renderiza

### Depois (com memo):
- Mudança em 1 card → Apenas aquele card re-renderiza
- Filtro muda → Apenas linhas afetadas re-renderizam
- Estado global muda → Apenas componentes com props diferentes re-renderizam

**Ganho estimado**: 40-60% menos re-renders em operações comuns

## ✅ Checklist de Implementação

Para cada componente:
- [ ] Adicionar `import { memo } from 'react'`
- [ ] Converter para `const Component = memo(function Component() { ... })`
- [ ] Adicionar `displayName` (opcional mas recomendado)
- [ ] Testar que funcionalidade permanece intacta
- [ ] Verificar no Profiler se re-renders diminuíram

## 🎯 Meta da Fase 1.5

- [ ] 15+ componentes com React.memo
- [ ] Todos os cards do dashboard
- [ ] Componentes de tabela/lista
- [ ] Componentes de charts

---

**Status**: Em progresso
**Concluído**: 1/40 componentes
