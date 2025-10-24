# ⚙️ CONFIGURAR SUPABASE_SERVICE_ROLE_KEY NO VERCEL

**Status**: ⚠️ **URGENTE** - API `/students/all` está falhando em produção por falta desta variável

---

## 🚨 PROBLEMA ATUAL

A API Route `/api/students/all` está retornando erro 500 em produção:

```json
{
  "success": false,
  "error": "Erro desconhecido ao buscar estudantes"
}
```

**Causa raiz**: A variável de ambiente `SUPABASE_SERVICE_ROLE_KEY` **não está configurada no Vercel**.

**Impacto**:
- ❌ Seletor de turmas não funciona em `/marcar-faltas`
- ❌ API `/students/all` falha completamente
- ❌ Sistema não funciona mesmo em redes rápidas

---

## ✅ SOLUÇÃO: Configurar Variável no Vercel

### Passo 1: Obter a Service Role Key

A chave está no arquivo `.env.local` local:

```bash
# Ver a chave no seu arquivo local:
grep "SUPABASE_SERVICE_ROLE_KEY" .env.local
```

**Resultado esperado**:
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjY2ppZnJnZ3BnZXZxZnR3ZGt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDEwNTg4OSwiZXhwIjoyMDc1NjgxODg5fQ.XMoo6NLn6NhCrjoLAZZFhiMUoDKgBbbZa5pQ6q8BXKc
```

**Copie apenas o valor** (tudo após o `=`):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjY2ppZnJnZ3BnZXZxZnR3ZGt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDEwNTg4OSwiZXhwIjoyMDc1NjgxODg5fQ.XMoo6NLn6NhCrjoLAZZFhiMUoDKgBbbZa5pQ6q8BXKc
```

**OU** obtenha diretamente do Supabase Dashboard:

1. Acesse: https://supabase.com/dashboard/project/xccjifrggpgevqftwdkx
2. Vá em: **Settings** → **API**
3. Procure: **Project API keys**
4. Copie: **`service_role` key** (secret)

⚠️ **ATENÇÃO**: Esta é uma chave **SECRETA** com acesso total ao banco. **NUNCA** compartilhe publicamente!

---

### Passo 2: Configurar no Vercel

#### Opção A: Via Dashboard (Recomendado)

1. **Acesse o Vercel Dashboard**:
   - URL: https://vercel.com/dashboard
   - Projeto: `frequencia-anual`

2. **Vá em Settings**:
   - Clique no projeto `frequencia-anual`
   - No menu lateral, clique em **Settings**

3. **Adicione a variável**:
   - No menu lateral de Settings, clique em **Environment Variables**
   - Clique em **Add New**
   - Preencha:
     - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
     - **Value**: Cole a chave copiada no Passo 1
     - **Environments**: Marque **TODOS** (Production, Preview, Development)
   - Clique em **Save**

4. **Redeploy**:
   - Vá em **Deployments**
   - Clique nos **3 pontinhos** do último deployment
   - Clique em **Redeploy**
   - Aguarde o deploy completar (~2 minutos)

#### Opção B: Via CLI do Vercel

```bash
# 1. Instalar Vercel CLI (se não tiver)
npm i -g vercel

# 2. Login
vercel login

# 3. Adicionar variável (substituir VALOR_DA_CHAVE)
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Cole o valor quando solicitado

# Repetir para Preview e Development
vercel env add SUPABASE_SERVICE_ROLE_KEY preview
vercel env add SUPABASE_SERVICE_ROLE_KEY development

# 4. Redeploy
vercel --prod
```

---

### Passo 3: Validar Configuração

Após o redeploy, teste a API:

```bash
# Testar API em produção
curl https://frequencia-anual.vercel.app/api/students/all | jq .
```

**Resultado esperado** ✅:
```json
{
  "success": true,
  "cached": false,
  "count": 150,
  "data": [
    {
      "estudanteId": "uuid",
      "nome": "João Silva",
      "turma": "5A",
      "status": "ATIVO"
    }
  ]
}
```

**Se ainda der erro** ❌:
```json
{
  "success": false,
  "error": "❌ Missing Supabase service role key!"
}
```

**Possíveis causas**:
1. Variável não foi salva corretamente
2. Redeploy não foi feito
3. Typo no nome da variável (deve ser EXATAMENTE `SUPABASE_SERVICE_ROLE_KEY`)

---

## 🧪 TESTAR EM /marcar-faltas

Após configurar, acesse:

**URL**: https://frequencia-anual.vercel.app/marcar-faltas

**Esperado**:
- ✅ Datas dos bimestres aparecem (ano letivo)
- ✅ Seletor de turmas aparece com opções (5A, 5B, etc)
- ✅ Console sem erros

**Tempo de carregamento**:
- **1ª visita**: 10-20s (redes lentas 2G/3G)
- **2ª+ visitas**: < 2s (cache server-side)

---

## 📋 CHECKLIST DE VALIDAÇÃO

- [ ] **Passo 1**: Obter `SUPABASE_SERVICE_ROLE_KEY` do `.env.local` ou Supabase Dashboard
- [ ] **Passo 2**: Adicionar variável no Vercel Dashboard
  - [ ] Nome: `SUPABASE_SERVICE_ROLE_KEY` (exato)
  - [ ] Valor: Chave copiada (começando com `eyJ...`)
  - [ ] Environments: Production, Preview, Development (todos marcados)
- [ ] **Passo 3**: Redeploy no Vercel
- [ ] **Passo 4**: Aguardar deploy completar (~2 min)
- [ ] **Passo 5**: Testar API: `curl https://frequencia-anual.vercel.app/api/students/all | jq .`
  - [ ] Retorna `"success": true`
  - [ ] Retorna lista de estudantes
- [ ] **Passo 6**: Testar no navegador: `/marcar-faltas`
  - [ ] Datas aparecem
  - [ ] Seletor de turmas funciona
  - [ ] Console sem erros
- [ ] **Passo 7**: Testar em rede lenta (Chrome DevTools → Slow 3G)
  - [ ] Sistema carrega (pode demorar 10-20s)
  - [ ] Turmas aparecem
  - [ ] Sem ERR_CONNECTION_RESET

---

## 🔐 SEGURANÇA

### ⚠️ NUNCA FAÇA:

- ❌ Commitar `SUPABASE_SERVICE_ROLE_KEY` no Git
- ❌ Expor a chave em código client-side
- ❌ Compartilhar a chave publicamente (Slack, Discord, etc)
- ❌ Usar a chave em código `"use client"`
- ❌ Logar a chave no console

### ✅ SEMPRE FAÇA:

- ✅ Manter a chave **APENAS** em variáveis de ambiente
- ✅ Usar `supabaseAdmin` **APENAS** em API Routes e Server Components
- ✅ Renovar a chave se comprometida (Supabase Dashboard → Settings → API → Regenerate)
- ✅ Restringir acesso ao Vercel Dashboard (apenas admin)

---

## 🆘 TROUBLESHOOTING

### Erro: "Missing Supabase service role key!"

**Causa**: Variável não configurada ou nome errado

**Solução**:
1. Verificar nome exato: `SUPABASE_SERVICE_ROLE_KEY` (case-sensitive)
2. Verificar valor completo foi colado (começa com `eyJ`)
3. Verificar em TODOS os environments (Production, Preview, Development)
4. Redeploy após adicionar

### Erro: "Invalid JWT"

**Causa**: Chave incorreta ou expirada

**Solução**:
1. Obter nova chave do Supabase Dashboard
2. Atualizar no Vercel
3. Redeploy

### Erro: "Quota exceeded" ou "429 Too Many Requests"

**Causa**: Plano gratuito do Supabase excedeu quota

**Solução**:
1. Aguardar reset da quota (diariamente às 04:00 AM BRT)
2. Considerar upgrade do plano Supabase
3. Verificar cache está funcionando (reduz chamadas)

---

## 📚 REFERÊNCIAS

- **Supabase Admin Client**: `src/lib/supabaseAdmin.ts`
- **API Route**: `src/app/api/students/all/route.ts`
- **Documentação Supabase**: https://supabase.com/docs/guides/api#authentication
- **Vercel Environment Variables**: https://vercel.com/docs/concepts/projects/environment-variables

---

**Criado em**: 24/10/2025
**Prioridade**: ⚠️ **CRÍTICA** - Sistema não funciona sem esta configuração
**Tempo estimado**: 5-10 minutos
