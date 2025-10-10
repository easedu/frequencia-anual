# 🚀 Firebase Emulators - Quick Start

## Em 3 Passos:

### 1️⃣ Iniciar Emulators
```bash
npm run emulators
```

Aguarde ver:
```
✔  firestore: Firestore Emulator listening on 8080
✔  auth: Auth Emulator listening on 9099
✔  ui: Emulator UI listening on 4000

┌─────────────────────────────────────────────┐
│ ✔  All emulators ready! It is now safe to  │
│    connect your app.                        │
└─────────────────────────────────────────────┘
```

### 2️⃣ Iniciar Next.js (NOVO TERMINAL)
```bash
npm run dev
```

Aguarde ver no console do navegador:
```
🔥 Conectado aos Firebase Emulators (Firestore: 8080, Auth: 9099)
```

### 3️⃣ Acessar Interface Visual
```
http://localhost:4000
```

---

## 🎯 Pronto! Agora você tem:

✅ Firestore local rodando (quota ILIMITADA)
✅ Interface visual para explorar dados
✅ Aplicação conectada automaticamente
✅ Dados salvos ao sair (Ctrl+C)

---

## 🧪 Teste Rápido

1. **Criar estudante** em http://localhost:3000/cadastrar-estudante
2. **Ver na UI** em http://localhost:4000 → Firestore → estudantes
3. **Testar API** (0 quota!):
   ```bash
   curl "http://localhost:3000/api/students/absence-multiples?multiple=8"
   ```

---

## ⚠️ IMPORTANTE

### Quando usar PRODUÇÃO (Firebase real):
- ❌ Nunca durante desenvolvimento
- ✅ Apenas validação final
- ✅ Deploy em Vercel

### Quando usar EMULATORS (local):
- ✅ **SEMPRE durante desenvolvimento**
- ✅ Testes infinitos (quota ilimitada)
- ✅ Mudanças destrutivas seguras

---

## 🛑 Parar Emulators

```bash
Ctrl+C  # No terminal dos emulators
```

Dados são salvos automaticamente em `./firebase-data/`

---

## 📚 Documentação Completa

Ver: `docs/FIREBASE-EMULATORS-GUIA.md`

---

**Resumo**: Firebase local = Testes infinitos sem gastar quota! 🎉
