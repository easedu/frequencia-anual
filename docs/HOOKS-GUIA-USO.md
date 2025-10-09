# 🎣 Guia de Uso dos Hooks Customizados

> **Documentação Completa**: Como usar os hooks customizados do projeto Frequência Anual
> **Última Atualização**: 2025-01-09
> **Status**: ✅ Atualizado (Fase 1.3 Concluída)

---

## 📋 Índice

1. [Visão Geral](#-visão-geral)
2. [Hooks de Autenticação](#-hooks-de-autenticação)
3. [Hooks de Dados](#-hooks-de-dados)
4. [Hooks de Frequência](#-hooks-de-frequência)
5. [Hooks Firebase Genéricos](#-hooks-firebase-genéricos)
6. [Padrões e Boas Práticas](#-padrões-e-boas-práticas)
7. [Troubleshooting](#-troubleshooting)

---

## 🎯 Visão Geral

### Estrutura de Hooks

```
src/hooks/
├── useAuth.ts                    # Autenticação Firebase
├── useStudents.ts                # Lista de estudantes
├── useFirebase.ts                # Coleções Firebase (genérico)
├── useFirebaseDoc.ts             # Documentos Firebase (genérico)
└── attendance/                   # Módulo de frequência
    ├── index.ts                  # Barrel export
    ├── useBimesterPeriods.ts     # Períodos dos bimestres
    ├── useSchoolDays.ts          # Dias letivos
    ├── useStudentRecords.ts      # Registros de frequência
    ├── useDuplicateAbsences.ts   # Detectar duplicatas
    └── useStudentAbsences.ts     # Faltas por estudante
```

### Filosofia

✅ **Modularidade**: Cada hook tem uma responsabilidade clara
✅ **Reutilização**: Hooks podem ser compostos
✅ **Type-Safety**: TypeScript em todos os hooks
✅ **Cache Padronizado**: Sistema centralizado via `cache.ts`
✅ **Performance**: Memoização e otimizações aplicadas

---

## 🔐 Hooks de Autenticação

### `useAuth()`

Hook para gerenciar autenticação do usuário.

**Localização**: `src/hooks/useAuth.ts`

#### Interface

```typescript
interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
```

#### Uso Básico

```typescript
import { useAuth } from '@/hooks/useAuth';

function LoginPage() {
  const { user, loading, signIn, signOut } = useAuth();

  const handleLogin = async () => {
    try {
      await signIn('usuario@exemplo.com', 'senha123');
    } catch (error) {
      console.error('Erro no login:', error);
    }
  };

  if (loading) return <div>Carregando...</div>;

  if (user) {
    return (
      <div>
        <p>Bem-vindo, {user.email}</p>
        <button onClick={signOut}>Sair</button>
      </div>
    );
  }

  return <button onClick={handleLogin}>Entrar</button>;
}
```

#### Quando Usar

- ✅ Qualquer página que precise verificar autenticação
- ✅ Componentes de login/logout
- ✅ Proteção de rotas

---

## 📊 Hooks de Dados

### `useStudents()`

Hook para carregar lista de estudantes ativos.

**Localização**: `src/hooks/useStudents.ts`

#### Interface

```typescript
interface UseStudentsReturn {
  students: Student[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}
```

#### Uso Básico

```typescript
import { useStudents } from '@/hooks/useStudents';

function StudentList() {
  const { students, loading, error, refresh } = useStudents();

  if (loading) return <Skeleton />;
  if (error) return <Error message={error.message} />;

  return (
    <div>
      <button onClick={refresh}>Atualizar</button>
      <ul>
        {students.map(student => (
          <li key={student.estudanteId}>{student.nome}</li>
        ))}
      </ul>
    </div>
  );
}
```

#### Quando Usar

- ✅ Listagens de estudantes
- ✅ Dashboards que mostram estudantes
- ✅ Seletores/dropdowns de estudantes

---

## 📅 Hooks de Frequência

Os hooks de frequência estão organizados no módulo `attendance/` e devem ser importados do barrel export.

### `useBimesterPeriods()`

Hook para obter períodos (datas de início e fim) de cada bimestre.

**Localização**: `src/hooks/attendance/useBimesterPeriods.ts`

#### Interface

```typescript
interface BimesterDates {
  [key: number]: { start: string; end: string };
}

interface UseBimesterPeriodsReturn {
  bimesterDates: BimesterDates;
  loading: boolean;
  error: Error | null;
  getBimesterByDate: (date: string) => number;
  getCurrentBimester: () => number;
  getBimesterRange: (bimester: number) => { start: string; end: string } | null;
  refresh: () => Promise<void>;
}
```

#### Uso Básico

```typescript
import { useBimesterPeriods } from '@/hooks/attendance';

function BimesterSelector() {
  const { bimesterDates, getCurrentBimester, getBimesterByDate } = useBimesterPeriods();

  const currentBimester = getCurrentBimester();

  return (
    <div>
      <p>Bimestre atual: {currentBimester}</p>
      {Object.entries(bimesterDates).map(([num, dates]) => (
        <div key={num}>
          <strong>Bimestre {num}</strong>: {dates.start} - {dates.end}
        </div>
      ))}
    </div>
  );
}
```

#### Quando Usar

- ✅ Filtros de período por bimestre
- ✅ Cálculos que dependem de datas bimestrais
- ✅ Validação de datas (verificar se está em período letivo)

---

### `useSchoolDays()`

Hook para calcular dias letivos em um período.

**Localização**: `src/hooks/attendance/useSchoolDays.ts`

#### Interface

```typescript
interface UseSchoolDaysReturn {
  schoolDays: Record<string, boolean>;
  loading: boolean;
  error: Error | null;
  getSchoolDaysForPeriod: (startDate: string, endDate: string) => number;
  getSchoolDaysUpToDate: (date: string) => number;
  refresh: () => Promise<void>;
}
```

#### Uso Básico

```typescript
import { useSchoolDays } from '@/hooks/attendance';

function AttendanceCalculator() {
  const { getSchoolDaysForPeriod, getSchoolDaysUpToDate } = useSchoolDays();

  const totalDays = getSchoolDaysForPeriod('01/02/2025', '30/04/2025');
  const daysUpToToday = getSchoolDaysUpToDate('15/03/2025');

  return (
    <div>
      <p>Total de dias letivos: {totalDays}</p>
      <p>Dias letivos até hoje: {daysUpToToday}</p>
    </div>
  );
}
```

#### Quando Usar

- ✅ Cálculo de frequência percentual
- ✅ Relatórios de faltas
- ✅ Dashboards com KPIs de presença

---

### `useStudentRecords()`

Hook para obter registros completos de frequência de estudantes.

**Localização**: `src/hooks/attendance/useStudentRecords.ts`

#### Interface

```typescript
interface StudentRecord {
  estudanteId: string;
  turma: string;
  nome: string;
  faltasB1: number;
  faltasB2: number;
  faltasB3: number;
  faltasB4: number;
  totalFaltas: number;
  percentualFrequencia: number;
  // ... mais campos
}

interface UseStudentRecordsReturn {
  studentRecords: StudentRecord[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}
```

#### Uso Básico

```typescript
import { useStudentRecords } from '@/hooks/attendance';

function FrequencyDashboard() {
  const { studentRecords, loading, refresh } = useStudentRecords({
    autoRefresh: true
  });

  if (loading) return <Skeleton />;

  return (
    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>Turma</th>
          <th>Faltas B1</th>
          <th>Faltas B2</th>
          <th>Faltas B3</th>
          <th>Faltas B4</th>
          <th>Total</th>
          <th>Frequência %</th>
        </tr>
      </thead>
      <tbody>
        {studentRecords.map(record => (
          <tr key={record.estudanteId}>
            <td>{record.nome}</td>
            <td>{record.turma}</td>
            <td>{record.faltasB1}</td>
            <td>{record.faltasB2}</td>
            <td>{record.faltasB3}</td>
            <td>{record.faltasB4}</td>
            <td>{record.totalFaltas}</td>
            <td>{record.percentualFrequencia.toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

#### Opções

```typescript
interface UseStudentRecordsOptions {
  turmaFilter?: string;       // Filtrar por turma
  statusFilter?: string;      // Filtrar por status (ATIVO, INATIVO)
  autoRefresh?: boolean;      // Atualizar automaticamente
}
```

#### Quando Usar

- ✅ Dashboards de frequência
- ✅ Relatórios completos de faltas
- ✅ Tabelas com dados consolidados

---

### `useDuplicateAbsences()`

Hook para detectar e remover faltas duplicadas no Firestore.

**Localização**: `src/hooks/attendance/useDuplicateAbsences.ts`

#### Interface

```typescript
interface AbsenceRecord {
  estudanteId: string;
  turma: string;
  data: string;
  docId: string;
  justified: boolean;
}

interface UseDuplicateAbsencesReturn {
  duplicates: AbsenceRecord[];
  loading: boolean;
  error: Error | null;
  fetchDuplicates: () => Promise<void>;
  removeDuplicates: () => Promise<void>;
}
```

#### Uso Básico

```typescript
import { useDuplicateAbsences } from '@/hooks/attendance';

function DuplicateChecker() {
  const { duplicates, loading, removeDuplicates } = useDuplicateAbsences();

  const handleRemove = async () => {
    if (confirm(`Remover ${duplicates.length} duplicatas?`)) {
      await removeDuplicates();
      alert('Duplicatas removidas!');
    }
  };

  if (loading) return <div>Verificando duplicatas...</div>;

  if (duplicates.length === 0) {
    return <div>✅ Nenhuma duplicata encontrada!</div>;
  }

  return (
    <div>
      <p>⚠️ {duplicates.length} duplicatas encontradas</p>
      <button onClick={handleRemove}>Remover Duplicatas</button>
      <ul>
        {duplicates.map(dup => (
          <li key={dup.docId}>
            {dup.estudanteId} - {dup.data}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

#### Quando Usar

- ✅ Manutenção de dados
- ✅ Limpeza periódica do banco
- ✅ Dashboards administrativos

---

### `useStudentAbsences()`

Hook para buscar faltas de um estudante específico, agrupadas por bimestre.

**Localização**: `src/hooks/attendance/useStudentAbsences.ts`

#### Interface

```typescript
interface StudentAbsencesByBimester {
  b1: string[];
  b2: string[];
  b3: string[];
  b4: string[];
}

interface UseStudentAbsencesReturn {
  absences: StudentAbsencesByBimester;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}
```

#### Uso Básico

```typescript
import { useStudentAbsences } from '@/hooks/attendance';

function StudentAbsenceDetail({ estudanteId }: { estudanteId: string }) {
  const { absences, loading, refresh } = useStudentAbsences(estudanteId, {
    excludeJustified: true
  });

  if (loading) return <Skeleton />;

  return (
    <div>
      <button onClick={refresh}>Atualizar</button>
      <h3>Faltas por Bimestre</h3>

      <div>
        <strong>1º Bimestre:</strong> {absences.b1.length} faltas
        <ul>{absences.b1.map(data => <li key={data}>{data}</li>)}</ul>
      </div>

      <div>
        <strong>2º Bimestre:</strong> {absences.b2.length} faltas
        <ul>{absences.b2.map(data => <li key={data}>{data}</li>)}</ul>
      </div>

      <div>
        <strong>3º Bimestre:</strong> {absences.b3.length} faltas
        <ul>{absences.b3.map(data => <li key={data}>{data}</li>)}</ul>
      </div>

      <div>
        <strong>4º Bimestre:</strong> {absences.b4.length} faltas
        <ul>{absences.b4.map(data => <li key={data}>{data}</li>)}</ul>
      </div>
    </div>
  );
}
```

#### Opções

```typescript
interface UseStudentAbsencesOptions {
  excludeJustified?: boolean;  // Excluir faltas justificadas (default: false)
}
```

#### Quando Usar

- ✅ Perfil detalhado de estudante
- ✅ Análise individual de faltas
- ✅ Relatórios por estudante

---

## 🔥 Hooks Firebase Genéricos

### `useFirebaseDoc<T>()`

Hook genérico para operações com documentos Firestore (com cache padronizado).

**Localização**: `src/hooks/useFirebaseDoc.ts`

#### Interface

```typescript
interface UseFirebaseDocReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  update: (newData: Partial<T>) => Promise<void>;
  refresh: () => Promise<void>;
}
```

#### Uso Básico

```typescript
import { useFirebaseDoc } from '@/hooks/useFirebaseDoc';

interface AnoLetivo {
  '1º Bimestre': { dates: any[]; startDate: string; endDate: string };
  '2º Bimestre': { dates: any[]; startDate: string; endDate: string };
  // ...
}

function AcademicYearConfig() {
  const { data, loading, update } = useFirebaseDoc<AnoLetivo>('2025/ano_letivo');

  if (loading) return <Skeleton />;
  if (!data) return <div>Não encontrado</div>;

  const handleUpdate = async () => {
    await update({
      '1º Bimestre': {
        ...data['1º Bimestre'],
        endDate: '30/04/2025'
      }
    });
  };

  return (
    <div>
      <h3>Ano Letivo 2025</h3>
      <button onClick={handleUpdate}>Atualizar Data</button>
    </div>
  );
}
```

#### Opções

```typescript
interface UseFirebaseDocOptions {
  realtime?: boolean;      // Listener em tempo real (default: false)
  cacheTime?: number;      // TTL do cache em ms (default: 5min)
}
```

#### Exemplos Avançados

**Real-time Listener**:
```typescript
const { data: profile } = useFirebaseDoc<UserProfile>(
  `users/${userId}`,
  { realtime: true }
);
```

**Cache Customizado**:
```typescript
const { data } = useFirebaseDoc('2025/ano_letivo', {
  cacheTime: 10 * 60 * 1000  // 10 minutos
});
```

#### Hooks Especializados

O `useFirebaseDoc` exporta hooks pré-configurados:

```typescript
// Hook para ano letivo (cache de 10min)
import { useAcademicYear } from '@/hooks/useFirebaseDoc';
const { data: anoLetivo } = useAcademicYear();

// Hook para perfil de usuário (real-time)
import { useUserProfile } from '@/hooks/useFirebaseDoc';
const { data: profile, update } = useUserProfile(userId);
```

#### Quando Usar

- ✅ Buscar documentos únicos do Firestore
- ✅ Configurações globais (ano letivo, etc)
- ✅ Perfis de usuário
- ✅ Dados que mudam raramente (bom para cache)

---

### `useFirebaseCollection<T>()`

Hook genérico para operações com coleções Firestore (com paginação e cache).

**Localização**: `src/hooks/useFirebase.ts`

#### Interface

```typescript
interface UseFirebaseCollectionResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  pagination: {
    hasMore: boolean;
    currentPage: number;
  };
}
```

#### Uso Básico

```typescript
import { useFirebaseCollection } from '@/hooks/useFirebase';
import { where, orderBy } from 'firebase/firestore';

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'completed';
}

function TaskList() {
  const { data: tasks, loading, loadMore, pagination } = useFirebaseCollection<Task>(
    'tasks',
    {
      constraints: [
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      ],
      enablePagination: true,
      pageSize: 20,
      cacheKey: 'pending-tasks',
      cacheTTL: 2 * 60 * 1000  // 2 minutos
    }
  );

  if (loading) return <Skeleton />;

  return (
    <div>
      <ul>
        {tasks.map(task => (
          <li key={task.id}>{task.title}</li>
        ))}
      </ul>

      {pagination.hasMore && (
        <button onClick={loadMore}>Carregar Mais</button>
      )}
    </div>
  );
}
```

#### Opções

```typescript
interface UseFirebaseCollectionOptions {
  cacheKey?: string;           // Chave para cache
  cacheTTL?: number;           // TTL do cache em ms
  enablePagination?: boolean;  // Habilitar paginação (default: false)
  pageSize?: number;           // Tamanho da página (default: 50)
  constraints?: QueryConstraint[];  // Filtros Firestore
}
```

#### Quando Usar

- ✅ Listas grandes de dados
- ✅ Dados que precisam de paginação
- ✅ Queries complexas com filtros

---

## ✅ Padrões e Boas Práticas

### 1. **Sempre Tipar os Hooks**

```typescript
// ✅ BOM
const { data, loading } = useFirebaseDoc<AnoLetivo>('2025/ano_letivo');

// ❌ RUIM
const { data, loading } = useFirebaseDoc('2025/ano_letivo');
```

### 2. **Use useMemo para Derivações**

```typescript
// ✅ BOM
const { studentRecords } = useStudentRecords();

const activeStudents = useMemo(() =>
  studentRecords.filter(s => s.totalFaltas < 10),
  [studentRecords]
);

// ❌ RUIM - Recalcula toda renderização
const activeStudents = studentRecords.filter(s => s.totalFaltas < 10);
```

### 3. **Tratamento de Erros**

```typescript
// ✅ BOM
const { data, loading, error } = useStudents();

if (loading) return <Skeleton />;
if (error) {
  return (
    <ErrorBoundary>
      <p>Erro ao carregar: {error.message}</p>
      <button onClick={refresh}>Tentar Novamente</button>
    </ErrorBoundary>
  );
}

// ❌ RUIM - Não trata erro
const { data } = useStudents();
return <div>{data.map(...)}</div>;  // Pode crashar!
```

### 4. **Evite Múltiplas Chamadas Desnecessárias**

```typescript
// ✅ BOM - Compartilha hook no componente pai
function ParentComponent() {
  const { students } = useStudents();

  return (
    <>
      <StudentList students={students} />
      <StudentCount students={students} />
    </>
  );
}

// ❌ RUIM - Cada filho chama o hook (2x queries!)
function StudentList() {
  const { students } = useStudents();
  // ...
}

function StudentCount() {
  const { students } = useStudents();
  // ...
}
```

### 5. **Use Cache Estrategicamente**

```typescript
// ✅ BOM - Dados que mudam raramente
const { data } = useFirebaseDoc('2025/ano_letivo', {
  cacheTime: 10 * 60 * 1000  // 10 minutos
});

// ✅ BOM - Dados em tempo real
const { data } = useFirebaseDoc(`users/${userId}`, {
  realtime: true
});

// ⚠️ CUIDADO - Dados que mudam frequentemente com cache alto
const { data } = useFirebaseDoc('tasks/active', {
  cacheTime: 30 * 60 * 1000  // 30 minutos - pode ficar desatualizado!
});
```

### 6. **Composição de Hooks**

Você pode compor múltiplos hooks para criar funcionalidades complexas:

```typescript
function useDashboardData() {
  const { students } = useStudents();
  const { studentRecords } = useStudentRecords();
  const { bimesterDates } = useBimesterPeriods();
  const { duplicates } = useDuplicateAbsences();

  const stats = useMemo(() => ({
    totalStudents: students.length,
    totalAbsences: studentRecords.reduce((sum, r) => sum + r.totalFaltas, 0),
    duplicatesCount: duplicates.length,
    currentBimester: getCurrentBimester(bimesterDates)
  }), [students, studentRecords, duplicates, bimesterDates]);

  return stats;
}

// Uso
function Dashboard() {
  const stats = useDashboardData();

  return (
    <div>
      <KPI label="Total de Estudantes" value={stats.totalStudents} />
      <KPI label="Total de Faltas" value={stats.totalAbsences} />
      <KPI label="Duplicatas" value={stats.duplicatesCount} />
    </div>
  );
}
```

---

## 🐛 Troubleshooting

### Problema: Hook não atualiza quando dados mudam no Firestore

**Causa**: Hook não está configurado para real-time ou cache muito longo

**Solução**:
```typescript
// Opção 1: Habilitar real-time
const { data } = useFirebaseDoc('path', { realtime: true });

// Opção 2: Reduzir cache
const { data } = useFirebaseDoc('path', { cacheTime: 1000 }); // 1 segundo

// Opção 3: Usar refresh manual
const { data, refresh } = useFirebaseDoc('path');
useEffect(() => {
  const interval = setInterval(refresh, 5000); // A cada 5s
  return () => clearInterval(interval);
}, [refresh]);
```

---

### Problema: "Loading" infinito

**Causa**: Erro na query ou path inválido

**Solução**:
```typescript
const { data, loading, error } = useFirebaseDoc('path');

useEffect(() => {
  if (error) {
    console.error('Erro ao carregar:', error);
  }
}, [error]);

// Verificar logs no console
```

---

### Problema: Dados duplicados aparecendo

**Causa**: Hook chamado múltiplas vezes ou cache inconsistente

**Solução**:
```typescript
// Verificar se hook está sendo chamado no lugar certo
// ✅ BOM - Uma vez no componente pai
function Parent() {
  const { data } = useStudents();
  return <Child data={data} />;
}

// ❌ RUIM - Chamado em cada filho
function Child() {
  const { data } = useStudents(); // Evitar!
}

// Se necessário limpar cache:
import { cache } from '@/utils/cache';
cache.invalidateNamespace('firebase-doc');
```

---

### Problema: Performance ruim com muitos dados

**Causa**: Carregar dados demais de uma vez

**Solução**:
```typescript
// Use paginação
const { data, loadMore, pagination } = useFirebaseCollection('collection', {
  enablePagination: true,
  pageSize: 50
});

// Ou limite com constraints
import { limit } from 'firebase/firestore';
const { data } = useFirebaseCollection('collection', {
  constraints: [limit(100)]
});
```

---

## 📚 Exemplos Completos

### Dashboard Completo de Frequência

```typescript
import {
  useBimesterPeriods,
  useStudentRecords,
  useSchoolDays,
  useDuplicateAbsences
} from '@/hooks/attendance';
import { useStudents } from '@/hooks/useStudents';

function FrequencyDashboard() {
  const { students } = useStudents();
  const { bimesterDates, getCurrentBimester } = useBimesterPeriods();
  const { studentRecords, loading } = useStudentRecords({ autoRefresh: true });
  const { getSchoolDaysForPeriod } = useSchoolDays();
  const { duplicates, removeDuplicates } = useDuplicateAbsences();

  const currentBimester = getCurrentBimester();
  const totalDays = getSchoolDaysForPeriod('01/02/2025', '30/12/2025');

  const stats = useMemo(() => ({
    totalStudents: students.length,
    totalAbsences: studentRecords.reduce((sum, r) => sum + r.totalFaltas, 0),
    avgFrequency: studentRecords.reduce((sum, r) => sum + r.percentualFrequencia, 0) / studentRecords.length,
    duplicatesCount: duplicates.length
  }), [students, studentRecords, duplicates]);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="dashboard">
      <h1>Dashboard de Frequência - Bimestre {currentBimester}</h1>

      <div className="kpis">
        <KPI label="Total de Estudantes" value={stats.totalStudents} />
        <KPI label="Total de Faltas" value={stats.totalAbsences} />
        <KPI label="Frequência Média" value={`${stats.avgFrequency.toFixed(1)}%`} />
        <KPI label="Dias Letivos" value={totalDays} />
      </div>

      {stats.duplicatesCount > 0 && (
        <Alert variant="warning">
          {stats.duplicatesCount} duplicatas encontradas.
          <button onClick={removeDuplicates}>Remover</button>
        </Alert>
      )}

      <FrequencyTable data={studentRecords} />
    </div>
  );
}
```

---

## 🎓 Recursos Adicionais

- **CLAUDE.md**: Diretrizes completas do projeto
- **FASE-1-3-CONCLUIDA.md**: Resumo executivo da refatoração de hooks
- **React Hooks Docs**: https://react.dev/reference/react

---

**Última Atualização**: 2025-01-09
**Mantenedor**: Equipe Frequência Anual
**Versão**: 1.0.0
