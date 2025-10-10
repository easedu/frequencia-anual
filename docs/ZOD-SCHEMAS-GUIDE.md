# 📝 Guia: Schemas Zod Centralizados

> **Criado em**: 2025-10-10
> **Status**: ✅ Implementado

## 🎯 Objetivo

Centralizar todos os schemas de validação Zod em um único local (`src/schemas/`) para:

- ✅ **Reutilização** - Evitar duplicação de validações
- ✅ **Consistência** - Mesmas regras em todo o app
- ✅ **Manutenção** - Alterar em um único lugar
- ✅ **Type-safety** - TypeScript infere tipos dos schemas

## 📦 Estrutura

```
src/schemas/
├── index.ts                  # Barrel export (ponto único de entrada)
├── common.ts                 # Schemas básicos reutilizáveis
├── studentSchemas.ts         # Validações de estudantes
├── absenceSchemas.ts         # Validações de faltas/atestados
├── interactionSchemas.ts     # Validações de interações
└── taskSchemas.ts            # Validações de tarefas
```

## 🔧 Como Usar

### Import Simplificado

```typescript
// ✅ BOM - Import único
import { studentFormSchema, cpfSchema, phoneSchema } from '@/schemas';

// ❌ RUIM - Imports múltiplos
import { studentFormSchema } from '@/schemas/studentSchemas';
import { cpfSchema } from '@/schemas/common';
import { phoneSchema } from '@/schemas/common';
```

### Em Formulários (React Hook Form)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { studentFormSchema } from '@/schemas';

export function StudentForm() {
  const form = useForm({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      nome: '',
      turma: '',
      // ...
    }
  });

  const onSubmit = (data) => {
    // data já está validado e tipado!
    console.log(data.nome); // TypeScript conhece os campos
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* ... */}
    </form>
  );
}
```

### Em API Routes

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { studentFormSchema } from '@/schemas';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar com Zod
    const validatedData = studentFormSchema.parse(body);

    // validatedData está tipado e validado
    // Continuar processamento...

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}
```

### Validação Manual

```typescript
import { phoneSchema, cpfSchema } from '@/schemas';

// Validar e retornar resultado
const phoneResult = phoneSchema.safeParse('11987654321');
if (phoneResult.success) {
  console.log('Telefone válido:', phoneResult.data);
} else {
  console.error('Erros:', phoneResult.error.errors);
}

// Validar e lançar erro se inválido
try {
  const cpf = cpfSchema.parse('12345678901'); // Válido
  console.log('CPF:', cpf);
} catch (error) {
  console.error('CPF inválido:', error);
}
```

## 📚 Schemas Disponíveis

### Common Schemas (`common.ts`)

| Schema | Descrição | Exemplo |
|--------|-----------|---------|
| `uuidSchema` | UUID v4 válido | `"550e8400-e29b-41d4-a716-446655440000"` |
| `isoDateSchema` | Data ISO 8601 | `"2025-01-15T10:30:00.000Z"` |
| `cpfSchema` | CPF (11 dígitos) | `"12345678901"` |
| `phoneSchema` | Telefone BR (10-11 dígitos) | `"11987654321"` |
| `cepSchema` | CEP (8 dígitos) | `"01310100"` |
| `emailSchema` | Email válido | `"user@example.com"` |

### Student Schemas (`studentSchemas.ts`)

| Schema | Descrição | Uso |
|--------|-----------|-----|
| `studentFormSchema` | Formulário completo de estudante | Cadastro/Edição |
| `studentCompleteFormSchema` | Com todos os campos opcionais | Formulário estendido |
| `contatoSchema` | Validação de contato | Subcoleção contacts |
| `enderecoSchema` | Validação de endereço | Campo endereco |
| `deficienciaSchema` | Validação de deficiência | Array deficiencias |

### Absence Schemas (`absenceSchemas.ts`)

| Schema | Descrição | Uso |
|--------|-----------|-----|
| `registerAbsenceSchema` | Registrar falta | Modal de faltas |
| `atestadoSchema` | Registrar atestado | Modal de atestados |
| `suspensaoSchema` | Registrar suspensão | Modal de suspensões |

### Interaction Schemas (`interactionSchemas.ts`)

| Schema | Descrição | Uso |
|--------|-----------|-----|
| `interactionSchema` | Registrar interação | Modal de interações |
| `occurrenceSchema` | Registrar ocorrência | Modal de ocorrências |

### Task Schemas (`taskSchemas.ts`)

| Schema | Descrição | Uso |
|--------|-----------|-----|
| `taskSchema` | Criar/editar tarefa | Gerenciador de tarefas |
| `taskUpdateSchema` | Atualizar tarefa | Update parcial |

## 🎨 Criar Novos Schemas

### 1. Schema Simples

```typescript
// src/schemas/mySchemas.ts
import { z } from 'zod';

export const mySimpleSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  age: z.number().min(0).max(120),
  email: z.string().email('Email inválido')
});

// Exportar tipo TypeScript
export type MySimpleData = z.infer<typeof mySimpleSchema>;
```

### 2. Schema com Campos Opcionais

```typescript
export const myOptionalSchema = z.object({
  requiredField: z.string().min(1),
  optionalField: z.string().optional(),
  nullableField: z.string().nullable(),
  optionalOrEmpty: z.string().optional().or(z.literal(''))
});
```

### 3. Schema com Validação Customizada

```typescript
export const myCustomSchema = z.object({
  password: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Deve conter ao menos uma letra maiúscula')
    .regex(/[0-9]/, 'Deve conter ao menos um número'),

  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword']
});
```

### 4. Schema Reutilizando Outros

```typescript
import { cpfSchema, phoneSchema, emailSchema } from './common';

export const contactSchema = z.object({
  nome: z.string().min(1),
  cpf: cpfSchema,
  telefone: phoneSchema,
  email: emailSchema
});
```

### 5. Schema com Transformação

```typescript
export const transformedSchema = z.object({
  // Remove espaços em branco
  name: z.string().trim(),

  // Converte para número
  age: z.string().transform(val => parseInt(val, 10)),

  // Converte para boolean
  active: z.string().transform(val => val === 'true')
});
```

### 6. Adicionar ao Index

```typescript
// src/schemas/index.ts
export * from './mySchemas';
```

## ✅ Boas Práticas

### ✅ DO

```typescript
// Sempre use schemas do @/schemas
import { studentFormSchema } from '@/schemas';

// Exporte o tipo TypeScript junto com o schema
export const mySchema = z.object({ ... });
export type MyData = z.infer<typeof mySchema>;

// Use mensagens de erro claras
z.string().min(1, 'Campo obrigatório')
z.string().email('Email inválido')

// Reutilize schemas comuns
import { phoneSchema, cpfSchema } from '@/schemas';

// Valide em API routes
const data = mySchema.parse(body);
```

### ❌ DON'T

```typescript
// Não crie validações inline sem schema
if (!data.name || data.name.length < 3) { ... } // ❌

// Não duplique validações
const cpfRegex = /^\d{11}$/; // ❌ Use cpfSchema

// Não ignore erros de validação
const data = mySchema.parse(body); // Pode lançar erro!
// Sempre use try-catch ou safeParse

// Não crie schemas fora de src/schemas/
// src/components/MyComponent.tsx
const localSchema = z.object({ ... }); // ❌ Mova para src/schemas/
```

## 🔄 Migração de Código Existente

### Antes (sem schema centralizado):

```typescript
// src/components/StudentForm.tsx
const schema = z.object({
  nome: z.string().min(1),
  turma: z.string().min(1),
  // ... 50 linhas de validação
});

// src/app/api/students/route.ts
const apiSchema = z.object({
  nome: z.string().min(1), // DUPLICADO!
  turma: z.string().min(1), // DUPLICADO!
  // ...
});
```

### Depois (com schema centralizado):

```typescript
// src/schemas/studentSchemas.ts
export const studentFormSchema = z.object({
  nome: z.string().min(1),
  turma: z.string().min(1),
  // ... definição única
});

// src/components/StudentForm.tsx
import { studentFormSchema } from '@/schemas';
const form = useForm({ resolver: zodResolver(studentFormSchema) });

// src/app/api/students/route.ts
import { studentFormSchema } from '@/schemas';
const data = studentFormSchema.parse(body);
```

**Benefício**: 1 definição, N usos. Alterar validação em 1 lugar aplica em todo o app!

## 🎯 Checklist de Schema Novo

Ao criar um novo schema:

- [ ] Criar em `src/schemas/` (arquivo apropriado)
- [ ] Exportar em `src/schemas/index.ts`
- [ ] Exportar tipo TypeScript: `export type MyData = z.infer<typeof mySchema>`
- [ ] Adicionar mensagens de erro claras
- [ ] Reutilizar schemas comuns (`cpfSchema`, `phoneSchema`, etc)
- [ ] Documentar em comentários
- [ ] Testar validação com dados válidos e inválidos

## 📚 Referências

- **Zod Docs**: https://zod.dev/
- **Arquivo Index**: `src/schemas/index.ts`
- **Common Schemas**: `src/schemas/common.ts`

---

**Criado por**: Claude Code - Fase 1 de Melhorias
**Versão**: 1.0.0
