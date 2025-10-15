# Evolution API - Integração WhatsApp

> **Documentação completa** da integração com Evolution API v2 no projeto Frequência Anual

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Setup e Configuração](#setup-e-configuração)
4. [Uso das APIs](#uso-das-apis)
5. [Autenticação](#autenticação)
6. [Exemplos Práticos](#exemplos-práticos)
7. [Migração Futura (Supabase Auth)](#migração-futura)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

### O que é Evolution API?

Evolution API é uma solução **open-source** para integração com WhatsApp Business, oferecendo:

- ✅ **Gratuita** e self-hosted
- ✅ Envio e recebimento de mensagens
- ✅ Verificação de números WhatsApp
- ✅ Suporte a mídias (imagens, PDFs, áudios)
- ✅ Webhooks para recebimento de mensagens

### Por que usar?

- 💰 **Custo zero** (vs APIs pagas)
- 🔒 **Controle total** dos dados
- 🚀 **Fácil deploy** (Docker)
- 📚 **Documentação completa**: https://doc.evolution-api.com/v2

---

## 🏗️ Arquitetura

### Estrutura Implementada

```
src/
├── types/whatsapp/                    # Tipos TypeScript
│   ├── evolution.ts                   # Tipos da Evolution API
│   ├── message.ts                     # Tipos de mensagens
│   ├── chat.ts                        # Tipos de verificação
│   └── index.ts                       # Barrel export
│
├── lib/
│   ├── whatsapp/
│   │   ├── evolutionConfig.ts         # Configuração centralizada
│   │   └── evolutionValidator.ts      # Validações (phone, message)
│   │
│   └── auth/                          # Autenticação (abstração)
│       ├── authProvider.ts            # Interface comum
│       ├── firebaseAuthProvider.ts    # Firebase Auth (atual)
│       ├── supabaseAuthProvider.ts    # Supabase Auth (futuro)
│       └── index.ts                   # Factory pattern
│
├── services/whatsapp/
│   ├── evolutionClient.ts             # Cliente HTTP base
│   ├── evolutionMessageService.ts     # Envio de mensagens
│   ├── evolutionChatService.ts        # Verificação de números
│   └── index.ts                       # Barrel export
│
├── middleware/
│   └── auth.ts                        # Middleware de autenticação
│
└── app/api/evolution/
    ├── send/route.ts                  # POST /api/evolution/send
    └── check/route.ts                 # POST /api/evolution/check
```

### Fluxo de Autenticação

```
Cliente Frontend
    ↓
    Envia token JWT (Authorization: Bearer <token>)
    ↓
API Route (/api/evolution/send)
    ↓
Middleware de Autenticação
    ↓
AuthProvider Factory (getAuthProvider)
    ↓
FirebaseAuthProvider (ou SupabaseAuthProvider futuro)
    ↓
Valida token
    ↓
    ✅ Token válido → Continua
    ❌ Token inválido → Erro 401
```

---

## ⚙️ Setup e Configuração

### 1. Instalar Evolution API (Docker)

```bash
# Criar network Docker
docker network create evolution

# Executar Evolution API
docker run -d \
  --name evolution-api \
  --network evolution \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY=sua-api-key-aqui \
  atendai/evolution-api:latest
```

### 2. Configurar Variáveis de Ambiente

Copie `.env.local.example` para `.env.local` e configure:

```bash
# Evolution API
EVOLUTION_API_BASE_URL=http://localhost:8080
EVOLUTION_API_KEY=sua-api-key-aqui
EVOLUTION_INSTANCE_NAME=frequencia-anual

# Firebase Auth (servidor)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."

# Auth Provider
AUTH_PROVIDER=firebase  # ou 'supabase' no futuro
```

### 3. Conectar Instância WhatsApp

1. Acesse: `http://localhost:8080/manager`
2. Crie nova instância: `frequencia-anual`
3. Escaneie QR Code com WhatsApp Business
4. Aguarde status "connected"

### 4. Testar Configuração

```bash
# Verificar se Evolution API está rodando
curl http://localhost:8080/

# Listar instâncias
curl -H "apikey: sua-api-key" http://localhost:8080/instance/fetchInstances
```

---

## 📡 Uso das APIs

### Endpoint 1: Enviar Mensagem

**POST** `/api/evolution/send`

#### Headers
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <firebase-token>"
}
```

#### Body
```json
{
  "phone": "11987654321",
  "message": "Olá! Esta é uma mensagem de teste.",
  "delay": 1000,           // Opcional: delay em ms
  "linkPreview": true      // Opcional: mostrar preview de links
}
```

#### Resposta (200)
```json
{
  "success": true,
  "message": "Mensagem enviada com sucesso",
  "data": {
    "messageId": "BAE594145F4C59B4",
    "phone": "5511987654321",
    "status": "PENDING",
    "sentAt": 1704067200000
  }
}
```

#### Erros
- **400**: Campos obrigatórios faltando
- **401**: Token inválido ou não fornecido
- **500**: Erro ao enviar mensagem

---

### Endpoint 2: Verificar Número WhatsApp

**POST** `/api/evolution/check`

#### Verificação única

**Body**
```json
{
  "phone": "11987654321"
}
```

**Resposta**
```json
{
  "success": true,
  "message": "Número tem WhatsApp",
  "data": {
    "phone": "5511987654321",
    "hasWhatsApp": true,
    "jid": "5511987654321@s.whatsapp.net",
    "verifiedAt": 1704067200000
  }
}
```

#### Verificação em lote

**Body**
```json
{
  "phones": ["11987654321", "11987654322", "11987654323"]
}
```

**Resposta**
```json
{
  "success": true,
  "message": "Verificados 3 de 3 números",
  "data": {
    "total": 3,
    "verified": 3,
    "withWhatsApp": 2,
    "results": [
      {
        "phone": "5511987654321",
        "hasWhatsApp": true,
        "jid": "5511987654321@s.whatsapp.net",
        "verifiedAt": 1704067200000
      },
      {
        "phone": "5511987654322",
        "hasWhatsApp": true,
        "jid": "5511987654322@s.whatsapp.net",
        "verifiedAt": 1704067200000
      },
      {
        "phone": "5511987654323",
        "hasWhatsApp": false,
        "verifiedAt": 1704067200000
      }
    ]
  }
}
```

---

## 🔐 Autenticação

### Como Funciona

1. Usuário faz login no frontend (Firebase Auth)
2. Frontend obtém token JWT do usuário logado
3. Frontend envia token no header `Authorization: Bearer <token>`
4. API valida token usando Firebase Admin SDK
5. Se válido, processa requisição
6. Se inválido, retorna erro 401

### Obter Token no Frontend

```typescript
// src/services/whatsapp/clientService.ts (exemplo)
import { auth } from '@/firebase.config';

export async function sendWhatsAppMessage(phone: string, message: string) {
  // Verificar se usuário está logado
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  // Obter token JWT
  const token = await user.getIdToken();

  // Enviar requisição com token
  const response = await fetch('/api/evolution/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ phone, message })
  });

  return response.json();
}
```

### Testar Autenticação (Desenvolvimento)

```bash
# 1. Fazer login no frontend e copiar token do DevTools
# 2. Testar API com curl

curl -X POST http://localhost:3000/api/evolution/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "phone": "11987654321",
    "message": "Teste de autenticação"
  }'
```

---

## 💡 Exemplos Práticos

### Exemplo 1: Enviar Alerta de Faltas

```typescript
import { sendWhatsAppMessage } from '@/services/whatsapp/clientService';

async function sendAbsenceAlert(studentName: string, absences: number, phone: string) {
  const message = `
Olá! Este é um alerta automático da escola.

O(a) estudante ${studentName} atingiu ${absences} faltas no bimestre atual.

É importante comparecer às aulas para garantir o aprendizado.

Atenciosamente,
Equipe Escolar
  `.trim();

  try {
    const result = await sendWhatsAppMessage(phone, message);

    if (result.success) {
      console.log('Alerta enviado!', result.data.messageId);
    } else {
      console.error('Erro ao enviar:', result.error);
    }
  } catch (error) {
    console.error('Falha ao enviar alerta:', error);
  }
}

// Uso
sendAbsenceAlert('João Silva', 15, '11987654321');
```

### Exemplo 2: Verificar Contatos antes de Enviar

```typescript
async function verifyAndSend(phones: string[], message: string) {
  // Verificar quais números têm WhatsApp
  const checkResponse = await fetch('/api/evolution/check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getToken()}`,
    },
    body: JSON.stringify({ phones })
  });

  const checkResult = await checkResponse.json();

  // Filtrar apenas números com WhatsApp
  const validNumbers = checkResult.data.results
    .filter(r => r.hasWhatsApp)
    .map(r => r.phone);

  console.log(`${validNumbers.length} de ${phones.length} têm WhatsApp`);

  // Enviar para números válidos
  for (const phone of validNumbers) {
    await sendWhatsAppMessage(phone, message);
    await sleep(1000); // Delay de 1s entre envios
  }
}
```

---

## 🔄 Migração Futura (Supabase Auth)

### Como Migrar

A arquitetura foi projetada para facilitar a migração de Firebase Auth para Supabase Auth.

**Passo 1:** Instalar Supabase Auth
```bash
npm install @supabase/supabase-js
```

**Passo 2:** Configurar variáveis de ambiente
```bash
# .env.local
AUTH_PROVIDER=supabase  # ← Mudar de 'firebase' para 'supabase'

NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
```

**Passo 3:** Implementar SupabaseAuthProvider

Editar `src/lib/auth/supabaseAuthProvider.ts` (já preparado, apenas descomentar código)

**Passo 4:** Atualizar frontend (hooks)

Substituir `useAuth` hook de Firebase por Supabase

**Pronto!** As API Routes continuam funcionando sem alteração.

### O que NÃO precisa mudar

- ✅ API Routes (`/api/evolution/*`)
- ✅ Middleware de autenticação
- ✅ Serviços Evolution API
- ✅ Validadores e configurações

### O que precisa mudar

- ❌ Frontend: `useAuth` hook
- ❌ Frontend: Login/Signup pages
- ❌ Migração de usuários existentes (script)

---

## 🐛 Troubleshooting

### Erro: "Evolution API não configurada"

**Causa**: Variáveis de ambiente faltando

**Solução**:
```bash
# Verificar se estão configuradas
echo $EVOLUTION_API_BASE_URL
echo $EVOLUTION_API_KEY
echo $EVOLUTION_INSTANCE_NAME

# Configurar em .env.local
EVOLUTION_API_BASE_URL=http://localhost:8080
EVOLUTION_API_KEY=sua-chave
EVOLUTION_INSTANCE_NAME=frequencia-anual

# Reiniciar servidor
npm run dev
```

---

### Erro: "Token inválido ou expirado"

**Causa**: Token JWT expirou (após 1 hora) ou é inválido

**Solução**:
```typescript
// Forçar refresh do token
const user = auth.currentUser;
const token = await user?.getIdToken(true); // true = forçar refresh
```

---

### Erro: "Erro de rede: Não foi possível conectar à Evolution API"

**Causa**: Evolution API não está rodando

**Solução**:
```bash
# Verificar se container está rodando
docker ps | grep evolution-api

# Iniciar se não estiver
docker start evolution-api

# Verificar logs
docker logs evolution-api
```

---

### Erro: "Número não é elegível para WhatsApp"

**Causa**: Número não tem formato brasileiro válido (DDD + 9 + 8 dígitos)

**Solução**:
- Formato correto: `11987654321` (sem código do país)
- Ou com código: `5511987654321`
- **Não usar**: `(11) 98765-4321` (será sanitizado automaticamente)

---

## 📚 Referências

- **Evolution API Docs**: https://doc.evolution-api.com/v2
- **Evolution API GitHub**: https://github.com/EvolutionAPI/evolution-api
- **Firebase Admin SDK**: https://firebase.google.com/docs/admin/setup
- **Supabase Auth**: https://supabase.com/docs/guides/auth

---

**Última atualização**: 2025-01-14
**Versão**: 1.0.0
**Autor**: Sistema Frequência Anual
