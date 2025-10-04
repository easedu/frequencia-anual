# Otimização de Performance da API `/students/absence-multiples`

## 🎯 Objetivo

Reduzir drasticamente o tempo de resposta da API de **~13 segundos** para **< 2 segundos**.

## 📊 Problema Identificado

### Antes da Otimização

A API estava fazendo **queries individuais** para cada estudante:

1. **Suspensões**: 736 estudantes × 1 query = **736 queries**
   - Tempo estimado: 736 × 75ms = **~55 segundos**

2. **Contatos**: 736 estudantes × 1 query = **736 queries**
   - Tempo estimado: 736 × 75ms = **~55 segundos**

3. **Total estimado**: **~110 segundos** apenas para suspensões + contatos

## ✅ Solução Implementada

### Collection Group Queries

Substituímos **N queries individuais** por **1 única query** usando Collection Group Queries do Firebase.

#### 1. Otimização de Suspensões (`loadStudentSuspensions`)

**ANTES:**
```typescript
// 736 queries individuais (uma por estudante)
for (const studentId of studentIds) {
  const suspensionsRef = collection(db, `students/${studentId}/suspensions`);
  const suspensionsSnap = await getDocs(suspensionsRef);
  // processar...
}
```

**DEPOIS:**
```typescript
// 1 única query para TODAS as suspensões
const suspensionsQuery = collectionGroup(db, 'suspensions');
const suspensionsSnap = await getDocs(suspensionsQuery);

// Filtrar por estudante no código
suspensionsSnap.docs.forEach(doc => {
  const studentId = doc.ref.path.split('/')[1];
  // processar...
});
```

**Ganho estimado**: De ~55s para ~200ms = **275x mais rápido**

#### 2. Otimização de Contatos (`loadVerifiedWhatsAppContacts`)

**ANTES:**
```typescript
// 736 queries individuais (uma por estudante)
const promises = chunk.map(student => getStudentContacts(student.estudanteId));
const results = await Promise.allSettled(promises);
```

**DEPOIS:**
```typescript
// 1 única query para TODOS os contatos
const contactsQuery = collectionGroup(db, 'contacts');
const contactsSnap = await getDocs(contactsQuery);

// Filtrar por estudante e aplicar regras no código
contactsSnap.docs.forEach(doc => {
  const studentId = doc.ref.path.split('/')[1];
  // aplicar filtros: whatsapp verificado + pode receber
});
```

**Ganho estimado**: De ~55s para ~200ms = **275x mais rápido**

## 🔧 Configuração Necessária no Firebase

### ⚠️ IMPORTANTE: Habilitar Collection Group Queries

As Collection Group Queries precisam de **índices especiais** no Firestore.

### Passo 1: Acesse o Console do Firebase

1. Vá para [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto `frequencia-anual`
3. Navegue para **Firestore Database** → **Indexes** (Índices)

### Passo 2: Criar Índices

Você pode criar os índices de duas formas:

#### Opção A: Executar a API e seguir o link de erro

1. Execute a API chamando o endpoint:
   ```bash
   curl -u username:password "http://localhost:3000/api/students/absence-multiples?month=2025-01&multiple=5"
   ```

2. O Firebase retornará um erro com um **link direto** para criar o índice automaticamente

3. Clique no link e aguarde a criação (leva ~2-5 minutos)

#### Opção B: Criar manualmente

Crie os seguintes índices compostos:

1. **Collection Group: `suspensions`**
   - Collection ID: `suspensions`
   - Query scope: Collection group
   - Fields indexed: (none needed for basic queries)

2. **Collection Group: `contacts`**
   - Collection ID: `contacts`
   - Query scope: Collection group
   - Fields indexed: (none needed for basic queries)

### Passo 3: Atualizar Regras de Segurança (se necessário)

Se as regras do Firestore bloquearem Collection Group Queries, adicione:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir Collection Group Query em suspensions
    match /{path=**}/suspensions/{suspensionId} {
      allow read: if request.auth != null;
    }

    // Permitir Collection Group Query em contacts
    match /{path=**}/contacts/{contactId} {
      allow read: if request.auth != null;
    }
  }
}
```

## 📈 Resultados Esperados

### Performance Estimada

- **Antes**: ~110 segundos (suspensões + contatos)
- **Depois**: ~400ms (suspensões + contatos)
- **Melhoria**: **275x mais rápido**

### Para 11 Estudantes (caso do usuário)

- **Antes**: ~13 segundos
- **Depois**: < 2 segundos
- **Melhoria**: **6-7x mais rápido**

### Para 736 Estudantes (produção completa)

- **Antes**: ~110 segundos (timeout!)
- **Depois**: ~3-5 segundos
- **Melhoria**: API funcionando sem timeout

## ✅ Regras Mantidas

Todas as regras da API foram **mantidas integralmente**:

1. ✅ Filtra apenas faltas não justificadas
2. ✅ Filtra apenas faltas no mês de referência
3. ✅ Filtra apenas múltiplos especificados
4. ✅ Exclui suspensões da contagem de faltas
5. ✅ Retorna apenas contatos com WhatsApp verificado
6. ✅ Retorna apenas contatos que podem receber mensagem
7. ✅ Usa exclusivamente V3 (100% nova estrutura)
8. ✅ Retorna apenas estudantes ativos
9. ✅ Exclui estudantes com zero faltas
10. ✅ Ordenação por faltas (descendente)
11. ✅ Cache de 30 minutos
12. ✅ Chunks de 50 estudantes
13. ✅ Basic Authentication

## 🔍 Como Validar

Execute o script de diagnóstico:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=xxx \
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx \
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx \
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx \
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx \
NEXT_PUBLIC_FIREBASE_APP_ID=xxx \
node scripts/diagnose-api-performance.mjs
```

Você verá:
- Tempo de execução de cada Collection Group Query
- Quantidade de documentos retornados
- Validação das regras de filtro
- Comparação de performance antes/depois

## 📝 Arquivos Modificados

### 1. `/src/app/api/students/absence-multiples/route.ts`

**Mudanças:**
- Adicionado import de `collectionGroup` do Firebase
- Removido import de `getStudentContacts` (não usado mais)
- Função `loadStudentSuspensions()`: Substituída implementação para usar Collection Group Query
- Função `loadVerifiedWhatsAppContacts()`: Substituída implementação para usar Collection Group Query

**Linhas modificadas:**
- Linha 2: Adicionado `collectionGroup` ao import
- Linha 7: Removido `getStudentContacts`
- Linhas 66-121: Reescrita completa de `loadStudentSuspensions()`
- Linhas 252-319: Reescrita completa de `loadVerifiedWhatsAppContacts()`

### 2. `/scripts/diagnose-api-performance.mjs` (NOVO)

Script de diagnóstico para validar otimizações e medir performance.

## 🚀 Próximos Passos

1. **Criar índices no Firebase** (obrigatório)
2. **Testar a API** com dados reais
3. **Monitorar logs** para confirmar Collection Group Queries
4. **Validar regras** ainda estão funcionando corretamente
5. **Medir performance** real em produção

## ⚠️ Observações Importantes

- Collection Group Queries **exigem índices** no Firestore
- Sem os índices, a API retornará erro 500
- A criação de índices leva **2-5 minutos**
- Cache de 30 minutos ajuda a reduzir chamadas repetidas
- Performance pode variar baseado em carga do Firebase

## 📞 Suporte

Se encontrar problemas:
1. Verifique se os índices foram criados no Firebase Console
2. Verifique se as regras de segurança permitem Collection Group Queries
3. Execute o script de diagnóstico para identificar gargalos
4. Verifique os logs do servidor para erros específicos
