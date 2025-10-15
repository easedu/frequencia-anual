# 🔧 Configuração Final do Webhook WhatsApp

## ✅ Status Atual

- ✅ Badge aparecendo com status "SENT"
- ✅ Código salvando `whatsappMessageId`
- ✅ Endpoint webhook criado
- ❌ **Webhook não configurado na Evolution API** (por isso status não atualiza)

---

## 🎯 Objetivo

Fazer o webhook atualizar automaticamente o status de:
- ⚪ **SENT** (Enviado) → 🔵 **DELIVERED** (Entregue) → 🟢 **READ** (Lido)

---

## 📝 Passo a Passo

### 1️⃣ Obter Informações da Evolution API

Você precisa de 3 informações:

| Informação | Onde Encontrar | Exemplo |
|------------|----------------|---------|
| **URL da Evolution API** | Configuração do servidor | `https://evolution.exemplo.com` |
| **Nome da Instância** | Painel Evolution API | `minha-instancia` |
| **API Key** | Configuração de segurança | `B6D9F8E2A1C3...` |

### 2️⃣ Identificar URL do Webhook

Sua aplicação está hospedada em:
- **Desenvolvimento**: `http://localhost:3000`
- **Produção**: `https://SEU_DOMINIO.vercel.app`

**URL do Webhook**: `https://SEU_DOMINIO.vercel.app/api/evolution/webhooks/message-status`

### 3️⃣ Configurar Webhook via API

Execute este comando **cURL** (substitua os valores):

```bash
curl -X POST "https://SUA_EVOLUTION_API/webhook/set/SUA_INSTANCIA" \
  -H "apikey: SUA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://SEU_DOMINIO.vercel.app/api/evolution/webhooks/message-status",
    "webhook_by_events": true,
    "webhook_base64": false,
    "events": [
      "MESSAGES_UPDATE"
    ]
  }'
```

**Exemplo Real**:
```bash
curl -X POST "https://evolution.minhaescola.com.br/webhook/set/escola-principal" \
  -H "apikey: B6D9F8E2A1C3D4E5F6G7H8I9J0K1L2M3" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://frequencia-anual.vercel.app/api/evolution/webhooks/message-status",
    "webhook_by_events": true,
    "webhook_base64": false,
    "events": [
      "MESSAGES_UPDATE"
    ]
  }'
```

**Resposta Esperada** (sucesso):
```json
{
  "success": true,
  "message": "Webhook configurado com sucesso",
  "data": {
    "url": "https://frequencia-anual.vercel.app/api/evolution/webhooks/message-status",
    "events": ["MESSAGES_UPDATE"]
  }
}
```

### 4️⃣ Verificar se Webhook Está Ativo

```bash
curl -X GET "https://SUA_EVOLUTION_API/webhook/find/SUA_INSTANCIA" \
  -H "apikey: SUA_API_KEY"
```

**Resposta Esperada**:
```json
{
  "url": "https://frequencia-anual.vercel.app/api/evolution/webhooks/message-status",
  "events": ["MESSAGES_UPDATE"],
  "webhook_by_events": true
}
```

### 5️⃣ Testar Endpoint do Webhook

Antes de enviar mensagem real, teste se o endpoint está online:

```bash
curl https://SEU_DOMINIO.vercel.app/api/evolution/webhooks/message-status
```

**Resposta Esperada**:
```json
{
  "status": "online",
  "endpoint": "/api/evolution/webhooks/message-status",
  "description": "Webhook receptor de status de mensagens WhatsApp (Evolution API)",
  "supportedEvents": ["MESSAGES_UPDATE"],
  "timestamp": "2025-10-15T18:45:00.000Z"
}
```

---

## 🧪 Teste Completo

### 1. Enviar Nova Mensagem WhatsApp

1. **Acesse** perfil de um estudante
2. **Cadastrar Interação** → "Contato digital"
3. **Selecione** 1 contato WhatsApp
4. **Digite** mensagem e envie
5. **Badge** deve aparecer: ⚪ **"Enviado"**

### 2. Aguardar Webhook Atualizar

- **Aguarde 5-10 segundos**
- **Recarregue** a página (Ctrl+Shift+R)
- **Badge** deve mudar para: 🔵 **"Entregue"**

### 3. Destinatário Lê a Mensagem

Quando o destinatário abrir e ler a mensagem:
- **Aguarde alguns segundos**
- **Recarregue** a página
- **Badge** deve mudar para: 🟢 **"Lido"**

### 4. Verificar no Banco

```sql
SELECT
  id,
  interaction_type,
  whatsapp_message_id,   -- Deve ter valor agora!
  whatsapp_status,       -- Deve mudar: SENT → DELIVERED → READ
  whatsapp_sent_at,
  whatsapp_delivered_at, -- Deve preencher quando entregar
  whatsapp_read_at,      -- Deve preencher quando ler
  created_at
FROM family_interactions
WHERE interaction_type = 'Contato digital'
ORDER BY created_at DESC
LIMIT 1;
```

**Evolução Esperada**:

| Momento | whatsapp_status | whatsapp_delivered_at | whatsapp_read_at |
|---------|----------------|----------------------|------------------|
| Envio | SENT | NULL | NULL |
| Após 5s | DELIVERED | 2025-10-15T18:45:10Z | NULL |
| Destinatário lê | READ | 2025-10-15T18:45:10Z | 2025-10-15T18:46:30Z |

---

## 🔍 Troubleshooting

### ❌ Problema: Badge não atualiza de SENT para DELIVERED

**Possíveis Causas**:

1. **Webhook não configurado**
   - Executou o curl de configuração?
   - Resposta foi sucesso?

2. **URL errada no webhook**
   - Verificar se URL está acessível externamente
   - Testar: `curl https://SEU_DOMINIO.vercel.app/api/evolution/webhooks/message-status`

3. **Evento errado configurado**
   - Deve ser `"MESSAGES_UPDATE"` (não `"MESSAGE_STATUS_UPDATE"`)

4. **Firewall bloqueando**
   - Evolution API consegue acessar Vercel?
   - Verificar logs da Evolution API

### ❌ Problema: Webhook chega mas status não atualiza

**Verificar Logs**:

1. **Vercel Logs**:
   - https://vercel.com/SEU_PROJETO/logs
   - Procurar por `[Webhook]`
   - Ver se há erros

2. **Verificar se `messageId` está sendo salvo**:
```sql
SELECT whatsapp_message_id
FROM family_interactions
WHERE interaction_type = 'Contato digital'
ORDER BY created_at DESC
LIMIT 1;
```

Se estiver **NULL**: Código de envio não está salvando (já corrigimos, mas precisa enviar nova mensagem)

### ❌ Problema: Evolution API retorna erro 401

**Causa**: API Key incorreta

**Solução**: Verificar API Key nas configurações da Evolution API

---

## 📊 Checklist Final

Antes de considerar 100% funcional:

- [ ] Migration SQL executada no Supabase
- [ ] Código atualizado (commit mais recente)
- [ ] Servidor Next.js reiniciado
- [ ] Webhook configurado na Evolution API (curl executado)
- [ ] Endpoint testado (GET retorna status online)
- [ ] Nova mensagem enviada (após código corrigido)
- [ ] Badge inicial aparece (SENT)
- [ ] Aguardou 10 segundos e recarregou
- [ ] Badge atualizado para DELIVERED
- [ ] Destinatário leu mensagem
- [ ] Badge atualizado para READ
- [ ] Timestamp aparece no tooltip ("Lido em DD/MM/YYYY às HH:MM")

---

## 🎉 Resultado Final Esperado

```
Enviar WhatsApp
    ↓
Badge: ⚪ "Enviado" (imediato)
    ↓
Webhook DELIVERED (5-10s)
    ↓
Badge: 🔵 "Entregue" (após recarregar)
    ↓
Usuário lê mensagem
    ↓
Webhook READ (imediato)
    ↓
Badge: 🟢 "Lido" (após recarregar)
    ↓
Tooltip: "Lido em 15/10/2025 às 18:46"
```

---

## 📞 Se Ainda Não Funcionar

Me envie:

1. **Resposta do curl** de configuração do webhook
2. **Resultado do GET** do endpoint (`/api/evolution/webhooks/message-status`)
3. **Query SQL** mostrando a última interação com todos os campos WhatsApp
4. **Screenshot** dos logs da Vercel (se houver)

Com essas informações vou identificar exatamente o que falta! 🔍

---

**Última Atualização**: 2025-10-15
**Versão do Código**: Com correção de `whatsappMessageId`
