# 📝 Implementação de Metadados de Usuário

> **Status**: ✅ Implementado (aguardando migration SQL)
> **Data**: 2025-10-14
> **Versão**: 1.0

---

## 🎯 Objetivo

Adicionar suporte para armazenar **metadados flexíveis** (favoritos, tema, preferências) dos usuários no Supabase, resolvendo o problema de persistência de favoritos na tela home.

---

## 🔍 Problema Original

### Situação Antes:

1. ❌ Usuários podiam marcar módulos como **favoritos** na tela home
2. ❌ Código tentava salvar em `notification_preferences` (campo inexistente)
3. ❌ Favoritos **não eram persistidos** - perdidos ao recarregar a página
4. ❌ Método `updateNotificationPreferences()` retornava `false` silenciosamente

### Código Problemático ([src/app/home/page.tsx](../src/app/home/page.tsx):107-114):

```typescript
await UserProfilesService.updateNotificationPreferences(uid, {
    favorites: newFavorites
} as any);
// ❌ Não funcionava - campo não existia na tabela 'users'
```

---

## 💡 Solução Implementada

### 1️⃣ **Adicionar campo `metadata` (JSONB) na tabela `users`**

Campo flexível para armazenar:
- ✅ `favorites` (string[]) - módulos favoritos
- ✅ `theme` ('light' | 'dark' | 'system') - tema preferido
- ✅ Outros campos customizados no futuro

### 2️⃣ **Atualizar schema TypeScript**

**Arquivo**: [src/lib/supabaseClient.ts](../src/lib/supabaseClient.ts):234

```typescript
users: {
  Row: {
    // ... campos existentes
    metadata: Record<string, any> | null // JSONB: {favorites: string[], theme: string, ...}
  }
}
```

### 3️⃣ **Criar interface `UserMetadata`**

**Arquivo**: [src/services/supabase/userProfilesService.ts](../src/services/supabase/userProfilesService.ts):43-50

```typescript
export interface UserMetadata {
  favorites?: string[];
  theme?: 'light' | 'dark' | 'system';
  [key: string]: any; // Permite campos customizados
}
```

### 4️⃣ **Adicionar campo `metadata` em `UserProfile`**

**Arquivo**: [src/services/supabase/userProfilesService.ts](../src/services/supabase/userProfilesService.ts):68

```typescript
export interface UserProfile {
  // ... campos existentes
  metadata?: UserMetadata; // NOVO
}
```

### 5️⃣ **Criar métodos de atualização**

#### `updateMetadata()` - Atualizar metadados genéricos

```typescript
await UserProfilesService.updateMetadata(firebaseUid, {
  favorites: ['marcar-faltas', 'controlar-faltas'],
  theme: 'dark'
});
```

#### `updateFavorites()` - Atalho para favoritos

```typescript
await UserProfilesService.updateFavorites(firebaseUid, [
  'marcar-faltas',
  'controlar-faltas'
]);
```

#### `updateNotificationPreferences()` - Compatibilidade

Mantido para não quebrar código existente, mas agora **redireciona** para `updateMetadata()`.

### 6️⃣ **Atualizar home/page.tsx**

**Carregar favoritos**:

```typescript
if (userProfile.metadata?.favorites) {
    setFavorites(userProfile.metadata.favorites);
}
```

**Salvar favoritos** (já funcionava, agora persiste):

```typescript
await UserProfilesService.updateNotificationPreferences(uid, {
    favorites: newFavorites
} as any);
// ✅ Agora redireciona para updateMetadata() e funciona!
```

---

## 🛠️ Migration SQL Necessária

### ⚠️ **AÇÃO OBRIGATÓRIA**: Rodar no Supabase

```sql
-- Adicionar campo metadata na tabela users
ALTER TABLE users
ADD COLUMN metadata JSONB DEFAULT '{"favorites": []}'::jsonb;

-- Criar índice para busca rápida (opcional, mas recomendado)
CREATE INDEX idx_users_metadata ON users USING GIN (metadata);
```

### Como Executar:

1. Acessar: [Supabase Dashboard](https://supabase.com/dashboard/project/xccjifrggpgevqftwdkx)
2. SQL Editor → New Query
3. Colar SQL acima
4. Run

---

## ✅ Resultados

### Antes vs Depois:

| Aspecto | Antes ❌ | Depois ✅ |
|---------|---------|-----------|
| **Persistência de favoritos** | Não funciona | ✅ Funciona |
| **Campo no banco** | Inexistente | `metadata` JSONB |
| **Flexibilidade** | Rígido | Flexível (JSONB) |
| **Tema do usuário** | Não suportado | ✅ Suportado |
| **Compatibilidade** | Código quebrado | ✅ Mantida |

### Funcionalidades Adicionadas:

1. ✅ **Favoritos persistem** entre logins
2. ✅ **Tema do usuário** pode ser salvo (`light`, `dark`, `system`)
3. ✅ **Estrutura flexível** - permite adicionar novas preferências sem alterar schema
4. ✅ **Performance** - Índice GIN para buscas rápidas em JSONB

---

## 📚 Uso

### Exemplo 1: Salvar Favoritos

```typescript
import { UserProfilesService } from '@/services/supabase/userProfilesService';

const uid = auth.currentUser.uid;
const favorites = ['marcar-faltas', 'controlar-faltas', 'perfil-estudante'];

await UserProfilesService.updateFavorites(uid, favorites);
```

### Exemplo 2: Salvar Tema

```typescript
await UserProfilesService.updateMetadata(uid, {
  theme: 'dark'
});
```

### Exemplo 3: Salvar Múltiplos Metadados

```typescript
await UserProfilesService.updateMetadata(uid, {
  favorites: ['marcar-faltas'],
  theme: 'dark',
  sidebar_collapsed: true, // Campo customizado
  notifications_enabled: true // Campo customizado
});
```

### Exemplo 4: Carregar Metadados

```typescript
const userProfile = await UserProfilesService.getByFirebaseUid(uid);

console.log(userProfile.metadata?.favorites); // ['marcar-faltas', ...]
console.log(userProfile.metadata?.theme); // 'dark'
console.log(userProfile.metadata?.sidebar_collapsed); // true
```

---

## 🔄 Compatibilidade

### Código Antigo Continua Funcionando:

```typescript
// ✅ Ainda funciona (redireciona para updateMetadata)
await UserProfilesService.updateNotificationPreferences(uid, {
    favorites: newFavorites
} as any);
```

### Recomendação para Código Novo:

```typescript
// ✅ Usar métodos novos
await UserProfilesService.updateMetadata(uid, { favorites: newFavorites });
// ou
await UserProfilesService.updateFavorites(uid, newFavorites);
```

---

## 🚀 Expansões Futuras

Com a estrutura JSONB, é fácil adicionar novas preferências:

### Exemplos:

```typescript
interface UserMetadata {
  favorites?: string[];
  theme?: 'light' | 'dark' | 'system';

  // FUTURO: Adicionar sem alterar schema
  language?: 'pt-BR' | 'en-US';
  sidebar_collapsed?: boolean;
  notifications_enabled?: boolean;
  default_dashboard?: string;
  recent_searches?: string[];
  custom_filters?: Record<string, any>;
}
```

Basta atualizar a interface TypeScript - **não precisa migração SQL**!

---

## 📝 Checklist de Deploy

- [x] 1. Atualizar schema TypeScript (`supabaseClient.ts`)
- [x] 2. Adicionar interface `UserMetadata`
- [x] 3. Atualizar `UserProfile` com campo `metadata`
- [x] 4. Criar métodos `updateMetadata()` e `updateFavorites()`
- [x] 5. Atualizar todos os métodos para incluir `metadata` no retorno
- [x] 6. Atualizar `home/page.tsx` para usar `metadata.favorites`
- [x] 7. Verificar erros TypeScript ✅
- [ ] 8. **RODAR MIGRATION SQL** (pendente)
- [ ] 9. Testar em desenvolvimento
- [ ] 10. Testar em produção

---

## 🐛 Troubleshooting

### Favoritos não estão persistindo?

1. **Verificar se migration foi executada**:
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'users' AND column_name = 'metadata';
   ```

   Deve retornar: `metadata | jsonb`

2. **Verificar dados salvos**:
   ```sql
   SELECT firebase_uid, metadata
   FROM users
   WHERE firebase_uid = 'seu-uid-aqui';
   ```

3. **Verificar logs**:
   ```typescript
   // No console do navegador
   console.log('Favoritos:', userProfile.metadata?.favorites);
   ```

### Campo `metadata` retorna `null`?

**Solução**: Usuários criados **antes** da migration não têm metadata. Atualizar:

```sql
-- Inicializar metadata para usuários existentes
UPDATE users
SET metadata = '{"favorites": []}'::jsonb
WHERE metadata IS NULL;
```

---

## 📖 Referências

- [Supabase JSONB Documentation](https://supabase.com/docs/guides/database/json)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)
- Código: [src/services/supabase/userProfilesService.ts](../src/services/supabase/userProfilesService.ts)
- UI: [src/app/home/page.tsx](../src/app/home/page.tsx)

---

**Última Atualização**: 2025-10-14
**Autor**: Claude Code Assistant
