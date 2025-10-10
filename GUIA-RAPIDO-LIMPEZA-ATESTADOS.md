# 🧹 Guia Rápido: Limpeza de Atestados Duplicados

**Criado em**: 2025-10-10
**API**: `/api/admin/clean-duplicate-atestados`

---

## 🚀 EXECUÇÃO RÁPIDA

### 1️⃣ Testar API (Dry-Run)

```bash
curl -X POST http://localhost:3000/api/admin/clean-duplicate-atestados \
  -H "x-api-key: dev-api-key-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{
    "estudanteId": "e3d06f0c-35fa-420c-bacd-0e4f4749c37c",
    "dryRun": true
  }'
```

**O que faz**: Analisa duplicatas SEM deletar nada

---

### 2️⃣ Executar Limpeza Real

**⚠️ ATENÇÃO**: Isso VAI DELETAR duplicatas permanentemente!

```bash
curl -X POST http://localhost:3000/api/admin/clean-duplicate-atestados \
  -H "x-api-key: dev-api-key-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{
    "estudanteId": "e3d06f0c-35fa-420c-bacd-0e4f4749c37c",
    "dryRun": false
  }'
```

**O que faz**: Deleta duplicatas (mantém o registro mais antigo)

---

## 📊 RESULTADO ESPERADO

### Dry-Run (Teste)

```json
{
  "success": true,
  "dryRun": true,
  "estudanteId": "e3d06f0c-35fa-420c-bacd-0e4f4749c37c",
  "totalAtestados": 2,
  "duplicatasEncontradas": 1,
  "registrosDuplicados": 1,
  "duplicatasRemovidas": 0,
  "duplicatas": [
    {
      "key": "15/09/2025-3-Gripe",
      "total": 2,
      "registros": [
        { "id": "abc123", "createdBy": "João Silva" },
        { "id": "def456", "createdBy": "João Silva" }
      ],
      "toRemove": ["def456"],
      "toKeep": "abc123",
      "detalhes": {
        "startDate": "15/09/2025",
        "days": 3,
        "description": "Gripe"
      }
    }
  ],
  "message": "Análise concluída. 1 grupo(s) de duplicatas encontrado(s) (1 registros duplicados). Use dryRun=false para remover."
}
```

### Limpeza Real

```json
{
  "success": true,
  "dryRun": false,
  "estudanteId": "e3d06f0c-35fa-420c-bacd-0e4f4749c37c",
  "totalAtestados": 2,
  "duplicatasEncontradas": 1,
  "registrosDuplicados": 1,
  "duplicatasRemovidas": 1,
  "duplicatas": [...],
  "message": "Limpeza concluída. 1 registro(s) duplicado(s) removido(s) com sucesso."
}
```

---

## 🔐 AUTENTICAÇÃO

### Desenvolvimento (Padrão)

**API Key**: `dev-api-key-change-in-production`

✅ **Funciona imediatamente** - Não precisa configurar nada!

### Produção (Recomendado)

Adicione ao `.env.local`:

```bash
ADMIN_API_KEY=sua-chave-secreta-aleatoria-aqui-xyz789
```

E use nos comandos:

```bash
curl -X POST http://localhost:3000/api/admin/clean-duplicate-atestados \
  -H "x-api-key: sua-chave-secreta-aleatoria-aqui-xyz789" \
  -H "Content-Type: application/json" \
  -d '{"estudanteId":"...","dryRun":true}'
```

---

## 🎯 LIMPEZA PARA BEATRIZ

### Estudante ID

```
e3d06f0c-35fa-420c-bacd-0e4f4749c37c
```

### Comando Completo (Dry-Run)

```bash
curl -X POST http://localhost:3000/api/admin/clean-duplicate-atestados \
  -H "x-api-key: dev-api-key-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{"estudanteId":"e3d06f0c-35fa-420c-bacd-0e4f4749c37c","dryRun":true}' \
  | jq .
```

**Nota**: O `| jq .` no final formata o JSON (requer jq instalado)

### Comando Completo (Real)

```bash
curl -X POST http://localhost:3000/api/admin/clean-duplicate-atestados \
  -H "x-api-key: dev-api-key-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{"estudanteId":"e3d06f0c-35fa-420c-bacd-0e4f4749c37c","dryRun":false}' \
  | jq .
```

---

## 🧪 TESTES

### 1. Verificar Documentação da API

```bash
curl http://localhost:3000/api/admin/clean-duplicate-atestados | jq .
```

### 2. Testar Autenticação Inválida

```bash
curl -X POST http://localhost:3000/api/admin/clean-duplicate-atestados \
  -H "x-api-key: chave-errada" \
  -H "Content-Type: application/json" \
  -d '{"estudanteId":"abc123","dryRun":true}'
```

**Esperado**: HTTP 401 - API key inválida

### 3. Testar sem estudanteId

```bash
curl -X POST http://localhost:3000/api/admin/clean-duplicate-atestados \
  -H "x-api-key: dev-api-key-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{"dryRun":true}'
```

**Esperado**: HTTP 400 - estudanteId é obrigatório

---

## 📊 IMPACTO NA QUOTA

### BEATRIZ

```
Dry-run:  3 reads + 0 writes (0.006% quota)
Real:     3 reads + 1 write (0.011% quota)
```

✅ **Seguro para executar a qualquer momento**

### Todos os 700 Estudantes

```
Dry-run:  ~2,100 reads (4.2% quota)
Real:     ~2,100 reads + ~70 writes (4.55% quota)
```

✅ **Seguro, mas executar após reset da quota (04:00 AM)**

---

## ⚠️ AVISOS IMPORTANTES

### Antes de Executar

1. ✅ **SEMPRE** executar `dryRun=true` primeiro
2. ✅ Analisar o resultado do dry-run
3. ✅ Confirmar que as duplicatas estão corretas
4. ✅ Verificar que o registro a manter (`toKeep`) é o correto

### Durante Execução

1. ⚠️ **NÃO executar múltiplas vezes** para o mesmo estudante
2. ⚠️ **NÃO executar** se a quota já estiver alta hoje

### Após Execução

1. ✅ Verificar resultado no Firebase Console
2. ✅ Testar perfil do estudante
3. ✅ Confirmar que duplicatas sumiram

---

## 🔄 LIMPEZA EM MASSA (Futura)

Se precisar limpar TODOS os estudantes:

```bash
#!/bin/bash
# Script: clean-all-students.sh

API_KEY="dev-api-key-change-in-production"
API_URL="http://localhost:3000/api/admin/clean-duplicate-atestados"

# Array de IDs de estudantes (obter do Firebase ou CSV)
ESTUDANTES=(
  "e3d06f0c-35fa-420c-bacd-0e4f4749c37c"
  "outro-id-aqui"
  # ... mais IDs
)

for ID in "${ESTUDANTES[@]}"; do
  echo "Processando: $ID"

  # Dry-run
  curl -X POST "$API_URL" \
    -H "x-api-key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"estudanteId\":\"$ID\",\"dryRun\":true}" \
    | jq '.duplicatasEncontradas'

  # Aguardar 1 segundo entre requisições
  sleep 1
done
```

---

## 📚 LOGS E DEBUGGING

### Ver Logs do Next.js

```bash
# Terminal onde rodou npm run dev
# Logs aparecerão automaticamente
```

### Logs da API

A API loga erros automaticamente:

```typescript
console.error('❌ Erro ao limpar duplicatas:', error);
```

---

## ✅ CHECKLIST DE EXECUÇÃO

### Preparação

- [ ] Servidor Next.js rodando (`npm run dev`)
- [ ] Firebase configurado e acessível
- [ ] Estudante ID confirmado
- [ ] API Key configurada (ou usar padrão dev)

### Execução

- [ ] **Passo 1**: Executar dry-run
- [ ] **Passo 2**: Analisar resultado
- [ ] **Passo 3**: Confirmar que duplicatas estão corretas
- [ ] **Passo 4**: Executar com `dryRun=false`
- [ ] **Passo 5**: Verificar resultado

### Validação

- [ ] Verificar no Firebase Console
- [ ] Testar perfil do estudante
- [ ] Confirmar que apenas 1 registro permanece
- [ ] Logar quantas duplicatas foram removidas

---

## 🆘 TROUBLESHOOTING

### Erro: "API key inválida"

**Solução**: Verificar que está usando o header correto:
```bash
-H "x-api-key: dev-api-key-change-in-production"
```

### Erro: "Connection refused"

**Solução**: Verificar se o servidor Next.js está rodando:
```bash
npm run dev
```

### Erro: "Quota exceeded"

**Solução**: Aguardar reset da quota (04:00 AM) ou executar depois

### Nenhuma Duplicata Encontrada

**Possibilidades**:
1. ✅ Não há duplicatas (ótimo!)
2. ⚠️ Estudante ID incorreto
3. ⚠️ Atestados têm descrições ligeiramente diferentes

---

## 📞 SUPORTE

**Documentação Completa**:
- `docs/ANALISE-DUPLICACAO-ATESTADOS-BEATRIZ.md`
- `docs/IMPACTO-QUOTA-LIMPEZA-ATESTADOS.md`
- `docs/COMPARACAO-PAGINA-VS-API-LIMPEZA.md`

**Arquivo da API**:
- `src/app/api/admin/clean-duplicate-atestados/route.ts`

---

✅ **API Pronta para Uso!** Execute o dry-run agora e veja os resultados! 🚀
