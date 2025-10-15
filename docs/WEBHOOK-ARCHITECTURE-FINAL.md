# 🏗️ Arquitetura Final: Rastreamento de Status WhatsApp

> **Solução Otimizada**: Status salvo onde a mensagem é visualizada + índice para buscas rápidas

**Data**: 2025-10-15
**Status**: ✅ Implementado

---

## 🎯 Decisão Arquitetural

### ❓ Problema Identificado

**Você perguntou**:
> "Se a mensagem está sendo salva em `family_interactions`, o status também não deveria estar lá?"

**Resposta**: **SIM!** Absolutamente correto! 🎯

### ✅ Solução Implementada

**Duas tabelas trabalhando juntas**:

| Tabela | Propósito | Quando Usar |
|--------|-----------|-------------|
| **`family_interactions`** | **PRINCIPAL** - Visualização do usuário | Exibir histórico de interações com status WhatsApp |
| **`whatsapp_message_history`** | **ÍNDICE** - Buscas e prevenção de duplicatas | Queries de automação, estatísticas, anti-spam |

---

## 📊 Arquitetura Dual-Table

```
┌──────────────────────────────────────────────────────────┐
│  USUÁRIO VISUALIZA                                        │
│  family_interactions (tabela PRINCIPAL)                  │
│  ✅ Conteúdo da mensagem (whatsapp_message)              │
│  ✅ Status atual (whatsapp_status)                       │
│  ✅ Histórico de mudanças (whatsapp_status_history)      │
│  ✅ Timestamps (delivered_at, read_at, played_at)        │
│  ✅ Telefones (whatsapp_phones)                          │
│  ✅ Message ID (whatsapp_message_id)                     │
└──────────────────────────────────────────────────────────┘
                        ↑
                        │ Webhook atualiza AQUI primeiro
                        │
┌──────────────────────────────────────────────────────────┐
│  WEBHOOK HANDLER                                          │
│  /api/evolution/webhooks/message-status                  │
│  ├─ 1. InteractionStatusService.updateStatus()           │
│  │     (atualiza family_interactions)                    │
│  └─ 2. MessageStatusService.updateStatus()               │
│        (atualiza whatsapp_message_history)               │
└──────────────────────────────────────────────────────────┘
                        ↑
                        │
┌──────────────────────────────────────────────────────────┐
│  AUTOMAÇÃO/QUERIES USA                                    │
│  whatsapp_message_history (tabela ÍNDICE)               │
│  ✅ Prevenção de duplicatas (constraint único)           │
│  ✅ Busca rápida por mês/ano/faltas                      │
│  ✅ Estatísticas de envio                                │
│  ✅ Queries de automação                                 │
└──────────────────────────────────────────────────────────┘
```

---

## 🗂️ Schema das Tabelas

### 1️⃣ `family_interactions` (PRINCIPAL)

**Novos Campos WhatsApp**:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `whatsapp_message` | TEXT | Conteúdo completo da mensagem |
| `whatsapp_phones` | JSONB | Array de telefones `["11987654321"]` |
| `whatsapp_message_id` | VARCHAR | ID da Evolution API |
| `whatsapp_status` | VARCHAR | Status atual (SENT, DELIVERED, READ, etc) |
| `whatsapp_status_history` | JSONB | Histórico completo `[{"status":"SENT",...}]` |
| `whatsapp_sent_at` | TIMESTAMPTZ | Quando foi enviada |
| `whatsapp_delivered_at` | TIMESTAMPTZ | Quando foi entregue (2 checks) |
| `whatsapp_read_at` | TIMESTAMPTZ | Quando foi lida (2 checks azuis) |
| `whatsapp_played_at` | TIMESTAMPTZ | Quando mídia foi reproduzida |
| `whatsapp_updated_at` | TIMESTAMPTZ | Última atualização (webhook) |

**Migration SQL**: [`WEBHOOK-FAMILY-INTERACTIONS-MIGRATION.sql`](WEBHOOK-FAMILY-INTERACTIONS-MIGRATION.sql)

### 2️⃣ `whatsapp_message_history` (ÍNDICE)

**Campos**:
- Mesmos campos de status que `family_interactions`
- **Plus**: `ano_referencia`, `mes_referencia`, `quantidade_faltas` (para automação)
- **Constraint único**: Previne duplicatas por (estudante + telefone + ano + mês + faltas)

**Migration SQL**: [`WEBHOOK-WHATSAPP-CREATE-TABLE.sql`](WEBHOOK-WHATSAPP-CREATE-TABLE.sql)

---

## 🔄 Fluxo Completo

### Envio de Mensagem

```typescript
// 1. Usuário envia mensagem (perfil-estudante/page.tsx)
const { messageId } = await EvolutionMessageService.sendText(phone, message);

// 2. Salvar interação com dados WhatsApp
await InteractionService.createInteraction(studentId, {
  type: "Contato digital",
  description: "Mensagem enviada...",
  whatsappMessage: message,           // ✅ Conteúdo completo
  whatsappPhones: [phone],
  whatsappMessageId: messageId,       // ✅ ID para rastreamento
  whatsappStatus: 'SENT',             // ✅ Status inicial
  whatsappSentAt: new Date().toISOString(),
  whatsappStatusHistory: [
    { status: 'SENT', timestamp: Date.now(), source: 'api' }
  ]
});

// 3. Salvar em whatsapp_message_history (prevenção duplicatas)
await MessageHistoryService.recordSent({
  estudanteId,
  contatoTelefone,
  anoReferencia,
  mesReferencia,
  quantidadeFaltas,
  messageId,
  status: 'SUCCESS',
  currentStatus: 'SENT'
});
```

### Atualização via Webhook

```typescript
// Evolution API envia webhook quando status muda
POST /api/evolution/webhooks/message-status
{
  "event": "MESSAGES_UPDATE",
  "data": {
    "key": { "id": "3EB0...", ... },
    "update": { "status": 3 }  // DELIVERED
  }
}

// Webhook atualiza AMBAS as tabelas
await InteractionStatusService.updateStatus(messageId, 'DELIVERED', timestamp);
  → Atualiza family_interactions

await MessageStatusService.updateStatus(messageId, 'DELIVERED', timestamp);
  → Atualiza whatsapp_message_history
```

### Visualização pelo Usuário

```typescript
// Perfil do Estudante → Seção "Interações Familiares"
const interactions = await InteractionService.getStudentInteractions(studentId);

interactions.map(interaction => {
  if (interaction.type === "Contato digital") {
    return (
      <div>
        <p>{interaction.whatsappMessage}</p>  // ✅ Mensagem completa
        <p>Status: {interaction.whatsappStatus}</p>  // ✅ DELIVERED
        <p>Entregue em: {interaction.whatsappDeliveredAt}</p>  // ✅ Timestamp
        <p>Lida em: {interaction.whatsappReadAt}</p>  // ✅ Se lida
      </div>
    );
  }
});
```

---

## ✅ Vantagens da Arquitetura Dual

### ✨ `family_interactions` como Fonte Principal

1. **UX Perfeita** ✅
   - Tudo em um só lugar (mensagem + status)
   - Sem necessidade de JOIN
   - Query simples e rápida

2. **Contexto Completo** ✅
   - Mensagem integrada com outras interações (telefone, reunião, etc)
   - Visão unificada do histórico de comunicação

3. **Dados Relacionados** ✅
   - Já tem student_id, interaction_date, created_by
   - Filtros naturais por tipo de interação

### 🚀 `whatsapp_message_history` como Índice

1. **Prevenção de Duplicatas** ✅
   - Constraint único por (estudante + telefone + ano + mês + faltas)
   - Automação não envia spam

2. **Queries de Automação** ✅
   - Busca rápida por mês/ano
   - Estatísticas por quantidade de faltas
   - Filtragem específica para alertas

3. **Performance** ✅
   - Índices otimizados para automação
   - Tabela menor (apenas essencial)

---

## 📝 Queries Úteis

### Ver Mensagens WhatsApp com Status

```sql
SELECT
  id,
  interaction_date,
  whatsapp_message,
  whatsapp_status,
  whatsapp_sent_at,
  whatsapp_delivered_at,
  whatsapp_read_at,
  jsonb_pretty(whatsapp_status_history) as historico
FROM family_interactions
WHERE interaction_type = 'Contato digital'
  AND whatsapp_message_id IS NOT NULL
ORDER BY interaction_date DESC
LIMIT 10;
```

### Taxa de Leitura de Mensagens

```sql
SELECT
  COUNT(*) as total_enviadas,
  COUNT(*) FILTER (WHERE whatsapp_status = 'DELIVERED') as entregues,
  COUNT(*) FILTER (WHERE whatsapp_status = 'READ') as lidas,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE whatsapp_status = 'READ') / NULLIF(COUNT(*), 0),
    2
  ) as taxa_leitura_pct
FROM family_interactions
WHERE interaction_type = 'Contato digital'
  AND whatsapp_message_id IS NOT NULL
  AND interaction_date >= CURRENT_DATE - INTERVAL '30 days';
```

### Mensagens Não Lidas (Ação Necessária)

```sql
SELECT
  fi.id,
  s.nome as estudante_nome,
  fi.interaction_date,
  fi.whatsapp_message,
  fi.whatsapp_status,
  fi.whatsapp_sent_at,
  EXTRACT(EPOCH FROM (NOW() - fi.whatsapp_sent_at))/3600 as horas_desde_envio
FROM family_interactions fi
JOIN students s ON s.id = fi.student_id
WHERE fi.interaction_type = 'Contato digital'
  AND fi.whatsapp_status IN ('SENT', 'DELIVERED')
  AND fi.whatsapp_sent_at < NOW() - INTERVAL '24 hours'
ORDER BY fi.whatsapp_sent_at ASC;
```

---

## 🚀 Como Configurar

### Passo 1: Migrar `family_interactions`

```bash
# Execute no SQL Editor do Supabase
docs/WEBHOOK-FAMILY-INTERACTIONS-MIGRATION.sql
```

### Passo 2: Criar `whatsapp_message_history` (se não existir)

```bash
# Execute no SQL Editor do Supabase
docs/WEBHOOK-WHATSAPP-CREATE-TABLE.sql
```

### Passo 3: Configurar Webhook Evolution API

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

### Passo 4: Testar

1. Envie mensagem via interface
2. Aguarde 5-10 segundos
3. Verifique em `family_interactions`:

```sql
SELECT
  whatsapp_status,
  whatsapp_delivered_at,
  whatsapp_read_at
FROM family_interactions
WHERE interaction_type = 'Contato digital'
ORDER BY created_at DESC
LIMIT 1;
```

---

## 📚 Arquivos da Implementação

### SQL
- [`WEBHOOK-FAMILY-INTERACTIONS-MIGRATION.sql`](WEBHOOK-FAMILY-INTERACTIONS-MIGRATION.sql) - Adicionar campos em family_interactions
- [`WEBHOOK-WHATSAPP-CREATE-TABLE.sql`](WEBHOOK-WHATSAPP-CREATE-TABLE.sql) - Criar whatsapp_message_history

### TypeScript
- [`src/types/index.ts`](../src/types/index.ts) - FamilyInteraction atualizado
- [`src/services/whatsapp/interactionStatusService.ts`](../src/services/whatsapp/interactionStatusService.ts) - Atualizar family_interactions
- [`src/services/whatsapp/messageStatusService.ts`](../src/services/whatsapp/messageStatusService.ts) - Atualizar whatsapp_message_history
- [`src/app/api/evolution/webhooks/message-status/route.ts`](../src/app/api/evolution/webhooks/message-status/route.ts) - Webhook (atualiza ambas)

---

## 🎯 Resultado Final

### Antes ❌
- Mensagem em `family_interactions`
- Status em... nenhum lugar? 🤷
- Webhook não implementado

### Depois ✅
- **Mensagem + Status** em `family_interactions` (visualização perfeita)
- **Índice de busca** em `whatsapp_message_history` (automação eficiente)
- **Webhook** atualiza ambas as tabelas automaticamente
- **UX impecável**: Tudo em um só lugar
- **Performance otimizada**: Queries rápidas

---

**Status**: ✅ Arquitetura dual-table implementada e otimizada!
**Vantagem**: Melhor dos dois mundos (UX + Performance)

