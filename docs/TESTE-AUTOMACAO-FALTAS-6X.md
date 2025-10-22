# 🧪 Guia de Teste: Automação de Alertas - 6 Faltas em Outubro

## 📋 Objetivo
Testar o fluxo completo de automação de alertas para estudantes com **múltiplos de 6 faltas** no **mês de outubro (10)**.

---

## 🎯 Pré-requisitos

### 1. Dados de Teste no Supabase

**Certifique-se de ter ao menos 1 estudante com exatamente 6 faltas em outubro:**

```sql
-- Ver estudantes com 6 faltas em outubro
SELECT
  s.student_id,
  s.name,
  s.class,
  COUNT(a.id) as total_faltas
FROM students s
LEFT JOIN student_absences a ON s.id = a.student_id
WHERE
  s.deleted = false
  AND EXTRACT(MONTH FROM a.absence_date::date) = 10
  AND EXTRACT(YEAR FROM a.absence_date::date) = 2025
GROUP BY s.id, s.student_id, s.name, s.class
HAVING COUNT(a.id) = 6
ORDER BY s.name;
```

**Se não houver dados, crie um estudante de teste:**

```sql
-- 1. Buscar um estudante existente
SELECT id, student_id, name FROM students WHERE deleted = false LIMIT 1;

-- 2. Criar 6 faltas em outubro para esse estudante (use o 'id' interno, não student_id)
-- Substitua 'SEU_STUDENT_INTERNAL_ID' pelo id retornado acima
INSERT INTO student_absences (student_id, absence_date, bimester, justified, created_at)
VALUES
  ('SEU_STUDENT_INTERNAL_ID', '2025-10-01', 4, false, NOW()),
  ('SEU_STUDENT_INTERNAL_ID', '2025-10-02', 4, false, NOW()),
  ('SEU_STUDENT_INTERNAL_ID', '2025-10-08', 4, false, NOW()),
  ('SEU_STUDENT_INTERNAL_ID', '2025-10-09', 4, false, NOW()),
  ('SEU_STUDENT_INTERNAL_ID', '2025-10-15', 4, false, NOW()),
  ('SEU_STUDENT_INTERNAL_ID', '2025-10-16', 4, false, NOW());
```

### 2. Contato WhatsApp Verificado

**Certifique-se de que o estudante tem um contato com WhatsApp verificado:**

```sql
-- Ver contatos do estudante
SELECT
  c.id,
  c.name,
  c.phone,
  c.can_receive_whatsapp,
  c.whatsapp_data
FROM student_contacts c
WHERE c.student_id = 'SEU_STUDENT_INTERNAL_ID';

-- Se não tiver whatsapp_data, atualize:
UPDATE student_contacts
SET
  can_receive_whatsapp = true,
  whatsapp_data = jsonb_build_object(
    'verified', true,
    'exists', true,
    'number', phone,
    'verifiedAt', NOW()
  )
WHERE student_id = 'SEU_STUDENT_INTERNAL_ID'
  AND phone IS NOT NULL;
```

### 3. Variáveis de Ambiente

**Verifique se as variáveis estão configuradas:**

```bash
# .env.local
API_HABIB_KYRILLOS_USERNAME=seu_usuario
API_HABIB_KYRILLOS_PASSWORD=sua_senha
AUTOMATION_NOTIFICATION_PHONE=5511988384664  # Seu telefone para receber relatório
EVOLUTION_API_BASE_URL=https://evolution.eashomeiot.com.br
EVOLUTION_API_KEY=sua_chave
EVOLUTION_INSTANCE_NAME=habib
```

---

## 🚀 Execução do Teste

### Teste 1: Dry-Run (Simulação sem enviar mensagens)

```bash
# Terminal 1: Servidor dev rodando
npm run dev

# Terminal 2: Executar automação em modo dry-run
curl -X GET \
  "http://localhost:3000/api/automation/process-absences?dryRun=true&multiple=6" \
  -H "Authorization: Basic $(echo -n 'SEU_USUARIO:SUA_SENHA' | base64)" \
  | jq '.'
```

**Resposta Esperada (202 Accepted):**

```json
{
  "success": true,
  "executionId": "uuid-da-execucao",
  "status": "STARTED",
  "message": "Processamento iniciado em background. Você receberá relatório via WhatsApp.",
  "dryRun": true,
  "absenceMultiple": 6,
  "notificationPhone": "5511988384664"
}
```

**Logs Esperados no Terminal (próximos 30-60 segundos):**

```
[AUTOMATION] 🚀 Execução iniciada (Fire-and-Forget)
[AUTOMATION] ✅ Execução criada no Supabase
[ORCHESTRATOR] 🔄 Iniciando processamento...
[ORCHESTRATOR] 📊 Total de estudantes encontrados: X
[ORCHESTRATOR] [CHECKPOINT] Salvando progresso...
[ORCHESTRATOR] ✅ Processamento concluído
[ORCHESTRATOR] 📨 Enviando relatório via WhatsApp... (DRY-RUN - não enviará)
```

**Verificar no Supabase:**

```sql
-- Ver execução criada
SELECT * FROM automation_executions
ORDER BY created_at DESC
LIMIT 1;

-- Deve ter:
-- status: 'COMPLETED'
-- dry_run: true
-- total_students: número de estudantes com 6 faltas
-- messages_sent: 0 (porque é dry-run)
```

---

### Teste 2: Envio Real (com mensagens WhatsApp)

**⚠️ ATENÇÃO: Este teste enviará mensagens reais! Use com cuidado.**

```bash
curl -X GET \
  "http://localhost:3000/api/automation/process-absences?dryRun=false&multiple=6" \
  -H "Authorization: Basic $(echo -n 'SEU_USUARIO:SUA_SENHA' | base64)" \
  | jq '.'
```

**O que acontece:**

1. ✅ **API retorna 202 Accepted** imediatamente (< 2s)
2. 🔄 **Processamento roda em background** (30-120s dependendo da quantidade)
3. 📤 **Mensagens são enviadas** para os responsáveis dos estudantes
4. 📋 **Tasks são criadas** (fechadas se enviou, abertas se falhou)
5. 📊 **Relatório é enviado** para o telefone de notificação (seu WhatsApp)

**Mensagem WhatsApp que o responsável receberá:**

```
🔔 *Alerta de Frequência Escolar*

Prezado(a) [Nome do Responsável],

Identificamos que o(a) estudante *[Nome do Estudante]* da turma *[Turma]* apresentou *6 faltas* no mês de *outubro/2025*.

É importante acompanhar a frequência escolar para garantir o melhor aproveitamento acadêmico.

Em caso de dúvidas, entre em contato com a escola.

Atenciosamente,
[Nome da Escola]
```

**Relatório que você receberá no seu WhatsApp:**

```
📊 *RELATÓRIO DE AUTOMAÇÃO - ALERTAS DE FALTAS*

🗓️ Data: 20/10/2025 às 14:30
📈 Múltiplo: 6 faltas
📅 Período: outubro/2025

✅ *RESUMO*
• Total de estudantes: 3
• Mensagens enviadas: 5
• Falhas: 1
• Tempo de execução: 45s

📋 *DETALHES*
✅ João Silva (5A) - 6 faltas
   → Mensagem enviada para: Maria Silva (11987654321)

✅ Ana Costa (5B) - 6 faltas
   → Mensagem enviada para: José Costa (11987654322)
   → Mensagem enviada para: Paula Costa (11987654323)

❌ Pedro Santos (5C) - 6 faltas
   → Sem contato WhatsApp verificado
   → Task ABERTA criada

🔗 Ver detalhes em: /painel-tarefas
```

---

## 🔍 Verificações Pós-Execução

### 1. Verificar Execução no Supabase

```sql
-- Ver última execução
SELECT
  id,
  status,
  dry_run,
  total_students,
  messages_sent,
  messages_failed,
  tasks_created,
  execution_time_seconds,
  created_at,
  completed_at
FROM automation_executions
ORDER BY created_at DESC
LIMIT 1;

-- Ver dados detalhados dos estudantes processados
SELECT
  id,
  students_data
FROM automation_executions
ORDER BY created_at DESC
LIMIT 1;
```

### 2. Verificar Histórico de Mensagens

```sql
-- Ver mensagens registradas
SELECT
  wh.id,
  s.name as estudante_nome,
  wh.contact_name,
  wh.contact_phone,
  wh.absence_count,
  wh.reference_month,
  wh.reference_year,
  wh.status,
  wh.sent_at,
  wh.dry_run
FROM whatsapp_message_history wh
JOIN students s ON s.student_id = wh.student_id
WHERE wh.reference_month = 10
  AND wh.reference_year = 2025
  AND wh.absence_count = 6
ORDER BY wh.sent_at DESC;
```

### 3. Verificar Tasks Criadas

```sql
-- Ver tasks criadas pela automação
SELECT
  t.id,
  s.name as estudante_nome,
  t.action_type,
  t.is_resolved,
  t.whatsapp_phone,
  t.created_at
FROM user_tasks t
JOIN students s ON s.student_id = t.student_id
WHERE t.created_by = 'AUTOMAÇÃO'
  AND DATE(t.created_at) = CURRENT_DATE
ORDER BY t.created_at DESC;
```

### 4. Verificar na Interface

1. Acessar `/painel-tarefas`
2. Filtrar por `created_by = "AUTOMAÇÃO"`
3. Verificar:
   - ✅ Tasks **FECHADAS** = mensagem enviada com sucesso
   - ⚠️ Tasks **ABERTAS** = falha no envio ou sem contato

---

## 🐛 Troubleshooting

### Problema: "No students found"

**Causa**: Nenhum estudante com 6 faltas em outubro

**Solução**: Execute a query de criação de faltas acima

---

### Problema: "Execution created but no report received"

**Causa**: Processamento em background pode levar até 2 minutos

**Solução**: Aguarde mais um pouco e verifique logs no terminal

---

### Problema: "WhatsApp message not sent"

**Causa**: Contato sem whatsapp_data

**Solução**:
```sql
-- Atualizar contato com dados de verificação
UPDATE student_contacts
SET whatsapp_data = jsonb_build_object(
  'verified', true,
  'exists', true,
  'number', phone,
  'verifiedAt', NOW()
)
WHERE student_id = 'SEU_STUDENT_INTERNAL_ID';
```

---

### Problema: "401 Unauthorized"

**Causa**: Credenciais incorretas

**Solução**: Verificar variáveis de ambiente:
```bash
echo $API_HABIB_KYRILLOS_USERNAME
echo $API_HABIB_KYRILLOS_PASSWORD
```

---

## 📊 Queries Úteis de Análise

### Ver todos os estudantes elegíveis (6 faltas em outubro)

```sql
SELECT
  s.student_id,
  s.name,
  s.class,
  COUNT(a.id) as total_faltas,
  ARRAY_AGG(c.phone) FILTER (WHERE c.can_receive_whatsapp = true) as telefones_whatsapp
FROM students s
LEFT JOIN student_absences a ON s.id = a.student_id
LEFT JOIN student_contacts c ON s.id = c.student_id
WHERE
  s.deleted = false
  AND EXTRACT(MONTH FROM a.absence_date::date) = 10
  AND EXTRACT(YEAR FROM a.absence_date::date) = 2025
GROUP BY s.id, s.student_id, s.name, s.class
HAVING COUNT(a.id) = 6
ORDER BY s.class, s.name;
```

### Ver histórico de execuções

```sql
SELECT
  id,
  status,
  dry_run,
  total_students,
  messages_sent,
  messages_failed,
  execution_time_seconds,
  created_at,
  completed_at,
  error_message
FROM automation_executions
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎯 Checklist de Teste Completo

- [ ] **Pré-requisitos**
  - [ ] Estudante com 6 faltas em outubro criado
  - [ ] Contato com WhatsApp verificado
  - [ ] Variáveis de ambiente configuradas

- [ ] **Teste 1: Dry-Run**
  - [ ] API retorna 202 Accepted
  - [ ] Logs aparecem no terminal
  - [ ] Execução criada no Supabase com status COMPLETED
  - [ ] `dry_run = true`
  - [ ] `messages_sent = 0`

- [ ] **Teste 2: Envio Real**
  - [ ] API retorna 202 Accepted
  - [ ] Mensagem chega no WhatsApp do responsável
  - [ ] Relatório chega no seu WhatsApp
  - [ ] Tasks criadas em `/painel-tarefas`
  - [ ] Histórico registrado em `whatsapp_message_history`

- [ ] **Verificações**
  - [ ] Status da execução = COMPLETED
  - [ ] Tasks criadas corretamente (fechadas/abertas)
  - [ ] Sem duplicatas em `whatsapp_message_history`

---

## 📚 Documentação Relacionada

- **Plano Detalhado**: `docs/AUTOMACAO-FALTAS-PLANO-DETALHADO.md`
- **Variáveis de Ambiente**: `docs/AUTOMACAO-ENV-VARS.md`
- **Testes Gerais**: `docs/AUTOMACAO-TESTES.md`
- **README**: `docs/AUTOMACAO-FALTAS-README.md`

---

**Última Atualização**: 2025-10-20
