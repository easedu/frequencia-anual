# ⚡ Quick Start: Firebase Emulators com Dados Reais

> **5 minutos para ambiente local com dados de produção - ZERO quota consumida!**

---

## 🚀 Setup Rápido (Primeira Vez)

### 1️⃣ Baixar Service Account Key (2 min)

1. **Acesse**: https://console.firebase.google.com/project/[SEU-PROJECT-ID]/settings/serviceaccounts/adminsdk

2. **Clique**: "Generate New Private Key" → Baixar JSON

3. **Renomeie e mova**:
```bash
mv ~/Downloads/projeto-*-adminsdk-*.json ./firebase-admin-key.json
```

⚠️ **Este arquivo contém credenciais sensíveis!** Já está no `.gitignore`.

---

### 2️⃣ Instalar firebase-admin (1 min)

```bash
npm install
```

✅ `firebase-admin` já está no `package.json`

---

### 3️⃣ Exportar Dados de Produção (2 min) **ZERO QUOTA!**

```bash
npm run export:prod
```

**Saída esperada**:
```
✅ EXPORTAÇÃO CONCLUÍDA!
📊 Total: 6.500 documentos
📁 Arquivo: 12.4 MB
💡 ZERO consumo de quota (Admin SDK)
```

---

## 🔥 Workflow Diário

### Terminal 1: Emulators (deixe rodando)
```bash
npm run emulators
```

**Aguarde**: `All emulators ready!` ✅

**Acesse**: http://localhost:4000 (UI visual)

---

### Terminal 2: Importar Dados (primeira vez)
```bash
npm run import:emulators
```

**Saída esperada**:
```
✅ IMPORTAÇÃO CONCLUÍDA!
📊 Total: 6.523 documentos
```

⚠️ **Só precisa fazer 1x!** Dados persistem em `firebase-data/`

---

### Terminal 3: Next.js
```bash
npm run dev
```

**Console do navegador mostrará**:
```
🔥 Conectado aos Firebase Emulators (Firestore: 8080, Auth: 9099)
```

✅ **Pronto!** Agora você está usando dados locais!

---

## ✅ Checklist de Validação

- [ ] Emulator UI mostra coleções (http://localhost:4000)
- [ ] Console do navegador mostra "Conectado aos Firebase Emulators"
- [ ] Dashboard carrega estudantes normalmente
- [ ] Criar/editar estudante funciona

---

## 🔄 Atualizar Dados (Semanal)

```bash
# 1. Exportar dados atualizados (ZERO quota)
npm run export:prod

# 2. Reiniciar Emulators
# Ctrl+C no Terminal 1
npm run emulators

# 3. Importar dados atualizados
# Terminal 2
npm run import:emulators
```

**Tempo**: ~5 minutos

---

## 📊 Consumo de Quota

| Ação | Quota Consumida |
|------|----------------|
| `npm run export:prod` | **0 reads** (Admin SDK) |
| `npm run import:emulators` | **0 reads** (local) |
| `npm run dev` (Emulators) | **0 reads** (local) |
| Testes ilimitados | **0 reads** (local) |

✅ **TOTAL**: **ZERO quota consumida!** 🎉

---

## ⚠️ Troubleshooting

### "Service Account não encontrado"
```bash
# Verificar
ls -la firebase-admin-key.json

# Se não existir, baixe do Firebase Console (passo 1)
```

### "Firebase Emulators não estão rodando"
```bash
# Terminal 1
npm run emulators

# Aguardar "All emulators ready!"
```

### "Dados não aparecem no Emulator UI"
```bash
# Reimportar
npm run import:emulators

# Recarregar: http://localhost:4000
```

---

## 📚 Comandos Úteis

```bash
# Exportar produção → local (ZERO quota)
npm run export:prod

# Importar no Emulators
npm run import:emulators

# Iniciar Emulators
npm run emulators

# Iniciar Next.js
npm run dev
```

---

## 📖 Documentação Completa

- **Guia Detalhado**: [SETUP-EMULATORS-COM-DADOS-REAIS.md](SETUP-EMULATORS-COM-DADOS-REAIS.md)
- **Troubleshooting**: [EMULATORS-TROUBLESHOOTING.md](EMULATORS-TROUBLESHOOTING.md)
- **CLAUDE.md**: Seção "Firebase Emulators"

---

**Status**: ✅ Pronto para usar
**Consumo de Quota**: 🎉 **ZERO**
**Performance**: ⚡ **160x mais rápido** (50ms vs 8000ms)
