# 🔥 Firebase Emulators - Banco Local Ilimitado

## 🎯 O QUE É?

**Firebase Emulators** = Firestore rodando **100% local** na sua máquina.

- ✅ **Quota ILIMITADA** (não usa nada da nuvem)
- ✅ **Velocidade** (sem latência)
- ✅ **Offline** (funciona sem internet)
- ✅ **Segurança** (dados de teste não vão pra produção)
- ✅ **Interface visual** (UI web para explorar dados)

---

## 🚀 Quick Start

### 1. Iniciar Emulators

```bash
npm run emulators
```

Isso vai:
- ✅ Iniciar Firestore local na porta **8080**
- ✅ Iniciar Auth local na porta **9099**
- ✅ Abrir UI visual em **http://localhost:4000**
- ✅ Importar dados salvos (se existirem)
- ✅ Exportar dados ao sair

### 2. Acessar Interface Visual

Abra no navegador:
```
http://localhost:4000
```

Você verá:
- 📊 Firestore Database (explorar coleções)
- 👥 Authentication (usuários)
- 📋 Logs em tempo real

### 3. Conectar sua Aplicação

A aplicação **detecta automaticamente** se os emulators estão rodando!

**Nenhuma mudança de código necessária** (já configurado em `firebase.config.ts`)

---

## 📋 Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run emulators` | Inicia com import/export automático (RECOMENDADO) |
| `npm run emulators:start` | Inicia limpo (sem dados) |
| `npm run emulators:export` | Exporta dados atuais para `./firebase-data` |
| `npm run emulators:import` | Importa dados de `./firebase-data` |

---

## 🎓 Como Usar - Passo a Passo

### Cenário 1: Desenvolvimento do Zero

```bash
# 1. Iniciar emulators
npm run emulators

# 2. Em outro terminal, iniciar Next.js
npm run dev

# 3. Acessar aplicação
# http://localhost:3000

# 4. Criar dados de teste manualmente
# - Cadastrar estudantes
# - Adicionar faltas
# - Testar funcionalidades

# 5. Ao sair, dados são salvos automaticamente
```

### Cenário 2: Importar Dados de Produção

```bash
# 1. Exportar dados de produção (via Firebase Console)
# Console → Firestore → Import/Export → Export
# Salvar em ./firebase-data/

# 2. Iniciar emulators com dados
npm run emulators

# 3. Agora você tem CÓPIA EXATA da produção localmente!
```

### Cenário 3: Testar Mudanças Destrutivas

```bash
# 1. Importar dados de produção
npm run emulators:import

# 2. Testar limpeza de duplicatas
# - Acessar /admin/clean-atestados
# - Executar limpeza SEM MEDO
# - É tudo local!

# 3. Se der errado, apenas reinicie
# Ctrl+C
# npm run emulators:import # Restaura estado original
```

---

## 🔧 Configuração (Já Feita!)

### firebase.json
```json
{
  "emulators": {
    "firestore": { "port": 8080 },
    "auth": { "port": 9099 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

### Portas Usadas
- **8080**: Firestore Emulator
- **9099**: Auth Emulator
- **4000**: Emulator UI (interface visual)
- **3000**: Next.js (aplicação)

---

## 💾 Import/Export de Dados

### Exportar Dados Atuais

**Opção 1: Automático** (ao sair)
```bash
npm run emulators  # Já exporta ao fechar (Ctrl+C)
```

**Opção 2: Manual** (durante execução)
```bash
# Em outro terminal:
npm run emulators:export
```

### Importar Dados

```bash
npm run emulators:import
```

### Onde os Dados Ficam?

```
firebase-data/
├── firestore_export/
│   └── firestore_export.overall_export_metadata
├── auth_export/
│   └── accounts.json
└── firebase-export-metadata.json
```

**IMPORTANTE**: Esta pasta está no `.gitignore` (não vai para o GitHub)

---

## 🎯 Casos de Uso Práticos

### 1. Testar API Pesada (SEM CONSUMIR QUOTA!)

```bash
# Terminal 1: Emulators
npm run emulators

# Terminal 2: Next.js
npm run dev

# Terminal 3: Testar API
curl "http://localhost:3000/api/students/absence-multiples?multiple=8"

# ✅ Usa banco LOCAL (0 quota consumida)
# ✅ Teste à vontade (ilimitado)
```

### 2. Limpar Duplicatas com Segurança

```bash
# 1. Copiar dados de produção
# (export do Firebase Console → firebase-data/)

# 2. Iniciar emulators
npm run emulators

# 3. Acessar aplicação
npm run dev

# 4. Executar limpeza
# http://localhost:3000/admin/clean-atestados

# 5. Se der errado, apenas reinicie
```

### 3. Desenvolver Nova Feature

```bash
# Trabalhe com banco local durante TODO o desenvolvimento
npm run emulators  # Terminal 1
npm run dev        # Terminal 2

# Quando pronto, teste em produção UMA VEZ
TESTING_MODE=false npm run dev
```

### 4. Testar Queries Complexas

```javascript
// Código funciona IGUAL em local e produção
const students = await getDocs(
  query(
    collection(db, 'estudantes'),
    where('turma', '==', '5A'),
    orderBy('nome')
  )
);

// Se emulators rodando → usa local
// Se não → usa produção
```

---

## 🔄 Como a Aplicação Detecta Emulators

**Já está configurado!** Ver `src/firebase.config.ts`:

```typescript
if (typeof window !== 'undefined') {
  // Detecta automaticamente se emulators estão rodando
  if (window.location.hostname === 'localhost') {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
    console.log('🔥 Conectado aos Firebase Emulators');
  }
}
```

---

## 📊 Monitoramento

### Logs em Tempo Real

```bash
# Na UI (http://localhost:4000):
- Ver todas as queries
- Ver todos os writes
- Ver autenticações
- Ver regras de segurança testadas
```

### Console do Terminal

```bash
# Emulators mostram:
i  firestore: Firestore Emulator listening on localhost:8080
i  auth: Auth Emulator listening on localhost:9099
i  ui: Emulator UI listening on localhost:4000

# Toda query aparece:
i  firestore: collection(estudantes).get() - 700 docs
i  firestore: doc(estudantes/abc123).update()
```

---

## ⚠️ Diferenças vs Produção

### O que FUNCIONA IGUAL:
- ✅ Todas as queries
- ✅ Todas as regras de segurança
- ✅ Índices compostos
- ✅ Transactions
- ✅ Batch writes
- ✅ Subcoleções

### O que NÃO funciona:
- ❌ Cloud Functions (precisa configurar separado)
- ❌ Storage (arquivos)
- ❌ Realtime Database (se usar)

---

## 🚨 Troubleshooting

### Erro: "Port already in use"

```bash
# Matar processos na porta 8080
lsof -ti:8080 | xargs kill -9

# Matar processos na porta 4000
lsof -ti:4000 | xargs kill -9

# Tentar novamente
npm run emulators
```

### Aplicação ainda usa produção

```bash
# 1. Verificar se emulators estão rodando
# Deve aparecer: "🔥 Conectado aos Firebase Emulators" no console

# 2. Verificar URL
# Deve ser http://localhost:3000 (não https, não vercel)

# 3. Hard reload no navegador
# Cmd+Shift+R (Mac) ou Ctrl+Shift+R (Windows)
```

### Dados não persistem entre reinicializações

```bash
# Use o comando correto:
npm run emulators  # ✅ COM export-on-exit

# NÃO use:
firebase emulators:start  # ❌ SEM export
```

### Não consigo acessar UI

```bash
# 1. Verificar se porta 4000 está livre
lsof -ti:4000

# 2. Acessar URL correta
http://localhost:4000  # ✅ Correto
http://localhost:4000/firestore  # ❌ Errado
```

---

## 🎓 Workflow Recomendado

### Desenvolvimento Normal (90% do tempo)

```bash
# Sempre use emulators localmente
Terminal 1: npm run emulators
Terminal 2: npm run dev

# Desenvolva, teste, quebre, teste de novo
# Quota: ILIMITADA ✅
```

### Teste Final (antes de deploy)

```bash
# Apenas 1x para validar com dados reais
TESTING_MODE=false npm run dev

# OU conectar temporariamente à produção
# (desativar emulators)
```

### Produção

```bash
# Deploy normal
npm run build
# Vercel faz deploy

# Produção usa Firebase real automaticamente
```

---

## 📈 Comparação de Quota

| Operação | Local (Emulators) | Produção |
|----------|-------------------|----------|
| 1000 queries | 0 quota ✅ | 1.000 reads |
| 100 writes | 0 quota ✅ | 100 writes |
| APIs pesadas | 0 quota ✅ | 2.124+ reads |
| Testes infinitos | 0 quota ✅ | Quota esgota |

**Economia**: **100%** da quota usando emulators! 🎉

---

## 🔐 Segurança

- ✅ Dados locais NÃO vão para produção
- ✅ Emulators só funcionam em `localhost`
- ✅ Produção não é afetada
- ✅ Pode testar destrutivamente sem medo

---

## 📚 Recursos

- [Documentação Oficial](https://firebase.google.com/docs/emulator-suite)
- [Vídeo Tutorial](https://www.youtube.com/watch?v=pkgvFNPdiEs)
- [Firebase Console](https://console.firebase.google.com)

---

## ✅ Checklist: Primeiros Passos

- [ ] Ler este guia
- [ ] Executar `npm run emulators` (primeira vez)
- [ ] Acessar UI em http://localhost:4000
- [ ] Executar `npm run dev` em outro terminal
- [ ] Criar um estudante de teste
- [ ] Verificar estudante na UI
- [ ] Testar API absence-multiples
- [ ] Fechar emulators (Ctrl+C) e verificar dados foram salvos
- [ ] Abrir novamente e verificar dados persistiram

---

## 🎯 Resumo

```
Firebase Emulators = Firebase Local = Quota Infinita

✅ Desenvolva localmente 100% do tempo
✅ Teste destrutivamente sem medo
✅ Economize 100% da quota
✅ Velocidade máxima (sem latência)
✅ Trabalhe offline

Só use produção para:
- Validação final
- Deploys
- Usuários reais
```

---

**Status**: ✅ Configurado e pronto para uso
**Última Atualização**: 2025-10-10
**Versão**: 1.0.0
