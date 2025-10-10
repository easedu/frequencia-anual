# 🔧 Correções no Dashboard de Frequência

**Data**: 2025-10-10
**Arquivo corrigido**: `src/hooks/attendance/useStudentRecords.ts`

---

## 🐛 Problemas Identificados

### 1. **Estudantes Inativos Incluídos nos Cálculos** ❌

**Problema**: O hook `useStudentRecords` buscava TODOS os estudantes do Firestore, incluindo:
- INATIVOS
- TRANSFERIDOS
- DESLIGADOS

**Impacto**:
- Números inflados no dashboard
- KPIs incorretos
- Faltas de estudantes inativos sendo contabilizadas
- Confusão nos relatórios

**Localização**: [useStudentRecords.ts:107-116](../src/hooks/attendance/useStudentRecords.ts#L107-L116)

**Código anterior**:
```typescript
// Get all students (V3 only)
let students = await StudentDataService.getStudents();

// Apply filters
if (statusFilter) {
  students = students.filter(s => s.status === statusFilter);
}
```

**Problema**: Filtro de status era **opcional** e não era passado pela página `controlar-faltas`.

---

### 2. **Parse Incorreto de Datas (DD/MM/YYYY → MM/DD/YYYY)** ❌

**Problema**: O código usava `new Date(abs.data)` diretamente com strings no formato brasileiro `DD/MM/YYYY`, mas JavaScript interpreta como formato americano `MM/DD/YYYY`.

**Exemplo do erro**:
```typescript
// Data armazenada: "10/03/2025" (10 de março)
new Date("10/03/2025") // JavaScript interpreta como: 3 de outubro ❌
```

**Impacto**:
- Faltas contabilizadas no bimestre errado
- Números trocados entre B1/B2 ou B3/B4
- Cálculos de "faltas até hoje" incorretos

**Localização**: [useStudentRecords.ts:31-77](../src/hooks/attendance/useStudentRecords.ts#L31-L77)

**Código anterior**:
```typescript
const faltasB1 = absences.filter(abs => {
  const date = new Date(abs.data); // ❌ Formato errado!
  const b1 = periods[1];
  return b1 && date >= new Date(b1.start) && date <= new Date(b1.end);
}).length;
```

---

## ✅ Correções Aplicadas

### 1. **Filtro Padrão por Status ATIVO**

**Solução**: Filtrar por `status: 'ATIVO'` por padrão, mas permitir override explícito.

**Código corrigido**:
```typescript
// ✅ FILTRO PADRÃO: Apenas estudantes ATIVOS
// Se statusFilter for explicitamente passado, usa ele. Caso contrário, filtra por ATIVO.
const effectiveStatusFilter = statusFilter !== undefined ? statusFilter : 'ATIVO';

if (effectiveStatusFilter) {
  students = students.filter(s => s.status === effectiveStatusFilter);
  logger.info(`🎯 Filtrando estudantes por status: ${effectiveStatusFilter} (${students.length} encontrados)`);
}
```

**Como usar**:
```typescript
// ✅ Padrão: Apenas ATIVOS
const { studentRecords } = useStudentRecords({ autoRefresh: true });

// ✅ Incluir todos (se necessário)
const { studentRecords } = useStudentRecords({ statusFilter: '' });

// ✅ Apenas INATIVOS (relatórios específicos)
const { studentRecords } = useStudentRecords({ statusFilter: 'INATIVO' });
```

---

### 2. **Parse Correto de Datas Brasileiras**

**Solução**: Usar a função `parseDate` do `@/utils/dateUtils` que converte corretamente `DD/MM/YYYY`.

**Import adicionado**:
```typescript
import { parseDate } from '@/utils/dateUtils';
```

**Código corrigido**:
```typescript
// ✅ FIX: Usar parseDate para converter formato brasileiro DD/MM/YYYY corretamente
const faltasB1 = absences.filter(abs => {
  const date = parseDate(abs.data);
  const b1 = periods[1];
  if (!date || !b1) return false;
  const startDate = parseDate(b1.start);
  const endDate = parseDate(b1.end);
  return startDate && endDate && date >= startDate && date <= endDate;
}).length;

// Mesma correção aplicada para B2, B3, B4 e "faltas até hoje"
```

**Melhorias adicionais**:
```typescript
// Calculate today's absences
const today = new Date();
today.setHours(0, 0, 0, 0); // ✅ Zerar horas para comparação correta
const faltasAteHoje = absences.filter(abs => {
  const date = parseDate(abs.data);
  return date && date <= today;
}).length;
```

---

## 📊 Impacto Esperado

### Antes das Correções ❌
- Dashboard incluía ~30-50 estudantes inativos
- Faltas de março apareciam em outubro
- Faltas de outubro apareciam em março
- KPIs inflados/incorretos
- Percentuais de frequência distorcidos

### Depois das Correções ✅
- Dashboard mostra apenas estudantes ATIVOS
- Faltas contabilizadas no bimestre correto
- KPIs precisos e confiáveis
- Relatórios refletem a realidade
- Números batem com expectativas

---

## 🧪 Testes Recomendados

### Teste 1: Verificar Filtro de Status
1. Acessar `/controlar-faltas`
2. Verificar console do browser: deve mostrar log `🎯 Filtrando estudantes por status: ATIVO`
3. Conferir total de estudantes no KPI card
4. Comparar com total de estudantes ATIVOS no Firestore

### Teste 2: Verificar Cálculo de Faltas por Bimestre
1. Escolher um estudante específico
2. Ver faltas em cada bimestre no dashboard
3. Conferir manualmente no Firestore (`absenceControl`) as datas das faltas
4. Verificar se estão no bimestre correto

**Períodos dos Bimestres 2025** (verificar em `2025/ano_letivo`):
- B1: 03/02/2025 a 10/05/2025
- B2: 13/05/2025 a 25/07/2025
- B3: 04/08/2025 a 10/10/2025
- B4: 13/10/2025 a 19/12/2025

### Teste 3: Validar "Faltas Até Hoje"
1. Ver campo "totalFaltasAteHoje" de um estudante
2. Contar manualmente faltas com data <= hoje
3. Verificar se o número bate

---

## 🔍 Logs Adicionados

O hook agora loga informações úteis:

```typescript
logger.info(`🎯 Filtrando estudantes por status: ${effectiveStatusFilter} (${students.length} encontrados)`);
```

**Como ver**:
- Abrir DevTools do browser (F12)
- Aba Console
- Buscar por "Filtrando estudantes"

---

## 📚 Arquivos Relacionados

- **Hook corrigido**: [src/hooks/attendance/useStudentRecords.ts](../src/hooks/attendance/useStudentRecords.ts)
- **Página que usa**: [src/app/controlar-faltas/page.tsx](../src/app/controlar-faltas/page.tsx)
- **Utilitário de datas**: [src/utils/dateUtils.ts](../src/utils/dateUtils.ts)
- **Componentes afetados**:
  - [src/components/cards/KPIsCard.tsx](../src/components/cards/KPIsCard.tsx)
  - [src/components/cards/AlertsCard.tsx](../src/components/cards/AlertsCard.tsx)
  - [src/components/cards/FrequencyTableCard.tsx](../src/components/cards/FrequencyTableCard.tsx)
  - Todos os cards que recebem `data: StudentRecord[]`

---

## ⚠️ Atenção

### Comportamento Padrão Mudou

**Antes**: Incluía todos os estudantes (ATIVO + INATIVO + TRANSFERIDO...)
**Agora**: Inclui apenas estudantes ATIVOS por padrão

Se alguma página/relatório precisar de estudantes inativos, deve passar explicitamente:
```typescript
const { studentRecords } = useStudentRecords({
  statusFilter: '' // String vazia = incluir todos
});
```

---

## ✅ Status

- [x] Problema identificado
- [x] Correções aplicadas
- [x] Documentação criada
- [ ] Testes manuais (VOCÊ PRECISA FAZER)
- [ ] Validação com dados reais

**Próximo passo**: Recarregar o dashboard (`/controlar-faltas`) e verificar se os números agora batem! 🚀
