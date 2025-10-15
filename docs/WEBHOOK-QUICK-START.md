# ⚡ Quick Start: Webhooks de Status WhatsApp

> **Configuração rápida em 3 passos** (5 minutos)

---

## 📋 Passo 1: Criar Tabela no Supabase (2 min)

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Menu: **SQL Editor**
4. Copie e cole: [`WEBHOOK-WHATSAPP-CREATE-TABLE.sql`](WEBHOOK-WHATSAPP-CREATE-TABLE.sql)
5. Clique em **Run**

✅ **Verificar**: Query deve executar sem erros

---

## 📋 Passo 2: Configurar Webhook na Evolution API (2 min)

### Opção A: Via Dashboard Evolution API

1. Acesse painel Evolution API
2. Selecione sua instância
3. **Webhooks** → **Configurar**
4. Cole a URL:
```
https://seu-dominio.vercel.app/api/evolution/webhooks/message-status
```
5. Eventos: `MESSAGES_UPDATE`
6. Salvar

### Opção B: Via API (curl)

```bash
curl -X POST "https://sua-evolution-api.com/webhook/set/sua-instancia" \
  -H "apikey: SUA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://seu-dominio.vercel.app/api/evolution/webhooks/message-status",
    "events": ["MESSAGES_UPDATE"],
    "webhook_by_events": true
  }'
```

✅ **Verificar**:
```bash
curl https://seu-dominio.vercel.app/api/evolution/webhooks/message-status
```

Resposta esperada:
```json
{
  "status": "online",
  "endpoint": "/api/evolution/webhooks/message-status"
}
```

---

## 📋 Passo 3: Testar (1 min)

1. Envie uma mensagem WhatsApp via interface
2. Aguarde 5-10 segundos
3. Verifique no Supabase:

```sql
SELECT
  message_id,
  current_status,
  status_history,
  delivered_at,
  read_at
FROM whatsapp_message_history
ORDER BY data_primeiro_envio DESC
LIMIT 1;
```

✅ **Resultado esperado**:
```
current_status: "DELIVERED" ou "READ"
status_history: [{"status":"SENT"...}, {"status":"DELIVERED"...}]
delivered_at: "2025-10-15T14:30:05.000Z"
```

---

## 🎯 Status que Você Vai Ver

| Status | Quando | Tempo |
|--------|--------|-------|
| **SENT** | Mensagem enviada | Imediato |
| **DELIVERED** | Chegou no celular | 1-5 segundos |
| **READ** | Usuário abriu | Quando abrir |

---

## 🐛 Problema?

### Webhook não está funcionando

1. **Verificar URL**:
```bash
curl https://seu-dominio.vercel.app/api/evolution/webhooks/message-status
```

2. **Verificar configuração Evolution API**:
```bash
curl -X GET "https://sua-evolution-api.com/webhook/find/sua-instancia" \
  -H "apikey: SUA_API_KEY"
```

3. **Verificar tabela existe**:
```sql
SELECT COUNT(*) FROM whatsapp_message_history;
```

### Desenvolvimento Local (ngrok)

```bash
# Terminal 1
npm run dev

# Terminal 2
ngrok http 3000
# Copie a URL gerada (https://abc123.ngrok-free.app)
```

Use URL do ngrok no webhook:
```
https://abc123.ngrok-free.app/api/evolution/webhooks/message-status
```

---

## 📚 Documentação Completa

Ver: [`WEBHOOK-WHATSAPP-STATUS-SETUP.md`](WEBHOOK-WHATSAPP-STATUS-SETUP.md)

---

✅ **Pronto!** Sistema de rastreamento de status funcionando em 5 minutos.
