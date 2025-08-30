# 🚀 Firebase Indexes - Otimização para Monitoramento de Faltas Consecutivas

## 📊 **Índices Compostos Recomendados**

### 1. **Collection: `2025/faltas/controle`**

Para otimizar as consultas de faltas por estudante:

```javascript
// Índice principal para consultas por estudanteId
{
  "fields": [
    { "fieldPath": "estudanteId", "order": "ASCENDING" },
    { "fieldPath": "data", "order": "ASCENDING" },
    { "fieldPath": "justified", "order": "ASCENDING" }
  ]
}
```

**Benefício:** Otimiza consultas `where('estudanteId', 'in', [...])` usadas nos batches.

### 2. **Índice para Consultas por Data**

```javascript
// Para filtros por período específico
{
  "fields": [
    { "fieldPath": "data", "order": "ASCENDING" },
    { "fieldPath": "justified", "order": "ASCENDING" },
    { "fieldPath": "estudanteId", "order": "ASCENDING" }
  ]
}
```

**Benefício:** Permite filtrar faltas por data de forma eficiente.

### 3. **Índice para Estatísticas**

```javascript
// Para agregações e contagens
{
  "fields": [
    { "fieldPath": "justified", "order": "ASCENDING" },
    { "fieldPath": "estudanteId", "order": "ASCENDING" }
  ]
}
```

## ⚡ **Comandos Firebase CLI**

Execute no terminal para criar os índices:

```bash
# 1. Índice principal
firebase firestore:indexes

# 2. Ou adicione ao firestore.indexes.json:
{
  "indexes": [
    {
      "collectionGroup": "controle",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "estudanteId", "order": "ASCENDING" },
        { "fieldPath": "data", "order": "ASCENDING" },
        { "fieldPath": "justified", "order": "ASCENDING" }
      ]
    }
  ]
}
```

## 📈 **Performance Esperada**

- **Antes:** ~2-5 segundos para 100 estudantes
- **Depois:** ~500ms-1s para 100 estudantes
- **Melhoria:** 80-90% redução no tempo de consulta

## 🎯 **Monitoramento**

Console logs adicionados para monitorar performance:
- `Carregamento de faltas - Total`
- `Batch X (Y estudantes)`
- `✓ Batch X: Z faltas encontradas`

Verifique o console do navegador para métricas detalhadas.