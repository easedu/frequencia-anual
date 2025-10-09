# 📋 Guia de Uso dos Schemas Zod Centralizados

> **Documentação criada em**: 2025-01-09
> **Fase**: 1.2 - Schemas Zod Centralizados
> **Status**: ✅ Implementado

---

## 📚 Índice

1. [Visão Geral](#-visão-geral)
2. [Estrutura de Diretórios](#-estrutura-de-diretórios)
3. [Schemas Disponíveis](#-schemas-disponíveis)
4. [Como Usar](#-como-usar)
5. [Schemas Comuns](#-schemas-comuns)
6. [Student Schemas](#-student-schemas)
7. [Absence Schemas](#-absence-schemas)
8. [Interaction Schemas](#-interaction-schemas)
9. [Task Schemas](#-task-schemas)
10. [Melhores Práticas](#-melhores-práticas)
11. [Exemplos Práticos](#-exemplos-práticos)
12. [Migração de Schemas Inline](#-migração-de-schemas-inline)

---

## 🎯 Visão Geral

Todos os schemas Zod de validação do projeto foram **centralizados** em `src/schemas/`. Isso garante:

- ✅ **DRY (Don't Repeat Yourself)**: Schemas definidos uma única vez
- ✅ **Consistência**: Mesma validação em toda aplicação
- ✅ **Type-Safety**: TypeScript garante tipos corretos
- ✅ **Manutenibilidade**: Mudanças em um só lugar
- ✅ **Reutilização**: Schemas compostos de blocos menores

---

## 📁 Estrutura de Diretórios

```
src/schemas/
├── index.ts                  # Barrel export (importar tudo daqui)
├── common.ts                 # Schemas comuns reutilizáveis
├── studentSchemas.ts         # Schemas de estudantes
├── absenceSchemas.ts         # Schemas de faltas e atestados
├── interactionSchemas.ts     # Schemas de interações familiares
└── taskSchemas.ts            # Schemas de tarefas
```

---

## 📦 Schemas Disponíveis

### Common Schemas (`common.ts`)

| Schema | Tipo | Uso |
|--------|------|-----|
| `uuidSchema` | string (UUID v4) | IDs de entidades |
| `isoDateSchema` | string (ISO 8601) | Datas ISO |
| `cpfSchema` | string (11 dígitos) | CPF brasileiro |
| `phoneSchema` | string (10-11 dígitos) | Telefone brasileiro |
| `cepSchema` | string (8 dígitos) | CEP brasileiro |
| `emailSchema` | string (email) | Email opcional |

### Student Schemas (`studentSchemas.ts`)

| Schema | Uso | Tipo Exportado |
|--------|-----|----------------|
| `studentSchema` | Validação completa de estudante | `Student` |
| `createStudentSchema` | Criar novo estudante (sem campos de sistema) | `CreateStudent` |
| `updateStudentSchema` | Atualizar estudante (campos opcionais) | `UpdateStudent` |
| `studentFilterSchema` | Filtros de busca de estudantes | `StudentFilter` |
| `studentFormSchema` | Formulário simples (com passthrough) | `StudentFormData` |
| `studentCompleteFormSchema` | Formulário completo (validação estrita) | `StudentCompleteFormData` |

**Sub-schemas**:
- `contactSchema` - Contato
- `addressSchema` - Endereço
- `disabilitySchema` - Deficiência
- `testResultSchema` - Prova São Paulo

### Absence Schemas (`absenceSchemas.ts`)

| Schema | Uso | Tipo Exportado |
|--------|-----|----------------|
| `absenceSchema` | Validação completa de falta | `Absence` |
| `createAbsenceSchema` | Criar nova falta | `CreateAbsence` |
| `updateAbsenceSchema` | Atualizar falta | `UpdateAbsence` |
| `absenceFilterSchema` | Filtros de busca de faltas | `AbsenceFilter` |
| `certificateSchema` | Atestado médico | `Certificate` |
| `createCertificateSchema` | Criar atestado | `CreateCertificate` |
| `updateCertificateSchema` | Atualizar atestado | `UpdateCertificate` |

### Interaction Schemas (`interactionSchemas.ts`)

| Schema | Uso | Tipo Exportado |
|--------|-----|----------------|
| `interactionSchema` | Validação completa de interação | `Interaction` |
| `createInteractionSchema` | Criar nova interação | `CreateInteraction` |
| `updateInteractionSchema` | Atualizar interação | `UpdateInteraction` |
| `interactionFilterSchema` | Filtros de busca | `InteractionFilter` |
| `interactionTypeSchema` | Tipo de interação (enum) | `InteractionType` |
| `interactionOutcomeSchema` | Resultado da interação (enum) | `InteractionOutcome` |

### Task Schemas (`taskSchemas.ts`)

| Schema | Uso | Tipo Exportado |
|--------|-----|----------------|
| `taskSchema` | Validação completa de tarefa | `Task` |
| `createTaskSchema` | Criar nova tarefa | `CreateTask` |
| `updateTaskSchema` | Atualizar tarefa | `UpdateTask` |
| `taskFilterSchema` | Filtros de busca | `TaskFilter` |
| `taskTypeSchema` | Tipo de tarefa (enum) | `TaskType` |
| `taskStatusSchema` | Status da tarefa (enum) | `TaskStatus` |
| `bimestreSchema` | Bimestre (enum) | `Bimestre` |
| `taskControlSchema` | Controle de tarefas | `TaskControl` |
| `createTaskControlSchema` | Criar controle | `CreateTaskControl` |

---

## 🚀 Como Usar

### ✅ Importação Recomendada (via barrel export)

```typescript
import {
  studentFormSchema,
  studentCompleteFormSchema,
  uuidSchema,
  phoneSchema
} from '@/schemas';
```

### ⚠️ Importação Específica (quando necessário)

```typescript
import { studentFormSchema } from '@/schemas/studentSchemas';
import { absenceSchema } from '@/schemas/absenceSchemas';
```

### 📝 Uso em Formulários (React Hook Form)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { studentFormSchema } from '@/schemas';
import type { z } from 'zod';

const form = useForm({
  resolver: zodResolver(studentFormSchema),
  defaultValues: {
    nome: '',
    turma: '',
    turno: 'MANHÃ',
    status: 'ATIVO',
    bolsaFamilia: 'NÃO',
  }
});

// Tipo inferido automaticamente
type FormData = z.infer<typeof studentFormSchema>;

const handleSubmit = (data: FormData) => {
  // data é type-safe!
  console.log(data.nome); // ✅ OK
  console.log(data.invalid); // ❌ Erro TypeScript
};
```

### 🔍 Validação Manual

```typescript
import { validateStudent, safeValidateStudent } from '@/schemas';

// Validação que lança erro
try {
  const validStudent = validateStudent(userData);
  // validStudent é tipo Student
} catch (error) {
  console.error('Validação falhou:', error);
}

// Validação segura (não lança erro)
const result = safeValidateStudent(userData);

if (result.success) {
  const validStudent = result.data;
  // validStudent é tipo Student
} else {
  console.error('Erros:', result.error.issues);
}
```

### 🎨 Uso em Componentes

```typescript
import { StudentFormData } from '@/schemas';
import { UseFormReturn } from 'react-hook-form';

interface StudentFormProps {
  form: UseFormReturn<StudentFormData>;
  onSubmit: (data: StudentFormData) => void;
}

export function StudentForm({ form, onSubmit }: StudentFormProps) {
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Campos do formulário */}
    </form>
  );
}
```

---

## 🔧 Schemas Comuns

### UUID Schema

```typescript
import { uuidSchema } from '@/schemas';

// Validar UUID
const result = uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000');
if (result.success) {
  console.log('UUID válido:', result.data);
}

// Em um schema maior
const mySchema = z.object({
  id: uuidSchema,
  name: z.string(),
});
```

### ISO Date Schema

```typescript
import { isoDateSchema } from '@/schemas';

// Valida formato YYYY-MM-DDTHH:mm:ss.sssZ
const result = isoDateSchema.safeParse('2025-01-09T12:30:00.000Z');
```

### Phone Schema

```typescript
import { phoneSchema } from '@/schemas';

// Valida telefone brasileiro (10-11 dígitos apenas)
const result = phoneSchema.safeParse('11987654321'); // ✅ Válido
const result2 = phoneSchema.safeParse('(11) 98765-4321'); // ❌ Inválido (tem formatação)

// Sanitizar antes de validar
const cleanPhone = phone.replace(/\D/g, '');
const result = phoneSchema.safeParse(cleanPhone); // ✅ OK
```

### CEP Schema

```typescript
import { cepSchema } from '@/schemas';

// Valida CEP brasileiro (8 dígitos apenas)
const result = cepSchema.safeParse('01310100'); // ✅ Válido
const result2 = cepSchema.safeParse('01310-100'); // ❌ Inválido (tem formatação)

// Sanitizar antes de validar
const cleanCep = cep.replace(/\D/g, '');
const result = cepSchema.safeParse(cleanCep); // ✅ OK
```

### CPF Schema

```typescript
import { cpfSchema } from '@/schemas';

// Valida CPF (11 dígitos apenas, sem validação de dígitos verificadores)
const result = cpfSchema.safeParse('12345678901'); // ✅ Formato OK
```

### Email Schema

```typescript
import { emailSchema } from '@/schemas';

// Email opcional (aceita '' ou email válido)
const result = emailSchema.safeParse('user@example.com'); // ✅ Válido
const result2 = emailSchema.safeParse(''); // ✅ Válido (opcional)
const result3 = emailSchema.safeParse('invalid'); // ❌ Inválido
```

---

## 👨‍🎓 Student Schemas

### Student Form Schema (Simples)

**Quando usar**: Formulários que permitem dados parciais durante edição

```typescript
import { studentFormSchema, StudentFormData } from '@/schemas';

const form = useForm<StudentFormData>({
  resolver: zodResolver(studentFormSchema),
});

// Schema permite campos extras via .passthrough()
// Útil para edição onde outros campos já existem
```

**Campos obrigatórios**: `nome`, `turma`
**Campos com default**: `turno`, `status`, `bolsaFamilia`
**Comportamento**: `.passthrough()` permite campos extras não validados

### Student Complete Form Schema

**Quando usar**: Formulário completo de cadastro/edição com validação estrita

```typescript
import { studentCompleteFormSchema, StudentCompleteFormData } from '@/schemas';

const form = useForm<StudentCompleteFormData>({
  resolver: zodResolver(studentCompleteFormSchema),
  defaultValues: {
    nome: '',
    turma: '',
    turno: 'MANHÃ',
    dataNascimento: '',
    status: 'ATIVO',
    bolsaFamilia: 'NÃO',
    email: '',
    contatos: [],
    deficiencia: {
      estudanteComDeficiencia: false,
    },
  },
});
```

**Inclui validação de**:
- Dados pessoais (nome, turma, turno, data nascimento, etc)
- Endereço completo (opcional)
- Contatos (array, opcional)
- Deficiência (objeto completo, opcional)

### Create Student Schema

**Quando usar**: Criar novo estudante (via service/API)

```typescript
import { createStudentSchema, CreateStudent } from '@/schemas';

const newStudent: CreateStudent = {
  estudanteId: uuidv4(),
  nome: 'JOÃO DA SILVA',
  turma: '5A',
  status: 'ATIVO',
  turno: 'MANHÃ',
  bolsaFamilia: 'NÃO',
  // ... outros campos
};

// Validar antes de salvar
const validated = createStudentSchema.parse(newStudent);
```

**Omite campos de sistema**: `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `deleted`, etc.

### Update Student Schema

**Quando usar**: Atualizar estudante existente

```typescript
import { updateStudentSchema, UpdateStudent } from '@/schemas';

const updates: UpdateStudent = {
  estudanteId: 'uuid-do-estudante', // Obrigatório
  turma: '6A', // Atualizar turma
  // Outros campos opcionais
};

const validated = updateStudentSchema.parse(updates);
```

**Campo obrigatório**: `estudanteId`
**Outros campos**: Todos opcionais (`.partial()`)

### Student Filter Schema

**Quando usar**: Filtrar listagem de estudantes

```typescript
import { studentFilterSchema, StudentFilter } from '@/schemas';

const filters: StudentFilter = {
  turma: '5A',
  status: 'ATIVO',
  turno: 'MANHÃ',
  bolsaFamilia: 'SIM',
  estudanteComDeficiencia: true,
  includeDeleted: false,
};

const validated = studentFilterSchema.parse(filters);
```

---

## 🚫 Absence Schemas

### Absence Schema

```typescript
import { absenceSchema, Absence } from '@/schemas';

const absence: Absence = {
  estudanteId: 'uuid-estudante',
  data: '2025-01-09',
  turma: '5A',
  justified: false,
  reason: 'Não compareceu',
};
```

### Certificate Schema (Atestado)

```typescript
import { certificateSchema, Certificate } from '@/schemas';

const certificate: Certificate = {
  estudanteId: 'uuid-estudante',
  startDate: '2025-01-09',
  days: 3,
  description: 'Atestado médico por gripe',
  fileUrl: 'https://...',
};
```

---

## 💬 Interaction Schemas

### Interaction Types

```typescript
type InteractionType =
  | 'LIGACAO'
  | 'REUNIAO_PRESENCIAL'
  | 'REUNIAO_REMOTA'
  | 'MENSAGEM'
  | 'EMAIL'
  | 'VISITA_DOMICILIAR'
  | 'OUTROS';
```

### Interaction Outcomes

```typescript
type InteractionOutcome =
  | 'POSITIVO'
  | 'NEGATIVO'
  | 'NEUTRO'
  | 'AGUARDANDO_RETORNO';
```

### Create Interaction

```typescript
import { createInteractionSchema, CreateInteraction } from '@/schemas';

const interaction: CreateInteraction = {
  studentId: 'uuid-estudante',
  date: '2025-01-09',
  type: 'LIGACAO',
  description: 'Conversa com responsável sobre faltas',
  sensitive: false,
  outcome: 'POSITIVO',
  contactName: 'Maria da Silva (mãe)',
  followUpNeeded: false,
};
```

---

## ✅ Task Schemas

### Task Types

```typescript
type TaskType =
  | 'LIGAR_PARA_RESPONSAVEL'
  | 'CHAMAR_RESPONSAVEL'
  | 'VERIFICAR_AUSENCIA'
  | 'ATUALIZAR_DADOS'
  | 'OUTROS';
```

### Task Status

```typescript
type TaskStatus = 'PENDING' | 'COMPLETED';
```

### Bimestre

```typescript
type Bimestre = '1B' | '2B' | '3B' | '4B' | 'ANUAL';
```

### Create Task

```typescript
import { createTaskSchema, CreateTask } from '@/schemas';

const task: CreateTask = {
  estudanteId: 'uuid-estudante',
  userId: 'uuid-usuario',
  taskType: 'LIGAR_PARA_RESPONSAVEL',
  status: 'PENDING',
  bimestre: '1B',
  createdDate: '2025-01-09',
  description: 'Verificar motivo das faltas',
  priority: 'HIGH',
  dueDate: '2025-01-15',
};
```

---

## 🎯 Melhores Práticas

### 1. Sempre Importe do Barrel Export

```typescript
// ✅ BOM
import { studentFormSchema } from '@/schemas';

// ❌ EVITAR (a menos que necessário)
import { studentFormSchema } from '@/schemas/studentSchemas';
```

### 2. Use Safe Parse para Validação de Entrada Externa

```typescript
import { safeValidateStudent } from '@/schemas';

const result = safeValidateStudent(externalData);

if (result.success) {
  // Use result.data (tipo Student)
  processStudent(result.data);
} else {
  // Trate erros
  result.error.issues.forEach(issue => {
    console.error(`${issue.path}: ${issue.message}`);
  });
}
```

### 3. Infira Tipos ao Invés de Duplicar

```typescript
import { studentFormSchema } from '@/schemas';
import type { z } from 'zod';

// ✅ BOM - Tipo inferido
type FormData = z.infer<typeof studentFormSchema>;

// ❌ RUIM - Tipo duplicado
interface FormData {
  nome: string;
  turma: string;
  // ... duplicação!
}
```

### 4. Sanitize Antes de Validar

```typescript
import { phoneSchema, cepSchema } from '@/schemas';

// ✅ BOM
const cleanPhone = rawPhone.replace(/\D/g, ''); // Remove não-dígitos
const result = phoneSchema.safeParse(cleanPhone);

// ❌ RUIM
const result = phoneSchema.safeParse('(11) 98765-4321'); // Falha na validação
```

### 5. Use Helpers de Validação

```typescript
import {
  validateStudent,
  validateCreateStudent,
  safeValidateStudent
} from '@/schemas';

// Throwing validation (para uso em try-catch)
try {
  const student = validateStudent(data);
} catch (error) {
  // Trate erro
}

// Safe validation (sem throw)
const result = safeValidateStudent(data);
```

### 6. Componha Schemas para Casos Específicos

```typescript
import { studentSchema } from '@/schemas';

// Schema customizado para um caso específico
const studentWithContactSchema = studentSchema.required({
  contatos: true, // Torna contatos obrigatório
});

// Schema customizado removendo campos
const publicStudentSchema = studentSchema.omit({
  email: true,
  contatos: true,
});
```

---

## 💡 Exemplos Práticos

### Exemplo 1: Formulário de Cadastro de Estudante

```typescript
// src/app/cadastrar-estudante/page.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { studentFormSchema, StudentFormData } from '@/schemas';
import { StudentDataService } from '@/services/studentDataService';
import { toast } from 'sonner';

export default function CadastrarEstudantePage() {
  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      nome: '',
      turma: '',
      turno: 'MANHÃ',
      status: 'ATIVO',
      bolsaFamilia: 'NÃO',
    },
  });

  const handleSubmit = async (data: StudentFormData) => {
    try {
      await StudentDataService.addStudent(data);
      toast.success('Estudante cadastrado com sucesso!');
      form.reset();
    } catch (error) {
      toast.error('Erro ao cadastrar estudante');
      console.error(error);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      {/* Campos do formulário */}
    </form>
  );
}
```

### Exemplo 2: API Route com Validação

```typescript
// src/app/api/students/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { safeValidateCreateStudent } from '@/schemas';
import { StudentDataService } from '@/services/studentDataService';

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Validar com safe parse
  const result = safeValidateCreateStudent(body);

  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Dados inválidos',
        issues: result.error.issues
      },
      { status: 400 }
    );
  }

  try {
    const student = await StudentDataService.addStudent(result.data);
    return NextResponse.json({ success: true, data: student });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao criar estudante' },
      { status: 500 }
    );
  }
}
```

### Exemplo 3: Componente com Props Tipadas

```typescript
// src/components/StudentForm.tsx
import { UseFormReturn } from 'react-hook-form';
import { StudentCompleteFormData } from '@/schemas';

interface StudentFormProps {
  form: UseFormReturn<StudentCompleteFormData>;
  onSubmit: (data: StudentCompleteFormData) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

export function StudentForm({
  form,
  onSubmit,
  onCancel,
  isEditing = false
}: StudentFormProps) {
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Campos do formulário */}
    </form>
  );
}
```

### Exemplo 4: Filtros de Busca

```typescript
// src/app/home/page.tsx
import { studentFilterSchema, StudentFilter } from '@/schemas';
import { StudentDataService } from '@/services/studentDataService';

const [filters, setFilters] = useState<StudentFilter>({
  turma: '',
  status: 'ATIVO',
  includeDeleted: false,
});

const fetchStudents = async () => {
  // Validar filtros antes de usar
  const validFilters = studentFilterSchema.parse(filters);
  const students = await StudentDataService.getStudents(validFilters);
  setStudents(students);
};
```

---

## 🔄 Migração de Schemas Inline

### Antes (Schema Inline)

```typescript
// ❌ ANTES - Schema duplicado em cada arquivo
import * as z from "zod";

const studentSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  turma: z.string().min(1, "Turma é obrigatória"),
  turno: z.string().default("MANHÃ"),
  dataNascimento: z.string().optional(),
  matricula: z.string().optional(),
  status: z.string().default("ATIVO"),
  bolsaFamilia: z.string().default("NÃO"),
  email: z.string().optional(),
}).passthrough();

const form = useForm({
  resolver: zodResolver(studentSchema),
});
```

### Depois (Schema Centralizado)

```typescript
// ✅ DEPOIS - Schema importado de localização centralizada
import { studentFormSchema } from '@/schemas';

const form = useForm({
  resolver: zodResolver(studentFormSchema),
});
```

### Benefícios da Migração

1. **Eliminação de ~70 linhas de código duplicado** no projeto
2. **Consistência**: Mesma validação em todos os lugares
3. **Manutenibilidade**: Mudança em um lugar atualiza todos os usos
4. **Type-safety**: Tipos inferidos automaticamente
5. **DRY**: Schemas compostos de blocos reutilizáveis

---

## 📚 Referências

- **Zod Documentation**: https://zod.dev
- **React Hook Form + Zod**: https://react-hook-form.com/get-started#SchemaValidation
- **TypeScript Type Inference**: https://www.typescriptlang.org/docs/handbook/type-inference.html

---

## ✅ Checklist de Migração

Se você está migrando um schema inline para centralizado:

- [ ] Identificar schema inline existente
- [ ] Verificar se já existe schema similar em `src/schemas/`
- [ ] Se não existe, criar em arquivo apropriado
- [ ] Exportar tipo com `z.infer<typeof schema>`
- [ ] Adicionar ao barrel export (`src/schemas/index.ts`)
- [ ] Substituir import no arquivo original
- [ ] Remover schema inline
- [ ] Testar compilação TypeScript
- [ ] Testar funcionalidade

---

**Última Atualização**: 2025-01-09
**Versão**: 1.0.0
**Status**: ✅ Completo