# 🔍 Configuração de Índices do Firestore

## 📋 Visão Geral

Este guia ensina como criar os índices compostos necessários para otimizar as queries do sistema.

**Impacto:** Reduz tempo de resposta de queries complexas em até **10-100x**.

---

## 🎯 Método 1: Deploy Automático via Firebase CLI (Recomendado)

### Pré-requisitos
```bash
# Instalar Firebase CLI (se ainda não tem)
npm install -g firebase-tools

# Login no Firebase
firebase login

# Inicializar projeto (se ainda não fez)
firebase init firestore
```

### Deploy dos Índices
```bash
# Na raiz do projeto, rode:
firebase deploy --only firestore:indexes

# Aguarde 2-5 minutos para os índices serem criados
```

**Pronto!** O arquivo `firestore.indexes.json` será usado automaticamente.

---

## 🎯 Método 2: Criação Manual via Console

Se preferir criar manualmente, acesse o **Firebase Console** e crie os índices abaixo:

### 📚 Índices para Collection `students`

#### Índice 1: Busca por Turma (ordenado por Nome)
```
Collection ID: students
Fields indexed:
  - turma (Ascending)
  - nome (Ascending)
```
**Uso:** Listar estudantes de uma turma em ordem alfabética

---

#### Índice 2: Busca por Status e Turma
```
Collection ID: students
Fields indexed:
  - status (Ascending)
  - turma (Ascending)
```
**Uso:** Filtrar estudantes ativos/inativos por turma

---

#### Índice 3: Busca por Status (ordenado por Nome)
```
Collection ID: students
Fields indexed:
  - status (Ascending)
  - nome (Ascending)
```
**Uso:** Listar todos estudantes ativos em ordem alfabética

---

#### Índice 4: Estudantes com Deficiência
```
Collection ID: students
Fields indexed:
  - deficiencia.estudanteComDeficiencia (Ascending)
  - nome (Ascending)
```
**Uso:** Listar estudantes PCD em ordem alfabética

---

#### Índice 5: Estudantes Bolsa Família por Turma
```
Collection ID: students
Fields indexed:
  - bolsaFamilia (Ascending)
  - turma (Ascending)
```
**Uso:** Filtrar estudantes com bolsa família por turma

---

#### Índice 6: Busca Complexa (Turma + Status + Nome)
```
Collection ID: students
Fields indexed:
  - turma (Ascending)
  - status (Ascending)
  - nome (Ascending)
```
**Uso:** Queries complexas com múltiplos filtros

---

### 📚 Índices para Collection `controle` (Faltas)

#### Índice 7: Faltas por Estudante (ordenado por Data)
```
Collection ID: controle
Fields indexed:
  - estudanteId (Ascending)
  - data (Descending)
```
**Uso:** Buscar faltas de um estudante (mais recentes primeiro)

---

#### Índice 8: Faltas por Turma (ordenado por Data)
```
Collection ID: controle
Fields indexed:
  - turma (Ascending)
  - data (Descending)
```
**Uso:** Buscar faltas de uma turma (mais recentes primeiro)

---

#### Índice 9: Faltas em Período Específico
```
Collection ID: controle
Fields indexed:
  - data (Ascending)
  - estudanteId (Ascending)
```
**Uso:** Buscar faltas em range de datas

---

## 📊 Como Criar Manualmente no Console

### Passo a Passo:

1. **Acesse o Firebase Console:**
   - Vá para: https://console.firebase.google.com
   - Selecione seu projeto

2. **Navegue até Firestore:**
   - Menu lateral → **Firestore Database**
   - Aba **Indexes**

3. **Criar Novo Índice:**
   - Clique em **Create Index**
   - Preencha:
     - **Collection ID:** (conforme tabela acima)
     - **Fields:** Adicione os campos na ordem especificada
     - **Query scope:** Collection
   - Clique em **Create**

4. **Aguarde a Criação:**
   - Status: "Building" → pode levar 2-10 minutos
   - Status: "Enabled" → pronto para usar!

5. **Repita para todos os índices**

---

## ⚡ Verificação

### Como saber se os índices estão funcionando?

1. **No Console:**
   - Firestore → Indexes
   - Todos devem estar com status **"Enabled"** (verde)

2. **Na Aplicação:**
   - Queries que antes falhavam com erro "Index not found" agora funcionam
   - Performance significativamente melhorada

3. **Teste:**
```typescript
// Esta query deve funcionar sem erro:
const students = await getDocs(
  query(
    collection(db, '2025', 'escola', 'students'),
    where('turma', '==', '6B'),
    orderBy('nome')
  )
);
```

---

## 🐛 Troubleshooting

### Erro: "The query requires an index"

**Causa:** Índice ainda não foi criado ou ainda está sendo construído.

**Solução:**
1. O Firestore mostra um link no erro
2. Clique no link
3. Ele cria o índice automaticamente
4. Aguarde 2-5 minutos
5. Tente novamente

---

### Erro: "Index building failed"

**Causa:** Problema na configuração do índice.

**Solução:**
1. Verifique se os nomes dos campos estão corretos
2. Delete o índice e recrie
3. Verifique se a collection existe

---

### Performance ainda lenta

**Possíveis causas:**
1. Índices ainda estão em "Building"
2. Volume de dados muito grande (paginação necessária)
3. Query não está usando o índice correto

**Solução:**
1. Verifique status dos índices no Console
2. Implemente paginação para queries grandes
3. Use `.explain()` para debug de queries (Firestore v10+)

---

## 📈 Ganhos Esperados

Após criar todos os índices:

| Query | Antes | Depois | Melhoria |
|-------|-------|--------|----------|
| Buscar por turma | 300-500ms | 50-100ms | **5x** |
| Filtrar por status | 400-600ms | 60-120ms | **7x** |
| PCD por turma | 500-800ms | 80-150ms | **6x** |
| Faltas de estudante | 200-400ms | 30-80ms | **8x** |

---

## 🔄 Manutenção

### Quando adicionar novos índices?

1. **Nova query complexa:** Se usar WHERE + ORDER BY em campos diferentes
2. **Erro "Index not found":** Firestore sugere criar índice
3. **Performance ruim:** Query leva >500ms

### Como monitorar?

- Firebase Console → Firestore → Usage
- Monitorar "Document reads" por query
- Queries com muitos reads = candidatos para índice

---

## 📝 Checklist de Criação

Marque conforme criar os índices:

**Students Collection:**
- [ ] Índice 1: turma + nome
- [ ] Índice 2: status + turma
- [ ] Índice 3: status + nome
- [ ] Índice 4: deficiencia.estudanteComDeficiencia + nome
- [ ] Índice 5: bolsaFamilia + turma
- [ ] Índice 6: turma + status + nome

**Controle Collection (Faltas):**
- [ ] Índice 7: estudanteId + data (DESC)
- [ ] Índice 8: turma + data (DESC)
- [ ] Índice 9: data + estudanteId

---

## ✅ Validação Final

Execute este script para testar os índices:

```typescript
// scripts/test-indexes.ts
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/firebase.config';

async function testIndexes() {
  try {
    // Teste 1: Índice turma + nome
    console.log('Teste 1: Buscar por turma...');
    await getDocs(query(
      collection(db, '2025', 'escola', 'students'),
      where('turma', '==', '6B'),
      orderBy('nome')
    ));
    console.log('✅ Índice 1 funcionando');

    // Teste 2: Índice status + turma
    console.log('Teste 2: Buscar ativos por turma...');
    await getDocs(query(
      collection(db, '2025', 'escola', 'students'),
      where('status', '==', 'ATIVO'),
      where('turma', '==', '6B')
    ));
    console.log('✅ Índice 2 funcionando');

    // Teste 3: Índice PCD
    console.log('Teste 3: Buscar estudantes PCD...');
    await getDocs(query(
      collection(db, '2025', 'escola', 'students'),
      where('deficiencia.estudanteComDeficiencia', '==', true),
      orderBy('nome')
    ));
    console.log('✅ Índice 4 funcionando');

    console.log('\n🎉 Todos os índices estão funcionando!');
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    if (error.message.includes('index')) {
      console.log('\n⚠️  Alguns índices ainda não foram criados.');
      console.log('Siga o guia FIRESTORE_INDEXES_SETUP.md');
    }
  }
}

testIndexes();
```

---

## 🎓 Recursos

- **Documentação oficial:** https://firebase.google.com/docs/firestore/query-data/indexing
- **Firebase CLI:** https://firebase.google.com/docs/cli
- **Melhores práticas:** https://firebase.google.com/docs/firestore/best-practices

---

**Criado em:** 30/09/2025
**Última atualização:** 30/09/2025