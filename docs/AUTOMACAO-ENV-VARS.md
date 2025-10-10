# 🔐 Variáveis de Ambiente - Automação de Alertas de Faltas

## 📋 Variáveis Necessárias

### Desenvolvimento Local (`.env.local`)

Criar/atualizar o arquivo `.env.local` na raiz do projeto:

```bash
# ==========================================
# AUTOMAÇÃO DE ALERTAS DE FALTAS
# ==========================================

# URL da API WhatsApp (usado pelo retry service)
# Usando a variável existente do projeto
BASE_URL_API_HABIB_KYRILLOS=https://seu-dominio.com

# URL base da própria API (usado para chamadas internas)
# Em desenvolvimento local:
NEXT_PUBLIC_API_URL=http://localhost:3000

# Telefone fixo para notificações de admin
AUTOMATION_NOTIFICATION_PHONE=5511988384664

# Credenciais Basic Auth (mesmas da API absence-multiples)
API_HABIB_KYRILLOS_USERNAME=seu_usuario
API_HABIB_KYRILLOS_PASSWORD=sua_senha
```

---

## 🚀 Vercel (Produção)

### Como Configurar

1. Acessar: https://vercel.com/dashboard
2. Selecionar projeto: **frequencia-anual**
3. **Settings** → **Environment Variables**
4. Adicionar cada variável:

| Nome | Valor | Exemplo |
|------|-------|---------|
| `NEXT_PUBLIC_WHATSAPP_API_URL` | URL da API WhatsApp | `https://seu-servidor.com` |
| `NEXT_PUBLIC_API_URL` | URL da aplicação Vercel | `https://seu-app.vercel.app` |
| `AUTOMATION_NOTIFICATION_PHONE` | Telefone admin | `5511988384664` |
| `API_HABIB_KYRILLOS_USERNAME` | Usuário Basic Auth | `admin` |
| `API_HABIB_KYRILLOS_PASSWORD` | Senha Basic Auth | `senha-segura` |

### ⚠️ Importante

- **Environment**: Selecionar **Production**, **Preview** e **Development**
- **Após adicionar**: Fazer novo deploy para aplicar

---

## 🐙 GitHub Secrets (para Actions)

### Como Configurar

1. Acessar: https://github.com/seu-usuario/frequencia-anual
2. **Settings** → **Secrets and variables** → **Actions**
3. Clicar em **New repository secret**
4. Adicionar cada secret:

| Nome | Valor |
|------|-------|
| `NEXT_PUBLIC_API_URL` | `https://seu-app.vercel.app` |
| `API_HABIB_KYRILLOS_USERNAME` | `admin` |
| `API_HABIB_KYRILLOS_PASSWORD` | `senha-segura` |
| `AUTOMATION_NOTIFICATION_PHONE` | `5511988384664` |

**Nota**: Secrets não aparecem depois de salvos (apenas nome fica visível)

---

## ✅ Verificar Configuração

### Teste Local

```bash
# Terminal 1: Iniciar servidor
npm run dev

# Terminal 2: Testar API
curl -X GET \
  "http://localhost:3000/api/automation/process-absences?dryRun=true&multiple=3" \
  -H "Authorization: Basic $(echo -n 'usuario:senha' | base64)"
```

**Resultado esperado**:
- ✅ Status 200
- ✅ `{ "success": true, "executionId": "exec-...", "summary": {...} }`

### Teste Produção

```bash
curl -X GET \
  "https://seu-app.vercel.app/api/automation/process-absences?dryRun=true&multiple=3" \
  -H "Authorization: Basic $(echo -n 'usuario:senha' | base64)"
```

---

## 🐛 Troubleshooting

### Erro: "WHATSAPP_API_URL is not defined"
❌ Variável não configurada ou nome errado
✅ Verificar `.env.local` (dev) ou Vercel (prod)
✅ Reiniciar servidor dev: `npm run dev`

### Erro: "Server configuration error"
❌ Credenciais Basic Auth não configuradas
✅ Verificar `API_HABIB_KYRILLOS_USERNAME` e `API_HABIB_KYRILLOS_PASSWORD`

### Erro: "Invalid credentials"
❌ Usuário/senha incorretos na requisição
✅ Verificar Basic Auth header
✅ Testar com: `echo -n 'usuario:senha' | base64`

### Variáveis não aplicadas no Vercel
❌ Falta fazer redeploy
✅ Vercel Dashboard → Deployments → Redeploy

---

## 📚 Referências

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

---

**Status**: ⏳ Aguardando configuração manual
