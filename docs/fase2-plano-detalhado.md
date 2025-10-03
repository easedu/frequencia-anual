# 📋 Plano Detalhado - Fase 2: Migração de Dados

**Data de criação:** 2025-10-03
**Engenheiro responsável:** Claude AI Agent (15+ anos exp. Firebase/Next.js)
**Status:** 🔄 Em planejamento

---

## 🎯 Objetivo da Fase 2

Migrar os dados reais dos contatos da estrutura antiga (`2025/lista_de_estudantes`) para a nova estrutura (`students/{id}/contacts`), integrando com os dados de verificação WhatsApp (`whatsapp_verified_numbers`).

---

## 📊 Análise Realizada

### Estrutura Antiga (Fonte):
```
2025/lista_de_estudantes
  estudantes: Array[735]
    [i]
      estudanteId: string
      nome: string
      turma: string
      status: string
      bolsaFamilia: string
      turno: string
      contatos: Array
        [j]
          nome: string
          telefone: string
          telefoneNumerico?: string  // ⚠️ Pode não existir!
          parentesco?: string
          podeReceberWhatsapp?: boolean
```

### WhatsApp Verified Numbers (Integração):
```
whatsapp_verified_numbers/{telefoneNumerico}
  hasWhatsApp: boolean
  phone: string
  verifiedAt: timestamp
  messageCount?: number
  lastMessageAt?: timestamp
  jid?: string
  contactName?: string
```

### Nova Estrutura (Destino):
```
students/{estudanteId}
  estudanteId: string
  anoLetivo: "2025"
  createdAt: timestamp
  migratedFrom: "lista_de_estudantes"
  version: "1.0"
  status: "structure_created" → "migrated"

  /contacts/{contactId}
    nome: string
    telefone: string
    telefoneNumerico: string
    parentesco: string | null
    podeReceberWhatsapp: boolean

    whatsapp: {
      verified: boolean
      exists: boolean | null
      jid: string | null
      name: string | null
      number: string | null
      verifiedAt: timestamp | null
      verificationStatus: 'verified' | 'unavailable' | 'pending' | null
    }

    createdAt: timestamp
    migratedFrom: "lista_de_estudantes"
    version: "1.0"
    anoLetivo: "2025"
```

### Estatísticas:
- **735 estudantes** a migrar
- **1305 contatos** a migrar
- **1418 números** verificados no WhatsApp
- **Média:** 1.78 contatos por estudante

---

## ⚠️ Desafios Identificados

### 1. Campo `telefoneNumerico` pode não existir
**Problema:** Análise mostrou que alguns contatos só têm `telefone` (formatado), sem `telefoneNumerico`.

**Solução:**
- Se `telefoneNumerico` existir: usar direto
- Se NÃO existir: extrair dígitos de `telefone` (remover formatação)
```typescript
const telefoneNumerico = contato.telefoneNumerico ||
                         contato.telefone?.replace(/\D/g, '') ||
                         '';
```

### 2. Integração com WhatsApp Verified Numbers
**Problema:** Precisamos cruzar dados de 2 collections diferentes.

**Solução:**
1. Para cada contato, buscar em `whatsapp_verified_numbers/{telefoneNumerico}`
2. Se existir: copiar dados de verificação
3. Se NÃO existir: deixar campos WhatsApp como `null`

### 3. IDs dos Contatos
**Problema:** Contatos antigos estão em array (sem ID único).

**Solução:** Usar índice do array para gerar ID consistente:
```typescript
const contactId = `contact_${index + 1}`;
// contact_1, contact_2, contact_3, ...
```

---

## 🔄 Estratégia de Migração

### Abordagem: **Migração Gradual com Dry-Run**

#### Etapa 1: Dry-Run (Simulação)
- ✅ Executar lógica SEM escrever no Firebase
- ✅ Gerar preview completo do que será criado
- ✅ Identificar problemas/conflitos
- ✅ Gerar relatório detalhado com contagens

#### Etapa 2: Validação do Dry-Run
- ✅ Comparar contagens: estudantes, contatos, telefones
- ✅ Verificar 100% dos dados têm campos obrigatórios
- ✅ Listar discrepâncias (se houver)
- ✅ Aprovação manual para prosseguir

#### Etapa 3: Migração Real
- ✅ Processar em lotes de 10 estudantes
- ✅ Usar `Promise.all` para otimizar (dentro do lote)
- ✅ Pausar 100ms entre lotes (evitar rate limit)
- ✅ Log detalhado de cada operação
- ✅ Permitir pausar/retomar se necessário

#### Etapa 4: Validação Pós-Migração
- ✅ Verificar 100% dos estudantes migrados
- ✅ Comparar contagens finais
- ✅ Testar queries na nova estrutura
- ✅ Garantir estrutura antiga intacta

---

## 💻 Implementação Técnica

### API Route: `/api/admin/migration-whatsapp-migrate-data`

#### Request:
```typescript
{
  dryRun: boolean,      // true = simular, false = executar
  batchSize?: number,   // padrão: 10
  startFrom?: number    // para retomar (padrão: 0)
}
```

#### Response:
```typescript
{
  success: boolean,
  dryRun: boolean,

  progress: {
    studentsProcessed: number,
    contactsMigrated: number,
    whatsappIntegrated: number,
    currentBatch: number,
    totalBatches: number
  },

  validation: {
    oldDataIntact: boolean,
    newDataCreated: boolean,
    countMatch: boolean
  },

  errors: string[],
  warnings: string[],

  preview?: {
    sampleStudent: string,
    sampleContact: object,
    estimatedTime: string
  }
}
```

### Lógica de Migração:

```typescript
async function migrateDataBatch(dryRun: boolean, batchSize: number, startFrom: number) {
  // 1. Ler estudantes da estrutura antiga
  const oldStudentsRef = doc(db, '2025', 'lista_de_estudantes');
  const oldStudentsSnap = await getDoc(oldStudentsRef);
  const estudantes = oldStudentsSnap.data().estudantes || [];

  // 2. Processar em lotes
  const batch = estudantes.slice(startFrom, startFrom + batchSize);

  for (const estudante of batch) {
    // 3. Atualizar documento do estudante (remover flag placeholder)
    if (!dryRun) {
      await updateDoc(doc(db, 'students', estudante.estudanteId), {
        status: 'migrated',
        migratedAt: serverTimestamp(),
        nome: estudante.nome,
        turma: estudante.turma,
        statusEstudante: estudante.status,
        bolsaFamilia: estudante.bolsaFamilia,
        turno: estudante.turno
      });
    }

    // 4. Migrar contatos
    if (estudante.contatos && Array.isArray(estudante.contatos)) {
      for (let i = 0; i < estudante.contatos.length; i++) {
        const contato = estudante.contatos[i];
        const contactId = `contact_${i + 1}`;

        // 4.1 Extrair telefone numérico
        const telefoneNumerico = contato.telefoneNumerico ||
                                 contato.telefone?.replace(/\D/g, '') ||
                                 '';

        // 4.2 Buscar verificação WhatsApp
        let whatsappData = {
          verified: false,
          exists: null,
          jid: null,
          name: null,
          number: null,
          verifiedAt: null,
          verificationStatus: null
        };

        if (telefoneNumerico) {
          const whatsappRef = doc(db, 'whatsapp_verified_numbers', telefoneNumerico);
          const whatsappSnap = await getDoc(whatsappRef);

          if (whatsappSnap.exists()) {
            const whatsappDoc = whatsappSnap.data();
            whatsappData = {
              verified: true,
              exists: whatsappDoc.hasWhatsApp ?? null,
              jid: whatsappDoc.jid || null,
              name: whatsappDoc.contactName || null,
              number: whatsappDoc.phone || contato.telefone,
              verifiedAt: whatsappDoc.verifiedAt || null,
              verificationStatus: whatsappDoc.hasWhatsApp ? 'verified' : 'unavailable'
            };
          }
        }

        // 4.3 Criar/atualizar contato
        const contactData = {
          nome: contato.nome || '',
          telefone: contato.telefone || '',
          telefoneNumerico: telefoneNumerico,
          parentesco: contato.parentesco || null,
          podeReceberWhatsapp: contato.podeReceberWhatsapp ?? true,

          whatsapp: whatsappData,

          createdAt: serverTimestamp(),
          migratedFrom: 'lista_de_estudantes',
          version: '1.0',
          anoLetivo: '2025',
          _placeholder: false  // Remover flag
        };

        if (!dryRun) {
          await setDoc(
            doc(db, 'students', estudante.estudanteId, 'contacts', contactId),
            contactData
          );
        }
      }
    }
  }

  // 5. Validar estrutura antiga intacta
  const validation = await validateOldDataIntact();

  return {
    studentsProcessed: batch.length,
    validation
  };
}
```

---

## ✅ Critérios de Validação

### Pré-Migração:
- [x] Análise de estrutura completa
- [x] Mapeamento de campos definido
- [x] Tratamento de exceções planejado
- [ ] Dry-run executado com sucesso
- [ ] Preview validado manualmente

### Durante Migração:
- [ ] Logs detalhados funcionando
- [ ] Contagens parciais corretas
- [ ] Nenhum erro crítico
- [ ] Performance aceitável (< 5min para 735)

### Pós-Migração:
- [ ] 100% estudantes migrados (735/735)
- [ ] 100% contatos migrados (1305/1305)
- [ ] Estrutura antiga intacta
- [ ] Queries na nova estrutura funcionando
- [ ] Zero discrepâncias

---

## 🛡️ Segurança

### Antes de Executar:
- [x] Backup do Firestore existe (estrutura antiga)
- [ ] Dry-run aprovado
- [ ] Período de baixo uso
- [ ] Equipe comunicada

### Durante Execução:
- [ ] Monitorar logs em tempo real
- [ ] Dashboard aberto
- [ ] Rollback pronto

### Rollback (se necessário):
```typescript
// 1. Pausar migração
// 2. Deletar collection students/ (nova)
// 3. Estrutura antiga permanece intacta
// 4. Aplicação continua funcionando
```

---

## 📊 Estimativas

### Tempo Estimado:
- Dry-run: ~2 minutos (735 estudantes, apenas leitura)
- Migração real: ~5 minutos (735 estudantes, 1305 writes)
- Validação: ~1 minuto
- **Total: ~10 minutos**

### Performance:
- Batch size: 10 estudantes
- Batches totais: 74 (735 / 10)
- Pause entre batches: 100ms
- Tempo médio/batch: ~4s
- **Estimativa: 74 × 4s = ~5 minutos**

---

## 🚦 Próximos Passos

### Etapa Atual: Implementação
1. ✅ Análise completa
2. ✅ Plano detalhado criado
3. 🔄 **Próximo: Implementar API de migração**
4. ⏳ Testar dry-run
5. ⏳ Executar migração real
6. ⏳ Validar resultados

---

## 📝 Notas Importantes

1. **Estrutura antiga PERMANECE INTACTA** durante toda a Fase 2
2. **Aplicação continua usando estrutura antiga** (nenhuma mudança no código)
3. **Nova estrutura será populada em paralelo**
4. **Fase 3** (próxima) é que implementará dual-write/dual-read
5. **Rollback é simples:** deletar collection `students/` (dados antigos preservados)

---

**Status:** ✅ Pronto para implementação
**Aprovação:** Aguardando confirmação do usuário
