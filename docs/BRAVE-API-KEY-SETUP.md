# 🔍 Configuração do Brave Search API Key

## 📋 Visão Geral

O Brave Search MCP permite fazer buscas na web diretamente no Claude, útil para:
- Buscar soluções de erros
- Encontrar documentação atualizada
- Troubleshooting
- Exemplos de código

---

## 🎯 Passo 1: Criar Conta no Brave Search API

### 1.1 Acesse o Brave Search API
Abra no seu navegador: https://brave.com/search/api/

### 1.2 Clique em "Get Started" ou "Sign Up"

### 1.3 Preencha os dados
- **Email:** Seu email
- **Password:** Crie uma senha forte
- **Company/Project:** "Frequencia Anual" (ou nome do seu projeto)

### 1.4 Verifique seu email
- Brave enviará um email de confirmação
- Clique no link para ativar sua conta

---

## 🎯 Passo 2: Obter API Key

### 2.1 Faça login
https://brave.com/search/api/

### 2.2 Acesse o Dashboard
- Após login, você será direcionado ao dashboard
- Ou acesse: https://brave.com/search/api/dashboard

### 2.3 Criar uma nova API Key
1. Procure por "API Keys" ou "Create API Key"
2. Clique em "Create New Key" ou "Generate Key"
3. Dê um nome: `claude-mcp-frequencia-anual`

### 2.4 Copie a API Key
⚠️ **IMPORTANTE:** Copie a chave imediatamente!
- A chave tem formato: `BSA...` (começa com BSA)
- Você não conseguirá vê-la novamente
- Guarde em local seguro

**Exemplo de formato:**
```
BSAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🎯 Passo 3: Plano Gratuito

### ✅ O que você ganha GRÁTIS:
- **2.000 queries por mês**
- Sem cartão de crédito necessário
- Renovação automática mensal

### 📊 Limites:
- 2.000 buscas/mês = ~67 buscas/dia
- Rate limit: 1 request/segundo
- Suficiente para desenvolvimento

### 💰 Planos pagos (opcional):
- **AI Pro:** $5/mês - 10.000 queries
- **Business:** Customizado - queries ilimitadas

**Recomendação:** Comece com gratuito!

---

## 📝 Agora me forneça a API Key

**Cole a API Key aqui quando estiver pronta:**

Exemplo:
```
BSA1234567890abcdefghijklmnopqrstuvwxyz
```

Quando você me fornecer a chave, eu vou:

1. ✅ Adicionar ao `~/.zshrc` (para terminal)
2. ✅ Recarregar as configurações
3. ✅ Verificar se está funcionando
4. ✅ Testar o Brave Search MCP
5. ✅ Atualizar a documentação

---

## 🔒 Segurança

### A chave NÃO será:
- ❌ Commitada no Git
- ❌ Compartilhada publicamente
- ❌ Armazenada em arquivos do projeto

### A chave SERÁ armazenada:
- ✅ No seu `~/.zshrc` (arquivo pessoal)
- ✅ Disponível apenas para você
- ✅ Usada pelo Claude Code e Claude Desktop localmente

---

## 🆘 Precisa de Ajuda?

### Não consegue acessar o Brave?
1. Verifique se está usando o link correto: https://brave.com/search/api/
2. Tente em modo anônimo/privado
3. Limpe cache do navegador

### Não vê a opção "API Keys"?
1. Verifique se confirmou o email
2. Faça logout e login novamente
3. Aguarde alguns minutos após criar conta

### Perdeu a API Key?
1. Acesse: https://brave.com/search/api/dashboard
2. Revogue a chave antiga
3. Crie uma nova
4. Me forneça a nova chave

### Quer usar sem Brave Search?
O Brave Search é **OPCIONAL**. Os outros MCPs funcionam sem ele:
- ✅ Firebase MCP
- ✅ Filesystem MCP
- ✅ GitHub MCP
- ✅ SQLite MCP
- ✅ Fetch MCP

---

## 🧪 Como Testar (Após Configurar)

### Teste 1: Busca simples
```
"Use Brave Search para buscar 'Next.js 15 tutorial'"
```

### Teste 2: Troubleshooting
```
"Busque soluções para o erro Firebase 'permission-denied'"
```

### Teste 3: Documentação
```
"Procure a documentação oficial do TypeScript sobre generics"
```

---

## 📊 Monitorar Uso

### Verificar quantas queries restam:
1. Acesse: https://brave.com/search/api/dashboard
2. Veja "Usage" ou "API Calls"
3. Monitore seu limite mensal

### Dicas para economizar queries:
- Use Brave Search apenas quando necessário
- Para docs conhecidas, use Fetch MCP
- Para código interno, use Filesystem MCP
- Para dados Firebase, use Firebase MCP

---

## 💡 Quando Usar Cada MCP?

| Necessidade | MCP Recomendado |
|-------------|-----------------|
| Buscar erro desconhecido | 🔍 Brave Search |
| Docs oficiais (URL conhecida) | 🌐 Fetch |
| Código do projeto | 📁 Filesystem |
| Dados Firestore | 🔥 Firebase |
| Analytics SQL | 💾 SQLite |
| Histórico Git | 🐙 GitHub |

---

**Quando tiver a API Key, cole aqui e eu configuro tudo automaticamente! 🚀**

**OU**

**Se preferir pular o Brave Search agora, é só me avisar!**
