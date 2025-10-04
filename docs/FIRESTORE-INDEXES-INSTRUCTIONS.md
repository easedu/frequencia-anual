# 📊 Instruções para Criar Índices no Firestore

## ⚠️ AÇÃO MANUAL NECESSÁRIA

Os índices compostos precisam ser criados manualmente no **Firestore Console**.

---

## 🔗 Acesso ao Console

1. Acesse: https://console.firebase.google.com/
2. Selecione o projeto: **frequencia-anual**
3. Navegue para: **Firestore Database** → **Indexes** (Índices)

---

## 📋 ÍNDICES A CRIAR

### **Índice 1: Consultas por Estudante**

**Objetivo**: Otimizar `getStudentAbsences()` - busca de faltas de um estudante específico

```
Collection ID: 2025/faltas/controle
Fields to index:
  1. estudanteId (Ascending)
  2. data (Ascending)
Query scope: Collection
```

**Passos**:
1. Clique em **"Create Index"**
2. Collection path: `2025/faltas/controle`
3. Adicionar campo: `estudanteId` → Ascending
4. Adicionar campo: `data` → Ascending
5. Query scope: **Collection**
6. Clicar em **"Create"**

**Tempo de criação**: ~5-10 minutos

---

### **Índice 2: Consultas por Turma + Data**

**Objetivo**: Otimizar tela de "Marcar Faltas" - busca faltas por turma e data

```
Collection ID: 2025/faltas/controle
Fields to index:
  1. turma (Ascending)
  2. data (Ascending)
Query scope: Collection
```

**Passos**:
1. Clique em **"Create Index"**
2. Collection path: `2025/faltas/controle`
3. Adicionar campo: `turma` → Ascending
4. Adicionar campo: `data` → Ascending
5. Query scope: **Collection**
6. Clicar em **"Create"**

**Tempo de criação**: ~5-10 minutos

---

### **Índice 3: Consultas por Data + Justified**

**Objetivo**: Otimizar queries que filtram por data e status de justificativa

```
Collection ID: 2025/faltas/controle
Fields to index:
  1. data (Ascending)
  2. justified (Ascending)
Query scope: Collection
```

**Passos**:
1. Clique em **"Create Index"**
2. Collection path: `2025/faltas/controle`
3. Adicionar campo: `data` → Ascending
4. Adicionar campo: `justified` → Ascending
5. Query scope: **Collection**
6. Clicar em **"Create"**

**Tempo de criação**: ~5-10 minutos

---

## ✅ VALIDAÇÃO

### Como verificar se índices foram criados:

1. No Firestore Console → Indexes
2. Verificar status de cada índice:
   - **Building**: Ainda sendo criado (aguardar)
   - **Enabled**: Pronto para uso ✅
   - **Error**: Erro na criação (verificar configuração)

### Tempo total estimado:
- **Criação**: 5-10 minutos por índice
- **Total**: ~15-30 minutos para todos os índices

---

## 🎯 IMPACTO ESPERADO

### Antes dos Índices:
- `getStudentAbsences()`: 3-5s (50.000 reads)
- Marcar faltas (verificar existentes): 2-3s
- APIs cross-student: 10-13s

### Depois dos Índices:
- `getStudentAbsences()`: **500ms** (68 reads) → **6-10x mais rápido**
- Marcar faltas: **300ms** → **6-10x mais rápido**
- APIs cross-student: **8-10s** → **1.3-1.6x mais rápido**

---

## ⚠️ IMPORTANTE

- **NÃO deletar índices antigos** até confirmar que novos estão funcionando
- **Aguardar status "Enabled"** antes de testar código otimizado
- **Monitorar erros** após criação dos índices

---

## 📞 Em caso de problemas:

Se aparecer erro do tipo:
```
"The query requires an index"
```

O próprio erro incluirá um **link direto** para criar o índice automaticamente. Basta clicar no link e confirmar.

---

## ✅ CHECKLIST

- [ ] Índice 1 criado (estudanteId + data)
- [ ] Índice 2 criado (turma + data)
- [ ] Índice 3 criado (data + justified)
- [ ] Todos os índices com status "Enabled"
- [ ] Testado query com índices (sem erros)

---

**Após criar todos os índices, você pode prosseguir para a Etapa 1.2**
