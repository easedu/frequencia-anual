# 🔧 Correções para ERR_CONNECTION_RESET

## 📋 Resumo Executivo

Data: 2025-01-23
Status: ✅ Implementado
Objetivo: Resolver erro `ERR_CONNECTION_RESET` relatado por usuários

---

## 🐛 Problema Identificado

Usuários relatam erro `ERR_CONNECTION_RESET` ao tentar acessar o sistema.

### Causas Raiz Identificadas

1. **Múltiplas inicializações do Firebase Admin** - Conflito entre `lib/firebaseAdmin.ts` e `lib/auth/firebaseAuthProvider.ts`
2. **Timeout agressivo do AuthProvider** - 10s forçando redirecionamento abrupto
3. **Vercel Serverless Timeout** - APIs configuradas com 30s mas plano Free tem limite de 10s
4. **Inicialização do Firebase no SSR/Build** - Firebase client inicializado incondicionalmente
5. **Error handling inadequado** - Timeouts causavam crashes sem feedback ao usuário

---

## ✅ Correções Implementadas

### 1. Consolidar Firebase Admin ✅

**Arquivo**: `src/lib/firebaseAdmin.ts`

**Antes**: Duas implementações concorrentes usando módulos diferentes
**Depois**: Depreciado e redirecionado para `firebaseAuthProvider.ts`

```typescript
// Agora redireciona para implementação moderna
export function getAdminAuth() {
  const apps = getApps();
  if (apps.length === 0) {
    throw new Error('Use FirebaseAuthProvider.validateToken()');
  }
  return getAuth(apps[0]);
}
```

**Benefício**: Elimina conflitos de múltiplas inicializações

---

### 2. Lazy Initialization do Firebase Client ✅

**Arquivo**: `src/firebase.config.ts`

**Antes**:
```typescript
export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
// Executava durante SSR/build
```

**Depois**:
```typescript
function initializeFirebase() {
  if (typeof window === 'undefined') {
    throw new Error('Firebase client não pode ser usado no servidor');
  }
  // Lazy initialization com verificação de apps existentes
}

export const auth = new Proxy({} as Auth, {
  get(_target, prop) {
    return (getFirebaseAuth() as any)[prop];
  }
});
```

**Benefício**: Evita erros durante SSR/build e múltiplas inicializações

---

### 3. Aumentar Timeout do AuthProvider ✅

**Arquivo**: `src/components/layout/AuthProvider.tsx`

**Antes**: 10 segundos → forçava redirecionamento abrupto
**Depois**: 30 segundos + error handling gracioso

```typescript
// Timeout aumentado para 30s
const timeoutId = setTimeout(() => {
  setLoading(false);
  setAuthError('Erro de conexão. Por favor, recarregue a página.');
  // NÃO força redirecionamento - apenas mostra erro
}, 30000);
```

**Benefício**: Permite conexões lentas e cold starts sem crashes

---

### 4. Ajustar Vercel maxDuration para 10s ✅

**Arquivo**: `vercel.json`

**Antes**: `maxDuration: 30` (inválido no Free Plan)
**Depois**: `maxDuration: 10` + headers keep-alive

```json
{
  "functions": {
    "src/app/api/**/route.ts": {
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {"key": "Connection", "value": "keep-alive"},
        {"key": "Keep-Alive", "value": "timeout=10"}
      ]
    }
  ]
}
```

**Benefício**: Evita que Vercel mate conexões sem response

---

### 5. Error Boundaries para Auth ✅

**Arquivo**: `src/components/layout/AuthProvider.tsx`

**Adicionado**:
- Estado `authError` para capturar falhas
- UI de erro com botão de reload
- Logs estruturados de diagnóstico

```typescript
{authError ? (
  <div className="p-4 bg-red-50 rounded-lg">
    <p>{authError}</p>
    <button onClick={() => window.location.reload()}>
      Recarregar Página
    </button>
  </div>
) : (
  <p>Carregando...</p>
)}
```

**Benefício**: UX melhor - usuário sabe o que fazer ao invés de ver erro do navegador

---

### 6. Timeout Utilities para APIs ✅

**Arquivo**: `src/app/api/_utils/timeout.ts` (NOVO)

**Criado**:
- `withTimeout()` - Wrapper para promises com timeout
- `isNearTimeout()` - Detecta se próximo do limite (80%)
- `fetchWithTimeout()` - Fetch com AbortController automático

```typescript
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 8000,
  timeoutMessage = 'Operação excedeu o tempo limite'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
}
```

**Benefício**: APIs podem detectar e abortar operações antes do timeout do Vercel

---

### 7. Logs de Diagnóstico ✅

**Arquivos**: `AuthProvider.tsx`, `firebase.config.ts`

**Adicionado**:
```typescript
logger.info('✅ Perfil do usuário carregado com sucesso', { userId });
logger.warn('⚠️ Perfil não encontrado no Supabase, usando fallback', { userId });
logger.error('❌ Erro ao buscar perfil', { error, userId });
logger.error('⏰ Timeout na verificação de autenticação após 30s', { pathname });
```

**Benefício**: Permite debugging via Vercel Logs

---

## 🧪 Como Testar

### Teste Local

```bash
# 1. Build local
npm run build

# 2. Iniciar produção local
npm start

# 3. Testar login com conexão lenta
# Ativar "Slow 3G" no Chrome DevTools → Network
```

### Teste em Produção

```bash
# 1. Commit e push
git add .
git commit -m "fix: resolver ERR_CONNECTION_RESET (timeout + lazy init)"
git push origin main

# 2. Aguardar deploy no Vercel

# 3. Monitorar logs
# https://vercel.com/dashboard → Seu projeto → Logs
```

### Cenários de Teste

- [ ] Login com WiFi normal
- [ ] Login com 3G lento (Chrome DevTools)
- [ ] Login após cold start (primeira request após 5min inativo)
- [ ] Login simultâneo de múltiplos usuários
- [ ] Verificar logs no console do navegador (deve mostrar "🔐 Firebase Auth inicializado")

---

## 📊 Métricas de Sucesso

### Antes
- ❌ Timeout AuthProvider: 10s
- ❌ Firebase Admin: 2 implementações
- ❌ Firebase Client: Init no build/SSR
- ❌ Vercel maxDuration: 30s (inválido)
- ❌ Error handling: Crash sem feedback

### Depois
- ✅ Timeout AuthProvider: 30s
- ✅ Firebase Admin: 1 implementação
- ✅ Firebase Client: Lazy init (browser only)
- ✅ Vercel maxDuration: 10s (Free Plan)
- ✅ Error handling: UI de erro + reload button

---

## 🔍 Monitoramento

### Vercel Logs

Verificar se há logs de timeout:
```
⏰ Timeout na verificação de autenticação após 30s
```

Se aparecer, investigar:
1. Latência do Firebase Auth
2. Latência do Supabase (busca de perfil)
3. Cold start do Vercel

### Console do Navegador

Logs esperados (sucesso):
```
🔐 Firebase Auth inicializado (apenas autenticação)
✅ Perfil do usuário carregado com sucesso
```

Logs de erro (conexão lenta):
```
⚠️ Perfil não encontrado no Supabase, usando fallback
❌ Erro ao buscar perfil do usuário (usando fallback)
```

---

## 🚨 Rollback (se necessário)

Se as correções causarem novos problemas:

```bash
# Reverter commit
git revert HEAD

# Ou checkout do commit anterior
git checkout <commit-hash-anterior>

# Push forçado (CUIDADO!)
git push origin main --force
```

---

## 📚 Referências

- **Issue Original**: ERR_CONNECTION_RESET relatado por usuários
- **Vercel Free Plan Limits**: https://vercel.com/docs/limits/overview#serverless-function-execution-timeout
- **Firebase Lazy Init**: https://firebase.google.com/docs/web/modular-upgrade#lazy-load
- **Next.js 15 Params**: https://nextjs.org/docs/app/api-reference/file-conventions/route

---

## 🎯 Próximos Passos (Opcional)

1. **Migrar para Supabase Auth** - Remover Firebase completamente
2. **Cache de Perfil** - Salvar perfil no localStorage para carga instantânea
3. **Prefetch de Auth** - Carregar auth antes do login render
4. **Monitoramento de Performance** - Sentry/Vercel Analytics

---

**Última Atualização**: 2025-01-23
**Autor**: Claude Code
**Status**: ✅ Implementado e pronto para deploy
