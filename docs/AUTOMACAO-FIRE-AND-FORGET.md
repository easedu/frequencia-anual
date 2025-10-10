# 🚀 Automação Fire-and-Forget com Sistema de Checkpoint

## 📋 Visão Geral

A automação de alertas de faltas foi implementada com arquitetura **Fire-and-Forget**, garantindo:

✅ **Resposta Imediata**: GitHub Actions retorna em < 2s (202 Accepted)
✅ **Processamento Assíncrono**: Execução em background
✅ **Checkpoints Granulares**: Estado salvo a cada estudante processado
✅ **Retomada Automática**: Continua de onde parou após falhas
✅ **Resiliência**: 1 erro não trava todo o processo
✅ **Idempotência**: Previne duplicatas com histórico no Firestore

---

## 🏗️ Arquitetura

```
┌─────────────────┐
│  GitHub Actions │  → Dispara às 9h AM (BRT)
└────────┬────────┘
         │ GET /api/automation/process-absences
         ▼
┌──────────────────────────────┐
│  API: /process-absences      │
│  1. Valida autenticação      │
│  2. Cria executionId         │
│  3. Salva estado no Firestore│
│  4. Retorna 202 Accepted     │ ← Resposta imediata!
└────────┬─────────────────────┘
         │ Background (não espera)
         ▼
┌─────────────────────────────────┐
│  automationOrchestrator.ts      │
│  ┌────────────────────────────┐ │
│  │ Para cada estudante:       │ │
│  │ 1. Processa mensagens      │ │
│  │ 2. Cria tarefas            │ │
│  │ 3. CHECKPOINT no Firestore │ │ ← Estado salvo!
│  │ 4. Continua próximo        │ │
│  └────────────────────────────┘ │
│                                 │
│  Se falhar:                     │
│  - Checkpoint salvo             │
│  - Notifica admin via WhatsApp  │
└─────────────────────────────────┘
         │ Ao finalizar
         ▼
┌─────────────────────────────┐
│  Relatório via WhatsApp     │
│  - Sumário de execução      │
│  - Estatísticas             │
│  - Erros (se houver)        │
└─────────────────────────────┘
```

---

## 📂 Nova Coleção Firestore

### `automationExecutions/{executionId}`

```typescript
interface AutomationExecution {
  executionId: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'RESUMING';
  startedAt: number; // Timestamp
  finishedAt?: number;
  lastCheckpointAt?: number;

  // Parâmetros
  dryRun: boolean;
  absenceMultiple: number;
  notificationPhone: string;
  referenceMonth: number;
  referenceYear: number;

  // Progresso (checkpoint)
  totalStudents: number;
  processedStudents: number;
  currentStudentIndex: number;
  processedStudentIds: string[]; // ← IDs processados

  // Resultados
  messagesSucceeded: number;
  messagesFailed: number;
  tasksCreated: number;
  errors: Array<{
    estudanteId: string;
    estudanteNome: string;
    error: string;
  }>;

  // Sumário final
  summary?: AutomationExecutionSummary;
  error?: string;
}
```

### 📌 Índice Composto Necessário

**Coleção**: `automationExecutions`
**Campos**:
- `status` (ASC)
- `lastCheckpointAt` (ASC)

**Comando Firebase CLI**:
```bash
firebase firestore:indexes
```

Adicionar no `firestore.indexes.json`:
```json
{
  "indexes": [
    {
      "collectionGroup": "automationExecutions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "lastCheckpointAt", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## 🔌 APIs Disponíveis

### 1. `/api/automation/process-absences` (GET)

**Função**: Iniciar nova execução
**Resposta**: 202 Accepted (imediato)

**Query Params**:
- `dryRun=true|false` (default: false)
- `multiple=3` (default: 3)
- `notificationPhone=5511988384664`

**Exemplo**:
```bash
curl -X GET 'http://localhost:3002/api/automation/process-absences?dryRun=true&multiple=8&notificationPhone=5511988384664' \
  -H 'Authorization: Basic aGFiaWItYXBpOnRuTFZFVHdjd0w4Z3k0WkpUdFVETEFBZEw0QlhtOA=='
```

**Resposta**:
```json
{
  "success": true,
  "executionId": "exec-1760055987051",
  "status": "STARTED",
  "message": "Processamento iniciado em background. Você receberá relatório via WhatsApp.",
  "dryRun": true,
  "absenceMultiple": 8,
  "notificationPhone": "5511988384664"
}
```

---

### 2. `/api/automation/status` (GET)

**Função**: Consultar status de execução

**Query Params**:
- `executionId` (opcional): ID específico
- `limit=10` (opcional): Listar últimas N execuções

**Exemplo 1: Execução Específica**
```bash
curl -X GET 'http://localhost:3002/api/automation/status?executionId=exec-1760055987051' \
  -H 'Authorization: Basic ...'
```

**Resposta**:
```json
{
  "success": true,
  "execution": {
    "executionId": "exec-1760055987051",
    "status": "RUNNING",
    "startedAt": "2025-10-10T00:26:27.052Z",
    "finishedAt": null,
    "elapsedMinutes": 5,
    "progress": {
      "totalStudents": 150,
      "processedStudents": 73,
      "remainingStudents": 77,
      "percentage": 49
    },
    "results": {
      "messagesSucceeded": 142,
      "messagesFailed": 3,
      "tasksCreated": 145,
      "errors": []
    }
  }
}
```

**Exemplo 2: Listar Recentes**
```bash
curl -X GET 'http://localhost:3002/api/automation/status?limit=5' \
  -H 'Authorization: Basic ...'
```

---

### 3. `/api/automation/resume` (POST)

**Função**: Retomar execução interrompida
**Body**: `{ "executionId": "exec-..." }`

**Exemplo**:
```bash
curl -X POST 'http://localhost:3002/api/automation/resume' \
  -H 'Authorization: Basic ...' \
  -H 'Content-Type: application/json' \
  -d '{"executionId": "exec-1760055987051"}'
```

**Resposta**:
```json
{
  "success": true,
  "executionId": "exec-1760055987051",
  "status": "RESUMING",
  "message": "Processamento retomado. Você receberá relatório via WhatsApp.",
  "progress": {
    "processedStudents": 73,
    "totalStudents": 150,
    "remainingStudents": 77
  }
}
```

---

### 4. `/api/automation/watchdog` (POST)

**Função**: Detectar e retomar processos travados

**Query Params**:
- `timeoutMinutes=60` (default: 60): Tempo sem checkpoint para considerar travado
- `autoResume=true|false` (default: false): Se true, retoma automaticamente

**Exemplo 1: Apenas Listar**
```bash
curl -X POST 'http://localhost:3002/api/automation/watchdog?timeoutMinutes=30' \
  -H 'Authorization: Basic ...'
```

**Resposta**:
```json
{
  "success": true,
  "stuckCount": 2,
  "autoResume": false,
  "executions": [
    {
      "executionId": "exec-1760051234567",
      "status": "RUNNING",
      "minutesSinceCheckpoint": 45,
      "processedStudents": 50,
      "totalStudents": 150
    }
  ],
  "message": "2 execução(ões) travada(s). Use autoResume=true para retomar."
}
```

**Exemplo 2: Auto-Retomar**
```bash
curl -X POST 'http://localhost:3002/api/automation/watchdog?timeoutMinutes=30&autoResume=true' \
  -H 'Authorization: Basic ...'
```

**Resposta**:
```json
{
  "success": true,
  "stuckCount": 2,
  "resumedCount": 2,
  "failedCount": 0,
  "resumed": ["exec-1760051234567", "exec-1760051234890"]
}
```

---

## 🔄 Fluxo de Checkpoint

### Como Funciona

1. **Início**: Execução criada com `status: 'QUEUED'`
2. **Processamento**: Para cada estudante:
   - Envia mensagens WhatsApp
   - Cria tarefas
   - **Salva checkpoint no Firestore** com:
     - `processedStudentIds.push(estudanteId)`
     - `processedStudents++`
     - `lastCheckpointAt = now`
3. **Retomada**: Se interrompido:
   - Busca `processedStudentIds`
   - Filtra estudantes: `students.filter(s => !processedIds.includes(s.id))`
   - Continua apenas com os restantes

### Garantias

✅ **Idempotência**: Estudante já processado = pulado
✅ **Atomicidade**: Checkpoint salvo após cada estudante (não perde progresso)
✅ **Isolamento**: Erro em 1 estudante não afeta os outros

---

## 🛡️ Cenários de Resiliência

### Cenário 1: Servidor Vercel Reinicia

**Problema**: Servidor reinicia no meio do processamento
**Solução**:
1. Último checkpoint salvo no Firestore (ex: 73/150 estudantes)
2. Retomar manualmente: `POST /api/automation/resume`
3. Processo continua dos 77 restantes

---

### Cenário 2: Erro em 1 Estudante

**Problema**: Falha ao processar estudante específico
**Solução**:
1. Erro capturado e salvo em `execution.errors[]`
2. Próximo estudante processado normalmente
3. Relatório final lista todos os erros

---

### Cenário 3: Firestore Indisponível

**Problema**: Firestore temporariamente offline
**Solução**:
1. Retry automático (3x) com backoff exponencial
2. Se falhar, processo para mas checkpoint anterior está salvo
3. Retomar quando Firestore voltar

---

### Cenário 4: GitHub Actions Timeout

**Problema**: GitHub Actions tem timeout (6h)
**Solução**:
1. GitHub Actions retorna 202 em < 2s (não espera processamento)
2. Processo continua em background no Vercel
3. Relatório enviado via WhatsApp (não depende de Actions)

---

### Cenário 5: Deploy Durante Execução

**Problema**: Deploy Vercel enquanto processo roda
**Solução**:
1. Processo atual interrompido
2. Último checkpoint salvo
3. Após deploy, retomar: `POST /api/automation/resume`

---

## 🧪 Como Testar

### Teste 1: Execução Normal

```bash
# 1. Iniciar
curl -X GET 'http://localhost:3002/api/automation/process-absences?dryRun=true&multiple=8' \
  -H 'Authorization: Basic ...'

# Resposta imediata (202)
# {
#   "executionId": "exec-...",
#   "status": "STARTED"
# }

# 2. Aguardar 30s

# 3. Consultar status
curl -X GET 'http://localhost:3002/api/automation/status?executionId=exec-...' \
  -H 'Authorization: Basic ...'

# Ver progresso:
# {
#   "progress": {
#     "processedStudents": 2,
#     "totalStudents": 2,
#     "percentage": 100
#   }
# }

# 4. Verificar relatório no WhatsApp (5511988384664)
```

---

### Teste 2: Interrupção e Retomada

```bash
# 1. Iniciar com lista grande (multiple=3 → muitos estudantes)
curl -X GET 'http://localhost:3002/api/automation/process-absences?dryRun=true&multiple=3' \
  -H 'Authorization: Basic ...'

# Resposta: { "executionId": "exec-123..." }

# 2. Aguardar 10s (alguns estudantes processados)

# 3. MATAR SERVIDOR (simular crash)
# Ctrl+C ou killall node

# 4. Reiniciar servidor
npm run dev

# 5. Consultar status da execução interrompida
curl -X GET 'http://localhost:3002/api/automation/status?executionId=exec-123...' \
  -H 'Authorization: Basic ...'

# Ver status: "RUNNING" ou "FAILED"
# Ver processedStudents: ex. 30/150

# 6. Retomar
curl -X POST 'http://localhost:3002/api/automation/resume' \
  -H 'Authorization: Basic ...' \
  -H 'Content-Type: application/json' \
  -d '{"executionId": "exec-123..."}'

# 7. Verificar que continua dos 120 restantes (150 - 30)
```

---

### Teste 3: Watchdog (Detecção de Travamento)

```bash
# 1. Simular execução travada (criar documento no Firestore com checkpoint antigo)

# 2. Rodar watchdog (apenas listar)
curl -X POST 'http://localhost:3002/api/automation/watchdog?timeoutMinutes=30' \
  -H 'Authorization: Basic ...'

# Resposta:
# {
#   "stuckCount": 1,
#   "executions": [...]
# }

# 3. Rodar watchdog com auto-resume
curl -X POST 'http://localhost:3002/api/automation/watchdog?timeoutMinutes=30&autoResume=true' \
  -H 'Authorization: Basic ...'

# Resposta:
# {
#   "resumedCount": 1,
#   "resumed": ["exec-123..."]
# }
```

---

## 📊 Monitoramento

### Console Firestore

1. Acessar: https://console.firebase.google.com
2. Navegar: Firestore → `automationExecutions`
3. Ver em tempo real:
   - `processedStudents` aumentando
   - `lastCheckpointAt` atualizando
   - `status` mudando

### Logs do Servidor

```bash
# Ver logs em tempo real
npm run dev

# Buscar por:
[AUTOMATION] 🚀 Execução iniciada
[AUTOMATION] 🔄 Processando: Nome Estudante
[AUTOMATION] ✅ Nome Estudante processado e checkpoint salvo
[AUTOMATION] ✅ Processamento concluído!
```

### Relatório WhatsApp

Mensagem automática enviada ao final:
```
📊 *Relatório de Automação de Alertas*

🆔 Execução: exec-1760055987051
⏱️ Duração: 5 minutos
📅 Referência: 10/2025
🔢 Múltiplo de faltas: 8

👥 *Estudantes*
• Encontrados: 2
• Com contatos: 1
• Sem contatos: 1

📱 *Mensagens WhatsApp*
• Tentadas: 3
• Enviadas: 3 ✅
• Falhas: 0 ❌
• Taxa de sucesso: 100%

📋 *Tarefas*
• Criadas: 4

✅ Sem erros
```

---

## 🚨 Troubleshooting

### Problema: Execução não inicia

**Sintomas**: Status fica em `QUEUED`
**Causa**: Erro no processamento background
**Solução**:
1. Ver logs do servidor
2. Verificar variáveis de ambiente
3. Testar API de estudantes manualmente

---

### Problema: Checkpoint não salva

**Sintomas**: `processedStudents` não atualiza
**Causa**: Permissões Firestore ou erro no `updateDoc`
**Solução**:
1. Verificar regras Firestore
2. Ver logs de erro
3. Conferir índices criados

---

### Problema: Relatório não chega

**Sintomas**: Processamento completo mas sem WhatsApp
**Causa**: Erro no envio ou telefone inválido
**Solução**:
1. Verificar `notificationPhone` (11 dígitos, começa com 11)
2. Ver logs: `[AUTOMATION] ✅ Relatório enviado`
3. Testar `WhatsAppRetryService` isoladamente

---

## 🔐 Segurança

### Autenticação

✅ Basic Auth em todas as APIs
✅ Mesmas credenciais da API de estudantes
✅ Variáveis de ambiente: `API_USER` e `API_PASSWORD`

### Firestore

✅ Coleção `automationExecutions` protegida por regras
✅ Apenas usuários autenticados podem ler/escrever

---

## 📅 Cron Recomendado

### GitHub Actions - Execução Principal

```yaml
# .github/workflows/daily-absence-automation.yml
on:
  schedule:
    - cron: '0 12 * * 1-5' # 9 AM BRT, seg-sex
```

### GitHub Actions - Watchdog (Opcional)

Criar novo workflow para watchdog:

```yaml
# .github/workflows/automation-watchdog.yml
name: Automation Watchdog

on:
  schedule:
    - cron: '30 */2 * * *' # A cada 2 horas (30min após)

jobs:
  watchdog:
    runs-on: ubuntu-latest
    steps:
      - name: Check Stuck Executions
        run: |
          curl -X POST '${{ secrets.NEXT_PUBLIC_API_URL }}/api/automation/watchdog?timeoutMinutes=60&autoResume=true' \
            -H 'Authorization: Basic ${{ secrets.API_BASIC_AUTH }}'
```

---

## ✅ Checklist de Deploy

- [ ] Índice Firestore criado (`automationExecutions`)
- [ ] Regras Firestore configuradas
- [ ] Variáveis de ambiente em produção (Vercel)
- [ ] GitHub Secrets configurados
- [ ] Workflow cron ativo
- [ ] Teste com `dryRun=true` executado
- [ ] Telefone de notificação validado
- [ ] Watchdog configurado (opcional)

---

## 📚 Referências

- **Plano Original**: `docs/AUTOMACAO-FALTAS-PLANO-DETALHADO.md`
- **Tipos TypeScript**: `src/types/index.ts` → `AutomationExecution`
- **Orquestrador**: `src/services/automationOrchestrator.ts`
- **APIs**: `src/app/api/automation/*/route.ts`
