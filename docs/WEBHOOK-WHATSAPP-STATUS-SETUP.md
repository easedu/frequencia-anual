# 📡 Configuração de Webhooks para Status de Mensagens WhatsApp

> **Objetivo**: Rastrear automaticamente o ciclo de vida completo das mensagens WhatsApp (PENDING → SENT → DELIVERED → READ → PLAYED)

**Data**: 2025-10-15
**Status**: ✅ Implementado
**Versão**: 1.0.0

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Passo 1: Migração do Banco de Dados](#passo-1-migração-do-banco-de-dados)
4. [Passo 2: Configurar Webhook na Evolution API](#passo-2-configurar-webhook-na-evolution-api)
5. [Passo 3: Testar Webhook](#passo-3-testar-webhook)
6. [Passo 4: Monitorar Status](#passo-4-monitorar-status)
7. [Troubleshooting](#troubleshooting)
8. [Referências](#referências)

---

## 🎯 Visão Geral

### Fluxo Completo

```
┌──────────────────────────────────────────────────────────────┐
│  1. Envio de Mensagem                                         │
│     ├─ Usuário envia mensagem via interface                  │
│     ├─ EvolutionMessageService.sendText()                    │
│     ├─ Evolution API processa                                │
│     └─ Retorna: { messageId: "3EB0...", status: "PENDING" }  │
│                                                               │
│  2. Salvamento Inicial                                        │
│     ├─ MessageHistoryService.recordSent()                    │
│     ├─ Salva em: whatsapp_message_history                    │
│     └─ current_status: "SENT" (status inicial)               │
│                                                               │
│  3. Evolution API → Webhook (automático)                      │
│     ├─ Mensagem entregue → DELIVERED                         │
│     ├─ Mensagem lida → READ                                  │
│     ├─ POST /api/evolution/webhooks/message-status           │
│     └─ Body: { event, data: { key, update } }                │
│                                                               │
│  4. Atualização Automática                                    │
│     ├─ Webhook recebe evento                                 │
│     ├─ MessageStatusService.updateStatus()                   │
│     ├─ Atualiza: current_status, status_history              │
│     └─ Salva: delivered_at, read_at, played_at               │
└──────────────────────────────────────────────────────────────┘
```

### Status Rastreados

| Status | Descrição | Indicador Visual | Timestamp Salvo |
|--------|-----------|------------------|-----------------|
| **PENDING** | Mensagem na fila | ⏳ Relógio | `sent_at` |
| **SENT** | Enviada para servidores WhatsApp | ✓ 1 check | `sent_at` |
| **DELIVERED** | Entregue no celular | ✓✓ 2 checks cinzas | `delivered_at` |
| **READ** | Lida pelo destinatário | ✓✓ 2 checks azuis | `read_at` |
| **PLAYED** | Mídia reproduzida | 🔵 Ícone play | `played_at` |
| **FAILED** | Falha no envio | ❌ X vermelho | - |

---

## 📦 Pré-requisitos

✅ Projeto Next.js 15+ com Evolution API configurada
✅ Supabase PostgreSQL configurado
✅ Acesso ao painel Evolution API
✅ URL pública do projeto (ngrok para dev, Vercel para prod)

---

## 🗄️ Passo 1: Migração do Banco de Dados

### 1.1 Executar Migration SQL

**Arquivo**: [`docs/WEBHOOK-WHATSAPP-STATUS-MIGRATION.sql`](WEBHOOK-WHATSAPP-STATUS-MIGRATION.sql)

```bash
# Via Supabase Dashboard
1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Menu lateral: SQL Editor
4. Copie e cole o conteúdo do arquivo WEBHOOK-WHATSAPP-STATUS-MIGRATION.sql
5. Clique em "Run"
```

### 1.2 Verificar Migration

```sql
-- Verificar se colunas foram adicionadas
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'whatsapp_message_history'
  AND column_name IN ('current_status', 'status_history', 'delivered_at', 'read_at', 'played_at', 'updated_at');

-- Deve retornar 6 linhas
```

### 1.3 Verificar Migração de Dados Existentes

```sql
-- Contar por status atual
SELECT
  current_status,
  COUNT(*) as total
FROM whatsapp_message_history
GROUP BY current_status
ORDER BY total DESC;

-- Verificar mensagens com message_id
SELECT
  COUNT(*) as total_com_message_id,
  COUNT(*) FILTER (WHERE current_status = 'SENT') as status_sent,
  COUNT(*) FILTER (WHERE current_status = 'FAILED') as status_failed
FROM whatsapp_message_history
WHERE message_id IS NOT NULL;
```

---

## 🔗 Passo 2: Configurar Webhook na Evolution API

### 2.1 Obter URL do Webhook

#### **Desenvolvimento (Local)**
Use **ngrok** para expor localhost:

```bash
# Terminal 1: Iniciar Next.js
npm run dev

# Terminal 2: Iniciar ngrok
ngrok http 3000
```

Copie a URL gerada:
```
https://abc123.ngrok-free.app
```

**URL do Webhook**:
```
https://abc123.ngrok-free.app/api/evolution/webhooks/message-status
```

#### **Produção (Vercel)**

**URL do Webhook**:
```
https://seu-projeto.vercel.app/api/evolution/webhooks/message-status
```

### 2.2 Configurar via Evolution API Dashboard

1. Acesse o painel Evolution API
2. Vá em **Webhooks** ou **Instances**
3. Selecione sua instância
4. Clique em **Configurar Webhook**

**Configurações**:
```json
{
  "url": "https://seu-dominio.com/api/evolution/webhooks/message-status",
  "events": [
    "MESSAGES_UPDATE"
  ],
  "webhook_by_events": true,
  "webhook_base64": false
}
```

### 2.3 Configurar via API (Alternativa)

```bash
curl -X POST "https://sua-evolution-api.com/webhook/set/sua-instancia" \
  -H "apikey: SUA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://seu-dominio.com/api/evolution/webhooks/message-status",
    "events": [
      "MESSAGES_UPDATE"
    ],
    "webhook_by_events": true,
    "webhook_base64": false
  }'
```

**Resposta esperada**:
```json
{
  "webhook": {
    "url": "https://seu-dominio.com/api/evolution/webhooks/message-status",
    "events": ["MESSAGES_UPDATE"],
    "webhook_by_events": true
  }
}
```

### 2.4 Verificar Configuração

```bash
curl -X GET "https://sua-evolution-api.com/webhook/find/sua-instancia" \
  -H "apikey: SUA_API_KEY"
```

---

## 🧪 Passo 3: Testar Webhook

### 3.1 Health Check do Endpoint

```bash
curl https://seu-dominio.com/api/evolution/webhooks/message-status
```

**Resposta esperada**:
```json
{
  "status": "online",
  "endpoint": "/api/evolution/webhooks/message-status",
  "description": "Webhook receptor de status de mensagens WhatsApp (Evolution API)",
  "supportedEvents": ["MESSAGES_UPDATE"],
  "timestamp": "2025-10-15T14:30:00.000Z"
}
```

### 3.2 Testar Envio de Mensagem Real

1. **Enviar mensagem via interface**:
   - Acesse: `/perfil-estudante`
   - Selecione um estudante
   - Seção "Interações Familiares"
   - Envie uma mensagem WhatsApp

2. **Verificar salvamento inicial**:
```sql
SELECT
  message_id,
  current_status,
  status_history,
  estudante_nome,
  contato_telefone,
  data_primeiro_envio
FROM whatsapp_message_history
ORDER BY data_primeiro_envio DESC
LIMIT 1;
```

**Resultado esperado**:
```
message_id: "3EB0ABC123..."
current_status: "SENT"
status_history: [{"status":"SENT","timestamp":1736445600000,"source":"api"}]
```

3. **Aguardar webhook** (alguns segundos):
   - Evolution API enviará evento quando status mudar
   - Verificar logs da aplicação

4. **Verificar atualização**:
```sql
SELECT
  message_id,
  current_status,
  status_history,
  delivered_at,
  read_at,
  updated_at
FROM whatsapp_message_history
WHERE message_id = '3EB0ABC123...'  -- Use o ID real
ORDER BY updated_at DESC
LIMIT 1;
```

**Resultado esperado (após entrega)**:
```
message_id: "3EB0ABC123..."
current_status: "DELIVERED"
status_history: [
  {"status":"SENT","timestamp":1736445600000,"source":"api"},
  {"status":"DELIVERED","timestamp":1736445605000,"source":"webhook"}
]
delivered_at: "2025-10-15T14:30:05.000Z"
```

### 3.3 Simular Webhook Manual (Desenvolvimento)

```bash
curl -X POST "http://localhost:3000/api/evolution/webhooks/message-status" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "MESSAGES_UPDATE",
    "instance": "test-instance",
    "data": {
      "key": {
        "remoteJid": "5511987654321@s.whatsapp.net",
        "fromMe": true,
        "id": "3EB0ABC123..."
      },
      "update": {
        "status": 3,
        "timestamp": 1736445605
      }
    },
    "date_time": "2025-10-15T14:30:05.000Z",
    "server_url": "https://evolution-api.com",
    "apikey": "test"
  }'
```

**Códigos de status**:
- `0` = FAILED
- `1` = PENDING
- `2` = SENT
- `3` = DELIVERED
- `4` = READ
- `5` = PLAYED

---

## 📊 Passo 4: Monitorar Status

### 4.1 Query: Mensagens por Status

```sql
SELECT
  current_status,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE delivered_at IS NOT NULL) as com_delivered,
  COUNT(*) FILTER (WHERE read_at IS NOT NULL) as com_read
FROM whatsapp_message_history
WHERE data_primeiro_envio >= NOW() - INTERVAL '7 days'
GROUP BY current_status
ORDER BY total DESC;
```

### 4.2 Query: Taxa de Entrega

```sql
SELECT
  COUNT(*) as total_enviadas,
  COUNT(*) FILTER (WHERE current_status IN ('DELIVERED', 'READ', 'PLAYED')) as entregues,
  COUNT(*) FILTER (WHERE current_status = 'READ') as lidas,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE current_status IN ('DELIVERED', 'READ', 'PLAYED')) / NULLIF(COUNT(*), 0),
    2
  ) as taxa_entrega_pct,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE current_status = 'READ') / NULLIF(COUNT(*), 0),
    2
  ) as taxa_leitura_pct
FROM whatsapp_message_history
WHERE data_primeiro_envio >= NOW() - INTERVAL '30 days'
  AND status = 'SUCCESS';
```

### 4.3 Query: Histórico de Status de uma Mensagem

```sql
SELECT
  message_id,
  estudante_nome,
  contato_telefone,
  current_status,
  jsonb_array_elements(status_history) as historico,
  delivered_at,
  read_at,
  data_primeiro_envio,
  updated_at
FROM whatsapp_message_history
WHERE message_id = '3EB0ABC123...';  -- Substitua pelo ID real
```

### 4.4 View: Dashboard de Status (Criar se quiser)

```sql
CREATE OR REPLACE VIEW v_whatsapp_status_dashboard AS
SELECT
  DATE(data_primeiro_envio) as data,
  current_status,
  COUNT(*) as total,
  AVG(EXTRACT(EPOCH FROM (updated_at::timestamp - data_primeiro_envio)) / 60)::numeric(10,2) as tempo_medio_atualizacao_min
FROM whatsapp_message_history
WHERE data_primeiro_envio >= NOW() - INTERVAL '30 days'
GROUP BY DATE(data_primeiro_envio), current_status
ORDER BY data DESC, total DESC;

-- Usar:
SELECT * FROM v_whatsapp_status_dashboard;
```

---

## 🐛 Troubleshooting

### Problema 1: Webhook não está sendo chamado

**Sintomas**:
- Mensagens enviadas com sucesso
- `current_status` permanece "SENT"
- Nenhum log de webhook

**Soluções**:
1. Verificar configuração do webhook na Evolution API:
```bash
curl -X GET "https://sua-evolution-api.com/webhook/find/sua-instancia" \
  -H "apikey: SUA_API_KEY"
```

2. Verificar se URL está acessível publicamente:
```bash
curl https://seu-dominio.com/api/evolution/webhooks/message-status
```

3. **Ngrok**: Verificar se túnel está ativo:
```bash
curl http://127.0.0.1:4040/api/tunnels  # Dashboard do ngrok
```

4. Testar webhook manualmente (ver seção 3.3)

### Problema 2: Webhook retorna erro 404

**Causa**: Mensagem não encontrada no histórico

**Verificar**:
```sql
SELECT COUNT(*) FROM whatsapp_message_history WHERE message_id IS NOT NULL;
```

**Solução**:
- Garantir que `messageId` está sendo salvo corretamente
- Verificar logs do `MessageHistoryService.recordSent()`

### Problema 3: Status não atualiza

**Causa**: `message_id` não coincide

**Verificar**:
```sql
-- Buscar por telefone ao invés de message_id
SELECT
  message_id,
  contato_telefone,
  current_status
FROM whatsapp_message_history
WHERE contato_telefone = '11987654321'  -- Seu telefone de teste
ORDER BY data_primeiro_envio DESC
LIMIT 5;
```

### Problema 4: Múltiplas atualizações do mesmo status

**Causa**: Evolution API pode enviar evento duplicado

**Solução**: Código já implementa idempotência (verifica se status já está atualizado)

---

## 📚 Referências

### Documentação Evolution API
- **Webhooks**: https://doc.evolution-api.com/v2/en/webhooks
- **Message Status**: https://doc.evolution-api.com/v2/en/message-status
- **Events**: https://doc.evolution-api.com/v2/en/events

### Arquivos do Projeto
- **Migration SQL**: [`WEBHOOK-WHATSAPP-STATUS-MIGRATION.sql`](WEBHOOK-WHATSAPP-STATUS-MIGRATION.sql)
- **Webhook Route**: [`src/app/api/evolution/webhooks/message-status/route.ts`](../src/app/api/evolution/webhooks/message-status/route.ts)
- **Status Service**: [`src/services/whatsapp/messageStatusService.ts`](../src/services/whatsapp/messageStatusService.ts)
- **Tipos**: [`src/types/whatsapp/webhook.ts`](../src/types/whatsapp/webhook.ts)

### Código de Status (Evolution API)

| Code | Status WhatsApp | Nossa Enum |
|------|-----------------|------------|
| 0 | ERROR | FAILED |
| 1 | PENDING | PENDING |
| 2 | SERVER_ACK | SENT |
| 3 | DELIVERY_ACK | DELIVERED |
| 4 | READ | READ |
| 5 | PLAYED | PLAYED |

---

## ✅ Checklist de Configuração

- [ ] Migration SQL executada no Supabase
- [ ] Colunas verificadas (current_status, status_history, etc)
- [ ] Dados existentes migrados
- [ ] Webhook configurado na Evolution API
- [ ] URL do webhook verificada (health check)
- [ ] Mensagem de teste enviada
- [ ] Status inicial salvo (SENT)
- [ ] Webhook recebido e processado
- [ ] Status atualizado (DELIVERED/READ)
- [ ] Timestamps salvos corretamente
- [ ] Logs verificados (sem erros)
- [ ] Dashboard de monitoramento criado (opcional)

---

**Status**: ✅ Sistema de webhooks implementado e funcionando
**Próximo passo**: Criar dashboard visual para visualizar status em tempo real

