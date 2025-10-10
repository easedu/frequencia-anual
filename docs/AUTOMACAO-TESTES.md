# 🧪 Guia de Testes - Automação de Alertas de Faltas

## 📋 Pré-requisitos

Antes de testar:

- [ ] Índice Firestore criado (`whatsappMessageHistory`)
- [ ] Variáveis de ambiente configuradas (`.env.local`)
- [ ] Servidor dev rodando: `npm run dev`
- [ ] Credenciais Basic Auth conhecidas

---

## 1️⃣ Teste: Dry-Run Local

### Objetivo
Validar todo o fluxo sem enviar mensagens reais.

### Setup
1. Garantir estudantes com múltiplos de 3 faltas no mês atual
2. Se não houver, criar manualmente via Firestore

### Execução

```bash
# Terminal 1: Servidor dev
npm run dev

# Terminal 2: Chamar API
curl -X GET \
  "http://localhost:3000/api/automation/process-absences?dryRun=true&multiple=3&notificationPhone=5511988384664" \
  -H "Authorization: Basic $(echo -n 'usuario:senha' | base64)" | jq '.'
```

### Validações

✅ **API Response**:
```json
{
  "success": true,
  "executionId": "exec-1234567890",
  "summary": {
    "dryRun": true,
    "studentsFound": 10,
    "messagesSucceeded": 8,
    "messagesFailed": 0,
    "messagesSkippedAlreadySent": 2,
    "tasksCreated": 10,
    "durationMs": 5000
  }
}
```

✅ **Firestore**:
- Coleção: `userTasks`
  - Tasks criadas com `created_by: "AUTOMAÇÃO"`
  - Tasks com `priority: 2`
  - Status correto (COMPLETED/PENDING)

- Coleção: `whatsappMessageHistory`
  - Documentos criados
  - `isDryRun: true`
  - `status: "SUCCESS"` ou `"NO_CONTACT"`

✅ **WhatsApp**:
- Relatório recebido no 5511988384664
- **NENHUMA** mensagem enviada para responsáveis

---

## 2️⃣ Teste: Idempotência (Dry-Run)

### Objetivo
Garantir que executar 2x não duplica mensagens/tasks.

### Execução

```bash
# Executar 1ª vez
curl ... (mesmo comando acima)

# Executar 2ª vez (IMEDIATAMENTE APÓS)
curl ... (mesmo comando acima)
```

### Validações

✅ **1ª Execução**:
- `messagesSucceeded: 8`
- `tasksCreated: 10`
- `messagesSkippedAlreadySent: 0`

✅ **2ª Execução**:
- `messagesSucceeded: 0`
- `tasksCreated: 0`
- `messagesSkippedAlreadySent: 8`

✅ **Firestore**:
- Nenhum documento duplicado em `whatsappMessageHistory`
- Nenhuma task duplicada em `userTasks`

---

## 3️⃣ Teste: Produção (1 Estudante)

### Objetivo
Validar fluxo real com 1 estudante.

### Setup
1. Escolher 1 estudante com:
   - Exatamente 3 faltas
   - 1 contato verificado
   - **AVISAR O RESPONSÁVEL ANTES!**

2. Limpar histórico do estudante (Firestore):
   ```
   whatsappMessageHistory → Deletar docs do estudanteId
   ```

### Execução

```bash
curl -X GET \
  "http://localhost:3000/api/automation/process-absences?dryRun=false&multiple=3&notificationPhone=5511988384664" \
  -H "Authorization: Basic $(echo -n 'usuario:senha' | base64)" | jq '.'
```

### Validações

✅ **WhatsApp**:
- Mensagem ENVIADA para o responsável
- Formato correto:
  ```
  🏫 EMEF Habib Kyrillos - Comunicado Importante!

  Olá, [Nome]! 👋
  ...
  ```

✅ **Task Fechada** (`userTasks`):
```json
{
  "created_by": "AUTOMAÇÃO",
  "action_taken": "Contato digital",
  "is_resolved": true,
  "whatsapp_phone": "11xxxxx",
  "action_description": "Mensagem enviada via WhatsApp ao número..."
}
```

✅ **Histórico** (`whatsappMessageHistory`):
```json
{
  "status": "SUCCESS",
  "messageId": "...",
  "isDryRun": false,
  "retryCount": 0
}
```

✅ **Relatório**:
- Recebido no 5511988384664
- `messagesSucceeded: 1`

---

## 4️⃣ Teste: Estudante Sem Contato

### Objetivo
Validar criação de task aberta.

### Setup
1. Estudante com 3 faltas
2. **SEM contatos verificados** (ou `podeReceberWhatsapp: false`)

### Execução

```bash
curl -X GET \
  "http://localhost:3000/api/automation/process-absences?dryRun=false&multiple=3" \
  -H "Authorization: Basic $(echo -n 'usuario:senha' | base64)" | jq '.'
```

### Validações

✅ **Task Aberta** (`userTasks`):
```json
{
  "created_by": "AUTOMAÇÃO",
  "recommended_action": "Contato telefônico",
  "is_resolved": false
}
```

✅ **Histórico**:
```json
{
  "status": "NO_CONTACT",
  "contatoTelefone": "NO_CONTACT"
}
```

---

## 5️⃣ Teste: Retry Logic

### Objetivo
Validar 3 tentativas com delay de 5s.

### Setup
1. Temporariamente modificar `whatsappRetryService.ts`:
   ```typescript
   // APENAS PARA TESTE
   if (attempt <= 2) {
     throw new Error('Teste de retry');
   }
   ```

2. Executar API com 1 estudante

### Validações

✅ **Logs**:
```
[WhatsAppRetry] Tentativa 1/3
[WhatsAppRetry] Aguardando 5000ms...
[WhatsAppRetry] Tentativa 2/3
[WhatsAppRetry] Aguardando 5000ms...
[WhatsAppRetry] Tentativa 3/3
[WhatsAppRetry] ✅ Sucesso na tentativa 3
```

✅ **Histórico**:
```json
{
  "retryCount": 2
}
```

### Cleanup
Reverter modificação no `whatsappRetryService.ts`

---

## 6️⃣ Teste: GitHub Actions Manual

### Objetivo
Validar execução via GitHub Actions.

### Execução

1. Acessar: https://github.com/seu-usuario/frequencia-anual/actions
2. Clicar: "Daily Absence Alerts Automation"
3. Clicar: "Run workflow"
4. Configurar:
   - Branch: `main`
   - Dry-run: `true`
   - Multiple: `3`
5. Clicar: "Run workflow"

### Validações

✅ **Workflow**:
- Status: ✅ Success
- Duração: < 5 minutos
- Logs completos

✅ **Summary**:
- Tab "Summary" exibe JSON response
- Dados corretos

✅ **Firestore**:
- Tasks criadas
- Histórico salvo

✅ **WhatsApp**:
- Relatório recebido

---

## 7️⃣ Teste: Fluxo Agendado (Opcional)

### Objetivo
Validar cron automático.

### Setup
1. Ajustar cron temporariamente:
   ```yaml
   # .github/workflows/daily-absence-automation.yml
   schedule:
     - cron: '*/5 * * * *' # A cada 5 minutos
   ```

2. Commit e push

3. Aguardar execução

### Validações

✅ Workflow executou automaticamente
✅ Tasks criadas
✅ Relatório recebido

### Cleanup
Reverter cron para `0 12 * * 1-5`

---

## 🐛 Troubleshooting

### Erro: "The query requires an index"
❌ Índice Firestore não criado
✅ Ver: `docs/FIRESTORE-INDEX-WHATSAPP-HISTORY.md`

### Erro: "Server configuration error"
❌ Env vars não configuradas
✅ Ver: `docs/AUTOMACAO-ENV-VARS.md`

### Mensagem não enviada
❌ Dry-run ativo ou API WhatsApp offline
✅ Verificar `dryRun=false`
✅ Verificar `NEXT_PUBLIC_WHATSAPP_API_URL`

### Task duplicada
❌ Índice Firestore incorreto
✅ Verificar campos do índice (exatos)

### Workflow não executou (cron)
❌ Horário incorreto (UTC vs BRT)
✅ 9h AM BRT = 12h UTC
✅ Verificar secrets configurados

---

## ✅ Checklist Final de Testes

- [ ] Dry-run local funcionou
- [ ] Idempotência validada (2x não duplica)
- [ ] Produção com 1 estudante validado
- [ ] Mensagem WhatsApp recebida
- [ ] Task fechada criada corretamente
- [ ] Estudante sem contato criou task aberta
- [ ] Retry logic validado (3 tentativas)
- [ ] GitHub Actions manual funcionou
- [ ] Relatório recebido sempre
- [ ] Histórico salvo no Firestore
- [ ] Nenhum erro de tipo (npm run type-check)

---

## 📊 Critérios de Sucesso

Após 1 semana em produção:

- [ ] 100% das execuções agendadas ocorreram
- [ ] 0 mensagens duplicadas
- [ ] 0 tasks duplicadas
- [ ] < 5% de falhas no envio (após retry)
- [ ] Relatório diário recebido
- [ ] Tasks visíveis em `/painel-tarefas`

---

**Última atualização**: Fase de implementação
