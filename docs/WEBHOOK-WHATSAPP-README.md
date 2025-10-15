# 📡 Sistema de Webhooks para Rastreamento de Status WhatsApp

> **Status**: ✅ Implementado e pronto para uso
> **Versão**: 1.0.0
> **Data**: 2025-10-15

---

## 🎯 O Que Foi Implementado

Sistema completo de rastreamento do ciclo de vida de mensagens WhatsApp via webhooks da Evolution API.

### Antes vs Depois

| Aspecto | ❌ Antes | ✅ Depois |
|---------|----------|-----------|
| **Status rastreado** | Apenas envio inicial (SUCCESS/FAILED) | Ciclo completo (PENDING → SENT → DELIVERED → READ → PLAYED) |
| **Atualização** | Manual/inexistente | Automática via webhook |
| **Confirmação de entrega** | Não | Sim (timestamp exato) |
| **Confirmação de leitura** | Não | Sim (se usuário tiver confirmação ativada) |
| **Histórico de mudanças** | Não | Sim (array completo de transições) |
| **Timestamps** | Apenas envio | Entrega, Leitura, Reprodução (mídia) |

---

## 📊 Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│  BANCO DE DADOS (Supabase PostgreSQL)                   │
│  whatsapp_message_history                               │
│  ├─ current_status (VARCHAR)                            │
│  ├─ status_history (JSONB array)                        │
│  ├─ delivered_at (TIMESTAMPTZ)                          │
│  ├─ read_at (TIMESTAMPTZ)                               │
│  ├─ played_at (TIMESTAMPTZ)                             │
│  └─ updated_at (TIMESTAMPTZ)                            │
└─────────────────────────────────────────────────────────┘
                        ↑
                        │ UPDATE
                        │
┌─────────────────────────────────────────────────────────┐
│  WEBHOOK HANDLER                                         │
│  /api/evolution/webhooks/message-status                 │
│  ├─ Recebe evento MESSAGES_UPDATE                       │
│  ├─ Valida estrutura                                    │
│  ├─ Extrai message_id e status code                    │
│  └─ Chama MessageStatusService.updateStatus()          │
└─────────────────────────────────────────────────────────┘
                        ↑
                        │ POST (webhook)
                        │
┌─────────────────────────────────────────────────────────┐
│  EVOLUTION API                                           │
│  ├─ Envia mensagem WhatsApp                             │
│  ├─ Monitora status da mensagem                         │
│  └─ Dispara webhook quando status muda                  │
└─────────────────────────────────────────────────────────┘
                        ↑
                        │ sendText()
                        │
┌─────────────────────────────────────────────────────────┐
│  APPLICATION (Next.js)                                   │
│  ├─ Usuário envia mensagem via interface                │
│  ├─ EvolutionMessageService.sendText()                  │
│  └─ MessageHistoryService.recordSent() (status inicial) │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Arquivos Criados/Modificados

### ✨ Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| [`src/types/whatsapp/webhook.ts`](../src/types/whatsapp/webhook.ts) | Tipos TypeScript para webhooks |
| [`src/services/whatsapp/messageStatusService.ts`](../src/services/whatsapp/messageStatusService.ts) | Serviço de atualização de status |
| [`src/app/api/evolution/webhooks/message-status/route.ts`](../src/app/api/evolution/webhooks/message-status/route.ts) | API Route do webhook |
| [`docs/WEBHOOK-WHATSAPP-CREATE-TABLE.sql`](WEBHOOK-WHATSAPP-CREATE-TABLE.sql) | SQL para criar tabela |
| [`docs/WEBHOOK-WHATSAPP-MIGRATION.sql`](WEBHOOK-WHATSAPP-MIGRATION.sql) | SQL para migrar tabela existente |
| [`docs/WEBHOOK-WHATSAPP-STATUS-SETUP.md`](WEBHOOK-WHATSAPP-STATUS-SETUP.md) | Guia completo de configuração |
| [`docs/WEBHOOK-QUICK-START.md`](WEBHOOK-QUICK-START.md) | Guia rápido (5 min) |

### 🔄 Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| [`src/types/index.ts`](../src/types/index.ts) | Adicionado `WhatsAppMessageStatus`, `StatusHistoryEntry`, campos novos em `WhatsAppMessageHistory` |
| [`src/services/messageHistoryService.ts`](../src/services/messageHistoryService.ts) | Atualizado `recordSent()` para salvar status inicial + histórico |

---

## 🗂️ Schema do Banco de Dados

### Tabela: `whatsapp_message_history`

**Novos Campos**:

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `current_status` | VARCHAR(20) | Status atual da mensagem | `"DELIVERED"` |
| `status_history` | JSONB | Histórico completo de mudanças | `[{"status":"SENT","timestamp":1736445600000,"source":"api"}]` |
| `delivered_at` | TIMESTAMPTZ | Quando foi entregue (2 checks) | `2025-10-15T14:30:05.000Z` |
| `read_at` | TIMESTAMPTZ | Quando foi lida (2 checks azuis) | `2025-10-15T14:35:20.000Z` |
| `played_at` | TIMESTAMPTZ | Quando mídia foi reproduzida | `2025-10-15T14:36:00.000Z` |
| `updated_at` | TIMESTAMPTZ | Última atualização (auto) | `2025-10-15T14:35:20.000Z` |

**Índices Criados**:
- `idx_whatsapp_message_id` → Busca por `message_id` (usado pelo webhook)
- `idx_whatsapp_current_status` → Filtrar por status atual
- Trigger `trigger_update_whatsapp_message_updated_at` → Atualiza `updated_at` automaticamente

---

## 🔧 API Endpoints

### 1. **Webhook Receptor** (POST)

**URL**: `/api/evolution/webhooks/message-status`

**Descrição**: Recebe eventos de atualização de status da Evolution API

**Payload (Evolution API)**:
```json
{
  "event": "MESSAGES_UPDATE",
  "instance": "instance-name",
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
  "date_time": "2025-10-15T14:30:05.000Z"
}
```

**Status Codes**:
- `0` = FAILED
- `1` = PENDING
- `2` = SENT (servidor WhatsApp)
- `3` = DELIVERED (celular do destinatário)
- `4` = READ (lida)
- `5` = PLAYED (mídia reproduzida)

**Resposta**:
```json
{
  "success": true,
  "data": {
    "messageId": "3EB0ABC123...",
    "oldStatus": "SENT",
    "newStatus": "DELIVERED",
    "phoneNumber": "5511987654321"
  }
}
```

### 2. **Health Check** (GET)

**URL**: `/api/evolution/webhooks/message-status`

**Descrição**: Verifica se endpoint está online

**Resposta**:
```json
{
  "status": "online",
  "endpoint": "/api/evolution/webhooks/message-status",
  "description": "Webhook receptor de status de mensagens WhatsApp (Evolution API)",
  "supportedEvents": ["MESSAGES_UPDATE"],
  "timestamp": "2025-10-15T14:30:00.000Z"
}
```

---

## 🚀 Como Usar

### Configuração (Uma Vez)

1. **Criar tabela no Supabase** (2 min)
   ```sql
   -- Ver: docs/WEBHOOK-WHATSAPP-CREATE-TABLE.sql
   ```

2. **Configurar webhook na Evolution API** (2 min)
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

3. **Testar** (1 min)
   - Envie uma mensagem via interface
   - Verifique status atualizado no banco

📖 **Guia completo**: [`WEBHOOK-WHATSAPP-STATUS-SETUP.md`](WEBHOOK-WHATSAPP-STATUS-SETUP.md)
⚡ **Guia rápido**: [`WEBHOOK-QUICK-START.md`](WEBHOOK-QUICK-START.md)

---

## 📊 Monitoramento e Queries

### Ver Taxa de Entrega

```sql
SELECT
  COUNT(*) as total_enviadas,
  COUNT(*) FILTER (WHERE current_status IN ('DELIVERED', 'READ', 'PLAYED')) as entregues,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE current_status IN ('DELIVERED', 'READ', 'PLAYED')) / NULLIF(COUNT(*), 0),
    2
  ) as taxa_entrega_pct
FROM whatsapp_message_history
WHERE data_primeiro_envio >= NOW() - INTERVAL '30 days';
```

### Ver Mensagens por Status

```sql
SELECT
  current_status,
  COUNT(*) as total
FROM whatsapp_message_history
GROUP BY current_status
ORDER BY total DESC;
```

### Ver Histórico de uma Mensagem

```sql
SELECT
  message_id,
  current_status,
  jsonb_pretty(status_history) as historico,
  delivered_at,
  read_at
FROM whatsapp_message_history
WHERE message_id = '3EB0ABC123...';
```

---

## 🎯 Casos de Uso

### 1. Dashboard de Monitoramento
Exibir taxa de entrega e leitura de mensagens em tempo real.

### 2. Alertas de Falha
Notificar administradores quando mensagens não são entregues.

### 3. Análise de Engajamento
Medir quanto tempo leva para responsáveis lerem mensagens.

### 4. Relatórios Pedagógicos
Comprovar que alertas foram enviados e lidos.

---

## ✅ Funcionalidades Implementadas

- ✅ Rastreamento automático de status via webhooks
- ✅ Salvamento de timestamps de entrega, leitura e reprodução
- ✅ Histórico completo de transições de status
- ✅ Idempotência (evita atualizações duplicadas)
- ✅ Validação de eventos (apenas mensagens enviadas por nós)
- ✅ Logs detalhados para debugging
- ✅ Health check endpoint
- ✅ Queries de monitoramento prontas
- ✅ Documentação completa

---

## 🔮 Próximos Passos (Opcional)

1. **Dashboard Visual**
   - Criar página para visualizar status em tempo real
   - Gráficos de taxa de entrega/leitura

2. **Alertas Automáticos**
   - Notificar quando mensagem não é entregue em X minutos
   - Reenviar automaticamente mensagens falhadas

3. **Relatórios**
   - Relatório mensal de engajamento
   - Export CSV com histórico completo

4. **Integração com Tarefas**
   - Fechar tarefa automaticamente quando mensagem é lida
   - Criar nova tarefa se mensagem não é lida em 24h

---

## 📚 Referências

- **Evolution API Docs**: https://doc.evolution-api.com/v2/en/webhooks
- **WhatsApp Status Lifecycle**: https://faq.whatsapp.com/general/chats/about-delivery-and-read-receipts

---

## 🤝 Suporte

**Problemas?** Ver seção Troubleshooting em [`WEBHOOK-WHATSAPP-STATUS-SETUP.md`](WEBHOOK-WHATSAPP-STATUS-SETUP.md)

---

**Status**: ✅ Sistema completo implementado e documentado
**Tempo de configuração**: ~5 minutos
**Complexidade**: Baixa (tudo automatizado)

