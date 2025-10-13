# ⚡ QUICK START - MIGRAÇÃO SUPABASE

**Status**: 📋 Fase 0 (Preparação)
**Próximo**: Fase 1 (Services)

---

## 🎯 PROGRESSO GERAL

```
✅ Fase 0: Migração de Dados (100%)     [21,662 registros]
📋 Fase 1: Services (0%)                [6 arquivos]
⬜ Fase 2: Hooks (0%)                   [8 arquivos]
⬜ Fase 3: Components (0%)              [15 arquivos]
⬜ Fase 4: Pages (0%)                   [15 páginas]
⬜ Fase 5: API Routes (0%)              [4 routes]
⬜ Fase 6: Cleanup (0%)
⬜ Fase 7: Testes (0%)
```

**Total**: 0% da aplicação migrada (apenas dados completos)

---

## 🚀 INÍCIO RÁPIDO

### 1. Criar Branch

```bash
git checkout -b feature/migrate-to-supabase
```

### 2. Confirmar Env Vars

```bash
cat .env.local | grep SUPABASE

# Deve mostrar:
# NEXT_PUBLIC_SUPABASE_URL=https://xccjifrggpgevqftwdkx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
# SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 3. Testar Conexão

```bash
curl http://localhost:3000/api/test-supabase-admin

# Deve retornar:
# {"students":739,"student_contacts":1310,...}
```

---

## 📁 FASE 1: SERVICES (AGORA)

### Arquivos a Migrar (ordem de prioridade)

1. ⭐ `src/services/studentDataService.ts` (CRÍTICO - 300 linhas)
2. `src/services/taskService.ts` (120 linhas)
3. `src/services/firebase/attendanceService.ts` (180 linhas)
4. `src/services/messageHistoryService.ts` (90 linhas)
5. `src/services/whatsappDataService.ts` (60 linhas)
6. `src/services/whatsappTrackingService.ts` (50 linhas)

### Template de Migração

```typescript
// ❌ ANTES
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase.config';

export const getData = async () => {
  const snapshot = await getDocs(collection(db, 'collection_name'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ✅ DEPOIS
import { supabase } from '@/lib/supabaseClient';
import type { TableName } from '@/lib/supabaseClient';

export const getData = async (): Promise<TableName[]> => {
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};
```

### Checklist

- [ ] Migrar `studentDataService.ts`
- [ ] Migrar `taskService.ts`
- [ ] Migrar `attendanceService.ts`
- [ ] Migrar `messageHistoryService.ts`
- [ ] Migrar `whatsappDataService.ts`
- [ ] Migrar `whatsappTrackingService.ts`
- [ ] Commit: `feat: migrate services to Supabase (Phase 1)`

---

## 🗺️ MAPEAMENTO RÁPIDO

### Schema Names

| Firebase | Supabase |
|----------|----------|
| `estudantes` | `students` |
| `{doc}/contatos` | `student_contacts` |
| `absences` | `student_absences` |
| `interacoes_familia` | `family_interactions` |
| `userTasks` | `user_tasks` |

### Field Names (Exemplo: Students)

| Firebase | Supabase |
|----------|----------|
| `estudanteId` | `student_id` |
| `nome` | `name` |
| `turma` | `class` |
| `turno` | `shift` |
| `statusEstudante` | `status` |
| `dataNascimento` | `birth_date` |
| `bolsaFamilia` | `bolsa_familia` |

### Common Operations

```typescript
// SELECT *
const { data } = await supabase.from('students').select('*');

// SELECT with JOIN
const { data } = await supabase
  .from('students')
  .select('*, student_contacts(*)');

// WHERE
const { data } = await supabase
  .from('students')
  .select('*')
  .eq('class', '5A');

// INSERT
const { data } = await supabase
  .from('students')
  .insert({ name: 'João', class: '5A' })
  .select()
  .single();

// UPDATE
const { data } = await supabase
  .from('students')
  .update({ name: 'Maria' })
  .eq('id', studentId)
  .select()
  .single();

// DELETE (soft)
const { data } = await supabase
  .from('students')
  .update({ deleted: true })
  .eq('id', studentId);
```

---

## ⚠️ ERROS COMUNS

### 1. Property 'nome' does not exist

```typescript
// ❌ ERRO
student.nome // Firebase

// ✅ CORRETO
student.name // Supabase
```

### 2. Cannot read 'contatos' (subcoleção)

```typescript
// ❌ FIREBASE (subcoleção)
const contacts = student.contatos;

// ✅ SUPABASE (JOIN)
const { data } = await supabase
  .from('students')
  .select('*, student_contacts(*)') // JOIN!
  .eq('id', id)
  .single();

const contacts = data.student_contacts;
```

### 3. Error: PGRST116 (not found)

```typescript
// Supabase retorna error ao invés de null
const { data, error } = await supabase
  .from('students')
  .select('*')
  .eq('id', id)
  .single();

if (error) {
  if (error.code === 'PGRST116') {
    return null; // Not found
  }
  throw error;
}
```

---

## 📚 DOCUMENTAÇÃO

- **Plano Completo**: `docs/MIGRACAO-APP-NEXTJS-SUPABASE-PLANO.md`
- **Schema SQL**: `supabase-schema-v2-padronizado.sql`
- **Tipos**: `src/lib/supabaseClient.ts`
- **Mapeamento**: `docs/MAPEAMENTO-FIREBASE-SUPABASE-V2.md`
- **Supabase Docs**: https://supabase.com/docs/reference/javascript

---

## 🎯 PRÓXIMO COMANDO

```bash
# Abrir arquivo para migrar
code src/services/studentDataService.ts
```

---

**Quick Start criado por**: Claude Code
**Data**: 11 de Outubro de 2025
**Versão**: 1.0
