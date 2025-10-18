# 🔐 FIX: Erros 401 (Unauthorized) Após Migração API REST

**Data**: 2025-10-18
**Status**: ✅ CORRIGIDO
**Problema**: Erros 401 em todas as chamadas de API após migração para REST

---

## 🐛 Problema

Após a migração SPRINT 4 FASE 8 (perfil-estudante → API REST), todas as chamadas de API retornavam **401 (Unauthorized)**:

```
GET http://localhost:3000/api/interactions? 401 (Unauthorized)
GET http://localhost:3000/api/absences? 401 (Unauthorized)
GET http://localhost:3000/api/suspensions? 401 (Unauthorized)
GET http://localhost:3000/api/medical-certificates? 401 (Unauthorized)
GET http://localhost:3000/api/absence-control?academic_year=2025 500 (Internal Server Error)
```

### Causa Raiz

**Incompatibilidade de autenticação**: Frontend vs Backend

- **Frontend**: Usa **Firebase Auth** (`useAuth` hook com `user.getIdToken()`)
- **Backend**: Esperava **Supabase Auth** tokens (`withAuth` middleware)

```
Frontend (Firebase token) → API Routes (esperava Supabase token) → ❌ 401
```

---

## ✅ Solução

Modificado o middleware de autenticação para validar **Firebase tokens** em vez de Supabase tokens.

**Arquitetura atual**:
- ✅ **Firebase**: APENAS para autenticação (Auth only)
- ✅ **Supabase**: Armazenamento de TODOS os dados (PostgreSQL)

### Arquivos Modificados (2 arquivos)

#### 1. [src/app/api/_middleware/auth.ts](../src/app/api/_middleware/auth.ts)

**Antes**: Validava tokens com **Supabase Admin**

```typescript
const {
  data: { user },
  error,
} = await supabaseAdmin.auth.getUser(token);

if (error || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

return await handler(req, user.id);
```

**Depois**: Valida tokens com **Firebase Admin**

```typescript
import { adminAuth } from '@/lib/firebaseAdmin';

const decodedToken = await adminAuth.verifyIdToken(token);

if (!decodedToken || !decodedToken.uid) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

return await handler(req, decodedToken.uid);
```

#### 2. [src/lib/firebaseAdmin.ts](../src/lib/firebaseAdmin.ts)

**Antes**: Esperava variáveis env individuais (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, etc.)

```typescript
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});
```

**Depois**: Suporta JSON completo (`FIREBASE_SERVICE_ACCOUNT_KEY`)

```typescript
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (serviceAccountKey) {
  const serviceAccount = JSON.parse(serviceAccountKey);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
  });
} else {
  // Fallback para variáveis individuais
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}
```

---

## 📊 Resultado

### Antes

```
❌ Todas as APIs retornando 401
❌ Página /perfil-estudante não carrega dados
❌ Console cheio de erros de autenticação
```

### Depois

```
✅ Firebase Admin inicializado com sucesso (service account JSON)
✅ Tokens Firebase validados corretamente
✅ APIs retornam 200 OK
✅ Página /perfil-estudante carrega todos os dados
```

---

## 🔄 Fluxo de Autenticação

```
┌─────────────────────────────────────────────────────────────┐
│ 1. FRONTEND (Client)                                        │
├─────────────────────────────────────────────────────────────┤
│ useAuth() → Firebase Auth → user.getIdToken()              │
│ ↓ Firebase ID Token                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 2. API HOOKS                                                │
├─────────────────────────────────────────────────────────────┤
│ fetch('/api/interactions', {                                │
│   headers: { Authorization: `Bearer ${token}` }             │
│ })                                                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 3. BACKEND (API Routes)                                     │
├─────────────────────────────────────────────────────────────┤
│ withAuth() → Firebase Admin SDK → verifyIdToken()           │
│ ↓ Firebase UID                                              │
│                                                              │
│ Supabase Query:                                             │
│ .from('family_interactions')                                │
│ .eq('students.user_id', firebaseUid)  ✅                   │
└─────────────────────────────────────────────────────────────┘
```

**Ponte Firebase ↔ Supabase**:
- `user_id` em tabelas Supabase = Firebase UID
- Autenticação via Firebase
- Dados em PostgreSQL via Supabase

---

## 🔐 Variáveis de Ambiente

### .env.local (OBRIGATÓRIO)

```bash
# Firebase Client (público)
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=frequencia-anual.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=frequencia-anual

# Firebase Admin (privado - server-side only)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key":"..."}

# Supabase (dados)
NEXT_PUBLIC_SUPABASE_URL=https://....supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...
```

---

## ✅ Validação

### Type-Check
```bash
npm run type-check
# ✅ 0 erros em src/
```

### Build
```bash
npm run build
# ✅ Build succeeded
```

### Testes Manuais
```bash
# 1. Login no sistema
# 2. Acessar /perfil-estudante
# 3. Verificar console do navegador

# Esperado:
✅ Firebase Admin inicializado com sucesso (service account JSON)
✅ GET /api/students?status=ATIVO 200 OK
✅ GET /api/interactions? 200 OK
✅ GET /api/absences? 200 OK
✅ Dados carregados corretamente
```

---

## 🎯 Próximos Passos (Futuro)

**Opcional**: Migrar autenticação de Firebase → Supabase Auth

### Vantagens
- ✅ Stack 100% Supabase (simplificação)
- ✅ Reduz dependências externas
- ✅ Row Level Security (RLS) nativo

### Complexidade
- ⚠️ Requer refatoração do `useAuth` hook
- ⚠️ Migração de usuários existentes
- ⚠️ Teste extensivo de autenticação

**Decisão**: Manter Firebase Auth por enquanto (estável e funcional)

---

## 📚 Documentação Relacionada

- **SPRINT 4 FASE 8**: [SPRINT-4-FASE-8-PERFIL-ESTUDANTE.md](./SPRINT-4-FASE-8-PERFIL-ESTUDANTE.md)
- **Firebase Admin**: [../src/lib/firebaseAdmin.ts](../src/lib/firebaseAdmin.ts)
- **Auth Middleware**: [../src/app/api/_middleware/auth.ts](../src/app/api/_middleware/auth.ts)

---

**FIX APLICADO COM SUCESSO! ✅**

🔐 Autenticação: Firebase Auth
💾 Dados: Supabase PostgreSQL
🌐 API: REST com autenticação Firebase
