# 📋 SUGESTÕES DE MELHORIAS - Projeto Frequência Anual

> **Documento gerado em**: 2025-10-09
> **Foco**: Melhorias sem custo adicional, base sólida antes de novas funcionalidades

---

## 📑 ÍNDICE

1. [Arquitetura do Projeto](#1-arquitetura-do-projeto)
2. [Arquitetura do Banco de Dados](#2-arquitetura-do-banco-de-dados)
3. [Melhorias de UX e Funcionalidades Existentes](#3-melhorias-de-ux-e-funcionalidades-existentes)
4. [Novas Funcionalidades (Sem Custo)](#4-novas-funcionalidades-sem-custo)
5. [Roadmap de Implementação](#5-roadmap-de-implementação)
6. [Análise de Custos](#6-análise-de-custos)

---

## 1. ARQUITETURA DO PROJETO

### 1.1 Estado Atual

#### ✅ Pontos Fortes
```
✓ Next.js 15 (App Router)
✓ TypeScript com tipagem centralizada (src/types/index.ts)
✓ Migração V3 completa (UUID)
✓ StudentDataService bem estruturado
✓ Soft-delete implementado
✓ Auditoria de dados (createdAt, updatedAt)
✓ Componentes UI com shadcn/ui
✓ Firebase Firestore + Auth
```

#### ⚠️ Pontos de Melhoria

**1.1.1 Estrutura de Pastas**
```
PROBLEMA: Componentes misturados (genéricos vs específicos)

ATUAL:
src/components/
├── ui/ (shadcn)
├── cards/
├── charts/
├── Header.tsx
├── Footer.tsx
├── RegisterAtestadoCard.tsx
├── StudentDialog.tsx
└── ... (30+ arquivos soltos)

SUGERIDO:
src/components/
├── ui/ (shadcn - não mexer)
├── layout/
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── Sidebar.tsx
├── students/
│   ├── StudentDialog.tsx
│   ├── StudentForm.tsx
│   ├── StudentTable.tsx
│   └── StudentCard.tsx
├── attendance/
│   ├── RegisterAbsence.tsx
│   ├── RegisterAtestado.tsx
│   └── AbsenceHistory.tsx
├── interactions/
│   ├── InteractionHistory.tsx
│   └── RegisterInteraction.tsx
├── dashboard/
│   ├── cards/
│   │   ├── KPIsCard.tsx
│   │   ├── AlertsCard.tsx
│   │   └── FiltersCard.tsx
│   └── charts/
│       ├── EvolutionChart.tsx
│       └── DistributionChart.tsx
└── shared/
    ├── ErrorBoundary.tsx
    ├── VirtualizedList.tsx
    └── CustomDataTable.tsx
```

**Ação**: Refatorar gradualmente (não quebrar imports)

---

**1.1.2 Camada de Serviços**
```
ATUAL:
src/services/
├── studentDataService.ts ✅
├── taskService.ts ✅
├── whatsappService.ts ✅
└── whatsappDataService.ts (duplicação?)

FALTA:
- Camada de abstração para Firestore
- Service para relatórios/analytics
- Service para exportação
- Service para cache
```

**Sugestão: Criar abstrações**
```typescript
// src/services/firebase/baseService.ts
export abstract class BaseFirestoreService<T> {
  protected collectionName: string;

  async getById(id: string): Promise<T | null>
  async getAll(filters?: FilterOptions): Promise<T[]>
  async create(data: T): Promise<string>
  async update(id: string, data: Partial<T>): Promise<void>
  async softDelete(id: string): Promise<void>
}

// src/services/studentService.ts (herda)
export class StudentService extends BaseFirestoreService<Student> {
  // Métodos específicos de estudante
}
```

**Benefícios**:
- Menos código duplicado
- Facilita testes
- Padrão consistente

---

**1.1.3 Gerenciamento de Estado**
```
PROBLEMA: useState em múltiplos componentes (prop drilling)

ATUAL:
- Cada componente gerencia seu próprio estado
- Props passadas por 3-4 níveis
- Re-renders desnecessários

SOLUÇÃO (SEM CUSTO):
1. Context API (nativo React)
2. Zustand (5kb, grátis)
3. React Query / TanStack Query (cache automático)

EXEMPLO - Context para Estudantes:
```typescript
// src/contexts/StudentContext.tsx
export const StudentContext = createContext<StudentContextType>();

export function StudentProvider({ children }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({});

  // Lógica centralizada

  return (
    <StudentContext.Provider value={{ students, loading, filters, ... }}>
      {children}
    </StudentContext.Provider>
  );
}

// Usar em qualquer componente
const { students, loading } = useStudentContext();
```

**Benefícios**:
- Menos prop drilling
- Estado compartilhado
- Fácil debug
- Zero custo

---

**1.1.4 Tipos e Validação**
```
✅ BOM: Tipos centralizados em src/types/index.ts

MELHORAR: Adicionar Zod schemas centralizados

// src/schemas/index.ts (NOVO)
import { z } from 'zod';

export const studentSchema = z.object({
  estudanteId: z.string().uuid(),
  nome: z.string().min(1, "Nome obrigatório"),
  turma: z.string().min(1, "Turma obrigatória"),
  turno: z.enum(["MANHÃ", "TARDE"]),
  status: z.enum(["ATIVO", "INATIVO", "TRANSFERIDO", "DESLIGADO"]),
  // ...
});

export const contactSchema = z.object({
  nome: z.string().min(1),
  telefone: z.string().regex(/^\d{10,11}$/, "Telefone inválido"),
  parentesco: z.string().optional(),
  podeReceberMensagem: z.boolean().default(true),
});

// Reusar em formulários e validações de API
```

**Benefícios**:
- Validação consistente
- Runtime + compile-time safety
- Menos bugs
- Zero custo (zod já instalado)

---

**1.1.5 Error Handling e Logging**
```
ATUAL:
- console.log/error espalhados
- src/utils/logger.ts existe mas pouco usado

MELHORAR:
1. Usar logger.ts consistentemente
2. Adicionar níveis (debug, info, warn, error)
3. Error boundaries em pontos críticos

// src/utils/logger.ts (melhorar)
export const logger = {
  debug: (msg: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${msg}`, data);
    }
  },
  info: (msg: string, data?: any) => {
    console.info(`[INFO] ${msg}`, data);
  },
  warn: (msg: string, data?: any) => {
    console.warn(`[WARN] ${msg}`, data);
  },
  error: (msg: string, error?: any) => {
    console.error(`[ERROR] ${msg}`, error);
    // Futuramente: enviar para Sentry (se contratar)
  }
};

// Usar em todo código
logger.info('Carregando estudantes...', { count: students.length });
logger.error('Erro ao salvar estudante', error);
```

**Benefícios**:
- Debug mais fácil
- Produção limpa (sem console.log)
- Preparado para monitoramento futuro
- Zero custo

---

### 1.2 Recomendações de Arquitetura

#### 1.2.1 Padrão de Camadas
```
┌─────────────────────────────────────┐
│         UI Components (Client)       │
│  (pages, components, hooks)         │
├─────────────────────────────────────┤
│         Business Logic              │
│  (contexts, custom hooks)           │
├─────────────────────────────────────┤
│         Services Layer              │
│  (API calls, data transformation)   │
├─────────────────────────────────────┤
│         Data Layer                  │
│  (Firebase, cache, utils)           │
└─────────────────────────────────────┘
```

**Princípio**: Cada camada só conhece a camada abaixo

**Exemplo**:
```typescript
// ❌ ERRADO: Componente acessa Firestore diretamente
import { collection, getDocs } from 'firebase/firestore';
function StudentList() {
  const [students, setStudents] = useState([]);
  useEffect(() => {
    getDocs(collection(db, 'students')).then(...);
  }, []);
}

// ✅ CERTO: Componente usa hook, hook usa service
function StudentList() {
  const { students, loading } = useStudents();
}

// Hook usa service
function useStudents() {
  const [students, setStudents] = useState([]);
  useEffect(() => {
    StudentService.getAll().then(setStudents);
  }, []);
}

// Service acessa Firestore
class StudentService {
  static async getAll() {
    return getDocs(collection(db, 'students'));
  }
}
```

---

#### 1.2.2 Code Splitting e Lazy Loading
```
PROBLEMA: Bundle grande, carrega tudo no início

SOLUÇÃO (SEM CUSTO):
```typescript
// src/app/home/page.tsx
import { lazy, Suspense } from 'react';

// Carregar charts sob demanda (recharts é pesado)
const EvolutionChart = lazy(() => import('@/components/charts/EvolutionChart'));
const DistributionChart = lazy(() => import('@/components/charts/DistributionChart'));

export default function HomePage() {
  return (
    <div>
      <Suspense fallback={<ChartSkeleton />}>
        <EvolutionChart data={data} />
      </Suspense>
    </div>
  );
}
```

**Benefícios**:
- Carregamento inicial mais rápido
- Bundles menores por rota
- Zero custo (nativo Next.js)

---

#### 1.2.3 Performance - Memoização
```
PROBLEMA: Re-renders desnecessários em listas grandes

SOLUÇÃO (SEM CUSTO):
```typescript
// src/components/students/StudentCard.tsx
import { memo } from 'react';

// Evita re-render se props não mudaram
export const StudentCard = memo(function StudentCard({ student, onEdit }) {
  return <div>...</div>;
});

// Hook para cálculos pesados
function StudentTable({ students }) {
  const filteredStudents = useMemo(() => {
    return students.filter(s => s.turma === selectedTurma);
  }, [students, selectedTurma]);

  const totalAbsences = useMemo(() => {
    return students.reduce((sum, s) => sum + s.totalFaltas, 0);
  }, [students]);

  return <div>...</div>;
}
```

**Benefícios**:
- App mais responsivo
- Melhor UX em listas grandes
- Zero custo (nativo React)

---

## 2. ARQUITETURA DO BANCO DE DADOS

### 2.1 Estrutura Atual (V3)

```
Firestore:
├── students/{estudanteId} ✅ UUID
│   ├── estudanteId, nome, turma, status, turno
│   ├── bolsaFamilia, matricula, email, dataNascimento
│   ├── endereco, deficiencia, provaSaoPaulo
│   ├── createdAt, updatedAt, createdBy, updatedBy
│   ├── deleted, deletedAt, deletedBy
│   └── contacts/{contactId} (subcoleção) ✅
│       ├── nome, parentesco, telefone
│       └── podeReceberWhatsapp
│
├── absences/{absenceId}
│   ├── estudanteId, data, justified, atestadoId
│   └── createdAt, updatedAt
│
├── atestados/{atestadoId}
│   ├── estudanteId, startDate, days, description
│   └── createdBy, createdAt
│
├── interactions/{interactionId}
│   ├── estudanteId, type, date, description
│   ├── sensitive, createdBy
│   └── createdAt
│
├── occurrences/{occurrenceId}
│   ├── estudanteId, date, description
│   ├── sensitive, createdBy
│   └── createdAt
│
├── tasks/{taskId}
│   ├── estudanteId, title, description, status
│   ├── priority, dueDate, assignedTo
│   └── createdAt, updatedAt
│
├── ano_letivo/{ano}
│   ├── 1º Bimestre: { dates, startDate, endDate }
│   ├── 2º Bimestre: { dates, startDate, endDate }
│   ├── 3º Bimestre: { dates, startDate, endDate }
│   └── 4º Bimestre: { dates, startDate, endDate }
│
└── users/{userId}
    ├── email, role, name
    └── createdAt
```

### 2.2 Pontos Fortes da Estrutura

✅ **Normalização adequada** (contacts como subcoleção)
✅ **Soft-delete implementado**
✅ **Auditoria completa** (created/updated)
✅ **IDs imutáveis** (UUID v4)
✅ **Dados sensíveis marcados** (interactions/occurrences)

---

### 2.3 Melhorias Sugeridas (SEM CUSTO)

#### 2.3.1 Adicionar Índices Compostos
```
PROBLEMA: Queries lentas com múltiplos filtros

SOLUÇÃO (GRÁTIS no Firestore):
Criar índices em Firebase Console

Índices Necessários:
1. students: (turma, status)
2. students: (turno, status)
3. students: (bolsaFamilia, status)
4. absences: (estudanteId, data)
5. absences: (data, justified)
6. interactions: (estudanteId, date)
7. tasks: (estudanteId, status, dueDate)

Como criar:
- Acessar Firebase Console
- Firestore → Indexes
- Clicar no link de erro ou criar manual
- Aguardar 2-5 min para criar
```

**Benefícios**:
- Queries 10x mais rápidas
- Sem timeout
- Zero custo (incluído no Firestore)

---

#### 2.3.2 Desnormalização Estratégica (Cache)
```
PROBLEMA: Múltiplas queries para dashboards

EXEMPLO:
Dashboard precisa de:
- Total de estudantes por turma (query 1)
- Total de faltas por turma (query 2 + processamento)
- Estudantes em risco (query 3 + cálculo)

SOLUÇÃO: Criar coleção de agregações

// Nova coleção (atualizada por triggers ou rotina noturna)
aggregations/{tipo}
├── students_by_turma
│   └── { "5A": 30, "5B": 28, ... }
├── absences_by_turma_bimester
│   └── { "5A_B1": 45, "5A_B2": 38, ... }
└── risk_students
    └── [{ estudanteId, score, nivel }, ...]

// Atualizar via Cloud Function (grátis até 2M invocações/mês)
// ou rotina noturna (Cloud Scheduler - 3 jobs grátis)
```

**Alternativa SEM Cloud Functions**:
```typescript
// Atualizar agregações no client quando necessário
// src/services/aggregationService.ts

export class AggregationService {
  static async updateStudentsByTurma(students: Student[]) {
    const aggregation = students.reduce((acc, s) => {
      acc[s.turma] = (acc[s.turma] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    await setDoc(doc(db, 'aggregations', 'students_by_turma'), aggregation);
  }

  // Chamar após criar/editar/deletar estudante
}
```

**Benefícios**:
- Dashboard carrega instantaneamente
- Menos queries
- Menos processamento client-side
- Dentro da quota gratuita Firestore

---

#### 2.3.3 Adicionar Timestamps de Cache
```
PROBLEMA: Como saber se dados agregados estão atualizados?

SOLUÇÃO:
// Adicionar em cada agregação
aggregations/{tipo}
├── data: { ... }
├── lastUpdated: Timestamp
└── version: number

// No client, verificar se precisa atualizar
if (Date.now() - aggregation.lastUpdated > 1_HOUR) {
  recalculate();
}
```

---

#### 2.3.4 Estrutura para Documentos (Futuro)
```
// Se implementar upload de atestados
atestados/{atestadoId}
├── estudanteId: string
├── startDate: string
├── days: number
├── description: string
├── fileUrl?: string (Storage URL) ⬅️ NOVO
├── fileName?: string ⬅️ NOVO
├── fileSize?: number ⬅️ NOVO
├── mimeType?: string ⬅️ NOVO
├── uploadedAt?: Timestamp ⬅️ NOVO
└── createdBy: string

// Firebase Storage:
/atestados/{estudanteId}/{atestadoId}.pdf

// Storage é GRÁTIS até 5GB armazenamento + 1GB download/dia
```

---

#### 2.3.5 Otimizar Queries Existentes
```
PROBLEMA: Carregar todos os estudantes de uma vez

ATUAL:
const students = await StudentDataService.getStudents(); // 700+ docs

SOLUÇÃO 1: Paginação
const students = await StudentDataService.getStudentsPaginated({
  page: 1,
  pageSize: 50
});

SOLUÇÃO 2: Filtro Server-Side
const students = await StudentDataService.getStudents({
  turma: '5A',
  status: 'ATIVO'
}); // Retorna 30 docs

// Implementação
static async getStudents(filters?: FilterOptions) {
  let q = collection(db, 'students');

  if (filters?.turma) {
    q = query(q, where('turma', '==', filters.turma));
  }
  if (filters?.status) {
    q = query(q, where('status', '==', filters.status));
  }

  q = query(q, limit(filters?.limit || 100));

  return getDocs(q);
}
```

**Benefícios**:
- Menos dados transferidos
- App mais rápido
- Dentro da quota gratuita (50K leituras/dia)

---

### 2.4 Regras de Segurança Firestore

```javascript
// Revisar regras atuais
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: usuário autenticado
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper: é o próprio usuário
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Helper: é admin
    function isAdmin() {
      return isAuthenticated() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Students: autenticado pode ler, admin pode escrever
    match /students/{studentId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();

      // Subcoleção contacts
      match /contacts/{contactId} {
        allow read: if isAuthenticated();
        allow write: if isAdmin();
      }
    }

    // Absences: autenticado pode ler e criar, admin pode editar/deletar
    match /absences/{absenceId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAdmin();
    }

    // Interactions: apenas quem criou ou admin
    match /interactions/{interactionId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAdmin() ||
                                resource.data.createdBy == request.auth.uid;
    }

    // Tasks: autenticado pode criar, assignedTo ou admin pode editar
    match /tasks/{taskId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAdmin() ||
                       resource.data.assignedTo == request.auth.uid;
      allow delete: if isAdmin();
    }

    // Users: usuário só pode ler/editar próprio perfil
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isOwner(userId);
    }

    // Aggregations: read-only
    match /aggregations/{aggId} {
      allow read: if isAuthenticated();
      allow write: if false; // Apenas via server/script
    }
  }
}
```

**Benefícios**:
- Segurança robusta
- Proteção contra acesso não autorizado
- Zero custo (parte do Firestore)

---

## 3. MELHORIAS DE UX E FUNCIONALIDADES EXISTENTES

### 3.1 Performance e Responsividade

#### 3.1.1 Loading States e Skeletons
```
PROBLEMA: Telas em branco durante carregamento

SOLUÇÃO:
```typescript
// src/components/ui/skeleton.tsx (já existe no shadcn)
import { Skeleton } from '@/components/ui/skeleton';

// Criar skeletons específicos
// src/components/skeletons/StudentCardSkeleton.tsx
export function StudentCardSkeleton() {
  return (
    <div className="p-4 border rounded-lg">
      <Skeleton className="h-6 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2 mb-4" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

// Usar em listas
function StudentList() {
  const { students, loading } = useStudents();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <StudentCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return <div>{students.map(...)}</div>;
}
```

**Benefícios**:
- UX profissional
- Usuário sabe que está carregando
- Zero custo (nativo)

---

#### 3.1.2 Otimistic Updates
```
PROBLEMA: Demora para ver resultado de ações

EXEMPLO ATUAL:
1. Usuário clica "Salvar"
2. Aguarda 2-3s (request Firebase)
3. Vê resultado

SOLUÇÃO (Optimistic UI):
1. Usuário clica "Salvar"
2. UI atualiza instantaneamente (local)
3. Request Firebase em background
4. Se erro, reverte

```typescript
function useOptimisticStudents() {
  const [students, setStudents] = useState<Student[]>([]);

  const updateStudent = async (id: string, updates: Partial<Student>) => {
    // 1. Atualizar UI imediatamente
    const backup = [...students];
    setStudents(prev => prev.map(s =>
      s.estudanteId === id ? { ...s, ...updates } : s
    ));

    try {
      // 2. Salvar no Firebase
      await StudentDataService.updateStudent({ estudanteId: id, ...updates });
      toast.success('Salvo com sucesso');
    } catch (error) {
      // 3. Reverter se erro
      setStudents(backup);
      toast.error('Erro ao salvar');
    }
  };

  return { students, updateStudent };
}
```

**Benefícios**:
- App parece instantâneo
- UX moderna
- Zero custo

---

#### 3.1.3 Debounce em Buscas
```
PROBLEMA: Query no Firestore a cada letra digitada

SOLUÇÃO:
```typescript
// src/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Usar em busca
function StudentSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    if (debouncedSearch) {
      // Só busca após 500ms de pausa na digitação
      searchStudents(debouncedSearch);
    }
  }, [debouncedSearch]);

  return <input onChange={e => setSearchTerm(e.target.value)} />;
}
```

**Benefícios**:
- Economiza queries (quota gratuita)
- App mais responsivo
- Zero custo

---

#### 3.1.4 Virtual Scrolling para Listas Grandes
```
PROBLEMA: Renderizar 700+ estudantes de uma vez

ATUAL: Todos os 700 no DOM

SOLUÇÃO: Virtualização (já tem lib instalada: react-window)
```typescript
// src/components/VirtualizedStudentTable.tsx (já existe - melhorar)
import { FixedSizeList } from 'react-window';

function VirtualizedStudentList({ students }: { students: Student[] }) {
  const Row = ({ index, style }: { index: number; style: CSSProperties }) => (
    <div style={style}>
      <StudentCard student={students[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={students.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

**Benefícios**:
- Renderiza apenas ~10-15 itens visíveis
- Performance 100x melhor em listas grandes
- Zero custo (lib já instalada)

---

### 3.2 Melhorias em Formulários

#### 3.2.1 Validação em Tempo Real
```
PROBLEMA: Usuário só vê erro ao submitar

SOLUÇÃO:
```typescript
// Usar validação on blur + on change do React Hook Form
const form = useForm({
  resolver: zodResolver(studentSchema),
  mode: 'onBlur', // Valida ao sair do campo
  reValidateMode: 'onChange', // Revalida ao digitar (após primeiro erro)
});
```

**Benefícios**:
- Feedback imediato
- Menos frustrações
- Zero custo

---

#### 3.2.2 Formatação Automática
```
PROBLEMA: Usuário precisa formatar CPF, telefone, CEP manualmente

SOLUÇÃO:
```typescript
// src/utils/formatters/index.ts
export function formatTelefone(value: string): string {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
}

export function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, '');
  return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatCEP(value: string): string {
  const numbers = value.replace(/\D/g, '');
  return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
}

// Usar no input
<input
  value={telefone}
  onChange={e => setTelefone(formatTelefone(e.target.value))}
  maxLength={15}
/>
```

**Benefícios**:
- UX melhor
- Menos erros de digitação
- Zero custo

---

#### 3.2.3 Auto-save (Draft)
```
PROBLEMA: Usuário perde dados se fechar sem salvar

SOLUÇÃO:
```typescript
// src/hooks/useAutoSave.ts
export function useAutoSave(key: string, data: any, delay: number = 2000) {
  useEffect(() => {
    const handler = setTimeout(() => {
      localStorage.setItem(`draft_${key}`, JSON.stringify(data));
    }, delay);

    return () => clearTimeout(handler);
  }, [data, key, delay]);

  // Restaurar draft
  const restoreDraft = () => {
    const draft = localStorage.getItem(`draft_${key}`);
    return draft ? JSON.parse(draft) : null;
  };

  return { restoreDraft };
}

// Usar no formulário
function StudentForm() {
  const [formData, setFormData] = useState<Student>(initialData);
  const { restoreDraft } = useAutoSave('student_form', formData);

  // Restaurar ao montar
  useEffect(() => {
    const draft = restoreDraft();
    if (draft && confirm('Restaurar rascunho?')) {
      setFormData(draft);
    }
  }, []);
}
```

**Benefícios**:
- Não perde dados
- UX profissional
- Zero custo (localStorage)

---

### 3.3 Dashboard e Visualizações

#### 3.3.1 Filtros Inteligentes
```
PROBLEMA: Muitos filtros, difícil encontrar o que precisa

SOLUÇÃO: Filtros salvos e favoritos
```typescript
// src/types/index.ts
export interface SavedFilter {
  id: string;
  name: string;
  filters: FilterOptions;
  isFavorite: boolean;
  createdAt: string;
}

// Salvar no localStorage ou Firestore
const savedFilters: SavedFilter[] = [
  {
    id: '1',
    name: 'Estudantes em risco (5A)',
    filters: { turma: '5A', minAbsences: 10, status: 'ATIVO' },
    isFavorite: true,
  },
  {
    id: '2',
    name: 'Bolsa Família - Alta infrequência',
    filters: { bolsaFamilia: 'SIM', minAbsences: 15 },
    isFavorite: true,
  },
];

// UI
<div className="flex gap-2 mb-4">
  <Button onClick={() => applyFilter(savedFilters[0].filters)}>
    ⭐ Estudantes em risco (5A)
  </Button>
  <Button onClick={() => applyFilter(savedFilters[1].filters)}>
    ⭐ Bolsa Família - Alta infrequência
  </Button>
</div>
```

**Benefícios**:
- Acesso rápido a filtros comuns
- Menos cliques
- Zero custo

---

#### 3.3.2 Exportar Visualização Atual
```
PROBLEMA: Usuário quer exportar dados filtrados

SOLUÇÃO:
```typescript
// src/utils/exportUtils.ts
export function exportToCSV(data: any[], filename: string) {
  const csv = convertToCSV(data);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${Date.now()}.csv`;
  link.click();
}

// Usar no dashboard
<Button onClick={() => exportToCSV(filteredStudents, 'estudantes_filtrados')}>
  Exportar para CSV
</Button>
```

**Benefícios**:
- Flexibilidade
- Compartilhar dados facilmente
- Zero custo (nativo browser)

---

#### 3.3.3 Comparações Temporais
```
SUGESTÃO: Adicionar "comparar com período anterior"

// Dashboard KPIs
Total de faltas: 450 (+12% vs B1)
Estudantes em risco: 23 (-3 vs B1)
Frequência média: 87% (+2% vs B1)

// Implementação
const currentData = calculateKPIs(students, 'B2');
const previousData = calculateKPIs(students, 'B1');

const difference = {
  value: currentData.totalAbsences - previousData.totalAbsences,
  percentage: ((currentData.totalAbsences / previousData.totalAbsences) - 1) * 100,
};
```

**Benefícios**:
- Insights de evolução
- Identificar tendências
- Zero custo (cálculo local)

---

### 3.4 Mobile e Responsividade

#### 3.4.1 PWA Melhorado
```
ATUAL: Service worker básico

MELHORAR:
1. Offline-first strategy
2. Cache inteligente
3. Background sync
4. Add to home screen

// public/sw.js (melhorar)
const CACHE_NAME = 'frequencia-v1';
const urlsToCache = [
  '/',
  '/home',
  '/cadastrar-estudante',
  '/controlar-faltas',
  '/offline',
  // Assets críticos
];

// Estratégia: Cache-first para assets, Network-first para API
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.url.includes('/api/')) {
    // API: Network-first
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(request))
    );
  } else {
    // Assets: Cache-first
    event.respondWith(
      caches.match(request)
        .then(response => response || fetch(request))
    );
  }
});

// Background sync (registrar faltas offline)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-absences') {
    event.waitUntil(syncAbsences());
  }
});
```

**Benefícios**:
- Funciona offline
- Melhor UX em conexões ruins
- Zero custo

---

#### 3.4.2 Navegação Mobile
```
PROBLEMA: Menu desktop não funciona bem em mobile

SOLUÇÃO: Bottom navigation
```tsx
// src/components/layout/MobileNav.tsx
'use client';

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden z-50">
      <div className="flex justify-around p-2">
        <NavItem icon={<Home />} label="Início" href="/home" />
        <NavItem icon={<Users />} label="Estudantes" href="/cadastrar-estudante" />
        <NavItem icon={<Calendar />} label="Faltas" href="/controlar-faltas" />
        <NavItem icon={<BarChart />} label="Relatórios" href="/relatorio-interacoes" />
      </div>
    </nav>
  );
}
```

**Benefícios**:
- UX mobile nativa
- Fácil navegação com polegar
- Zero custo

---

## 4. NOVAS FUNCIONALIDADES (SEM CUSTO)

### 4.1 Sistema de Exportação

#### 4.1.1 Exportar para Excel (Avançado)
```
BIBLIOTECA JÁ INSTALADA: xlsx

FUNCIONALIDADE:
- Múltiplas abas (estudantes, faltas, interações)
- Formatação (cores, bordas, largura de colunas)
- Fórmulas (totais, médias)
- Gráficos básicos

// src/services/exportService.ts
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export class ExportService {
  static async exportToExcel(data: {
    students: Student[];
    absences: AbsenceRecord[];
    interactions: FamilyInteraction[];
  }) {
    const workbook = XLSX.utils.book_new();

    // Aba 1: Estudantes
    const studentsSheet = XLSX.utils.json_to_sheet(
      data.students.map(s => ({
        Nome: s.nome,
        Turma: s.turma,
        Turno: s.turno,
        Status: s.status,
        'Bolsa Família': s.bolsaFamilia,
        'Total Faltas': s.totalFaltas || 0,
      }))
    );
    XLSX.utils.book_append_sheet(workbook, studentsSheet, 'Estudantes');

    // Aba 2: Faltas por Bimestre
    const absencesSheet = XLSX.utils.json_to_sheet(
      processAbsencesByStudent(data.absences)
    );
    XLSX.utils.book_append_sheet(workbook, absencesSheet, 'Faltas');

    // Aba 3: Interações
    const interactionsSheet = XLSX.utils.json_to_sheet(
      data.interactions.map(i => ({
        Estudante: findStudentName(i.estudanteId),
        Tipo: i.type,
        Data: formatDate(i.date),
        Descrição: i.description,
      }))
    );
    XLSX.utils.book_append_sheet(workbook, interactionsSheet, 'Interações');

    // Salvar
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `relatorio_completo_${Date.now()}.xlsx`);
  }
}

// Botão no dashboard
<Button onClick={() => ExportService.exportToExcel(allData)}>
  📊 Exportar Relatório Completo (Excel)
</Button>
```

**Benefícios**:
- Relatórios profissionais
- Fácil compartilhar com gestores
- Zero custo (libs já instaladas)

---

#### 4.1.2 Exportar para PDF (Básico)
```
BIBLIOTECA: jspdf (instalar: npm install jspdf)
ALTERNATIVA GRÁTIS: Usar window.print() com CSS

// SOLUÇÃO SEM BIBLIOTECA (CSS Print)
// src/app/relatorios/[tipo]/page.tsx

export default function RelatorioPage() {
  return (
    <>
      <div className="no-print mb-4">
        <Button onClick={() => window.print()}>
          Imprimir / Salvar PDF
        </Button>
      </div>

      <div className="print:p-8">
        <h1 className="text-2xl font-bold mb-4">
          Relatório de Frequência - Turma 5A
        </h1>

        <table className="w-full border">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Faltas B1</th>
              <th>Faltas B2</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s.estudanteId}>
                <td>{s.nome}</td>
                <td>{s.faltasB1}</td>
                <td>{s.faltasB2}</td>
                <td>{s.totalFaltas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none; }
          body { font-size: 12pt; }
        }
      `}</style>
    </>
  );
}
```

**Benefícios**:
- PDF via "Salvar como PDF" do browser
- Zero dependências
- Zero custo

---

### 4.2 Análise Preditiva (Risk Score)

```
ALGORITMO SEM IA (baseado em regras)

// src/utils/riskAnalysis.ts
export interface RiskAnalysis {
  estudanteId: string;
  nome: string;
  riskScore: number; // 0-100
  riskLevel: 'BAIXO' | 'MÉDIO' | 'ALTO' | 'CRÍTICO';
  factors: RiskFactor[];
  recommendations: string[];
}

export interface RiskFactor {
  category: string;
  points: number;
  description: string;
}

export function calculateRiskScore(
  student: Student,
  absences: AbsenceRecord[],
  interactions: FamilyInteraction[],
  schoolDays: number
): RiskAnalysis {
  let score = 0;
  const factors: RiskFactor[] = [];
  const recommendations: string[] = [];

  // 1. Análise de Frequência (0-35 pontos)
  const frequency = ((schoolDays - absences.length) / schoolDays) * 100;

  if (frequency < 75) {
    const points = 35;
    score += points;
    factors.push({
      category: 'Frequência',
      points,
      description: `Frequência de ${frequency.toFixed(1)}% (abaixo de 75%)`
    });
    recommendations.push('🚨 Risco crítico de reprovação por falta');
    recommendations.push('📞 Contatar família imediatamente');
  } else if (frequency < 85) {
    const points = 20;
    score += points;
    factors.push({
      category: 'Frequência',
      points,
      description: `Frequência de ${frequency.toFixed(1)}% (entre 75-85%)`
    });
    recommendations.push('⚠️ Monitorar frequência de perto');
  }

  // 2. Faltas Consecutivas (0-20 pontos)
  const consecutiveAbsences = findConsecutiveAbsences(absences);
  if (consecutiveAbsences >= 5) {
    const points = 20;
    score += points;
    factors.push({
      category: 'Faltas Consecutivas',
      points,
      description: `${consecutiveAbsences} faltas seguidas`
    });
    recommendations.push('🏠 Considerar visita domiciliar');
  }

  // 3. Comunicação com Família (0-25 pontos)
  const lastInteraction = getLastInteraction(interactions);
  const daysSinceLastInteraction = lastInteraction
    ? daysBetween(lastInteraction.date, today())
    : 999;

  if (daysSinceLastInteraction > 60) {
    const points = 25;
    score += points;
    factors.push({
      category: 'Comunicação Familiar',
      points,
      description: `Sem contato há ${daysSinceLastInteraction} dias`
    });
    recommendations.push('📱 Retomar contato com família');
  } else if (daysSinceLastInteraction > 30) {
    const points = 15;
    score += points;
    factors.push({
      category: 'Comunicação Familiar',
      points,
      description: `Sem contato há ${daysSinceLastInteraction} dias`
    });
    recommendations.push('📧 Agendar reunião com responsáveis');
  }

  // 4. Desempenho Acadêmico (0-10 pontos) - se tiver Prova SP
  if (student.provaSaoPaulo && student.provaSaoPaulo.length > 0) {
    const lastProva = student.provaSaoPaulo[student.provaSaoPaulo.length - 1];
    if (lastProva.nivelProficiencia === 'INSUFICIENTE') {
      const points = 10;
      score += points;
      factors.push({
        category: 'Desempenho',
        points,
        description: 'Nível insuficiente na Prova São Paulo'
      });
      recommendations.push('📚 Indicar para reforço escolar');
    }
  }

  // 5. Vulnerabilidade Social (0-10 pontos)
  if (student.bolsaFamilia === 'SIM' && frequency < 80) {
    const points = 10;
    score += points;
    factors.push({
      category: 'Vulnerabilidade',
      points,
      description: 'Bolsa Família + baixa frequência'
    });
    recommendations.push('🤝 Encaminhar para assistência social');
  }

  // Definir nível de risco
  let riskLevel: RiskAnalysis['riskLevel'];
  if (score >= 70) riskLevel = 'CRÍTICO';
  else if (score >= 50) riskLevel = 'ALTO';
  else if (score >= 30) riskLevel = 'MÉDIO';
  else riskLevel = 'BAIXO';

  return {
    estudanteId: student.estudanteId,
    nome: student.nome,
    riskScore: score,
    riskLevel,
    factors,
    recommendations,
  };
}

// Componente de visualização
// src/components/cards/RiskAnalysisCard.tsx
export function RiskAnalysisCard() {
  const { students } = useStudents();
  const { absences } = useAbsences();
  const { interactions } = useInteractions();

  const riskAnalysis = useMemo(() => {
    return students
      .map(s => calculateRiskScore(s, absencesBy(s.estudanteId), interactionsBy(s.estudanteId), 200))
      .filter(r => r.riskLevel !== 'BAIXO')
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [students, absences, interactions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>🚨 Estudantes em Risco</CardTitle>
      </CardHeader>
      <CardContent>
        {riskAnalysis.map(analysis => (
          <div key={analysis.estudanteId} className="mb-4 p-4 border rounded">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold">{analysis.nome}</h3>
              <Badge variant={getRiskVariant(analysis.riskLevel)}>
                {analysis.riskLevel} - {analysis.riskScore} pts
              </Badge>
            </div>

            <div className="mb-2">
              <strong>Fatores de Risco:</strong>
              <ul className="list-disc list-inside">
                {analysis.factors.map((f, i) => (
                  <li key={i} className="text-sm">
                    {f.category}: {f.description} ({f.points} pts)
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <strong>Ações Recomendadas:</strong>
              <ul className="list-disc list-inside">
                {analysis.recommendations.map((r, i) => (
                  <li key={i} className="text-sm text-blue-600">{r}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

**Benefícios**:
- Identificação proativa de risco
- Ações direcionadas
- Zero custo (cálculo local)
- Sem IA/ML (regras simples e efetivas)

---

### 4.3 Templates de Comunicação

```
PROBLEMA: Reescrever mensagens repetitivas

SOLUÇÃO: Templates salvos

// src/types/index.ts
export interface MessageTemplate {
  id: string;
  name: string;
  category: 'FALTA' | 'CONVOCACAO' | 'PARABENIZACAO' | 'ALERTA';
  message: string;
  variables: string[]; // ['NOME_ESTUDANTE', 'TOTAL_FALTAS', ...]
  createdAt: string;
}

// Templates padrão
const defaultTemplates: MessageTemplate[] = [
  {
    id: '1',
    name: 'Alerta de Faltas',
    category: 'ALERTA',
    message: 'Olá! Informamos que o(a) estudante {NOME_ESTUDANTE} já possui {TOTAL_FALTAS} faltas no bimestre atual. A frequência mínima é de 75%. Pedimos atenção a este assunto.',
    variables: ['NOME_ESTUDANTE', 'TOTAL_FALTAS'],
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Convocação Reunião',
    category: 'CONVOCACAO',
    message: 'Prezado(a) responsável, convocamos para reunião sobre o(a) estudante {NOME_ESTUDANTE} no dia {DATA_REUNIAO} às {HORA_REUNIAO}. Sua presença é muito importante!',
    variables: ['NOME_ESTUDANTE', 'DATA_REUNIAO', 'HORA_REUNIAO'],
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Parabéns - Melhoria',
    category: 'PARABENIZACAO',
    message: 'Parabéns! O(a) estudante {NOME_ESTUDANTE} teve uma melhora significativa na frequência! Continue assim! 👏',
    variables: ['NOME_ESTUDANTE'],
    createdAt: new Date().toISOString(),
  },
];

// src/services/templateService.ts
export class TemplateService {
  static replaceVariables(template: string, variables: Record<string, string>): string {
    let message = template;
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{${key}}`, 'g'), value);
    });
    return message;
  }

  static getTemplates(): MessageTemplate[] {
    const saved = localStorage.getItem('message_templates');
    return saved ? JSON.parse(saved) : defaultTemplates;
  }

  static saveTemplate(template: MessageTemplate) {
    const templates = TemplateService.getTemplates();
    localStorage.setItem('message_templates', JSON.stringify([...templates, template]));
  }
}

// Componente UI
// src/components/MessageTemplateSelector.tsx
export function MessageTemplateSelector({ onSelect }: { onSelect: (message: string) => void }) {
  const [templates] = useState(TemplateService.getTemplates());
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});

  const handleApply = () => {
    if (selectedTemplate) {
      const message = TemplateService.replaceVariables(selectedTemplate.message, variables);
      onSelect(message);
    }
  };

  return (
    <div>
      <Select onValueChange={(id) => {
        const template = templates.find(t => t.id === id);
        setSelectedTemplate(template || null);
      }}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione um template" />
        </SelectTrigger>
        <SelectContent>
          {templates.map(t => (
            <SelectItem key={t.id} value={t.id}>
              {t.name} ({t.category})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedTemplate && (
        <div className="mt-4 space-y-2">
          {selectedTemplate.variables.map(v => (
            <div key={v}>
              <Label>{v}</Label>
              <Input
                value={variables[v] || ''}
                onChange={e => setVariables({ ...variables, [v]: e.target.value })}
              />
            </div>
          ))}

          <div className="p-3 bg-gray-50 rounded">
            <strong>Preview:</strong>
            <p>{TemplateService.replaceVariables(selectedTemplate.message, variables)}</p>
          </div>

          <Button onClick={handleApply}>Aplicar Template</Button>
        </div>
      )}
    </div>
  );
}
```

**Benefícios**:
- Economiza tempo
- Mensagens padronizadas
- Zero custo (localStorage)

---

### 4.4 Estatísticas e Insights

```
FUNCIONALIDADE: Insights automáticos no dashboard

// src/utils/insightsGenerator.ts
export interface Insight {
  type: 'WARNING' | 'INFO' | 'SUCCESS' | 'DANGER';
  title: string;
  description: string;
  action?: string;
  actionUrl?: string;
}

export function generateInsights(
  students: Student[],
  absences: AbsenceRecord[],
  currentBimester: number
): Insight[] {
  const insights: Insight[] = [];

  // 1. Alerta: Turmas com alta taxa de falta
  const absencesByTurma = groupBy(absences, a => findStudent(a.estudanteId)?.turma);
  Object.entries(absencesByTurma).forEach(([turma, turmaAbsences]) => {
    const avgAbsences = turmaAbsences.length / countStudentsInTurma(turma);
    if (avgAbsences > 8) {
      insights.push({
        type: 'WARNING',
        title: `Alta taxa de faltas na turma ${turma}`,
        description: `Média de ${avgAbsences.toFixed(1)} faltas por estudante`,
        action: 'Ver detalhes',
        actionUrl: `/controlar-faltas?turma=${turma}`,
      });
    }
  });

  // 2. Alerta: Estudantes próximos do limite (75% frequência)
  const atRisk = students.filter(s => {
    const freq = calculateFrequency(s.estudanteId, absences);
    return freq >= 75 && freq < 80;
  });
  if (atRisk.length > 0) {
    insights.push({
      type: 'WARNING',
      title: `${atRisk.length} estudantes próximos do limite`,
      description: 'Frequência entre 75-80%. Atenção necessária.',
      action: 'Ver lista',
      actionUrl: '/home?filter=at-risk',
    });
  }

  // 3. Sucesso: Turmas com excelente frequência
  Object.entries(absencesByTurma).forEach(([turma, turmaAbsences]) => {
    const avgAbsences = turmaAbsences.length / countStudentsInTurma(turma);
    if (avgAbsences < 3) {
      insights.push({
        type: 'SUCCESS',
        title: `Parabéns! Turma ${turma} com excelente frequência`,
        description: `Média de apenas ${avgAbsences.toFixed(1)} faltas por estudante`,
      });
    }
  });

  // 4. Info: Comparação com bimestre anterior
  if (currentBimester > 1) {
    const currentAbsences = absences.filter(a => a.bimester === currentBimester).length;
    const previousAbsences = absences.filter(a => a.bimester === currentBimester - 1).length;
    const diff = currentAbsences - previousAbsences;
    const percentDiff = (diff / previousAbsences) * 100;

    if (Math.abs(percentDiff) > 10) {
      insights.push({
        type: diff > 0 ? 'WARNING' : 'SUCCESS',
        title: `${diff > 0 ? 'Aumento' : 'Redução'} de ${Math.abs(percentDiff).toFixed(1)}% nas faltas`,
        description: `Em relação ao ${currentBimester - 1}º bimestre`,
      });
    }
  }

  // 5. Alerta: Falta de comunicação com famílias
  const studentsWithoutInteraction = students.filter(s => {
    const lastInteraction = getLastInteraction(s.estudanteId);
    return !lastInteraction || daysSince(lastInteraction.date) > 45;
  });
  if (studentsWithoutInteraction.length > 10) {
    insights.push({
      type: 'INFO',
      title: `${studentsWithoutInteraction.length} famílias sem contato recente`,
      description: 'Sem interação há mais de 45 dias',
      action: 'Ver lista',
      actionUrl: '/relatorio-interacoes?filter=no-recent-interaction',
    });
  }

  return insights;
}

// Componente
// src/components/cards/InsightsCard.tsx
export function InsightsCard() {
  const { students } = useStudents();
  const { absences } = useAbsences();
  const currentBimester = getCurrentBimester();

  const insights = useMemo(() =>
    generateInsights(students, absences, currentBimester),
    [students, absences, currentBimester]
  );

  if (insights.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>💡 Insights e Alertas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, i) => (
          <Alert key={i} variant={getAlertVariant(insight.type)}>
            <AlertTitle>{insight.title}</AlertTitle>
            <AlertDescription>
              {insight.description}
              {insight.action && (
                <Button variant="link" size="sm" className="ml-2">
                  {insight.action} →
                </Button>
              )}
            </AlertDescription>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}
```

**Benefícios**:
- Informações proativas
- Facilita tomada de decisão
- Zero custo (cálculo local)

---

### 4.5 Histórico de Ações (Audit Log)

```
FUNCIONALIDADE: Log de todas as ações importantes

// Firestore
audit_logs/{logId}
├── userId: string
├── action: string ('CREATE_STUDENT', 'UPDATE_ABSENCE', etc)
├── entityType: string ('student', 'absence', 'interaction')
├── entityId: string
├── changes?: { before: any, after: any }
├── ipAddress?: string
├── userAgent?: string
└── timestamp: Timestamp

// src/services/auditLogService.ts
export class AuditLogService {
  static async log(params: {
    action: string;
    entityType: string;
    entityId: string;
    changes?: any;
  }) {
    const user = getCurrentUser();

    await addDoc(collection(db, 'audit_logs'), {
      userId: user?.uid,
      userEmail: user?.email,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      changes: params.changes,
      timestamp: Timestamp.now(),
    });
  }

  static async getLogsForEntity(entityType: string, entityId: string) {
    const q = query(
      collection(db, 'audit_logs'),
      where('entityType', '==', entityType),
      where('entityId', '==', entityId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    return getDocs(q);
  }
}

// Usar ao modificar dados
async function updateStudent(data: Student) {
  const before = await StudentDataService.getById(data.estudanteId);

  await StudentDataService.update(data);

  await AuditLogService.log({
    action: 'UPDATE_STUDENT',
    entityType: 'student',
    entityId: data.estudanteId,
    changes: { before, after: data },
  });
}

// Componente de histórico
// src/components/EntityHistoryModal.tsx
export function EntityHistoryModal({ entityType, entityId }: Props) {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    AuditLogService.getLogsForEntity(entityType, entityId)
      .then(setLogs);
  }, [entityType, entityId]);

  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Histórico de Modificações</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="p-3 border rounded">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{log.action}</span>
                <span className="text-gray-500">
                  {formatDate(log.timestamp)}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Por: {log.userEmail}
              </div>
              {log.changes && (
                <details className="mt-2 text-xs">
                  <summary>Ver mudanças</summary>
                  <pre className="mt-1 p-2 bg-gray-50 rounded overflow-auto">
                    {JSON.stringify(log.changes, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Benefícios**:
- Rastreabilidade completa
- Compliance/auditoria
- Resolver disputas
- Dentro da quota gratuita Firestore

---

## 5. ROADMAP DE IMPLEMENTAÇÃO

### Fase 1: FUNDAÇÃO SÓLIDA (2-3 semanas)

**Objetivo**: Melhorar arquitetura antes de adicionar funcionalidades

#### Semana 1-2: Refatoração Arquitetural
- [ ] Reorganizar componentes em pastas temáticas
- [ ] Criar BaseFirestoreService genérico
- [ ] Centralizar schemas Zod (src/schemas/)
- [ ] Implementar logging consistente
- [ ] Adicionar error boundaries

**Arquivos Principais**:
- `src/services/firebase/baseService.ts` (NOVO)
- `src/schemas/index.ts` (NOVO)
- `src/utils/logger.ts` (melhorar existente)
- `src/components/` (reorganizar pastas)

**Estimativa**: 16-24 horas

---

#### Semana 2-3: Otimizações de Performance
- [ ] Adicionar React.memo em componentes de lista
- [ ] Implementar useMemo/useCallback
- [ ] Lazy loading de componentes pesados
- [ ] Melhorar VirtualizedStudentTable
- [ ] Adicionar skeletons de loading

**Arquivos Principais**:
- `src/components/students/StudentCard.tsx` (adicionar memo)
- `src/components/VirtualizedStudentTable.tsx` (melhorar)
- `src/components/skeletons/` (NOVO)
- `src/app/home/page.tsx` (lazy loading charts)

**Estimativa**: 12-16 horas

---

### Fase 2: MELHORIAS DE UX (2-3 semanas)

#### Semana 3-4: Formulários e Interações
- [ ] Formatação automática (telefone, CPF, CEP)
- [ ] Validação em tempo real
- [ ] Auto-save (localStorage)
- [ ] Optimistic updates
- [ ] Debounce em buscas

**Arquivos Principais**:
- `src/utils/formatters/index.ts` (expandir)
- `src/hooks/useAutoSave.ts` (NOVO)
- `src/hooks/useOptimisticUpdate.ts` (NOVO)
- `src/hooks/useDebounce.ts` (NOVO)
- `src/components/StudentForm.tsx` (aplicar melhorias)

**Estimativa**: 16-20 horas

---

#### Semana 4-5: Dashboard e Visualizações
- [ ] Filtros salvos
- [ ] Insights automáticos (InsightsCard)
- [ ] Comparações temporais
- [ ] Exportar visualização (CSV)

**Arquivos Principais**:
- `src/components/cards/InsightsCard.tsx` (NOVO)
- `src/utils/insightsGenerator.ts` (NOVO)
- `src/components/filters/SavedFilters.tsx` (NOVO)
- `src/utils/exportUtils.ts` (NOVO)

**Estimativa**: 16-20 horas

---

### Fase 3: NOVAS FUNCIONALIDADES (3-4 semanas)

#### Semana 5-6: Sistema de Exportação
- [ ] Exportar para Excel (múltiplas abas)
- [ ] Exportar para PDF (CSS print)
- [ ] Templates de relatórios
- [ ] Botões de exportação em cards

**Arquivos Principais**:
- `src/services/exportService.ts` (NOVO)
- `src/app/relatorios/[tipo]/page.tsx` (NOVO)
- `src/components/ExportButton.tsx` (NOVO)
- `src/types/index.ts` (adicionar ExportConfig)

**Estimativa**: 20-24 horas

---

#### Semana 7-8: Análise de Risco
- [ ] Algoritmo de risk score
- [ ] RiskAnalysisCard
- [ ] Recomendações automáticas
- [ ] Filtro por nível de risco

**Arquivos Principais**:
- `src/utils/riskAnalysis.ts` (NOVO)
- `src/components/cards/RiskAnalysisCard.tsx` (NOVO)
- `src/types/index.ts` (adicionar RiskAnalysis)

**Estimativa**: 24-30 horas

---

#### Semana 8-9: Templates de Comunicação
- [ ] Templates padrão
- [ ] TemplateService
- [ ] MessageTemplateSelector
- [ ] Salvar templates customizados

**Arquivos Principais**:
- `src/services/templateService.ts` (NOVO)
- `src/components/MessageTemplateSelector.tsx` (NOVO)
- `src/types/index.ts` (adicionar MessageTemplate)
- `src/components/WhatsAppModal.tsx` (integrar templates)

**Estimativa**: 12-16 horas

---

### Fase 4: AUDIT E MELHORIA CONTÍNUA (2 semanas)

#### Semana 9-10: Audit Log
- [ ] AuditLogService
- [ ] Integrar em todos os CRUDs
- [ ] EntityHistoryModal
- [ ] Página de logs gerais

**Arquivos Principais**:
- `src/services/auditLogService.ts` (NOVO)
- `src/components/EntityHistoryModal.tsx` (NOVO)
- `src/app/admin/audit-logs/page.tsx` (NOVO)
- Atualizar todos os services (studentDataService, etc)

**Estimativa**: 16-20 horas

---

#### Semana 10-11: PWA e Mobile
- [ ] Melhorar service worker
- [ ] Cache estratégias
- [ ] Background sync
- [ ] MobileNav (bottom navigation)
- [ ] Testar offline

**Arquivos Principais**:
- `public/sw.js` (melhorar)
- `src/components/layout/MobileNav.tsx` (NOVO)
- `src/lib/serviceWorker.ts` (expandir)

**Estimativa**: 16-20 horas

---

### RESUMO DO ROADMAP

| Fase | Duração | Foco | Horas |
|------|---------|------|-------|
| Fase 1 | 2-3 semanas | Fundação sólida | 28-40h |
| Fase 2 | 2-3 semanas | Melhorias UX | 32-40h |
| Fase 3 | 3-4 semanas | Novas funcionalidades | 56-70h |
| Fase 4 | 2 semanas | Audit e PWA | 32-40h |
| **TOTAL** | **9-12 semanas** | - | **148-190h** |

---

## 6. ANÁLISE DE CUSTOS

### 6.1 Firebase (Plano Gratuito - Spark)

#### Firestore
```
✅ GRÁTIS ATÉ:
- 50.000 leituras/dia
- 20.000 escritas/dia
- 20.000 exclusões/dia
- 1 GB armazenamento

ESTIMATIVA ATUAL (700 estudantes):
- Tamanho médio de documento: ~2 KB
- Armazenamento total: ~1.4 MB (estudantes) + ~10 MB (faltas/interações) = ~12 MB
- Leituras/dia: ~5.000 (bem abaixo do limite)
- Escritas/dia: ~200 (bem abaixo do limite)

✅ CONCLUSÃO: Totalmente dentro da quota gratuita
```

#### Firebase Auth
```
✅ GRÁTIS: Ilimitado
```

#### Firebase Storage (se usar)
```
✅ GRÁTIS ATÉ:
- 5 GB armazenamento
- 1 GB download/dia
- 20.000 uploads/dia

ESTIMATIVA (atestados em PDF):
- Tamanho médio PDF: 500 KB
- 100 atestados/ano: ~50 MB
- Downloads/dia: ~10 (5 MB/dia)

✅ CONCLUSÃO: Totalmente dentro da quota gratuita
```

#### Firebase Hosting
```
✅ GRÁTIS ATÉ:
- 10 GB armazenamento
- 360 MB/dia transferência

NOTA: Não usamos (hospedado na Vercel)
```

---

### 6.2 Vercel (Plano Hobby - Gratuito)

```
✅ GRÁTIS:
- 100 GB bandwidth/mês
- Unlimited deploys
- Automatic HTTPS
- Preview deployments

ESTIMATIVA:
- Tamanho bundle: ~2 MB
- 1000 usuários/mês × 5 visitas = 5000 × 2 MB = 10 GB/mês

✅ CONCLUSÃO: Dentro da quota gratuita
```

---

### 6.3 Bibliotecas e Dependências

```
✅ TODAS GRATUITAS (open-source):
- Next.js (MIT)
- React (MIT)
- Firebase SDK (Apache 2.0)
- shadcn/ui (MIT)
- TanStack Table (MIT)
- React Hook Form (MIT)
- Zod (MIT)
- Recharts (MIT)
- xlsx (Apache 2.0)
- uuid (MIT)
- lucide-react (ISC)

✅ CONCLUSÃO: Zero custos com licenças
```

---

### 6.4 Custos Potenciais (Futuro)

#### Se ultrapassar quota gratuita:

**Firestore (Plano Blaze - pay-as-you-go)**:
```
- $0.06 por 100.000 leituras
- $0.18 por 100.000 escritas
- $0.18 por GB armazenamento/mês

EXEMPLO: 1 milhão leituras/mês = $0.60
```

**Firebase Storage**:
```
- $0.026 por GB armazenamento/mês
- $0.12 por GB download

EXEMPLO: 10 GB atestados + 100 GB download/mês = $12.26
```

**Vercel Pro (se necessário)**:
```
- $20/mês
- 1 TB bandwidth
- Analytics
- Password protection
```

---

### 6.5 Alternativas Gratuitas para Escalar

#### Se atingir limites do Firestore:

**1. Otimizar Queries**:
- Paginação agressiva
- Cache local (localStorage)
- Agregações pré-calculadas

**2. Self-hosting com Firebase Emulator** (desenvolvimento):
```bash
firebase emulators:start
# 100% grátis, sem limites
```

**3. Migrar para Supabase** (Postgres):
```
✅ GRÁTIS ATÉ:
- 500 MB database
- 1 GB file storage
- 50.000 active users/mês

Postgres é mais eficiente que Firestore para queries complexas
```

**4. Static Site Generation (SSG)**:
```typescript
// Gerar páginas estáticas no build
export async function generateStaticParams() {
  const students = await StudentDataService.getAll();
  return students.map(s => ({ id: s.estudanteId }));
}

// Zero consultas Firestore para leitura!
```

---

### 6.6 Resumo de Custos

| Serviço | Plano Atual | Custo Mensal | Limite Gratuito |
|---------|-------------|--------------|-----------------|
| Firebase Firestore | Spark | **$0** | 50K leituras/dia |
| Firebase Auth | Spark | **$0** | Ilimitado |
| Firebase Storage | Spark | **$0** | 5 GB + 1 GB/dia |
| Vercel | Hobby | **$0** | 100 GB bandwidth |
| Domínio | - | $0 | (vercel.app gratuito) |
| **TOTAL** | - | **$0/mês** | ✅ Suficiente |

---

## 7. CONSIDERAÇÕES FINAIS

### 7.1 Priorização Recomendada

**Para criar base sólida primeiro**:

1. **Fase 1 (Fundação)** - ESSENCIAL
   - Refatoração arquitetural
   - Performance básica
   - Logging consistente

2. **Fase 2 (UX)** - IMPORTANTE
   - Formulários melhorados
   - Loading states
   - Debounce

3. **Fase 3 (Funcionalidades)** - DESEJÁVEL
   - Exportação
   - Risk score
   - Templates

4. **Fase 4 (Audit)** - OPCIONAL (mas recomendado)
   - Audit log
   - PWA melhorado

---

### 7.2 Métricas de Sucesso

**Como medir se as melhorias funcionaram**:

```typescript
// Antes vs Depois
const metrics = {
  loadTime: {
    before: '3.5s',
    after: '1.2s',
    improvement: '66%',
  },
  bundleSize: {
    before: '850 KB',
    after: '420 KB',
    improvement: '51%',
  },
  firestoreReads: {
    before: '15.000/dia',
    after: '6.000/dia',
    improvement: '60%',
  },
  userSatisfaction: {
    before: '3.2/5',
    after: '4.7/5',
    improvement: '47%',
  },
};
```

**Ferramentas de medição (gratuitas)**:
- Lighthouse (Chrome DevTools)
- Firebase Console → Usage
- Vercel Analytics (grátis no Hobby)
- React DevTools Profiler

---

### 7.3 Próximos Passos

**Decisão necessária**:

1. **Começar pela Fase 1** (fundação)?
   - Sim → Criar plano detalhado de refatoração
   - Não → Pular para funcionalidades específicas

2. **Qual funcionalidade priorizar** (se pular Fase 1)?
   - Sistema de exportação (alto valor)
   - Análise de risco (diferencial)
   - Templates de comunicação (produtividade)

3. **Trabalhar sozinho ou em equipe**?
   - Sozinho → Seguir roadmap linear
   - Equipe → Paralelizar fases

---

**Documento gerado seguindo as diretrizes do CLAUDE.md**
**Todas as sugestões são implementáveis sem custos adicionais**
**Foco em base sólida antes de expansão**

---

## 📎 ANEXOS

### A. Checklist de Implementação

```markdown
## Antes de implementar qualquer item:
- [ ] Ler seção correspondente deste documento
- [ ] Verificar impacto em CLAUDE.md
- [ ] Criar branch: `git checkout -b feature/nome`
- [ ] Planejar arquivos afetados
- [ ] Estimar tempo realista
- [ ] Testar localmente
- [ ] Verificar bundle size
- [ ] Validar tipos TypeScript
- [ ] Testar em mobile
- [ ] Commitar com mensagem descritiva
- [ ] Criar PR para revisão
```

### B. Comandos Úteis

```bash
# Análise de bundle
npm run analyze

# Verificar tipos
npm run type-check

# Verificar anos hardcoded (evitar!)
npm run check:years

# Linting
npm run lint

# Build local
npm run build && npm start

# Limpar tudo
npm run clean-all-and-restart
```

### C. Referências

- [CLAUDE.md](/Users/easedu/Documents/Projetos/micro-saas/frequencia-anual/CLAUDE.md)
- [Firebase Quotas](https://firebase.google.com/pricing)
- [Vercel Limits](https://vercel.com/docs/platform/limits)
- [Next.js Best Practices](https://nextjs.org/docs)
- [React Performance](https://react.dev/learn/render-and-commit)

---

**Fim do documento**