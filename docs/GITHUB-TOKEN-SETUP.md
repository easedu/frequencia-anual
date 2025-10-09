# 🔑 Configuração do GitHub Token

## 📋 Visão Geral

Este guia te ajudará a criar e configurar um GitHub Personal Access Token para usar com o GitHub MCP no Claude Code e Claude Desktop.

---

## 🎯 Passo 1: Criar o GitHub Token

### 1.1 Acesse o GitHub
Abra no seu navegador: https://github.com/settings/tokens

### 1.2 Clique em "Generate new token"
Selecione: **"Generate new token (classic)"**

### 1.3 Configure o Token

**Nome do token:**
```
Claude MCP - Frequência Anual
```

**Expiração:**
- Recomendado: `90 days` (3 meses)
- Ou: `No expiration` (se preferir não renovar)

**Permissões necessárias (scopes):**

✅ **Marque TODAS estas opções:**

```
[✓] repo (Full control of private repositories)
    [✓] repo:status
    [✓] repo_deployment
    [✓] public_repo
    [✓] repo:invite
    [✓] security_events

[✓] workflow (Update GitHub Action workflows)

[✓] read:org (Read org and team membership)

[✓] read:user (Read user profile data)

[✓] user:email (Access user email addresses)
```

### 1.4 Gerar Token
1. Role até o final da página
2. Clique em **"Generate token"**
3. ⚠️ **COPIE O TOKEN IMEDIATAMENTE** (você não conseguirá vê-lo novamente!)

**O token terá este formato:**
```
ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🎯 Passo 2: Configurar no Sistema

### ⚠️ IMPORTANTE: Mantenha o token seguro!
- Nunca compartilhe o token
- Nunca faça commit dele no Git
- Guarde em local seguro (ex: gerenciador de senhas)

---

## 📝 Agora me forneça o token

**Cole o token aqui quando estiver pronto:**

Exemplo:
```
ghp_1234567890abcdefghijklmnopqrstuvwxyz
```

Quando você me fornecer o token, eu vou:

1. ✅ Adicionar ao `~/.zshrc` (para terminal)
2. ✅ Recarregar as configurações
3. ✅ Verificar se está funcionando
4. ✅ Testar o GitHub MCP
5. ✅ Atualizar a documentação

---

## 🔒 Segurança

### O token NÃO será:
- ❌ Commitado no Git
- ❌ Compartilhado publicamente
- ❌ Armazenado em arquivos do projeto

### O token SERÁ armazenado:
- ✅ No seu `~/.zshrc` (arquivo pessoal)
- ✅ Disponível apenas para você
- ✅ Usado pelo Claude Code e Claude Desktop localmente

---

## 🆘 Precisa de Ajuda?

### Não consegue acessar o GitHub?
1. Faça login no GitHub: https://github.com/login
2. Depois acesse: https://github.com/settings/tokens

### Não vê a opção "Generate token"?
1. Verifique se está logado
2. Verifique permissões da sua conta

### Token expirou?
1. Vá em: https://github.com/settings/tokens
2. Delete o token antigo
3. Crie um novo seguindo os passos acima
4. Me forneça o novo token

---

**Quando tiver o token, cole aqui na conversa e eu configuro tudo automaticamente! 🚀**
