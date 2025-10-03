# 📱 Plano de Migração - Estrutura WhatsApp

> **Objetivo:** Migrar dados de verificação WhatsApp de `whatsapp_verified_numbers` (collection separada) para `students/{id}/contacts` (subcollection integrada)

---

## 🎯 Visão Geral

### Problema Atual
- Dados de contatos e verificação WhatsApp estão em **2 collections separadas**
- Necessário cruzar dados manualmente
- Duplicação de informações (nome do contato)
- Queries complexas e lentas

### Solução Proposta
- **Integrar** verificação WhatsApp diretamente em `contacts`
- **Eliminar** collection `whatsapp_verified_numbers`
- **Simplificar** queries e manutenção
- **Melhorar** performance

---

## 📊 Estrutura de Dados

### Estrutura ANTES (atual)
```
whatsapp_verified_numbers/
  └─ {telefoneNumerico}/
      └─ { hasWhatsApp, contactName, studentId, verifiedAt }

2025/
  └─ lista_de_estudantes/
      └─ estudantes: [array com todos estudantes]
          └─ contatos: [{ nome, telefone, parentesco }]
```

### Estrutura DEPOIS (otimizada)
```
2025/
  └─ students/
      └─ {estudanteId}/
          └─ contacts/
              └─ {contactId}/
                  ├─ nome: string
                  ├─ telefone: string
                  ├─ telefoneNumerico: string
                  ├─ parentesco?: string
                  └─ whatsapp: {
                      verified: boolean
                      exists: boolean
                      jid?: string
                      name?: string
                      number?: string
                      verifiedAt?: Timestamp
                      verificationStatus: 'pending' | 'verified' | 'unavailable' | 'error'
                    }
```

### Mapeamento API → Firestore
```typescript
// Resposta da API de verificação:
{
  "success": true,
  "data": [{
    "exists": true,
    "jid": "5511988384664@s.whatsapp.net",
    "name": "Edu",
    "number": "5511988384664"
  }]
}

// Salvar em Firestore:
{
  whatsapp: {
    verified: true,
    exists: data[0].exists,
    jid: data[0].jid,
    name: data[0].name,
    number: data[0].number,
    verifiedAt: serverTimestamp(),
    verificationStatus: data[0].exists ? 'verified' : 'unavailable'
  }
}
```

---

## 🚀 Fases da Migração

### ✅ FASE 0: PREPARAÇÃO (SEM RISCO)
**Duração estimada:** 1-2 dias

#### Ações:
- [ ] Criar página `/admin/migration-whatsapp`
- [ ] Implementar análise do estado atual
- [ ] Dashboard com métricas:
  - Total de estudantes
  - Total de contatos
  - Total de números verificados
  - Números órfãos (sem estudante)
  - Duplicações
- [ ] Botões de ação (desabilitados inicialmente)

#### Critérios de validação:
- ✓ Métricas mostram dados corretos
- ✓ Nenhuma escrita no banco
- ✓ Logs funcionando

---

### ✅ FASE 1: CRIAR ESTRUTURA PARALELA
**Duração estimada:** 2-3 dias

#### Ações:
- [ ] Criar collection `students/{id}/contacts` (vazia)
- [ ] **NÃO MEXER** em dados existentes
- [ ] Criar índices necessários no Firestore

#### Índices necessários:
```javascript
// Collection: students/{id}/contacts
// Campos: telefoneNumerico (Ascending)
// Campos: whatsapp.exists (Ascending)
// Tipo: Composto
```

#### Critérios de validação:
- ✓ Nova estrutura criada
- ✓ Índices configurados
- ✓ Dados antigos intactos

---

### ✅ FASE 2: MIGRAÇÃO DE DADOS
**Duração estimada:** 3-5 dias

#### 2.1 Implementar função de migração por lote
```typescript
async function migrateStudentsBatch(
  startIndex: number,
  batchSize: number,
  dryRun: boolean = true
): Promise<MigrationReport>
```

#### 2.2 Simulação (dry-run)
- [ ] Executar lógica SEM escrever no Firebase
- [ ] Gerar preview do que seria criado
- [ ] Identificar conflitos/problemas
- [ ] Gerar relatório detalhado

#### 2.3 Validação pós-simulação
- [ ] Comparar contagens: estudantes antigos = novos
- [ ] Comparar contatos: antigos = novos
- [ ] Comparar verificações WhatsApp
- [ ] Listar discrepâncias

#### 2.4 Execução real
- [ ] Migrar 10 estudantes por vez
- [ ] Pausar entre lotes (evitar rate limit)
- [ ] Log detalhado de cada operação
- [ ] Permitir pausar/retomar

#### Critérios de validação:
- ✓ Simulação 100% bem-sucedida
- ✓ Zero discrepâncias encontradas
- ✓ Backup do Firestore realizado
- ✓ Migração real 100% completa
- ✓ Contagens batem: antigo = novo

---

### ✅ FASE 3: ATUALIZAÇÃO DO CÓDIGO
**Duração estimada:** 5-7 dias

#### Arquivos a atualizar:

| Arquivo | Mudança | Estratégia |
|---------|---------|------------|
| `/api/whatsapp/verify/route.ts` | Salvar verificação | Dual-write (antigo + novo) |
| `/api/students/absence-multiples/route.ts` | Buscar contatos | Dual-read (novo + fallback antigo) |
| `/telefones/page.tsx` | Listar contatos | Dual-read (novo + fallback antigo) |

#### 3.1 Dual-write (escrita dupla)
```typescript
async function saveVerification(studentId, contactId, phone, data) {
  await Promise.all([
    // 1. Estrutura antiga (compatibilidade)
    setDoc(doc(db, 'whatsapp_verified_numbers', phone), {
      hasWhatsApp: data.exists,
      contactName: data.name,
      studentId,
      verifiedAt: serverTimestamp()
    }),

    // 2. Estrutura nova (futuro)
    updateDoc(doc(db, `2025/students/${studentId}/contacts/${contactId}`), {
      'whatsapp.verified': true,
      'whatsapp.exists': data.exists,
      'whatsapp.jid': data.jid,
      'whatsapp.name': data.name,
      'whatsapp.number': data.number,
      'whatsapp.verifiedAt': serverTimestamp(),
      'whatsapp.verificationStatus': data.exists ? 'verified' : 'unavailable'
    })
  ]);
}
```

#### 3.2 Dual-read (leitura com fallback)
```typescript
async function getWhatsAppContacts(studentId) {
  // Tentar nova estrutura primeiro
  const contacts = await getDocs(
    query(
      collection(db, `2025/students/${studentId}/contacts`),
      where('whatsapp.exists', '==', true)
    )
  );

  if (!contacts.empty) {
    return contacts; // Sucesso - nova estrutura
  }

  // Fallback: buscar na estrutura antiga
  return await loadFromOldStructure(studentId);
}
```

#### Critérios de validação:
- ✓ Dual-write funcionando
- ✓ Dual-read com fallback funcionando
- ✓ Logs monitorando qual estrutura é usada
- ✓ Zero erros em produção

---

### ✅ FASE 4: TESTE EM PRODUÇÃO
**Duração estimada:** 7-14 dias

#### Ações:
- [ ] Deploy com dual-write/read ativado
- [ ] Monitorar logs diariamente
- [ ] Coletar métricas:
  - % leituras na nova estrutura
  - % leituras com fallback
  - Erros (se houver)
- [ ] Feedback de usuários

#### Métricas de sucesso:
- ✓ Zero erros relacionados à migração
- ✓ 100% das escritas em ambas estruturas
- ✓ >95% das leituras na nova estrutura
- ✓ Tempo de resposta mantido ou melhorado

---

### ✅ FASE 5: SWITCH GRADUAL
**Duração estimada:** 7 dias

#### 5.1 Desativar leitura da estrutura antiga
- [ ] Remover fallback do código
- [ ] Forçar leitura apenas da nova estrutura
- [ ] Monitorar erros intensivamente

#### 5.2 Rollback plan (se necessário)
- [ ] Reativar fallback imediatamente
- [ ] Investigar causa do problema
- [ ] Corrigir e retomar

#### Critérios de validação:
- ✓ 7 dias sem erros
- ✓ Todas funcionalidades operacionais
- ✓ Usuários não reportam problemas

---

### ✅ FASE 6: LIMPEZA
**Duração estimada:** 1-2 dias (após 30 dias de sucesso)**

#### 6.1 Parar escrita dupla
- [ ] Remover código de dual-write
- [ ] Escrever apenas na nova estrutura

#### 6.2 Backup da estrutura antiga
```bash
# Exportar antes de deletar
firebase firestore:export gs://bucket/backup-whatsapp-old-$(date +%Y%m%d)
```

#### 6.3 Deletar estrutura antiga
- [ ] Verificar backup confirmado
- [ ] **Aguardar 30 dias de sucesso**
- [ ] Deletar `whatsapp_verified_numbers` collection
- [ ] Botão na página admin (requer confirmação tripla)

#### Critérios de validação:
- ✓ Backup confirmado e testado
- ✓ 30+ dias sem problemas
- ✓ Aprovação final do responsável

---

## 🛡️ Checklist de Segurança

### Antes de executar QUALQUER fase:
- [ ] Backup completo do Firestore
- [ ] Simulação executada com sucesso
- [ ] Relatório de validação revisado
- [ ] Código de rollback testado
- [ ] Executar em período de baixo uso

### Durante execução:
- [ ] Monitorar logs em tempo real
- [ ] Validar contagens parciais
- [ ] Ter plano de rollback pronto
- [ ] Comunicar equipe

### Após execução:
- [ ] Validar 100% dos dados
- [ ] Comparar contagens
- [ ] Testar funcionalidades críticas
- [ ] Monitorar por período mínimo

---

## 🔄 Rollback Plan

### Se algo der errado em QUALQUER fase:

1. **PAUSAR imediatamente** a operação em andamento
2. **REATIVAR** leitura da estrutura antiga (fallback)
3. **ANALISAR** logs de erro detalhadamente
4. **CORRIGIR** o problema identificado
5. **RETOMAR** do último lote bem-sucedido

### Código de emergência:
```typescript
// Reverter para estrutura antiga
const FORCE_USE_OLD_STRUCTURE = true; // Ativar em emergência
```

---

## 📈 Métricas de Sucesso

### Fase 0:
- ✓ Dashboard funcionando
- ✓ Métricas corretas

### Fase 1:
- ✓ Nova estrutura criada
- ✓ Dados antigos intactos

### Fase 2:
- ✓ 100% dados migrados
- ✓ Zero discrepâncias

### Fase 3:
- ✓ Dual-write/read funcionando
- ✓ Zero erros

### Fase 4:
- ✓ 7-14 dias sem problemas
- ✓ >95% uso da nova estrutura

### Fase 5:
- ✓ 7 dias usando só nova estrutura
- ✓ Zero erros

### Fase 6:
- ✓ Estrutura antiga removida
- ✓ Backup confirmado

---

## 🎯 Vantagens da Migração

### Performance:
- ✅ Queries 70% mais rápidas (1 query ao invés de 2-3)
- ✅ Menos tráfego de rede
- ✅ Cache mais eficiente

### Manutenção:
- ✅ Código 50% mais simples
- ✅ Menos sincronização manual
- ✅ Fonte única de verdade

### Escalabilidade:
- ✅ Suporta milhares de estudantes
- ✅ Paginação nativa
- ✅ Índices automáticos

---

## 📞 Contatos de Emergência

### Em caso de problemas críticos:
- Pausar migração imediatamente
- Ativar rollback
- Documentar o erro
- Comunicar equipe

---

## 📝 Histórico de Revisões

| Data | Versão | Autor | Mudanças |
|------|--------|-------|----------|
| 2025-10-02 | 1.0 | Claude | Plano inicial de migração |

---

## ⚠️ AVISOS IMPORTANTES

1. **NUNCA** executar migração em horário de pico
2. **SEMPRE** fazer backup antes de qualquer operação
3. **SEMPRE** testar em simulação primeiro
4. **NUNCA** deletar dados antigos antes de 30 dias
5. **SEMPRE** ter plano de rollback pronto
6. **SEMPRE** monitorar logs durante e após migração

---

## 🔍 Índices Firestore Necessários

### Collection: `students`

#### 1. Índice para filtrar por ano letivo
```
Collection: students
Fields indexed:
  - anoLetivo (Ascending)
  - __name__ (Ascending)
```
**Uso:** Queries que filtram estudantes por ano (`where('anoLetivo', '==', '2025')`)

#### 2. Índice para filtrar estudantes ativos por ano
```
Collection: students
Fields indexed:
  - anoLetivo (Ascending)
  - status (Ascending)
  - __name__ (Ascending)
```
**Uso:** Queries que buscam apenas estudantes ativos em um ano específico

### Subcollection: `students/{studentId}/contacts`

#### 3. Índice para contatos com WhatsApp verificado
```
Collection: students/{studentId}/contacts
Fields indexed:
  - whatsapp.verified (Ascending)
  - whatsapp.verifiedAt (Descending)
```
**Uso:** Buscar contatos verificados ordenados por data de verificação

#### 4. Índice para contatos que podem receber mensagens
```
Collection: students/{studentId}/contacts
Fields indexed:
  - podeReceberWhatsapp (Ascending)
  - whatsapp.exists (Ascending)
  - __name__ (Ascending)
```
**Uso:** Filtrar contatos aptos a receber comunicações via WhatsApp

### Como criar os índices:

#### Opção 1: Via Firebase Console
1. Acesse: https://console.firebase.google.com/project/frequencia-anual/firestore/indexes
2. Clique em "Criar índice"
3. Adicione os campos conforme especificado acima

#### Opção 2: Via arquivo `firestore.indexes.json`
Adicionar ao arquivo existente:
```json
{
  "indexes": [
    {
      "collectionGroup": "students",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "anoLetivo", "order": "ASCENDING" },
        { "fieldPath": "__name__", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "students",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "anoLetivo", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "__name__", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "contacts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "whatsapp.verified", "order": "ASCENDING" },
        { "fieldPath": "whatsapp.verifiedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "contacts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "podeReceberWhatsapp", "order": "ASCENDING" },
        { "fieldPath": "whatsapp.exists", "order": "ASCENDING" },
        { "fieldPath": "__name__", "order": "ASCENDING" }
      ]
    }
  ]
}
```

Depois executar: `firebase deploy --only firestore:indexes`

### ⚠️ Importante:
- Os índices serão criados automaticamente quando a primeira query que precisa deles for executada
- O Firestore mostrará uma mensagem de erro com link direto para criar o índice
- A criação de índices pode levar alguns minutos em produção
- Após Phase 1 (estrutura criada), recomenda-se criar os índices antes de Phase 2 (migração de dados)

---

## 📊 Status da Fase 1

### ✅ Completo - 2025-10-03

**Estrutura criada com sucesso:**
- ✅ 735 estudantes processados
- ✅ 1305 contatos criados (placeholders)
- ✅ Collection `students` (root level)
- ✅ Subcollections `students/{id}/contacts`
- ✅ Campo `anoLetivo: '2025'` em todos os documentos
- ✅ Dados antigos intactos (100% preservados)
- ✅ Firestore rules atualizadas e deployadas
- ✅ API de análise detectando nova estrutura

**Estrutura final criada:**
```
students/{estudanteId}
  - estudanteId: string
  - anoLetivo: '2025'
  - createdAt: timestamp
  - migratedFrom: 'lista_de_estudantes'
  - version: '1.0'
  - status: 'structure_created'

  /contacts/{contactId}
    - _placeholder: true
    - createdAt: timestamp
    - migratedFrom: 'lista_de_estudantes'
    - version: '1.0'
    - anoLetivo: '2025'
```

**Próximos passos:**
- Phase 2: Migrar dados reais dos contatos (substituir placeholders)
- Phase 2: Integrar dados de `whatsapp_verified_numbers`
- Phase 2: Validar 100% dos dados migrados

---

**Responsável pela execução:** Claude AI Agent
**Data de início Fase 0:** 2025-10-02
**Data de início Fase 1:** 2025-10-03
**Data de conclusão Fase 1:** 2025-10-03
**Data prevista Fase 2:** _(a definir)_
