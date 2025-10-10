# 📚 Guia: BaseFirestoreService

> **Criado em**: 2025-10-10
> **Status**: ✅ Implementado

## 🎯 Objetivo

O `BaseFirestoreService` é uma classe base genérica que **elimina código duplicado** em serviços Firestore, fornecendo operações CRUD comuns com:

- ✅ **Soft Delete** automático
- ✅ **Auditoria** (createdAt, updatedAt)
- ✅ **Paginação** integrada
- ✅ **Batch operations**
- ✅ **Type-safe** com TypeScript genérico

## 📦 Localização

```
src/services/firebase/
├── BaseFirestoreService.ts      # Classe base
├── UserTasksService.ts          # Exemplo de uso
└── index.ts                     # Barrel export
```

## 🔧 Como Usar

### 1. Criar um Novo Serviço

```typescript
// src/services/firebase/MyEntityService.ts

import { BaseFirestoreService, Auditable } from '@/services/firebase';
import { logger } from '@/utils/logger';

// 1. Definir interface com auditoria
interface MyEntity extends Auditable {
  id: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
  // ... outros campos
}

// 2. Estender BaseFirestoreService
export class MyEntityService extends BaseFirestoreService<MyEntity> {
  constructor() {
    super('myEntities'); // Nome da coleção no Firestore
  }

  // 3. Adicionar métodos específicos do domínio
  async getActive(): Promise<MyEntity[]> {
    return await this.getAll({
      filters: [
        { field: 'status', operator: '==', value: 'ACTIVE' }
      ],
      orderByField: 'name',
      orderDirection: 'asc'
    });
  }

  async getByName(name: string): Promise<MyEntity[]> {
    return await this.getAll({
      filters: [
        { field: 'name', operator: '==', value: name }
      ]
    });
  }
}

// 4. Exportar instância singleton
export const myEntityService = new MyEntityService();
```

### 2. Operações CRUD Básicas

```typescript
import { myEntityService } from '@/services/firebase/MyEntityService';

// ✅ CREATE
const id = 'my-unique-id';
await myEntityService.create(id, {
  name: 'Minha Entidade',
  description: 'Descrição aqui',
  status: 'ACTIVE'
});
// createdAt, updatedAt, deletedAt são adicionados automaticamente

// ✅ READ (por ID)
const entity = await myEntityService.getById(id);
if (entity) {
  console.log(entity.name);
}

// ✅ READ (todos)
const allEntities = await myEntityService.getAll({
  orderByField: 'name',
  orderDirection: 'asc'
});

// ✅ READ (com filtros)
const activeEntities = await myEntityService.getAll({
  filters: [
    { field: 'status', operator: '==', value: 'ACTIVE' }
  ],
  limit: 10
});

// ✅ UPDATE
await myEntityService.update(id, {
  description: 'Nova descrição'
});
// updatedAt é atualizado automaticamente

// ✅ SOFT DELETE (recomendado)
await myEntityService.softDelete(id);
// Marca deletedAt = Timestamp.now()
// getAll() não retorna documentos deletados

// ✅ HARD DELETE (use com cuidado!)
await myEntityService.hardDelete(id);
// Remove permanentemente do Firestore

// ✅ RESTORE (restaurar soft deleted)
await myEntityService.restore(id);
// Define deletedAt = null
```

### 3. Paginação

```typescript
// Primeira página
const page1 = await myEntityService.getPaginated({
  limit: 20,
  orderByField: 'createdAt',
  orderDirection: 'desc'
});

console.log(page1.data); // Array de 20 itens
console.log(page1.hasMore); // true se houver mais

// Segunda página
if (page1.hasMore && page1.lastDoc) {
  const page2 = await myEntityService.getPaginated({
    limit: 20,
    orderByField: 'createdAt',
    orderDirection: 'desc',
    startAfter: page1.lastDoc
  });
}
```

### 4. Batch Operations

```typescript
// Criar batch
const batch = myEntityService.createBatch();

// Adicionar múltiplas operações
myEntityService.batchCreate(batch, 'id-1', { name: 'Entity 1', ... });
myEntityService.batchCreate(batch, 'id-2', { name: 'Entity 2', ... });
myEntityService.batchUpdate(batch, 'id-3', { status: 'INACTIVE' });
myEntityService.batchSoftDelete(batch, 'id-4');

// Executar tudo de uma vez (atômico)
await batch.commit();
```

### 5. Contadores e Existência

```typescript
// Contar documentos
const total = await myEntityService.count();

// Contar com filtro
const activeCount = await myEntityService.count([
  { field: 'status', operator: '==', value: 'ACTIVE' }
]);

// Verificar se existe
const exists = await myEntityService.exists('my-id');
```

## 📊 Filtros Disponíveis

```typescript
interface QueryOptions {
  limit?: number;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  startAfter?: DocumentSnapshot;
  filters?: Array<{
    field: string;
    operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'array-contains';
    value: any;
  }>;
}
```

### Exemplos de Filtros:

```typescript
// Igualdade
{ field: 'status', operator: '==', value: 'ACTIVE' }

// Diferença
{ field: 'status', operator: '!=', value: 'DELETED' }

// Maior que
{ field: 'createdAt', operator: '>', value: Timestamp.fromDate(new Date('2025-01-01')) }

// Menor ou igual
{ field: 'priority', operator: '<=', value: 3 }

// In (múltiplos valores)
{ field: 'turma', operator: 'in', value: ['5A', '5B', '5C'] }

// Array contains
{ field: 'tags', operator: 'array-contains', value: 'importante' }
```

## 🎯 Benefícios

### Antes (Código Duplicado):

```typescript
// taskService.ts
export class TaskService {
  static async getAll() {
    const snapshot = await getDocs(collection(db, 'tasks'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async getById(id: string) {
    const docRef = doc(db, 'tasks', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() };
  }

  // ... mais 100 linhas de código
}

// studentService.ts
export class StudentService {
  static async getAll() { /* MESMA LÓGICA DUPLICADA */ }
  static async getById(id: string) { /* MESMA LÓGICA DUPLICADA */ }
  // ... mais 100 linhas
}

// whatsappService.ts
export class WhatsAppService {
  static async getAll() { /* MESMA LÓGICA DUPLICADA */ }
  // ... etc
}
```

### Depois (Sem Duplicação):

```typescript
// taskService.ts
export class TaskService extends BaseFirestoreService<Task> {
  constructor() {
    super('tasks');
  }

  // Apenas métodos específicos de domínio
  async getPending() {
    return await this.getAll({
      filters: [{ field: 'is_resolved', operator: '==', value: false }]
    });
  }
}

// studentService.ts
export class StudentService extends BaseFirestoreService<Student> {
  constructor() {
    super('estudantes');
  }

  // Apenas métodos específicos de estudantes
  async getByTurma(turma: string) {
    return await this.getAll({
      filters: [{ field: 'turma', operator: '==', value: turma }]
    });
  }
}

// whatsappService.ts
export class WhatsAppService extends BaseFirestoreService<WhatsAppMessage> {
  constructor() {
    super('whatsappMessageHistory');
  }
}
```

**Redução**: ~300 linhas de código duplicado eliminadas!

## ⚠️ Boas Práticas

### ✅ DO

```typescript
// Sempre estender BaseFirestoreService
export class MyService extends BaseFirestoreService<MyType> { }

// Usar soft delete por padrão
await myService.softDelete(id);

// Adicionar métodos específicos de domínio
async getByCustomField(value: string) {
  return await this.getAll({
    filters: [{ field: 'customField', operator: '==', value }]
  });
}

// Usar instância singleton
export const myService = new MyService();
```

### ❌ DON'T

```typescript
// Não reimplementar métodos já existentes
async getById(id: string) {
  // ❌ Já existe no BaseFirestoreService!
  const docRef = doc(db, this.collectionName, id);
  // ...
}

// Não usar hard delete sem necessidade extrema
await myService.hardDelete(id); // ⚠️ PERIGOSO!

// Não ignorar soft delete
const all = await getDocs(collection(db, 'myCollection'));
// ❌ Retorna incluindo deletados!

// Use:
const all = await myService.getAll();
// ✅ Filtra deletedAt automaticamente
```

## 🔄 Migração de Serviços Existentes

### Passo a Passo:

1. **Identificar serviço** a ser migrado
2. **Criar nova classe** estendendo BaseFirestoreService
3. **Mover métodos específicos** de domínio
4. **Remover métodos genéricos** (já estão no Base)
5. **Testar** todas as funcionalidades
6. **Substituir imports** no código

### Exemplo:

```typescript
// ANTES: src/services/taskService.ts (200 linhas)
export class TaskService {
  static async getAll() { ... } // 20 linhas
  static async getById(id) { ... } // 15 linhas
  static async create(data) { ... } // 25 linhas
  static async update(id, data) { ... } // 20 linhas
  static async delete(id) { ... } // 15 linhas
  static async getPending() { ... } // 30 linhas específicas
  static async getByStudent(estudanteId) { ... } // 25 linhas específicas
}

// DEPOIS: src/services/firebase/TaskService.ts (60 linhas)
export class TaskService extends BaseFirestoreService<Task> {
  constructor() {
    super('tasks');
  }

  // Apenas métodos específicos (55 linhas)
  async getPending() { ... }
  async getByStudent(estudanteId) { ... }
}
```

**Redução**: 200 → 60 linhas (-70%)

## 📚 Referências

- **Arquivo**: `src/services/firebase/BaseFirestoreService.ts`
- **Exemplo**: `src/services/firebase/UserTasksService.ts`
- **Tipos**: `src/services/firebase/index.ts`

## 🎓 Próximos Passos

1. Migrar `taskService.ts` → `firebase/TaskService.ts`
2. Migrar `whatsappService.ts` → `firebase/WhatsAppService.ts`
3. Migrar outros serviços conforme necessário
4. Remover código duplicado antigo

---

**Criado por**: Claude Code - Fase 1 de Melhorias
**Versão**: 1.0.0
