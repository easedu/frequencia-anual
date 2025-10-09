# 🚀 Guia dos Novos MCPs - SQLite + Fetch + Brave Search

## 📋 Visão Geral

Foram adicionados **3 novos MCPs** ao seu projeto:

1. 💾 **SQLite MCP** - Analytics com SQL
2. 🌐 **Fetch MCP** - Buscar conteúdo web e testar APIs
3. 🔍 **Brave Search MCP** - Busca web integrada

---

## 💾 SQLite MCP - Seu Novo Aliado de Analytics

### 🎯 O que é?
Um banco de dados SQL local para queries complexas e analytics rápidos.

### 🔥 Por que você precisa?
- Firestore é excelente para dados em tempo real
- SQLite é superior para **analytics e relatórios**
- Queries SQL são mais rápidas e flexíveis

### 📊 Casos de Uso Reais:

#### 1. **Relatório de Faltas por Turma**
```
"No SQLite, mostre estudantes com mais de 10 faltas agrupados por turma"
```

**SQL equivalente:**
```sql
SELECT turma, COUNT(*) as total_estudantes, AVG(total_faltas) as media_faltas
FROM students
WHERE total_faltas > 10
GROUP BY turma
ORDER BY media_faltas DESC;
```

#### 2. **Análise Temporal**
```
"Crie uma query que mostre a evolução de faltas por bimestre"
```

#### 3. **Importar dados do Firestore**
```
"Importe os dados de estudantes do Firestore para uma tabela SQLite chamada 'students'"
```

### ⚠️ Importante:

**O arquivo `analytics.db` será criado na raiz do projeto.**

Adicione ao `.gitignore`:
```bash
analytics.db
analytics.db-journal
*.db
*.db-journal
```

---

## 🌐 Fetch MCP - Seu Navegador Integrado

### 🎯 O que é?
Busca conteúdo de URLs e APIs diretamente no Claude.

### 🔥 Por que você precisa?
- Testar APIs sem Postman
- Buscar documentação online
- Debug de webhooks
- Converter HTML para Markdown

### 📊 Casos de Uso Reais:

#### 1. **Testar WhatsApp API**
```
"Use o Fetch para testar a API do WhatsApp com este payload:
{
  "phone": "5511999999999",
  "message": "Teste de envio"
}"
```

#### 2. **Buscar Documentação**
```
"Busque a documentação do Firebase sobre Firestore Security Rules em:
https://firebase.google.com/docs/firestore/security/get-started"
```

#### 3. **Debug de Webhook**
```
"Faça uma requisição GET para https://api.exemplo.com/webhook/status
e me mostre a resposta"
```

### ⚠️ Segurança:

⚠️ **CUIDADO:** Fetch pode acessar URLs internas/locais.
- Não use com URLs sensíveis
- Cuidado com dados confidenciais

---

## 🔍 Brave Search MCP - Google do Claude

### 🎯 O que é?
Busca web integrada ao Claude usando Brave Search API.

### 🔥 Por que você precisa?
- Buscar soluções atualizadas
- Encontrar docs de tecnologias novas
- Troubleshooting de erros
- Exemplos de código

### 📊 Casos de Uso Reais:

#### 1. **Troubleshooting**
```
"Busque soluções para o erro:
'Firebase: Missing or insufficient permissions (permission-denied)'"
```

#### 2. **Documentação Atualizada**
```
"Procure a documentação oficial do Next.js 15 sobre Server Actions"
```

#### 3. **Exemplos de Código**
```
"Encontre exemplos de implementação de dual-write pattern com Firestore"
```

### ⚠️ Configuração Necessária:

**Brave Search MCP requer API Key:**

1. **Criar conta:** https://brave.com/search/api/
2. **Obter API Key** (gratuito até 2000 queries/mês)
3. **Configurar:**

```bash
# Adicione ao ~/.zshrc:
export BRAVE_API_KEY="sua_chave_aqui"

# Recarregue:
source ~/.zshrc
```

**Sem API Key, este MCP não funcionará.**

---

## 🔧 Instalação de Dependências

### uvx (para SQLite e Fetch)

**O que é:** Executador de pacotes Python (como npx para Python)

**Instalar:**
```bash
# Instalar uv (gerenciador Python):
curl -LsSf https://astral.sh/uv/install.sh | sh

# Verificar:
uvx --version
```

**Se não tiver Python:**
```bash
# macOS:
brew install python3

# Verificar:
python3 --version
```

---

## 🎯 Workflow Recomendado

### 1. **Analytics (SQLite)**

**Quando usar:**
- Relatórios complexos
- Agregações (COUNT, AVG, SUM)
- JOINs entre tabelas
- Queries com múltiplos filtros

**Exemplo:**
```
"Crie uma tabela no SQLite com estudantes que têm:
- Mais de 10 faltas não justificadas
- Frequência abaixo de 75%
- Pelo menos 1 interação familiar registrada

Mostre nome, turma, total de faltas e última interação"
```

### 2. **APIs e Docs (Fetch)**

**Quando usar:**
- Testar endpoints
- Buscar documentação
- Validar payloads JSON
- Debug de integrações

**Exemplo:**
```
"Busque a API do GitHub em https://api.github.com/repos/seu-usuario/frequencia-anual
e mostre as informações do repositório"
```

### 3. **Pesquisa (Brave Search)**

**Quando usar:**
- Erros desconhecidos
- Tecnologias novas
- Best practices
- Exemplos de implementação

**Exemplo:**
```
"Busque como implementar rate limiting em Next.js API routes"
```

---

## 📊 Comparação: Firebase vs SQLite

| Aspecto | Firebase | SQLite |
|---------|----------|--------|
| **Tempo Real** | ✅ Excelente | ❌ Não suporta |
| **Analytics** | ⚠️ Limitado | ✅ SQL completo |
| **Agregações** | ⚠️ Lento | ✅ Rápido |
| **JOINs** | ❌ Não suporta | ✅ Sim |
| **Custo** | 💰 Paid (reads) | ✅ Grátis |
| **Offline** | ⚠️ Cache | ✅ Total |

**Conclusão:** Use ambos! Firebase para app, SQLite para analytics.

---

## 🚀 Próximos Passos

### 1. **Instalar uvx**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. **Obter Brave API Key** (opcional)
https://brave.com/search/api/

### 3. **Reiniciar Claude**
- Claude Code: Cmd+Q → Reabrir
- Claude Desktop: Cmd+Q → Reabrir

### 4. **Testar MCPs**

**SQLite:**
```
"Crie uma tabela de teste no SQLite"
```

**Fetch:**
```
"Busque https://api.github.com e mostre o resultado"
```

**Brave Search:**
```
"Busque 'Next.js 15 server actions tutorial'"
```

---

## 🐛 Troubleshooting

### SQLite/Fetch não funciona:

```bash
# Verificar se uvx está instalado:
uvx --version

# Se não, instalar:
curl -LsSf https://astral.sh/uv/install.sh | sh

# Reiniciar terminal
```

### Brave Search não funciona:

```bash
# Verificar API key:
echo $BRAVE_API_KEY

# Se vazio, configurar:
export BRAVE_API_KEY="sua_chave"
```

### JSON inválido:

```bash
# Validar .mcp.json:
cat .mcp.json | python3 -m json.tool

# Validar claude_desktop_config.json:
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python3 -m json.tool
```

---

## 📚 Recursos

- [SQLite MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite)
- [Fetch MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/fetch)
- [Brave Search API](https://brave.com/search/api/)
- [MCP Protocol Spec](https://modelcontextprotocol.io)

---

## 💡 Dica Final

**Combine os MCPs para máxima eficiência:**

```
Exemplo: "Use Brave Search para encontrar exemplos de
'SQLite analytics dashboard', depois use Fetch para
buscar o código de exemplo, e finalmente implemente
as queries no nosso analytics.db"
```

---

**Última atualização:** 2025-10-09
**Backups criados:**
- `.mcp.json.backup.20251009_114310`
- `claude_desktop_config.json.backup.20251009_114313`
