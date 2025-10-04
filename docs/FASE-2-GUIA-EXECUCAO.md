# 📘 FASE 2: GUIA DE EXECUÇÃO - Migração V3

## ⚠️ LEIA COMPLETAMENTE ANTES DE EXECUTAR

Este documento contém o guia passo-a-passo para executar a **Fase 2: Migração Histórica V2 → V3**.

---

## 📋 PRÉ-REQUISITOS

Antes de iniciar a Fase 2, certifique-se que:

- [x] **Fase 0 concluída**: Backup criado e análise de qualidade OK
- [x] **Fase 1 concluída**: Índices criados e código otimizado
- [x] **Fase 1 testada**: Funcionando em produção por 24-48h sem problemas
- [x] **Backup seguro**: Arquivo `backups/absences-backup-*.json` existe e íntegro
- [x] **Checksum salvo**: Arquivo `.md5` existe

---

## 🎯 OBJETIVO DA FASE 2

Migrar dados de:
- **V2**: `2025/faltas/controle` (coleção global)

Para:
- **V3 Subcoleções**: `students/{id}/absences/`
- **V3 Summary**: `absences_summary/{month}/{studentId}`

**IMPORTANTE**: V2 permanece intacto! Não há deleção de dados.

---

## 📂 SCRIPTS CRIADOS

| Script | Propósito | Tempo Estimado |
|--------|-----------|----------------|
| `02-create-v3-structure.mjs` | Criar estrutura V3 e testar permissões | 1 minuto |
| `03-migrate-historical-data.mjs` | Migrar TODOS os dados V2 → V3 | 10-20 minutos |
| `04-validate-migration.mjs` | Validar integridade 100% | 5-10 minutos |
| `utils/compare-v2-v3.mjs` | Comparar contagens V2 vs V3 | 1 minuto |
| `utils/count-records.mjs` | Contagem rápida | 30 segundos |

---

## 🚀 PASSO A PASSO

### **ETAPA 1: Testar Estrutura V3**

**Script**: `02-create-v3-structure.mjs`

**O que faz**:
- Cria collection `absences_summary/` (documento de teste)
- Cria subcoleção `students/{test}/absences/` (documento de teste)
- Testa permissões de leitura/escrita
- Deleta documentos de teste
- Valida que tudo está OK

**Execução**:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=xxx \
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx \
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx \
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx \
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx \
NEXT_PUBLIC_FIREBASE_APP_ID=xxx \
node scripts/migration/02-create-v3-structure.mjs
```

**Resultado esperado**:
```
✅ ESTRUTURA V3 PRONTA PARA MIGRAÇÃO!
   • Collection absences_summary/ criada: ✅
   • Escrita em absences_summary/: ✅
   • Leitura de absences_summary/: ✅
   • Deleção de absences_summary/: ✅
   • Escrita em students/{id}/absences/: ✅
   • Leitura de students/{id}/absences/: ✅
   • Deleção de students/{id}/absences/: ✅
```

**Se falhar**:
- Verificar regras de segurança do Firestore
- Verificar credenciais Firebase
- NÃO prosseguir até resolver

---

### **ETAPA 2: Migração Histórica**

**Script**: `03-migrate-historical-data.mjs`

**⚠️ SCRIPT MAIS CRÍTICO - LEIA COM ATENÇÃO**

**O que faz**:
1. Busca TODOS os estudantes ativos (736 estudantes)
2. Para cada estudante:
   - Busca faltas em V2 (`2025/faltas/controle`)
   - Cria documentos em V3 subcoleção (`students/{id}/absences/`)
   - Cria summaries mensais (`absences_summary/{month}/{id}`)
3. Processa em batches de 50 estudantes
4. Salva checkpoint a cada batch
5. Pode retomar se interrompido

**Características de Segurança**:
- ✅ V2 permanece intacto (não deleta nada)
- ✅ Checkpoint automático
- ✅ Pode retomar se falhar
- ✅ Processamento em batches pequenos
- ✅ Log detalhado de cada estudante

**Execução**:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=xxx \
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx \
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx \
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx \
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx \
NEXT_PUBLIC_FIREBASE_APP_ID=xxx \
node scripts/migration/03-migrate-historical-data.mjs
```

**Progresso esperado**:
```
📦 Batch 1/15 (50 estudantes)
────────────────────────────────────────────────────────────────────────────────
   1/736 - João Silva: 25 faltas (3 meses) ✅
   2/736 - Maria Santos: 12 faltas (2 meses) ✅
   3/736 - Pedro Oliveira: 0 faltas (pulando)
   ...
   50/736 - Ana Costa: 18 faltas (2 meses) ✅

📦 Batch 2/15 (50 estudantes)
...
```

**Tempo estimado**:
- 736 estudantes × 0.5s = ~6-10 minutos
- Com pausas entre batches: **10-20 minutos total**

**Se interrompido**:
- Checkpoint salvo em `backups/migration-checkpoint.json`
- Re-executar o script → Pergunta se quer continuar do checkpoint
- Responder "s" para continuar de onde parou

**Resultado esperado**:
```
════════════════════════════════════════════════════════════════════════════════
  MIGRAÇÃO CONCLUÍDA
════════════════════════════════════════════════════════════════════════════════

📊 Estatísticas:

   • Estudantes processados: 736/736
   • Faltas migradas: 17822
   • Summaries criados: 1248
   • Estudantes sem faltas: 18
   • Erros: 0
   • Tempo total: 587.23s

════════════════════════════════════════════════════════════════════════════════
  ✅ MIGRAÇÃO 100% SUCESSO!
════════════════════════════════════════════════════════════════════════════════

✅ Todos os dados migrados sem erros

📋 Próximo passo: Executar script 04-validate-migration.mjs
```

**Se houver erros**:
- Script mantém checkpoint
- Pode re-executar para tentar novamente
- Erros são logados com detalhes
- Investigar estudantes com erro antes de prosseguir

---

### **ETAPA 3: Validação Intensiva**

**Script**: `04-validate-migration.mjs`

**O que faz**:
1. Compara contagem total: V2 = V3 subcoleções = V3 summary
2. Valida amostra de 100 estudantes aleatórios:
   - Contagem de faltas V2 = V3
   - Datas idênticas
   - Flags (justified) idênticos
3. Valida accuracy de 50 summaries aleatórios:
   - Count correto
   - Justified/unjustified corretos
4. Gera relatório detalhado

**Execução**:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=xxx \
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx \
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx \
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx \
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx \
NEXT_PUBLIC_FIREBASE_APP_ID=xxx \
node scripts/migration/04-validate-migration.mjs
```

**Resultado esperado**:
```
════════════════════════════════════════════════════════════════════════════════
  RELATÓRIO DE VALIDAÇÃO
════════════════════════════════════════════════════════════════════════════════

📊 Resultados:

   1. Contagem Total: ✅ PASS
   2. Validação por Estudante: ✅ PASS (100/100)
   3. Accuracy de Summaries: ✅ PASS (50/50)

════════════════════════════════════════════════════════════════════════════════
  ✅ MIGRAÇÃO 100% ÍNTEGRA - VALIDAÇÃO COMPLETA!
════════════════════════════════════════════════════════════════════════════════

✅ Todos os dados migrados corretamente
✅ Contagens batem perfeitamente
✅ Amostra validada com sucesso
✅ Summaries corretos

📋 Próximo passo: Implementar Dual-Write (Fase 3)
```

**Se falhar**:
- Script retorna exit code 1
- Lista erros encontrados
- NÃO prosseguir até resolver
- Pode ser necessário re-executar migração

---

### **ETAPA 4: Comparação Rápida (Opcional)**

**Script**: `utils/compare-v2-v3.mjs`

Validação rápida de contagens a qualquer momento.

**Execução**:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=xxx \
... \
node scripts/migration/utils/compare-v2-v3.mjs
```

---

### **ETAPA 5: Contagem Rápida (Opcional)**

**Script**: `utils/count-records.mjs`

Contagem super rápida sem validações.

**Execução**:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=xxx \
... \
node scripts/migration/utils/count-records.mjs
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

Após executar todos os scripts, validar:

- [ ] Script 02: Estrutura V3 criada com sucesso
- [ ] Script 03: Migração concluída com 0 erros
- [ ] Script 04: Validação 100% PASS
- [ ] V2 intacto (conferir no Firestore Console)
- [ ] V3 subcoleções criadas (conferir no Firestore Console)
- [ ] V3 summaries criados (conferir no Firestore Console)
- [ ] Checkpoint deletado (migração completa)
- [ ] Backup V2 salvo e íntegro

---

## 🔙 ROLLBACK (SE NECESSÁRIO)

Se algo der errado na migração:

### **Opção 1: Apenas deletar V3**

```bash
# No Firestore Console:
# 1. Deletar collection absences_summary/
# 2. Deletar subcoleções students/{id}/absences/
```

**Impacto**: Nenhum! V2 permanece intacto, sistema continua funcionando.

### **Opção 2: Restaurar do backup**

Se por algum motivo V2 foi corrompido (não deveria acontecer):

```bash
# Usar backup em backups/absences-backup-*.json
# Executar script de restauração (a ser criado se necessário)
```

---

## ⏱️ TIMELINE ESTIMADO

| Etapa | Tempo |
|-------|-------|
| Preparação (leitura) | 10 min |
| Etapa 1: Estrutura V3 | 1 min |
| Etapa 2: Migração | 10-20 min |
| Etapa 3: Validação | 5-10 min |
| **TOTAL** | **~30-45 min** |

---

## 🎯 CRITÉRIOS DE SUCESSO

A Fase 2 está completa quando:

1. ✅ Script 03 concluído com 0 erros
2. ✅ Script 04 retorna "100% ÍNTEGRA"
3. ✅ V2 intacto (17.822 registros)
4. ✅ V3 com 17.822 registros (subcoleções)
5. ✅ V3 summary com soma = 17.822
6. ✅ Amostra de 100 estudantes validada
7. ✅ Summaries corretos

---

## 📞 EM CASO DE PROBLEMAS

### Erro: "Missing or insufficient permissions"
- **Causa**: Regras do Firestore bloqueando
- **Solução**: Ajustar regras ou usar credenciais de admin

### Erro: "Timeout"
- **Causa**: Muitos dados processando
- **Solução**: Script tem retry automático, aguardar ou reduzir batch size

### Erro: "Checkpoint corrupted"
- **Causa**: Checkpoint JSON corrompido
- **Solução**: Deletar `backups/migration-checkpoint.json` e reiniciar

### Discrepâncias na validação
- **Causa**: Migração parcial ou dados corrompidos
- **Solução**: Re-executar migração do zero (deletar V3 primeiro)

---

## 🚀 PRÓXIMA FASE

Após Fase 2 concluída com sucesso:

➡️ **Fase 3: Dual-Write** (Escrever em V2 + V3 simultaneamente)

Implementar em `AttendanceService` para que novas faltas sejam salvas em ambas estruturas durante período de transição.

---

**Documento criado em**: 2025-01-04
**Versão**: 1.0
**Status**: Pronto para execução
