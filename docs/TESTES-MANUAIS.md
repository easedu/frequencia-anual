# 🧪 TESTES MANUAIS - MIGRAÇÃO V2 → V3

Guia completo para validação manual da migração de absences/faltas do sistema.

---

## 📋 Pré-requisitos

- Migração histórica 100% completa (ver `backups/migration-checkpoint.json`)
- Dual-write ativo em produção
- Acesso ao Firebase Console
- Acesso ao sistema em produção

---

## 🔍 1. TESTES DE INTERFACE (UI)

### 1.1. Registrar Nova Falta

**Objetivo:** Validar que dual-write funciona corretamente na interface

**Passos:**

1. Acessar o sistema em produção
2. Navegar para tela de registro de faltas
3. Selecionar um estudante qualquer
4. Registrar uma nova falta para HOJE (data atual)
5. Confirmar o registro

**Validação:**

- [ ] Falta aparece imediatamente na lista do estudante
- [ ] Não houve erros no console do navegador
- [ ] Mensagem de sucesso foi exibida

**Validação no Firebase Console:**

1. Abrir Firebase Console → Firestore Database
2. Navegar para `2025/faltas/controle`
3. **V2:** Verificar que existe 1 novo documento com:
   - `estudanteId` = ID do estudante escolhido
   - `data` = data de hoje (formato YYYY-MM-DD)
   - `justified` = false (ou true, conforme selecionado)

4. Navegar para `students/{estudanteId}/absences`
5. **V3 Subcoleção:** Verificar que existe 1 novo documento com:
   - `data` = data de hoje (formato YYYY-MM-DD)
   - `justified` = false (ou true, conforme selecionado)

6. Navegar para `students/{estudanteId}/absence_summary/{mes-atual}`
   - Exemplo: `students/ABC123/absence_summary/2025-01`
7. **V3 Summary:** Verificar que o documento existe e contém:
   - `count` incrementado em +1
   - `dates` contém a data de hoje
   - `unjustified` ou `justified` incrementado em +1

**Critério de Sucesso:**

- ✅ Todos os 3 locais (V2, V3 subcoleção, V3 summary) têm os dados corretos
- ✅ Timestamps estão consistentes (dentro de 1 segundo)

---

### 1.2. Justificar Falta com Atestado

**Objetivo:** Validar que justificativas são escritas corretamente em V2 e V3

**Passos:**

1. Localizar uma falta injustificada existente
2. Clicar em "Justificar" ou "Adicionar Atestado"
3. Preencher dados do atestado
4. Confirmar

**Validação:**

- [ ] Status da falta mudou para "Justificada"
- [ ] Atestado aparece vinculado à falta
- [ ] Não houve erros

**Validação no Firebase Console:**

1. **V2:** `2025/faltas/controle/{docId}`
   - `justified` = true
   - `atestadoId` = ID do atestado criado

2. **V3 Subcoleção:** `students/{id}/absences/{docId}`
   - `justified` = true
   - `atestadoId` = ID do atestado criado

3. **V3 Summary:** `students/{id}/absence_summary/{mes}`
   - `justified` incrementado em +1
   - `unjustified` decrementado em -1

**Critério de Sucesso:**

- ✅ Contadores de justified/unjustified corretos em V3 summary
- ✅ Dados consistentes entre V2 e V3

---

### 1.3. Visualizar Histórico de Faltas

**Objetivo:** Validar que leitura de faltas funciona (V2 ou V3 conforme feature flag)

**Passos:**

1. Selecionar um estudante
2. Visualizar histórico completo de faltas
3. Verificar que todas as datas aparecem
4. Verificar que status (justificada/injustificada) está correto

**Validação:**

- [ ] Todas as faltas aparecem na lista
- [ ] Datas em ordem cronológica
- [ ] Status correto para cada falta
- [ ] Performance aceitável (< 2 segundos)

**Com Feature Flag OFF (V2):**

- Deve ler de `2025/faltas/controle`
- Log no console: `[FEATURE-FLAG] Usando V2 para leitura`

**Com Feature Flag ON (V3):**

- Deve ler de `students/{id}/absences`
- Log no console: `[FEATURE-FLAG] Usando V3 para leitura`
- Performance deve ser ~65% mais rápida

**Critério de Sucesso:**

- ✅ Dados idênticos com flag ON e OFF
- ✅ Nenhuma falta faltando
- ✅ Performance melhor com V3

---

## 📊 2. TESTES DE API

### 2.1. Endpoint: GET /api/students/consecutive-absences

**Objetivo:** Validar performance e corretude de queries complexas

**Teste com cURL:**

```bash
curl -X GET "http://localhost:3000/api/students/consecutive-absences?days=3" \
  -H "Authorization: Bearer {token}"
```

**Validação:**

- [ ] Response status = 200
- [ ] Tempo de resposta < 3 segundos
- [ ] Lista de estudantes com 3+ faltas consecutivas
- [ ] Contagem correta de faltas por estudante

**Com Feature Flag V3:**

```bash
NEXT_PUBLIC_USE_V3_READS=true npm run dev
```

- [ ] Response idêntico ao V2
- [ ] Tempo de resposta ~65% menor
- [ ] Logs indicam uso de V3

---

### 2.2. Endpoint: POST /api/absences/create

**Objetivo:** Validar dual-write via API

**Teste com cURL:**

```bash
curl -X POST "http://localhost:3000/api/absences/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "estudanteId": "TESTE_123",
    "data": "2025-01-20",
    "justified": false
  }'
```

**Validação:**

- [ ] Response status = 201
- [ ] Log `[DUAL-WRITE] Falta registrada V2+V3`
- [ ] Dados salvos em V2, V3 subcoleção e V3 summary

---

## 🔥 3. TESTES NO FIREBASE CONSOLE

### 3.1. Verificar Estrutura V3

**Passos:**

1. Abrir Firebase Console → Firestore Database
2. Navegar para coleção `students`
3. Selecionar um estudante aleatório
4. Verificar subcoleções:

**Subcoleções Esperadas:**

- [ ] `absences` (faltas individuais)
- [ ] `absence_summary` (resumos mensais)
- [ ] `contacts` (contatos do estudante)

**Exemplo de documento em `absences`:**

```json
{
  "data": "2025-01-15",
  "justified": false,
  "atestadoId": null,
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

**Exemplo de documento em `absence_summary/2025-01`:**

```json
{
  "count": 12,
  "justified": 3,
  "unjustified": 9,
  "dates": ["2025-01-03", "2025-01-05", ...],
  "lastUpdated": {Timestamp}
}
```

---

### 3.2. Comparar V2 vs V3 (Amostra)

**Passos:**

1. Escolher 5 estudantes aleatórios
2. Para cada estudante:

**V2:**

- Contar documentos em `2025/faltas/controle` onde `estudanteId` = ID do estudante
- Anotar total de faltas

**V3:**

- Contar documentos em `students/{id}/absences`
- Somar `count` de todos os documentos em `students/{id}/absence_summary`
- Anotar totais

**Validação:**

- [ ] Total V2 = Total V3 Subcoleção
- [ ] Total V2 = Total V3 Summary
- [ ] Datas idênticas em V2 e V3

**Critério de Sucesso:**

- ✅ 100% de consistência (zero discrepâncias)

---

## ⚡ 4. TESTES DE PERFORMANCE

### 4.1. Comparar Tempo de Leitura V2 vs V3

**Configuração:**

1. Abrir Chrome DevTools → Network
2. Filtrar por tipo: Fetch/XHR

**Teste com V2:**

```bash
# .env.local
NEXT_PUBLIC_USE_V3_READS=false
```

1. Acessar página de histórico de faltas
2. Selecionar estudante com muitas faltas (> 30)
3. Anotar tempo de carregamento

**Teste com V3:**

```bash
# .env.local
NEXT_PUBLIC_USE_V3_READS=true
```

1. Recarregar página (Ctrl+Shift+R)
2. Selecionar o MESMO estudante
3. Anotar tempo de carregamento

**Critério de Sucesso:**

- ✅ V3 pelo menos 50% mais rápido que V2
- ✅ Dados idênticos

**Exemplo Esperado:**

- V2: ~680ms
- V3: ~240ms (65% mais rápido)

---

### 4.2. Teste de Carga (Múltiplos Estudantes)

**Objetivo:** Validar que V3 escala melhor com volume

**Teste:**

1. Abrir 10 abas do navegador
2. Em cada aba, carregar histórico de um estudante diferente
3. Medir tempo total de carregamento

**Com V2:**

- Tempo esperado: ~5-8 segundos

**Com V3:**

- Tempo esperado: ~2-3 segundos

---

## 🚨 5. TESTES DE FALLBACK

### 5.1. Simular Falha em V3

**Objetivo:** Validar que sistema cai para V2 em caso de erro V3

**Passos:**

1. Desabilitar temporariamente permissões de escrita em `students` no Firestore Rules:

```javascript
// Firestore Rules (TEMPORÁRIO - NÃO DEIXAR EM PRODUÇÃO)
match /students/{studentId} {
  allow write: if false; // Bloquear V3
}
```

2. Tentar registrar nova falta via UI

**Validação:**

- [ ] Falta é registrada com sucesso (via V2)
- [ ] Log `[DUAL-WRITE] Fallback para V2-only`
- [ ] Não há erro visível para o usuário

3. Restaurar permissões:

```javascript
match /students/{studentId} {
  allow write: if request.auth != null;
}
```

**Critério de Sucesso:**

- ✅ Sistema continua funcionando mesmo com V3 offline
- ✅ Fallback automático para V2

---

## 📝 6. CHECKLIST FINAL

### Antes de Ativar Feature Flag em Produção

- [ ] Migração histórica 100% completa (736/736 estudantes)
- [ ] Dual-write funcionando há pelo menos 24 horas
- [ ] Script `05-monitor-dual-write.mjs` executado sem alertas
- [ ] Script `06-automated-tests.mjs` com 100% de testes passando
- [ ] Testes manuais de UI concluídos
- [ ] Testes de API concluídos
- [ ] Testes de performance validados (V3 > 50% mais rápido)
- [ ] Teste de fallback validado
- [ ] Backup completo do Firestore realizado

### Após Ativar Feature Flag

- [ ] Monitorar logs por 1 hora
- [ ] Verificar que não há erros no Sentry/logs
- [ ] Validar performance melhorou conforme esperado
- [ ] Executar `05-monitor-dual-write.mjs` novamente
- [ ] Confirmar que usuários não reportam problemas

### Rollback (Se Necessário)

Se qualquer problema for detectado:

```bash
# .env.local ou Vercel Environment Variables
NEXT_PUBLIC_USE_V3_READS=false
```

- Tempo de rollback: ~30 segundos (redeploy)
- Sistema volta a usar V2 imediatamente
- Dual-write continua ativo (não há perda de dados)

---

## 📊 7. RELATÓRIOS E LOGS

### Arquivos de Relatório

Após executar testes automatizados, verificar:

- `backups/dual-write-monitoring.json` - Monitoramento V2 vs V3
- `backups/automated-tests-report.json` - Resultados dos testes
- `backups/migration-checkpoint.json` - Status da migração

### Exemplo de Relatório Saudável

```json
{
  "status": "OK",
  "v2Total": 22545,
  "v3SubcollectionTotal": 22545,
  "v3SummaryTotal": 22545,
  "discrepancyV2vsV3Sub": 0.00,
  "discrepancyV2vsV3Summary": 0.00,
  "alerts": []
}
```

---

## 🆘 Troubleshooting

### Problema: Discrepância > 1% entre V2 e V3

**Diagnóstico:**

```bash
node scripts/migration/05-monitor-dual-write.mjs
```

**Possíveis Causas:**

- Migração histórica incompleta
- Dual-write não está ativo
- Erro em alguma escrita recente

**Solução:**

1. Verificar `backups/migration-checkpoint.json`
2. Se incompleto, executar `03-migrate-historical-data.mjs`
3. Validar que `attendanceService.ts` tem dual-write

---

### Problema: Performance V3 não melhorou

**Diagnóstico:**

1. Verificar que feature flag está ON
2. Verificar logs no console: `[FEATURE-FLAG] Usando V3`

**Possíveis Causas:**

- Feature flag não está ativada
- Cache do navegador
- Índices do Firestore não criados

**Solução:**

1. Confirmar `NEXT_PUBLIC_USE_V3_READS=true`
2. Limpar cache (Ctrl+Shift+R)
3. Criar índices compostos no Firestore Console

---

### Problema: Dados diferentes entre V2 e V3

**Diagnóstico:**

```bash
node scripts/migration/06-automated-tests.mjs
```

- Verificar teste "Dados idênticos em amostra"

**Possíveis Causas:**

- Escrita V3 falhou silenciosamente
- Migração teve erro não detectado

**Solução:**

1. Executar rollback imediato (feature flag OFF)
2. Executar script de correção de dados
3. Re-validar com testes automatizados

---

## ✅ Conclusão

Após completar TODOS os testes deste guia:

1. Documentar resultados em ticket/issue
2. Obter aprovação de QA/Product Owner
3. Ativar feature flag em staging primeiro
4. Monitorar por 24h em staging
5. Ativar em produção gradualmente (A/B test se possível)

**Lembre-se:** Migração de dados é IRREVERSÍVEL. Melhor testar 10 vezes do que falhar 1.
