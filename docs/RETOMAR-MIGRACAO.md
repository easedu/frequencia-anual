# 🔄 Retomar Migração V2 → V3

## 📊 Status Atual

- ✅ **Processados**: 605/736 estudantes (82%)
- ⏳ **Restantes**: 131 estudantes (18%)
- ⚠️ **Status**: Interrompido por quota exceeded
- 📍 **Checkpoint**: Salvo em `backups/migration-checkpoint.json`

---

## ⏰ Quota do Firestore

### Quando a quota reseta?
- **Horário**: 4h00 da manhã (horário de Brasília)
- **Timezone**: Meia-noite PST/PDT → 4h BRT
- **Frequência**: Diariamente

### Limites (Plano Free/Spark)
- **Writes**: 20.000/dia
- **Reads**: 60.000/dia
- **Deletes**: 20.000/dia

---

## 🚀 Opções para Retomar

### Opção 1: Automático às 4h (RECOMENDADO)

Execute o script que aguarda até 4h e roda automaticamente:

\`\`\`bash
bash scripts/migration/run-at-4am.sh
\`\`\`

**Vantagens:**
- ✅ Roda automaticamente no horário certo
- ✅ Sem necessidade de acordar
- ✅ Checkpoint automático
- ⚠️ Requer terminal aberto

---

### Opção 2: Manual amanhã às 4h

Acorde às 4h e execute:

\`\`\`bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCmUo0UtaYnGjCPdCIuNbKJgFKBWPJv5yY \
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=frequencia-anual.firebaseapp.com \
NEXT_PUBLIC_FIREBASE_PROJECT_ID=frequencia-anual \
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=frequencia-anual.firebasestorage.app \
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=267076712674 \
NEXT_PUBLIC_FIREBASE_APP_ID=1:267076712674:web:4d2872f56d8aff504dc6bb \
node scripts/migration/03-migrate-historical-data-optimized.mjs
\`\`\`

Quando perguntar se deseja continuar do checkpoint, digite: **s**

---

### Opção 3: Upgrade para Blaze (Pay-as-you-go)

Se não quiser aguardar, faça upgrade no Firebase Console:

1. Acesse: https://console.firebase.google.com
2. Projeto: `frequencia-anual`
3. Settings → Usage and billing → Modify plan
4. Selecione: **Blaze Plan**

**Custo estimado:**
- Writes restantes: ~3.000-4.000 operações
- Custo: ~$0.01-0.02 USD (centavos)
- Remove limites diários

Após upgrade, execute:
\`\`\`bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCmUo0UtaYnGjCPdCIuNbKJgFKBWPJv5yY \
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=frequencia-anual.firebaseapp.com \
NEXT_PUBLIC_FIREBASE_PROJECT_ID=frequencia-anual \
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=frequencia-anual.firebasestorage.app \
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=267076712674 \
NEXT_PUBLIC_FIREBASE_APP_ID=1:267076712674:web:4d2872f56d8aff504dc6bb \
node scripts/migration/03-migrate-historical-data-optimized.mjs
\`\`\`

---

## 🔧 Melhorias no Script Otimizado

O novo script (`03-migrate-historical-data-optimized.mjs`) possui:

### Rate Limiting
- **Batch size**: 10 estudantes (era 50)
- **Delay**: 3 segundos entre batches
- **Retry**: Até 3 tentativas com backoff exponencial

### Checkpoint Avançado
- Salva após cada batch (a cada 10 estudantes)
- Permite retomar exatamente de onde parou
- Registra erros e estatísticas

### Processamento Sequencial
- Evita sobrecarga de operações paralelas
- Melhor controle de rate limiting
- Mais previsível para quotas

---

## 📈 Tempo Estimado

### Restante (131 estudantes)
- **Batch size**: 10 estudantes
- **Total batches**: 14 batches
- **Tempo/batch**: ~1 minuto
- **Delay**: 3s entre batches
- **TOTAL**: ~15-20 minutos

---

## ✅ Após Migração Concluída

Execute o script de validação:

\`\`\`bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCmUo0UtaYnGjCPdCIuNbKJgFKBWPJv5yY \
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=frequencia-anual.firebaseapp.com \
NEXT_PUBLIC_FIREBASE_PROJECT_ID=frequencia-anual \
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=frequencia-anual.firebasestorage.app \
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=267076712674 \
NEXT_PUBLIC_FIREBASE_APP_ID=1:267076712674:web:4d2872f56d8aff504dc6bb \
node scripts/migration/04-validate-migration.mjs
\`\`\`

**O que valida:**
- ✅ Total de registros V2 = V3
- ✅ Sample de 100 estudantes aleatórios
- ✅ Integridade de summaries mensais
- ✅ Campos obrigatórios presentes

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique o checkpoint: `cat backups/migration-checkpoint.json`
2. Veja logs de erro no console
3. Verifique quota no Firebase Console: 
   - https://console.firebase.google.com/project/frequencia-anual/usage

---

## 🎯 Próximas Fases (Após Validação)

1. **Fase 3**: Dual-Write (escrever em V2 e V3 simultaneamente)
2. **Fase 4**: Migração de código (atualizar para usar V3)
3. **Fase 5**: Cutover (V3 se torna autoritativo)
4. **Fase 6**: Cleanup (remover código V2)

---

**Última atualização**: 2025-10-04 às 16:00 BRT
**Checkpoint**: `backups/migration-checkpoint.json`
