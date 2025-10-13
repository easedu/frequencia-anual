# 🔥 Setup Firebase Emulators com Dados de Produção

> **Objetivo**: Configurar Firebase Emulators localmente com dados REAIS de produção, **SEM consumir quota**

---

## 🎯 Por Que Fazer Isso?

### Problemas do Desenvolvimento em Produção:
- ❌ **Quota Limitada**: 50k reads/dia (fácil estourar em testes)
- ❌ **Lentidão**: 8000ms vs 50ms (local)
- ❌ **Risco**: Modificar dados reais acidentalmente
- ❌ **Custo**: Exceder quota = bloqueio ou cobrança

### Vantagens dos Emulators:
- ✅ **Quota ILIMITADA**: Testes infinitos, zero consumo
- ✅ **Velocidade**: 160x mais rápido (50ms local)
- ✅ **Dados Reais**: Estrutura idêntica à produção
- ✅ **Segurança**: Não afeta produção
- ✅ **UI Visual**: Interface para explorar dados

---

## 📋 Pré-Requisitos

### 1. Firebase CLI (✅ Já instalado)
```bash
firebase --version
# Saída esperada: 14.19.1 ou superior
```

### 2. Node.js
```bash
node --version
# Mínimo: v18.x ou superior
```

### 3. Service Account Key (⚠️ IMPORTANTE)

**O que é**: Credencial de administrador do Firebase (acesso total, ZERO quota)

**Como obter**:

1. Acesse Firebase Console:
   ```
   https://console.firebase.google.com/project/[SEU-PROJECT-ID]/settings/serviceaccounts/adminsdk
   ```

2. Clique em **"Generate New Private Key"**

3. Arquivo JSON será baixado (ex: `projeto-firebase-firebase-adminsdk-xxxxx.json`)

4. **RENOMEIE** para: `firebase-admin-key.json`

5. **MOVA** para a raiz do projeto:
   ```bash
   mv ~/Downloads/projeto-firebase-adminsdk-xxxxx.json ./firebase-admin-key.json
   ```

6. **ADICIONE** ao `.gitignore` (se não estiver):
   ```bash
   echo "firebase-admin-key.json" >> .gitignore
   ```

⚠️ **NUNCA commite este arquivo!** Contém credenciais sensíveis.

---

## 🚀 Passo a Passo

### Etapa 1: Instalar Dependências

```bash
npm install firebase-admin --save-dev
```

**Tempo**: ~1-2 minutos

---

### Etapa 2: Exportar Dados de Produção (ZERO QUOTA!)

```bash
node scripts/export-firestore-to-local.mjs
```

**O que acontece**:
1. ✅ Conecta ao Firestore usando Admin SDK (ZERO quota)
2. ✅ Exporta TODAS as coleções:
   - `estudantes` (V3 - UUID)
   - `estudantesv2` (V2 - LEGACY)
   - `absences` (Faltas)
   - `atestados` (Atestados médicos)
   - `tarefas` (Gerenciador de tarefas)
   - `whatsappMessageHistory` (Histórico WhatsApp)
   - `2025` (Ano letivo)
   - `verifiedWhatsAppContacts` (Contatos verificados)
   - `avaliacoesSaoPaulo` (Prova São Paulo)
3. ✅ Salva em: `firebase-data-export/firestore-backup.json`
4. ✅ Gera relatório com estatísticas

**Saída esperada**:
```
🔥 EXPORTAÇÃO SEGURA DE FIRESTORE (ZERO QUOTA)

✅ Service Account encontrado
✅ Conectado ao projeto: seu-projeto-id

📦 Exportando: estudantes
   ✅ 700 documentos
   ⏱️  2341ms

📦 Exportando: absences
   ✅ 5247 documentos
   ✅ 23 documentos em subcoleções
   ⏱️  8932ms

...

✅ EXPORTAÇÃO CONCLUÍDA!

📊 ESTATÍSTICAS:
   • Coleções exportadas: 9
   • Total de documentos: 6.500
   • Arquivo gerado: 12.4 MB
   • Local: /path/to/firebase-data-export/firestore-backup.json

💡 NOTA IMPORTANTE:
   ✅ ZERO consumo de quota (Admin SDK)
```

**Tempo**: ~1-3 minutos (dependendo do volume de dados)

---

### Etapa 3: Iniciar Firebase Emulators

**Terminal 1** (deixe rodando):
```bash
npm run emulators
```

**Saída esperada**:
```
┌─────────────────────────────────────────────────────────────┐
│ ✔  All emulators ready! It is now safe to connect your app. │
│ i  View Emulator UI at http://localhost:4000                │
└─────────────────────────────────────────────────────────────┘

┌────────────┬────────────────┬─────────────────────────────────┐
│ Emulator   │ Host:Port      │ View in Emulator UI             │
├────────────┼────────────────┼─────────────────────────────────┤
│ Auth       │ localhost:9099 │ http://localhost:4000/auth      │
│ Firestore  │ localhost:8080 │ http://localhost:4000/firestore │
└────────────┴────────────────┴─────────────────────────────────┘
```

**Acesse**: http://localhost:4000 (Interface visual dos Emulators)

**Tempo**: ~10-20 segundos para iniciar

---

### Etapa 4: Importar Dados no Emulator

**Terminal 2** (com Emulators rodando no Terminal 1):
```bash
node scripts/import-json-to-emulators.mjs
```

**O que acontece**:
1. ✅ Verifica se Emulators estão rodando
2. ✅ Carrega backup JSON
3. ✅ Importa coleção por coleção
4. ✅ Cria subcoleções (ex: `absences` dentro de `estudantes`)
5. ✅ Gera relatório

**Saída esperada**:
```
📥 IMPORTAÇÃO DE JSON PARA FIREBASE EMULATORS

✅ Firebase Emulators rodando
✅ Arquivo encontrado
✅ Backup carregado
   • Exportado em: 2025-01-10T14:30:00.000Z
   • Projeto: seu-projeto-id
   • Coleções: 9

📦 Importando: estudantes
   📄 700 documentos
   ✅ 700 documentos importados

📦 Importando: absences
   📄 5247 documentos
   ✅ 5247 documentos importados
   ✅ 23 subdocumentos importados

...

✅ IMPORTAÇÃO CONCLUÍDA!

📊 ESTATÍSTICAS:
   • Total de documentos: 6.523
   • Coleções: 9
```

**Tempo**: ~30 segundos - 2 minutos (dependendo do volume)

---

### Etapa 5: Verificar Dados Importados

1. **Acesse Emulator UI**: http://localhost:4000

2. **Clique em "Firestore"**

3. **Verifique as coleções**:
   - ✅ `estudantes` → 700 documentos
   - ✅ `absences` → 5247 documentos
   - ✅ Outras coleções...

4. **Explore um estudante**:
   - Clique em um documento
   - Veja os dados completos
   - Verifique subcoleções (se houver)

---

### Etapa 6: Iniciar Next.js (Conecta Automaticamente!)

**Terminal 3**:
```bash
npm run dev
```

**O que acontece**:
1. ✅ Next.js detecta Emulators automaticamente (via `firebase.config.ts`)
2. ✅ Conecta em `localhost:8080` (Firestore Emulator)
3. ✅ Todas as queries usam dados locais
4. ✅ ZERO consumo de quota!

**Console do navegador mostrará**:
```
🔥 Conectado aos Firebase Emulators (Firestore: 8080, Auth: 9099)
```

---

## ✅ Checklist de Validação

### Dados Importados Corretamente?
- [ ] Emulator UI mostra todas as coleções
- [ ] Número de documentos bate com a exportação
- [ ] Dados estão completos (não vazios)

### Next.js Conectado aos Emulators?
- [ ] Console mostra "Conectado aos Firebase Emulators"
- [ ] Dashboard carrega estudantes
- [ ] Não há erros de conexão

### Testes Funcionando?
- [ ] Criar novo estudante funciona
- [ ] Editar estudante funciona
- [ ] Registrar falta funciona
- [ ] Dados persistem (não somem ao recarregar página)

---

## 🔄 Workflow Diário

### Início do Dia:
```bash
# Terminal 1
npm run emulators

# Terminal 2 (aguardar Emulators iniciarem)
npm run dev
```

### Durante Desenvolvimento:
- ✅ Desenvolva normalmente
- ✅ Testes ilimitados (ZERO quota)
- ✅ Dados reais para validação
- ✅ Performance 160x melhor

### Fim do Dia:
- `Ctrl+C` no Terminal 2 (Next.js)
- `Ctrl+C` no Terminal 1 (Emulators)
- Dados são **salvos automaticamente** em `firebase-data/`

### Reiniciar Emulators com Dados Salvos:
```bash
npm run emulators
# Dados anteriores são carregados automaticamente!
```

---

## 🔄 Atualizar Dados de Produção

### Quando Atualizar?
- ✅ Semanalmente (Segunda-feira de manhã)
- ✅ Após mudanças grandes em produção
- ✅ Antes de testar features que dependem de dados reais

### Como Atualizar:
```bash
# 1. Exportar dados atualizados (ZERO quota)
node scripts/export-firestore-to-local.mjs

# 2. Reiniciar Emulators
# Ctrl+C no Terminal 1 (parar Emulators)
npm run emulators

# 3. Importar dados atualizados
# Terminal 2
node scripts/import-json-to-emulators.mjs
```

**Tempo total**: ~5 minutos

---

## 📊 Comparação: Produção vs Emulators

| Aspecto | Produção | Emulators |
|---------|----------|-----------|
| **Quota** | 50k reads/dia | ♾️ Ilimitado |
| **Velocidade** | ~8000ms | ~50ms |
| **Consumo** | Conta na quota | ZERO |
| **Segurança** | Dados reais (risco) | Dados locais (seguro) |
| **UI Visual** | Não | Sim (localhost:4000) |
| **Persistência** | Permanente | Reinicia quando para |

---

## ⚠️ Troubleshooting

### Erro: "Service Account não encontrado"
```bash
# Verificar se o arquivo existe
ls -la firebase-admin-key.json

# Se não existir, baixe do Firebase Console
# Ver: Etapa "Pré-Requisitos" acima
```

### Erro: "Firebase Emulators não estão rodando"
```bash
# Terminal 1: Iniciar Emulators
npm run emulators

# Aguardar mensagem: "All emulators ready!"
# Depois executar importação no Terminal 2
```

### Erro: "Cannot connect to Emulator"
```bash
# Verificar se porta 8080 está livre
lsof -ti:8080

# Se houver processo, matar:
kill -9 $(lsof -ti:8080)

# Reiniciar Emulators
npm run emulators
```

### Dados Não Aparecem no Emulator UI
```bash
# 1. Verificar se importação foi bem-sucedida
# Deve mostrar: "✅ IMPORTAÇÃO CONCLUÍDA!"

# 2. Recarregar página do Emulator UI
# http://localhost:4000

# 3. Clicar em "Firestore" → Ver coleções
```

### Next.js Conecta em Produção ao Invés de Emulators
```bash
# Verificar console do navegador
# Deve mostrar: "Conectado aos Firebase Emulators"

# Se conectar em produção:
# 1. Parar Next.js (Ctrl+C)
# 2. Verificar se Emulators estão rodando
# 3. Reiniciar: npm run dev
```

---

## 🔐 Segurança

### ⚠️ NUNCA Commite:
- `firebase-admin-key.json` (credenciais)
- `firebase-data-export/` (backup local)
- `.env.local` (se houver keys)

### ✅ Já está no .gitignore:
```gitignore
firebase-admin-key.json
firebase-data-export/
.env*.local
```

### Verificar antes de commit:
```bash
git status
# NÃO deve listar firebase-admin-key.json
```

---

## 📚 Scripts Disponíveis

### `npm run emulators`
- Inicia Emulators
- Importa dados de `firebase-data/` (se existir)
- Exporta automaticamente ao parar (`Ctrl+C`)

### `node scripts/export-firestore-to-local.mjs`
- Exporta dados de produção (ZERO quota)
- Salva em `firebase-data-export/firestore-backup.json`

### `node scripts/import-json-to-emulators.mjs`
- Importa backup JSON nos Emulators
- Requer Emulators rodando

---

## 🎯 Próximos Passos

Agora que você tem Emulators configurados:

1. ✅ **Desenvolva com confiança**: Testes ilimitados, ZERO quota
2. ✅ **Teste scripts de migração**: Ambiente seguro
3. ✅ **Valide features**: Dados reais sem risco
4. ✅ **Otimize queries**: Veja performance real

---

## 📖 Documentação Relacionada

- [CLAUDE.md](../CLAUDE.md) - Seção "Não Fazer" → Firebase Emulators
- [EMULATORS-QUICK-START.md](EMULATORS-QUICK-START.md) - Guia rápido
- [FIREBASE-EMULATORS-GUIA.md](FIREBASE-EMULATORS-GUIA.md) - Guia completo

---

**Última Atualização**: 2025-01-10
**Status**: ✅ Scripts Criados e Testados
**Consumo de Quota**: 🎉 **ZERO** (Admin SDK)
