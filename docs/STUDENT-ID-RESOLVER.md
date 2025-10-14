# Student ID Resolver - Documentação Técnica

**Data**: 2025-10-14
**Autor**: Claude Code
**Versão**: 1.0.0

---

## 📋 Sumário Executivo

Helper centralizado para resolver conversões entre Firebase UUIDs (externos) e Internal IDs (Supabase). Implementado para otimizar performance e eliminar queries duplicadas nos services.

---

## 🎯 Problema Original

### Arquitetura Supabase

A tabela `students` mantém **2 UUIDs** diferentes:

```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- ← Internal ID (Supabase)
  student_id UUID NOT NULL UNIQUE,                 -- ← Firebase UUID (aplicação)
  name TEXT,
  ...
);
```

**Foreign Keys apontam para `students.id`** (Internal ID):

```sql
CREATE TABLE medical_certificates (
  student_id UUID REFERENCES students(id),  -- ← FK para Internal ID
  ...
);

CREATE TABLE student_suspensions (
  student_id UUID REFERENCES students(id),  -- ← FK para Internal ID
  ...
);
```

### Fluxo Antes da Otimização

```
Usuário acessa: /perfil-estudante?id=ce5ac93c-bad9-4f82... (Firebase UUID)
                                    ↓
Service: getByStudentId(firebaseUUID)
                                    ↓
Query 1: SELECT * FROM medical_certificates WHERE student_id = 'ce5ac93c...'
         ❌ FALHA (FK espera Internal ID, não Firebase UUID)
                                    ↓
Query 2: SELECT id FROM students WHERE student_id = 'ce5ac93c...'
         ✅ Retorna: 'd2b76d89-660f-4179...' (Internal ID)
                                    ↓
Query 3: SELECT * FROM medical_certificates WHERE student_id = 'd2b76d89...'
         ✅ SUCESSO
```

**Resultado**: **3 queries** em vez de 1!

---

## ✅ Solução Implementada

### Helper Centralizado

**Arquivo**: [`src/utils/studentIdResolver.ts`](../src/utils/studentIdResolver.ts)

### Funções Principais

#### 1. `resolveToInternalId(firebaseUUID)`

Converte Firebase UUID → Internal ID (com cache).

```typescript
import { resolveToInternalId } from '@/utils/studentIdResolver';

const internalId = await resolveToInternalId('ce5ac93c-bad9-4f82-af87-ffac12eb395f');
// Retorna: 'd2b76d89-660f-4179-961a-1ea294bd14ca'
```

#### 2. `resolveToFirebaseUUID(internalId)`

Converte Internal ID → Firebase UUID (reverse lookup).

```typescript
const firebaseUUID = await resolveToFirebaseUUID('d2b76d89-660f-4179-961a-1ea294bd14ca');
// Retorna: 'ce5ac93c-bad9-4f82-af87-ffac12eb395f'
```

#### 3. `resolveBatch(firebaseUUIDs[])`

Resolve múltiplos UUIDs em **1 query única**.

```typescript
const mapping = await resolveBatch(['uuid1', 'uuid2', 'uuid3']);
// Retorna: Map<FirebaseUUID, InternalID>
```

---

## 🚀 Performance

### Cache Automático

- **TTL**: 1 hora
- **Estrutura**: Map<FirebaseUUID, InternalID>
- **Bidirectional**: Também mapeia InternalID → FirebaseUUID

### Ganhos de Performance

| Operação | Antes | Depois | Ganho |
|----------|-------|--------|-------|
| **Buscar atestados** | 3 queries | 1 query | **66% menos queries** |
| **Criar suspensão** | 2 queries | 1 query | **50% menos queries** |
| **Buscar suspensões** | 3 queries | 1 query (cache) | **66% menos queries** |
| **Batch de 100 estudantes** | 100 queries | 1 query | **99% menos queries** |

---

## 📦 Services Refatorados

### 1. MedicalCertificatesService

**Antes**:
```typescript
// Tenta direto (falha)
let { data, error } = await supabase
  .from('medical_certificates')
  .eq('student_id', studentId);

// Se falhou, converte manualmente
if (!data || data.length === 0) {
  const { data: studentData } = await supabase
    .from('students')
    .select('id')
    .eq('student_id', studentId)
    .maybeSingle();

  const internalId = studentData.id;

  // Tenta de novo
  const result = await supabase
    .from('medical_certificates')
    .eq('student_id', internalId);
}
```

**Depois**:
```typescript
import { resolveToInternalId } from '@/utils/studentIdResolver';

// Resolve de cara (com cache)
const internalId = await resolveToInternalId(studentId);

// Busca UMA vez
const { data, error } = await supabase
  .from('medical_certificates')
  .eq('student_id', internalId);
```

### 2. StudentSuspensionsService

Mesma refatoração aplicada.

---

## 🔧 Como Usar em Novos Services

### Padrão Recomendado

```typescript
import { resolveToInternalId } from '@/utils/studentIdResolver';

export class MyNewService {
  static async getByStudentId(firebaseUUID: string): Promise<MyData[]> {
    try {
      // 1. Resolver Firebase UUID → Internal ID
      const internalId = await resolveToInternalId(firebaseUUID);

      if (!internalId) {
        logger.warn('Estudante não encontrado', { firebaseUUID });
        return [];
      }

      // 2. Usar Internal ID na query
      const { data, error } = await supabase
        .from('my_table')
        .select('*')
        .eq('student_id', internalId);

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Erro ao buscar dados', { firebaseUUID }, error as Error);
      return [];
    }
  }

  static async create(data: { studentId: string; ... }): Promise<MyData | null> {
    try {
      // 1. Resolver antes de inserir
      const internalId = await resolveToInternalId(data.studentId);

      if (!internalId) {
        throw new Error(`Estudante não encontrado: ${data.studentId}`);
      }

      // 2. Inserir com Internal ID
      const { data: result, error } = await supabase
        .from('my_table')
        .insert({
          student_id: internalId,  // ← Internal ID, não Firebase UUID
          ...otherFields
        })
        .select()
        .single();

      if (error) throw error;

      return result;
    } catch (error) {
      logger.error('Erro ao criar', data, error as Error);
      throw error;
    }
  }
}
```

---

## 🧪 Testando

### Fluxo de Teste Completo

1. **Criar suspensão**:
   ```
   POST /api/suspensions
   { studentId: "ce5ac93c..." }

   ✅ 1 query de conversão (miss cache)
   ✅ 1 query de insert
   Total: 2 queries
   ```

2. **Buscar suspensões** (mesma sessão):
   ```
   GET /api/suspensions?studentId=ce5ac93c...

   ✅ 0 queries de conversão (hit cache!)
   ✅ 1 query de select
   Total: 1 query
   ```

3. **Deletar suspensão**:
   ```
   DELETE /api/suspensions/123

   ✅ 1 query de delete
   Total: 1 query
   ```

### Limpar Cache (se necessário)

```typescript
import { clearCache } from '@/utils/studentIdResolver';

clearCache(); // Limpa Map completo
```

---

## 📊 Monitoramento

### Estatísticas do Cache

```typescript
import { getCacheStats } from '@/utils/studentIdResolver';

const stats = getCacheStats();
console.log(stats);
// { size: 150, ttl: 3600000 }
```

### Logs

O helper **não gera logs de debug** para evitar poluição do console. Apenas logs de erro (`logger.error()`) e warnings (`logger.warn()`).

---

## 🔮 Futuras Otimizações (Opcional)

### Opção 1: Usar JOIN em vez de Conversão

Padrão usado em `absenceService.ts`:

```typescript
// Em vez de converter manualmente
const internalId = await resolveToInternalId(firebaseUUID);

// Usar JOIN (0 conversões necessárias)
const { data, error } = await supabase
  .from('medical_certificates')
  .select(`
    *,
    students!inner (
      student_id
    )
  `)
  .eq('students.student_id', firebaseUUID);
```

**Prós**:
- ✅ Sem conversão de ID
- ✅ 1 query sempre

**Contras**:
- ⚠️ Query mais complexa
- ⚠️ Dados nested (precisa mapear)

### Opção 2: Refatorar Schema (Arriscado)

Mudar Foreign Keys para apontar `students(student_id)` em vez de `students(id)`.

**Prós**:
- ✅ Elimina conversão completamente
- ✅ Simplifica código

**Contras**:
- ❌ Migração arriscada (~10k registros)
- ❌ Mudança estrutural grande

---

## ✅ Checklist de Implementação

- [x] Criar helper `studentIdResolver.ts`
- [x] Implementar cache com TTL
- [x] Refatorar `MedicalCertificatesService`
- [x] Refatorar `StudentSuspensionsService`
- [x] Remover logs de debug desnecessários
- [x] Documentar decisão de arquitetura
- [ ] Testar fluxo completo em dev
- [ ] Code review
- [ ] Deploy em staging

---

## 📚 Referências

- **Helper**: [`src/utils/studentIdResolver.ts`](../src/utils/studentIdResolver.ts)
- **Services Refatorados**:
  - [`medicalCertificatesService.ts`](../src/services/supabase/medicalCertificatesService.ts)
  - [`studentSuspensionsService.ts`](../src/services/supabase/studentSuspensionsService.ts)
- **Arquitetura Supabase**: [`docs/archives/migration/CORRECAO-FOREIGN-KEY-ABSENCES.md`](./archives/migration/CORRECAO-FOREIGN-KEY-ABSENCES.md)

---

**Status**: ✅ Implementado e Documentado
**Próximos Passos**: Testes em dev → Code review → Deploy
