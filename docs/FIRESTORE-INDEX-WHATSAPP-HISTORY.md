# 🔥 Índice Composto Firestore - WhatsApp Message History

## ⚠️ OBRIGATÓRIO

Este índice é **OBRIGATÓRIO** para o funcionamento da automação de alertas de faltas.

Sem ele, as queries vão falhar com erro:
```
Error: 9 FAILED_PRECONDITION: The query requires an index
```

---

## 📋 Configuração do Índice

### Coleção
`whatsappMessageHistory`

### Campos (em ordem)
1. **estudanteId** → Ascending
2. **contatoTelefone** → Ascending
3. **anoReferencia** → Ascending
4. **mesReferencia** → Ascending
5. **quantidadeFaltas** → Ascending

### Query Scope
Collection

---

## 🛠️ Como Criar

### Opção 1: Firebase Console (RECOMENDADO)

1. Acessar: https://console.firebase.google.com
2. Selecionar projeto: **frequencia-anual**
3. Menu lateral → **Firestore Database**
4. Aba **Indexes**
5. Clicar em **Create Index**

6. Configurar:
   ```
   Collection ID: whatsappMessageHistory

   Fields:
   - estudanteId         (Ascending)
   - contatoTelefone     (Ascending)
   - anoReferencia       (Ascending)
   - mesReferencia       (Ascending)
   - quantidadeFaltas    (Ascending)

   Query scope: Collection
   ```

7. Clicar **Create Index**
8. Aguardar criação (1-3 minutos)
9. Verificar status: **Enabled** (verde)

---

### Opção 2: Link Automático via Erro

1. Executar a API de automação:
   ```bash
   curl -X GET \
     "http://localhost:3000/api/automation/process-absences?dryRun=true&multiple=3" \
     -H "Authorization: Basic $(echo -n 'user:pass' | base64)"
   ```

2. Vai falhar com erro contendo link direto:
   ```
   https://console.firebase.google.com/v1/r/project/SEU_PROJETO/firestore/indexes?create_composite=...
   ```

3. Clicar no link
4. Confirmar criação
5. Aguardar (1-3 minutos)

---

## ✅ Verificar Índice Criado

### Via Console
1. Firebase Console → Firestore → Indexes
2. Procurar: `whatsappMessageHistory`
3. Status deve estar: **Enabled** (verde)

### Via API
Testar query:
```typescript
import { MessageHistoryService } from '@/services/messageHistoryService';

const alreadySent = await MessageHistoryService.wasAlreadySent({
  estudanteId: 'test-id',
  contatoTelefone: '11999999999',
  anoReferencia: 2025,
  mesReferencia: 10,
  quantidadeFaltas: 3
});

// Se funcionar sem erro → Índice OK ✅
```

---

## 🐛 Troubleshooting

### Erro: "The query requires an index"
❌ Índice não criado ou ainda criando
✅ Aguardar criação (pode levar até 5 minutos)
✅ Verificar campos exatos (ordem importa!)

### Índice não aparece no Console
❌ Pode estar criando
✅ Atualizar página
✅ Verificar projeto correto

### Query ainda falha após criar índice
❌ Campos diferentes do esperado
✅ Deletar índice e recriar
✅ Verificar nomes exatos (case-sensitive)

---

## 📊 Impacto

### Performance
- Query de unicidade: **< 50ms** (com índice)
- Query de unicidade: **FALHA** (sem índice)

### Custo
- Criação do índice: **Grátis**
- Leituras otimizadas: **Menor custo**

---

## 🔗 Referências

- [Firestore Indexes Documentation](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Composite Indexes](https://firebase.google.com/docs/firestore/query-data/index-overview#composite_indexes)

---

**Status**: ⏳ Aguardando criação manual no Firebase Console
