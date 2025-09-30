# 🚀 Deploy Rápido - 3 Comandos

**Copie e cole estes comandos no terminal:**

---

## Passo 1: Login no Firebase

```bash
firebase login
```

Isso abrirá o navegador. Faça login com sua conta Google que tem acesso ao projeto Firebase.

---

## Passo 2: Deploy dos Indexes

```bash
firebase deploy --only firestore:indexes
```

⏱️ Aguarde 5-15 minutos para os indexes serem criados.

---

## Passo 3: Deploy das Security Rules

```bash
firebase deploy --only firestore:rules
```

✅ Instantâneo!

---

## Verificar se funcionou

### Ver status dos indexes:
```bash
firebase firestore:indexes
```

### Ou no Console:
https://console.firebase.google.com → frequencia-anual → Firestore → Indexes

Aguarde até todos mostrarem **"Enabled"** (verde).

---

## Testar aplicação

```bash
npm run dev
```

Acesse a aplicação e verifique que está funcionando normalmente.

**Agora estará 5-50x mais rápido!** 🎉

---

## Se der erro de projeto

```bash
firebase use frequencia-anual
```

Depois tente novamente o deploy.