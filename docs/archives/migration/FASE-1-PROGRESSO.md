# ✅ FASE 1: Migração de Hooks - Progresso

## 📊 Status Geral

**Fase 1.2 CONCLUÍDA**: `useFirebaseDoc` → `useSupabaseDoc`

| Hook | Status | Arquivos Afetados | Notas |
|------|--------|-------------------|-------|
| **useStudentAbsences.ts** | ✅ Concluído | 1 arquivo | Fase 1.1 - Usa AbsenceService (Supabase) |
| **useFirebaseDoc.ts** | ✅ Concluído | 2 arquivos | Fase 1.2 - Migrado para useSupabaseDoc.ts |
| **useFirebase.ts** | ⏳ Pendente | - | Fase 1.3 |
| **useFirebaseCollection.ts** | ⏳ Pendente | - | Fase 1.4 - Deprecar |

---

## 🎯 Fase 1.1: useStudentAbsences.ts ✅

**Concluída anteriormente**

### Mudanças
- Migrado de Firebase → Supabase
- Usa `AbsenceService.getStudentAbsences(estudanteId)`
- Campos Supabase: `absence_date`, `is_justified`

### Arquivos Modificados
- `src/hooks/attendance/useStudentAbsences.ts` (novo - Supabase)
- `src/hooks/attendance/useStudentAbsences.firebase.BACKUP` (backup Firebase)

---

## 🎯 Fase 1.2: useFirebaseDoc → useSupabaseDoc ✅

**Concluída hoje**

### Arquivos Criados
- `src/hooks/useSupabaseDoc.ts` (NOVO - 282 linhas)

### Arquivos de Backup
- `src/hooks/useFirebaseDoc.firebase.BACKUP` (backup Firebase)

### Arquivos Modificados
- `src/app/debug-bimestres/page.tsx` (atualizado para usar useSupabaseDoc)

### Features Implementadas

#### 1. **Path Mapping** (Firebase → Supabase)
```typescript
// Firebase: "2025/ano_letivo"
// Supabase: academic_years WHERE year = '2025'

const tableMap: Record<string, { table: string; idColumn: string }> = {
  '2025': { table: 'academic_years', idColumn: 'year' },
  'users': { table: 'users', idColumn: 'user_id' },
  'students': { table: 'students', idColumn: 'student_id' },
};
```

#### 2. **Cache Padronizado**
- Usa `cache.ts` centralizado
- TTL configurável (default: 5 minutos)
- Namespace: `supabase-doc`

#### 3. **Real-Time Subscriptions**
- Suporta Supabase Realtime (substitui Firebase onSnapshot)
- Escuta eventos: INSERT, UPDATE, DELETE
- Auto-invalidação de cache

#### 4. **API Idêntica ao useFirebaseDoc**
```typescript
const { data, loading, error, update, refresh } = useSupabaseDoc<AnoLetivo>('2025/ano_letivo');

// Update
await update({ bimestre1: { start: '01/02/2025', end: '30/04/2025' } });

// Manual refresh
await refresh();
```

### Hooks Especializados

#### useAcademicYear(year)
```typescript
const { data: anoLetivo, loading } = useAcademicYear('2025');
```

#### useUserProfile(userId)
```typescript
const { data: profile, update } = useUserProfile(currentUserId);
await update({ display_name: 'New Name' });
```

### Correções de Tipo

#### AbsenceRecord - Suporte a ambos os campos
```typescript
export interface AbsenceRecord {
  estudanteId: string;
  // ⚠️ MIGRAÇÃO: Ambos os campos durante transição
  data?: string;             // Firebase (LEGACY)
  absence_date?: string;     // Supabase (NOVO)
  justified?: boolean;       // Firebase (LEGACY)
  is_justified?: boolean;    // Supabase (NOVO)
  atestadoId?: string;
  suspensaoId?: string;
}
```

#### Hooks Attendance - Suporte Dual
```typescript
// useStudentAbsences.ts
const dateStr = record.absence_date ?? record.data; // ✅ Suporta ambos
const isJustified = record.is_justified ?? record.justified ?? false; // ✅ Suporta ambos

// useStudentRecords.ts
const absences = excludeJustified
  ? allAbsences.filter(abs => !(abs.is_justified ?? abs.justified ?? false))
  : allAbsences;

const date = parseFlexibleDate(abs.absence_date ?? abs.data ?? '');
```

### Desafios Resolvidos

#### 1. Tipagem Dinâmica do Supabase
**Problema**: Supabase não sabe os tipos de tabelas em runtime
**Solução**: Type erasure com `as any`

```typescript
const supabaseAny = supabase as any;
const { data, error } = await supabaseAny
  .from(table)
  .update(newData)
  .eq(idColumn, idValue)
  .select()
  .single();
```

#### 2. Cache.invalidate vs cache.remove
**Problema**: `cache.remove()` não existe
**Solução**: Usar `cache.invalidate()`

```typescript
// ❌ ERRADO
cache.remove('supabase-doc', { path });

// ✅ CORRETO
cache.invalidate('supabase-doc', { path });
```

---

## 📈 Estatísticas

### Linhas de Código
- **Criadas**: 282 linhas (useSupabaseDoc.ts)
- **Movidas para backup**: 199 linhas (useFirebaseDoc.ts)
- **Modificadas**: ~50 linhas (types, hooks attendance, debug page)

### Arquivos Impactados
- ✅ 1 novo hook criado
- ✅ 1 hook antigo movido para backup
- ✅ 1 interface atualizada (AbsenceRecord)
- ✅ 2 hooks de attendance corrigidos
- ✅ 1 página de debug atualizada

### Erros TypeScript
- **Antes**: 76 erros
- **Depois**: 75 erros (1 erro resolvido - useSupabaseDoc)
- **Nota**: Os 75 erros restantes são de outros arquivos (não relacionados à migração)

---

## ⏭️ Próximos Passos

### Fase 1.3: Migrar useFirebase.ts
- Criar `useSupabase.ts` (coleções genéricas)
- Implementar paginação manual (range)
- Substituir imports em todos os arquivos

### Fase 1.4: Deprecar useFirebaseCollection.ts
- Já existe `useFirebase.ts` (duplicado)
- Remover referências
- Deletar arquivo

---

## 🧪 Testes Necessários

### useSupabaseDoc
- [ ] Fetch one-time (sem realtime)
- [ ] Fetch com realtime
- [ ] Update com merge
- [ ] Cache funcionando
- [ ] Invalidação de cache
- [ ] Path mapping (2025/ano_letivo → academic_years)

### Hooks Attendance
- [ ] Suporte a campos Firebase (data, justified)
- [ ] Suporte a campos Supabase (absence_date, is_justified)
- [ ] Filtro excludeJustified funciona
- [ ] Agrupamento por bimestre correto

### Debug Page
- [ ] Carrega dados do Supabase
- [ ] Mostra estrutura correta
- [ ] Identifica problemas de mapeamento

---

## 📚 Documentação Atualizada

- ✅ `FASE-1-PROGRESSO.md` (este arquivo)
- ✅ `PLANO-MIGRACAO-COMPLETA-SUPABASE.md` (atualizado status)
- ⏳ `CLAUDE.md` (pendente - adicionar seção useSupabaseDoc)

---

**Data**: 2025-10-12
**Responsável**: Claude (continuação da migração Firebase → Supabase)
**Referência**: PLANO-MIGRACAO-COMPLETA-SUPABASE.md (Fase 1)
