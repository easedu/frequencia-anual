# 🚀 Deploy: Correções ERR_CONNECTION_RESET

## ✅ Status: Pronto para Deploy

Data: 2025-01-23
Build: ✅ Testado e aprovado
Compatibilidade: Vercel Free Plan

---

## 📦 O Que Foi Implementado

### 1. ✅ Firebase Admin Consolidado
- Removida duplicação de inicialização
- Única implementação em `lib/auth/firebaseAuthProvider.ts`
- `lib/firebaseAdmin.ts` depreciado e redirecionado

### 2. ✅ Lazy Initialization do Firebase Client
- Firebase só inicializa no browser (não no SSR/build)
- Verificação de apps existentes
- Validação de env vars antes de inicializar

### 3. ✅ Timeout Aumentado no AuthProvider
- 10s → 30s (conexões lentas)
- Error handling gracioso (não força redirecionamento)
- UI de erro com botão de reload

### 4. ✅ Vercel maxDuration Ajustado
- 30s → 10s (compatível com Free Plan)
- Headers `keep-alive` adicionados
- Previne `ERR_CONNECTION_RESET`

### 5. ✅ Timeout Automático em TODAS as APIs
- `withAuth()` - 8s timeout integrado (APIs autenticadas)
- `withTimeout()` - 8s timeout para APIs públicas
- Logs de performance automáticos
- Response 504 Gateway Timeout padronizado

### 6. ✅ Error Boundaries e Logs
- Estado `authError` no AuthProvider
- Logs estruturados em JSON
- Performance warnings automáticos (>2s)

---

## 🚀 Como Fazer o Deploy

### Passo 1: Commit e Push

```bash
# 1. Verificar mudanças
git status

# 2. Adicionar todos os arquivos
git add .

# 3. Commit com mensagem descritiva
git commit -m "fix: resolver ERR_CONNECTION_RESET - timeout + lazy init + consolidação Firebase"

# 4. Push para main
git push origin main
```

### Passo 2: Aguardar Deploy Automático

O Vercel fará deploy automaticamente quando detectar push na `main`.

1. Acesse https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em "Deployments"
4. Aguarde status "Ready" (~3-5 minutos)

### Passo 3: Verificar Deploy

```bash
# Testar endpoint de health
curl https://seu-projeto.vercel.app/api/health

# Testar login no navegador
# Abrir: https://seu-projeto.vercel.app/login
```

---

## 🧪 Testes Pós-Deploy

### Teste 1: Login Normal

- [ ] Acesse `/login`
- [ ] Faça login com credenciais válidas
- [ ] Verifique console do navegador (deve mostrar "🔐 Firebase Auth inicializado")
- [ ] Login deve funcionar em <30s

### Teste 2: Login com Conexão Lenta

- [ ] Abrir Chrome DevTools → Network
- [ ] Selecionar "Slow 3G"
- [ ] Acesse `/login`
- [ ] Faça login
- [ ] Deve funcionar (até 30s) ou mostrar erro de reload (não crash)

### Teste 3: Cold Start (Primeira Request)

- [ ] Aguarde 5 minutos sem acessar o site
- [ ] Acesse `/login` (cold start do Vercel)
- [ ] Login deve funcionar mesmo demorando >10s (não `ERR_CONNECTION_RESET`)

### Teste 4: APIs

```bash
# GET API autenticada (precisa de token)
curl -H "Authorization: Bearer SEU_TOKEN" \
  https://seu-projeto.vercel.app/api/students

# Deve retornar:
# - 200 OK com dados (se token válido)
# - 401 Unauthorized (se token inválido)
# - 504 Timeout (se demorar >8s)
```

---

## 📊 Monitoramento

### Vercel Logs

1. Acesse https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em "Logs"
4. Filtrar por:
   - `⚠️ API lenta` - APIs demorando >2s
   - `❌ Erro na API` - Erros em APIs
   - `⏰ Timeout` - Timeouts de auth

### Console do Navegador

Logs esperados (sucesso):
```
🔐 Firebase Auth inicializado (apenas autenticação)
✅ Perfil do usuário carregado com sucesso
```

Logs de warning (não-crítico):
```
⚠️ Perfil não encontrado no Supabase, usando fallback
```

Logs de erro (crítico - investigar):
```
❌ Erro ao buscar perfil do usuário (usando fallback)
⏰ Timeout na verificação de autenticação após 30s
```

---

## 🔍 Troubleshooting Pós-Deploy

### Problema: ERR_CONNECTION_RESET ainda aparece

**Verificar**:
1. `vercel.json` tem `maxDuration: 10` (não 30)?
2. Logs do Vercel mostram timeout >10s?
3. Firebase env vars estão configuradas no Vercel?

**Solução**:
- Verificar env vars no Vercel Dashboard → Settings → Environment Variables
- Confirmar que todas as `NEXT_PUBLIC_FIREBASE_*` estão configuradas

---

### Problema: Login muito lento (>20s)

**Verificar**:
1. Latência do Firebase Auth (região)
2. Latência do Supabase (busca de perfil)
3. Cold start do Vercel (primeira request)

**Solução**:
- Considerar cache de perfil no localStorage
- Migrar Firebase Auth → Supabase Auth (futuro)

---

### Problema: Timeout em APIs específicas

**Logs mostram**:
```
⚠️ API lenta (auth): POST /api/students - 7234ms
```

**Solução**:
1. **Otimizar query**:
   ```typescript
   // ❌ RUIM
   .select('*')

   // ✅ BOM
   .select('id, name, class')
   .limit(100)
   ```

2. **Adicionar detecção de timeout**:
   ```typescript
   import { isNearTimeout } from '@/app/api/_middleware';

   const startTime = Date.now();
   // ... operação
   if (isNearTimeout(startTime)) {
     return successResponse({ partial: true, data });
   }
   ```

3. **Mover para background job** (se muito pesado):
   - Vercel Cron
   - GitHub Actions
   - Webhook assíncrono

---

## 📚 Arquivos Modificados

### Core
- `src/firebase.config.ts` - Lazy initialization
- `src/lib/firebaseAdmin.ts` - Depreciado e redirecionado
- `src/components/layout/AuthProvider.tsx` - Timeout 30s + error handling
- `vercel.json` - maxDuration 10s + headers keep-alive

### Middlewares (NOVOS)
- `src/app/api/_middleware/auth.ts` - Timeout integrado (8s)
- `src/app/api/_middleware/withTimeout.ts` - Timeout para APIs públicas
- `src/app/api/_middleware/index.ts` - Barrel export

### Utilitários (NOVOS)
- `src/app/api/_utils/timeout.ts` - Helpers de timeout

### Documentação (NOVOS)
- `docs/FIX-ERR-CONNECTION-RESET.md` - Resumo das correções
- `docs/MIDDLEWARE-TIMEOUT-GUIDE.md` - Guia de uso dos middlewares
- `docs/DEPLOY-FIX-CONNECTION-RESET.md` - Este arquivo

---

## ✅ Checklist de Deploy

- [x] Build local OK (`npm run build`)
- [x] Type-check OK (warnings de dependências não-críticos)
- [x] Código commitado
- [ ] Push para main
- [ ] Deploy no Vercel concluído
- [ ] Teste de login (WiFi normal)
- [ ] Teste de login (3G lento)
- [ ] Teste de cold start
- [ ] Monitorar logs por 24h

---

## 🎯 Próximos Passos (Opcional)

1. **Migrar para Supabase Auth** (remover Firebase)
2. **Cache de Perfil** (localStorage para carga instantânea)
3. **Sentry** (monitoramento de erros)
4. **Vercel Analytics** (performance real de usuários)

---

## 📞 Suporte

Se após o deploy ainda houver problemas:

1. **Verificar logs do Vercel**: https://vercel.com/dashboard → Logs
2. **Verificar console do navegador**: F12 → Console
3. **Testar em modo anônimo**: Descartar cache/cookies
4. **Reportar com logs**: Incluir screenshots + logs do Vercel

---

**Última Atualização**: 2025-01-23
**Status**: ✅ Pronto para deploy em produção
**Compatibilidade**: Vercel Free Plan ✅
**Build Testado**: ✅ Aprovado
