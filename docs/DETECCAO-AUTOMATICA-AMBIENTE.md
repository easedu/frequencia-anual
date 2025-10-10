# 🔍 Detecção Automática de Ambiente

## 🎯 Como Funciona?

A aplicação **detecta automaticamente** se deve usar **Emulators (local)** ou **Firebase Cloud (produção)**.

**Você não precisa mudar NADA no código!**

---

## 🧠 Lógica de Detecção

### Código (firebase.config.ts)

```typescript
// 🏠 LOCAL vs ☁️ PRODUÇÃO

if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    // 🏠 AMBIENTE LOCAL
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
    console.log('🔥 Conectado aos Firebase Emulators');
} else {
    // ☁️ PRODUÇÃO
    // (nada a fazer, comportamento padrão do Firebase SDK)
    console.log('☁️ Conectado ao Firebase Cloud');
}
```

### Critério de Detecção

| Ambiente | Hostname | Firebase Usado |
|----------|----------|----------------|
| **Desenvolvimento** | `localhost` | Emulators (local) 🏠 |
| **Produção Vercel** | `*.vercel.app` | Firebase Cloud ☁️ |
| **Produção Custom** | `seu-dominio.com` | Firebase Cloud ☁️ |

---

## 📊 Fluxograma

```
┌─────────────────────┐
│   Aplicação Inicia  │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │ Onde estou?  │
    └──────┬───────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
┌─────────┐ ┌──────────┐
│localhost│ │Outro host│
└────┬────┘ └────┬─────┘
     │           │
     ▼           ▼
┌──────────┐ ┌──────────┐
│Emulators │ │Cloud Prod│
│(local)   │ │(remoto)  │
└──────────┘ └──────────┘
```

---

## 🧪 Teste de Detecção

### 1. Local (Desenvolvimento)

```bash
# Terminal 1: Iniciar emulators
npm run emulators

# Terminal 2: Iniciar Next.js
npm run dev

# Abrir navegador: http://localhost:3000

# Console do navegador mostrará:
🔥 Conectado aos Firebase Emulators (Firestore: 8080, Auth: 9099)
```

### 2. Produção (Vercel)

```bash
# Deploy normal
git push origin main

# Vercel faz deploy automático

# Acessar: https://frequencia-anual.vercel.app

# Console do navegador mostrará:
☁️ Conectado ao Firebase Cloud
```

---

## 🔧 Ambientes Suportados

| Ambiente | URL Example | Firebase | Quota |
|----------|-------------|----------|-------|
| **Dev Local** | `http://localhost:3000` | Emulators 🏠 | Ilimitada ✅ |
| **Dev Local IP** | `http://192.168.1.10:3000` | **Cloud** ☁️ | 50k/dia ⚠️ |
| **Vercel Preview** | `*.vercel.app` | Cloud ☁️ | 50k/dia |
| **Vercel Prod** | `frequencia-anual.vercel.app` | Cloud ☁️ | 50k/dia |
| **Custom Domain** | `app.minhaescola.com.br` | Cloud ☁️ | 50k/dia |

⚠️ **ATENÇÃO**: Apenas `localhost` usa Emulators! Qualquer outro hostname usa Firebase Cloud.

---

## 🎛️ Override Manual (Avançado)

### Forçar Emulators (Não Recomendado)

Se por algum motivo precisar forçar uso de emulators mesmo fora de localhost:

```typescript
// firebase.config.ts

const forceEmulators = process.env.NEXT_PUBLIC_FORCE_EMULATORS === 'true';

if (typeof window !== 'undefined') {
  if (window.location.hostname === 'localhost' || forceEmulators) {
    connectFirestoreEmulator(db, 'localhost', 8080);
    // ...
  }
}
```

```bash
# .env.local
NEXT_PUBLIC_FORCE_EMULATORS=true  # Usar com cautela!
```

⚠️ **Use apenas para debugging específico!**

---

## 🚨 Troubleshooting

### Problema: Local usando Cloud (consumindo quota)

**Sintomas**:
- Console mostra: `☁️ Conectado ao Firebase Cloud`
- Quota sendo consumida durante dev

**Causa**: Hostname não é `localhost`

**Soluções**:

1. **Verificar URL**:
   ```
   ❌ http://192.168.1.10:3000  # Usa Cloud!
   ✅ http://localhost:3000     # Usa Emulators
   ```

2. **Sempre usar localhost**:
   ```bash
   npm run dev
   # Acessa http://localhost:3000 (NÃO IP)
   ```

3. **Verificar se emulators estão rodando**:
   ```bash
   # Outro terminal deve ter:
   npm run emulators
   # ✔  firestore: Firestore Emulator listening on 8080
   ```

### Problema: Produção tentando usar Emulators

**Sintomas**:
- Erro em produção: `ECONNREFUSED localhost:8080`
- Nada funciona em produção

**Causa**: Lógica de detecção incorreta

**Verificação**:
```typescript
// firebase.config.ts
// Deve ter esta condição:
if (window.location.hostname === 'localhost') {
  // Emulators
}
// NÃO deve ter:
if (process.env.NODE_ENV === 'development') { // ❌ ERRADO!
  // Esta lógica não funciona em build de produção
}
```

### Problema: Emulators não conectando

**Sintomas**:
- Console mostra: `☁️ Conectado ao Firebase Cloud` (mesmo em localhost)
- Não vê mensagem de Emulators

**Causas possíveis**:

1. **Emulators não iniciados**:
   ```bash
   # Verificar se está rodando:
   lsof -i :8080
   # Deve mostrar processo firebase
   ```

2. **Erro ao conectar (já conectado antes)**:
   ```typescript
   // firebase.config.ts usa try-catch
   try {
     connectFirestoreEmulator(db, 'localhost', 8080);
   } catch (error) {
     // Já conectado ou erro
     console.log('ℹ️ Firebase Emulators não disponíveis');
   }
   ```

   **Solução**: Hard reload (Cmd+Shift+R)

3. **Service Worker cache**:
   ```bash
   # Dev Tools → Application → Service Workers → Unregister All
   # Depois: Hard Reload
   ```

---

## ✅ Checklist de Verificação

### Desenvolvimento Local

- [ ] Emulators rodando (`npm run emulators`)
- [ ] URL é `http://localhost:3000`
- [ ] Console mostra: `🔥 Conectado aos Firebase Emulators`
- [ ] UI acessível em `http://localhost:4000`
- [ ] Dados aparecendo na UI

### Produção (Vercel)

- [ ] Deploy bem-sucedido
- [ ] URL é `*.vercel.app` ou domínio custom
- [ ] Console mostra: `☁️ Conectado ao Firebase Cloud`
- [ ] Login funciona
- [ ] Dados carregam

---

## 📚 Arquivos Envolvidos

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/firebase.config.ts` | Detecção e conexão |
| `firebase.json` | Configuração dos Emulators |
| `.env.local` | Credenciais Firebase |
| `package.json` | Scripts de Emulators |

---

## 🎓 Resumo

### Como Funciona

1. **Aplicação lê `window.location.hostname`**
2. **Se `localhost` → Emulators**
3. **Se qualquer outro → Firebase Cloud**

### Benefícios

- ✅ Zero configuração manual
- ✅ Desenvolvimento sempre local (quota ilimitada)
- ✅ Produção sempre cloud (dados reais)
- ✅ Sem risco de misturar ambientes
- ✅ Sem switches manuais

### Quando Intervir

❌ **NUNCA** em uso normal
✅ Apenas para debugging específico (override manual)

---

**Status**: ✅ Implementado e funcionando
**Última Atualização**: 2025-10-10
**Versão**: 1.0.0
