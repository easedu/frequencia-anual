# 🔍 ANÁLISE: Hooks Supabase Não Utilizados

**Data da Análise:** 24/10/2025
**Arquivos Analisados:** `src/hooks/useSupabase.ts`, `src/hooks/useSupabaseDoc.ts`
**Status:** ⚠️ Código não utilizado (DEPRECATED)

---

## 📊 SUMÁRIO EXECUTIVO

### Descoberta

Dois hooks customizados (`useSupabase.ts` e `useSupabaseDoc.ts`) foram criados durante a migração Firestore → Supabase mas **nunca foram utilizados** no projeto.

**Verificação:**
```bash
grep -r "useSupabase\|useSupabaseDoc" src/ --include="*.ts" --include="*.tsx"
# Resultado: 0 usos encontrados (exceto nos próprios arquivos)
```

### Tamanho do Código Não Utilizado

| Arquivo | Linhas | Tamanho | Funcionalidades |
|---------|--------|---------|-----------------|
| `useSupabase.ts` | 491 linhas | ~15KB | 4 hooks + batch operations |
| `useSupabaseDoc.ts` | 322 linhas | ~10KB | 3 hooks + real-time |
| **TOTAL** | **813 linhas** | **~25KB** | 7 hooks customizados |

---

## 🎯 RECOMENDAÇÃO

### Opção 1: REMOVER (Recomendado ✅)

**Justificativa:**
- ✅ **0 dependências** no projeto
- ✅ Reduz **813 linhas** de código não testado
- ✅ Simplifica manutenção
- ✅ Evita confusão (desenvolvedores podem pensar que devem usar)
- ✅ Bundle menor (~25KB menos)

**Como fazer:**
```bash
# Backup (caso precise reverter)
git mv src/hooks/useSupabase.ts src/hooks/_deprecated/useSupabase.ts.bak
git mv src/hooks/useSupabaseDoc.ts src/hooks/_deprecated/useSupabaseDoc.ts.bak

# OU deletar diretamente
rm src/hooks/useSupabase.ts
rm src/hooks/useSupabaseDoc.ts

# Commit
git add .
git commit -m "chore: remover hooks Supabase não utilizados (813 linhas)"
```

**Risco:** ⚠️ Baixo
- Nenhum código depende desses hooks
- Se precisar no futuro, está no histórico Git

---

### Opção 2: MANTER (Não recomendado ❌)

**Quando considerar:**
- Se planeja migrar de APIs REST → hooks Supabase client-side
- Se vai implementar real-time features no futuro
- Se quer hooks genéricos para prototipar rapidamente

**Problemas:**
- ❌ Código não testado em produção
- ❌ Pode ter bugs não descobertos
- ❌ Aumenta complexidade cognitiva
- ❌ Duplicação com padrão atual (APIs REST)

**Se manter, fazer:**
1. Adicionar testes unitários
2. Criar documentação de uso
3. Adicionar exemplos práticos
4. Integrar em pelo menos 1 componente (validar funcionalidade)

---

## 📋 ANÁLISE DETALHADA DOS HOOKS

### `useSupabase.ts` (491 linhas)

**4 hooks exportados:**

#### 1. `useSupabaseCollection<T>`
```typescript
export function useSupabaseCollection<T>(
  table: string,
  options?: { cacheKey?, cacheTTL?, enablePagination?, pageSize?, filters?, orderBy? }
): { data: T[], loading, error, loadMore, refresh, hasMore, totalCount }
```

**Features:**
- ✅ Cache com `cache.ts`
- ✅ Paginação manual (loop de 1000 em 1000)
- ✅ Filtros e ordenação
- ✅ Performance logging

**Problema:**
Duplica funcionalidade já existente em `paginationHelper.ts` (que **é usado** no projeto).

#### 2. `useSupabaseBatch()`
```typescript
export function useSupabaseBatch(): {
  executeBatch: (operations: Array<{type, table, data?, id?}>) => Promise<void>,
  loading,
  error
}
```

**Features:**
- Batch insert, update, delete
- Agrupa operações por tipo/tabela
- Executa em paralelo

**Problema:**
APIs REST já fazem batch operations quando necessário.

#### 3. `useSupabaseWithRetry<T>`
```typescript
export function useSupabaseWithRetry<T>(
  fetcher: () => Promise<T>,
  dependencies?: any[],
  maxRetries = 3,
  retryDelay = 1000
): { data, loading, error, retry }
```

**Problema:**
`retry.ts` já implementa retry strategy com **p-retry** (mais robusto).

#### 4. `useParallelSupabaseQueries<T>`
```typescript
export function useParallelSupabaseQueries<T>(
  queries: Record<keyof T, () => Promise<T[keyof T]>>,
  dependencies?: any[]
): { data, loading, error, refetch }
```

**Problema:**
`Promise.all()` manual já é usado onde necessário.

---

### `useSupabaseDoc.ts` (322 linhas)

**3 hooks exportados:**

#### 1. `useSupabaseDoc<T>`
```typescript
export function useSupabaseDoc<T>(
  path: string, // "2025/ano_letivo" ou "users/user-id"
  options?: { realtime?, cacheTime?, idColumn? }
): { data: T | null, loading, error, update, refresh }
```

**Features:**
- ✅ Cache com `cache.ts`
- ✅ Real-time subscriptions (Supabase)
- ✅ Parse de path Firebase → Supabase
- ✅ Auto-update em mudanças

**Problema:**
APIs REST são usadas para fetch de documentos únicos.

#### 2. `useAcademicYear(year)`
```typescript
export function useAcademicYear(year = "2025"): UseSupabaseDocReturn<AnoLetivo>
```

**Problema:**
Wrapper desnecessário (1 linha de código).

#### 3. `useUserProfile(userId)`
```typescript
export function useUserProfile(userId: string): UseSupabaseDocReturn<UserProfile>
```

**Features:**
- Real-time updates automático

**Problema:**
Não há necessidade de real-time em profiles no projeto atual.

---

## 🔄 PADRÃO ATUAL DO PROJETO

### Como o projeto usa Supabase hoje:

#### Frontend → Backend API → Supabase Admin

```typescript
// ✅ PADRÃO USADO (Fases 1-4 de refatoração)

// Frontend Service
export class MyService {
  static async getData(firebaseStudentId: string) {
    const headers = await getAuthHeaders(); // JWT Firebase
    const response = await fetch(`/api/students?estudanteId=${firebaseStudentId}`, { headers });
    return response.json();
  }
}

// Backend API
export const GET = withAuth(async (req: NextRequest, userId: string) => {
  const estudanteId = searchParams.get('estudanteId');
  const internalId = await resolveFirebaseUUIDToInternal(estudanteId);

  const { data } = await supabaseAdmin
    .from('students')
    .select('*')
    .eq('id', internalId)
    .single();

  return successResponse(data);
});
```

**Vantagens do padrão atual:**
- ✅ Autenticação centralizada (Firebase JWT)
- ✅ Resolução de UUID no backend (segurança)
- ✅ Supabase Admin (sem RLS, mais rápido)
- ✅ Type-safe com response helpers
- ✅ Error handling padronizado
- ✅ Logs centralizados

**Por que os hooks não são usados:**
- ❌ Supabase client-side usa RLS (Row Level Security) → pode bloquear
- ❌ Frontend teria que resolver UUID (complexidade)
- ❌ Menos controle sobre autenticação
- ❌ Mistura de padrões (REST + hooks)

---

## 🚀 SE DECIDIR USAR OS HOOKS

### Cenários válidos para uso:

#### 1. Real-time Features

```typescript
// Exemplo: Dashboard ao vivo com updates em tempo real
function LiveDashboard() {
  const { data: stats, loading } = useSupabaseDoc<DashboardStats>(
    'dashboard/stats',
    { realtime: true } // ✅ Atualiza automaticamente
  );

  return <KPIsCard data={stats} />;
}
```

#### 2. Prototipação Rápida

```typescript
// Exemplo: Testar query nova sem criar API
function TestComponent() {
  const { data: students } = useSupabaseCollection<Student>('students', {
    filters: [{ column: 'class', operator: 'eq', value: '5A' }]
  });

  return <pre>{JSON.stringify(students, null, 2)}</pre>;
}
```

#### 3. Operações Client-side (com RLS configurado)

```typescript
// Exemplo: User pode editar só o próprio perfil
function UserProfile({ userId }: { userId: string }) {
  const { data: profile, update } = useUserProfile(userId);

  const handleSave = async (newData: Partial<UserProfile>) => {
    await update(newData); // ✅ Supabase RLS valida permissão
  };

  return <ProfileForm data={profile} onSave={handleSave} />;
}
```

### Mas precisaria:

1. **Configurar RLS no Supabase**
```sql
-- Exemplo: Users podem ler/editar só o próprio perfil
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = user_id);
```

2. **Integrar Firebase Auth com Supabase**
```typescript
// supabaseClient.ts
const supabaseAccessToken = await user.getIdToken();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    headers: {
      Authorization: `Bearer ${supabaseAccessToken}`
    }
  }
});
```

3. **Migrar padrão arquitetural**
   - De: Frontend → API REST → Supabase Admin
   - Para: Frontend → Supabase Client (com RLS)

---

## 📊 COMPARAÇÃO: API REST vs Hooks

| Aspecto | API REST (atual) | Hooks Supabase |
|---------|------------------|----------------|
| **Autenticação** | ✅ Firebase JWT (backend) | ⚠️ Precisa integrar Firebase + Supabase |
| **Segurança** | ✅ Backend valida tudo | ⚠️ Depende de RLS bem configurado |
| **Performance** | ✅ Supabase Admin (sem RLS) | ⚠️ Supabase Client (com RLS, +overhead) |
| **Dual ID Resolution** | ✅ Backend resolve UUID | ❌ Frontend teria que resolver |
| **Error Handling** | ✅ Padronizado (errorResponse) | ⚠️ Cada hook trata diferente |
| **Type Safety** | ✅ Tipos explícitos | ⚠️ Generic `<T>` (menos type-safe) |
| **Real-time** | ❌ Não suporta | ✅ Subscriptions nativas |
| **Simplicidade** | ✅ Fetch API padrão | ⚠️ Abstração adicional |
| **Manutenção** | ✅ 1 padrão (REST) | ⚠️ 2 padrões (REST + hooks) |

---

## 🎯 DECISÃO FINAL RECOMENDADA

### REMOVER os hooks (Opção 1) ✅

**Motivos:**
1. ✅ **Zero uso** confirmado
2. ✅ Padrão atual (API REST) funciona bem
3. ✅ Reduz **813 linhas** de código não testado
4. ✅ Evita mistura de padrões arquiteturais
5. ✅ Bundle menor (~25KB)
6. ✅ Manutenção mais simples

**Exceção:**
Se planeja implementar **real-time features** (dashboard ao vivo, chat, notificações push), considere:
- Manter **apenas `useSupabaseDoc.ts`** (real-time)
- Remover `useSupabase.ts` (duplica `paginationHelper.ts`)
- Integrar Firebase Auth com Supabase
- Configurar RLS
- Criar exemplo funcional

---

## ✅ PLANO DE AÇÃO

### Remover Hooks (Recomendado)

```bash
# 1. Criar backup
mkdir -p src/hooks/_deprecated
git mv src/hooks/useSupabase.ts src/hooks/_deprecated/
git mv src/hooks/useSupabaseDoc.ts src/hooks/_deprecated/

# 2. Commit
git add .
git commit -m "chore: depreciar hooks Supabase não utilizados

- useSupabase.ts (491 linhas)
- useSupabaseDoc.ts (322 linhas)
- Total: 813 linhas removidas
- Motivo: 0 usos encontrados no projeto
- Padrão atual: API REST funciona bem"

# 3. Após 1 sprint sem issues, deletar definitivamente
rm -rf src/hooks/_deprecated/
```

### OU Integrar Hooks (Se decidir usar)

```bash
# 1. Escolher 1 componente piloto
#    Ex: Dashboard com real-time stats

# 2. Implementar exemplo funcional
# src/app/home/page.tsx
import { useSupabaseDoc } from '@/hooks/useSupabaseDoc';

function Dashboard() {
  const { data, loading } = useSupabaseDoc<DashboardStats>(
    'dashboard/stats',
    { realtime: true }
  );
  // ...
}

# 3. Configurar RLS no Supabase
# (Ver SQL acima)

# 4. Testar em produção
# - Verificar performance
# - Verificar segurança (RLS funciona?)
# - Verificar estabilidade (subscriptions)

# 5. Documentar uso em CLAUDE.md
# Seção: "Quando usar hooks Supabase vs API REST"

# 6. Se OK, migrar outros componentes incrementalmente
```

---

## 📚 REFERÊNCIAS

- **Padrão API REST atual**: `docs/REFATORACAO-SUPABASE-FRONTEND-FASES-1-4-COMPLETA.md`
- **Dual ID System**: CLAUDE.md seção "⚠️ REGRA CRÍTICA: DUAL ID SYSTEM"
- **Cache System**: `src/utils/cache.ts`
- **Pagination Helper**: `src/utils/paginationHelper.ts` (usado no projeto)
- **Retry Strategy**: `src/utils/retry.ts` (usado no projeto)

---

**Criado em:** 24/10/2025
**Analisado por:** Claude Code
**Status:** ✅ Análise completa - Aguardando decisão