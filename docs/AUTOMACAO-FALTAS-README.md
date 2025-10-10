# 🤖 Automação de Alertas de Faltas - Guia Rápido

> **🚀 ATUALIZAÇÃO**: Implementado sistema **Fire-and-Forget com Checkpoints**!
> Ver documentação completa: [`docs/AUTOMACAO-FIRE-AND-FORGET.md`](./AUTOMACAO-FIRE-AND-FORGET.md)

## 🎯 O que faz?

Envia automaticamente mensagens WhatsApp para responsáveis de estudantes que acumularam múltiplos de faltas (3, 6, 9...) no mês atual.

**Novidades v2.0**:
- ✅ Resposta imediata (< 2s) - não trava GitHub Actions
- ✅ Checkpoint a cada estudante processado
- ✅ Retomada automática após falhas
- ✅ Monitoramento em tempo real via Firestore
- ✅ Watchdog para detectar processos travados

---

## ⏰ Quando executa?

- **Automático**: Todos os dias úteis (Segunda a Sexta) às **9h AM** (horário de São Paulo)
- **Manual**: Via GitHub Actions ou API direta
- **Retomada**: API `/resume` para execuções interrompidas

---

## 🔄 Fluxo Resumido (Fire-and-Forget)

```
GitHub Actions (9h AM)
   ↓
1. API retorna 202 Accepted (< 2s) ← Imediato!
   ↓
2. Background: Busca estudantes com múltiplos de 3 faltas
   ↓
3. Para cada estudante:
   ├─ Processa (mensagens + tarefas)
   ├─ CHECKPOINT salvo no Firestore ← Estado seguro!
   └─ Continua próximo
   ↓
4. Relatório final via WhatsApp

Se interromper: Retoma de onde parou! 🔄
```

---

## 🚀 Como Usar

### Teste Local (Dry-Run)

```bash
# Terminal 1: Iniciar servidor
npm run dev

# Terminal 2: Chamar API (modo teste - NÃO envia mensagens reais)
curl -X GET \
  "http://localhost:3000/api/automation/process-absences?dryRun=true&multiple=3&notificationPhone=5511988384664" \
  -H "Authorization: Basic $(echo -n 'usuario:senha' | base64)" | jq '.'
```

**Resultado esperado**:
```json
{
  "success": true,
  "executionId": "exec-1234567890",
  "summary": {
    "dryRun": true,
    "studentsFound": 10,
    "messagesSucceeded": 8,
    "tasksCreated": 10
  }
}
```

---

### Produção (Envio Real)

```bash
curl -X GET \
  "http://localhost:3000/api/automation/process-absences?dryRun=false&multiple=3" \
  -H "Authorization: Basic $(echo -n 'usuario:senha' | base64)" | jq '.'
```

⚠️ **ATENÇÃO**: `dryRun=false` envia mensagens REAIS para responsáveis!

---

### GitHub Actions (Manual)

1. Acessar: https://github.com/seu-usuario/frequencia-anual/actions
2. Clicar: **"Daily Absence Alerts Automation"**
3. Clicar: **"Run workflow"**
4. Configurar:
   - Branch: `main`
   - Dry-run: `true` (teste) ou `false` (produção)
   - Multiple: `3` (ou 6, 9, 12...)
5. Clicar: **"Run workflow"**

---

## 📋 Query Parameters

| Parâmetro | Tipo | Default | Descrição |
|-----------|------|---------|-----------|
| `dryRun` | boolean | `false` | Modo teste (não envia mensagens) |
| `multiple` | number | `3` | Múltiplo de faltas (3, 6, 9...) |
| `notificationPhone` | string | `5511988384664` | Telefone admin para relatórios |

---

## 📊 Monitoramento

### Ver Tasks Criadas
- Acessar: https://seu-app.vercel.app/painel-tarefas
- Filtrar por: `created_by: "AUTOMAÇÃO"`

### Ver Histórico de Envios
- Firebase Console → Firestore → Coleção `whatsappMessageHistory`

### Ver Logs de Execução
- **GitHub Actions**: https://github.com/seu-usuario/frequencia-anual/actions
- **Vercel**: https://vercel.com/dashboard/logs

---

## ⚙️ Configuração Inicial

### 1. Variáveis de Ambiente (`.env.local`)

```bash
NEXT_PUBLIC_WHATSAPP_API_URL=https://seu-servidor.com
NEXT_PUBLIC_API_URL=http://localhost:3000
AUTOMATION_NOTIFICATION_PHONE=5511988384664
API_HABIB_KYRILLOS_USERNAME=admin
API_HABIB_KYRILLOS_PASSWORD=senha-segura
```

### 2. GitHub Secrets

Configurar em: **Settings → Secrets and variables → Actions**

- `NEXT_PUBLIC_API_URL`
- `API_HABIB_KYRILLOS_USERNAME`
- `API_HABIB_KYRILLOS_PASSWORD`
- `AUTOMATION_NOTIFICATION_PHONE`

### 3. Índice Firestore (OBRIGATÓRIO)

**Coleção**: `whatsappMessageHistory`

**Campos** (em ordem):
1. estudanteId (Ascending)
2. contatoTelefone (Ascending)
3. anoReferencia (Ascending)
4. mesReferencia (Ascending)
5. quantidadeFaltas (Ascending)

**Como criar**: Firebase Console → Firestore → Indexes → Create Index

📖 **Ver detalhes**: `docs/FIRESTORE-INDEX-WHATSAPP-HISTORY.md`

---

## ⚠️ Regras Importantes

### Unicidade (Evita Duplicatas)
Mensagem enviada **apenas 1x** por combinação:
- **Ano** + **Mês** + **Faltas** + **Estudante** + **Contato**

**Exemplo**:
- Estudante com **3 faltas**, **2 contatos** → ✅ 2 mensagens enviadas
- Mesmo estudante, mesmo mês, **3 faltas** → ❌ NÃO envia (duplicata)
- Mesmo estudante, mesmo mês, **6 faltas** → ✅ ENVIA (nova quantidade)

### Retry Automático
- **3 tentativas** por mensagem
- **Delay de 5 segundos** entre tentativas
- Após 3 falhas → Cria task ABERTA

### Tasks Criadas

**FECHADA** (Mensagem enviada com sucesso):
```json
{
  "created_by": "AUTOMAÇÃO",
  "action_taken": "Contato digital",
  "is_resolved": true,
  "whatsapp_phone": "11988384664",
  "action_description": "Mensagem enviada via WhatsApp..."
}
```

**ABERTA** (Falha ou sem contato):
```json
{
  "created_by": "AUTOMAÇÃO",
  "recommended_action": "Contato telefônico",
  "is_resolved": false
}
```

### Relatório para Admin
Enviado **sempre** para **5511988384664**:
- Resumo da execução
- Quantidade de mensagens enviadas
- Falhas
- Tempo de execução

---

## 🐛 Troubleshooting

### Mensagem não enviada
❌ **Dry-run ativo** → Use `dryRun=false`
❌ **Contato sem WhatsApp verificado** → Verificar `verifiedWhatsAppContacts`
❌ **API WhatsApp offline** → Verificar `NEXT_PUBLIC_WHATSAPP_API_URL`

### Mensagem duplicada
❌ **Índice Firestore faltando** → Criar índice composto
❌ **Campos do índice incorretos** → Verificar ordem exata

### Task duplicada
❌ **Histórico não salvo** → Verificar logs do Firestore
❌ **Índice incorreto** → Recriar índice

### Workflow não executou (cron)
❌ **Horário incorreto** → 9h AM BRT = 12h UTC
❌ **Dia não útil** → Segunda a Sexta apenas
❌ **Secrets faltando** → Configurar no GitHub

### API retorna 401
❌ **Basic Auth incorreto** → Verificar usuário/senha
❌ **Env vars não configuradas** → Verificar `.env.local` ou Vercel

---

## 📚 Documentação Completa

| Documento | Descrição |
|-----------|-----------|
| **[AUTOMACAO-FALTAS-PLANO-DETALHADO.md](AUTOMACAO-FALTAS-PLANO-DETALHADO.md)** | Plano completo de implementação (200+ linhas) |
| **[AUTOMACAO-ENV-VARS.md](AUTOMACAO-ENV-VARS.md)** | Configuração de variáveis de ambiente |
| **[AUTOMACAO-TESTES.md](AUTOMACAO-TESTES.md)** | Guia de testes passo a passo |
| **[FIRESTORE-INDEX-WHATSAPP-HISTORY.md](FIRESTORE-INDEX-WHATSAPP-HISTORY.md)** | Como criar índice Firestore |
| **[CLAUDE.md](../CLAUDE.md#-automação-de-alertas-de-faltas)** | Seção de automação no guia principal |

---

## 🔗 Links Úteis

- **Firebase Console**: https://console.firebase.google.com
- **Vercel Dashboard**: https://vercel.com/dashboard
- **GitHub Actions**: https://github.com/seu-usuario/frequencia-anual/actions
- **Painel de Tarefas**: https://seu-app.vercel.app/painel-tarefas

---

## 📞 Suporte

**Em caso de dúvidas**:
1. Consultar documentação completa em `docs/`
2. Verificar logs no Vercel/GitHub Actions
3. Testar em dry-run antes de produção

---

**Última atualização**: Implementação concluída
**Status**: ✅ Pronto para uso
