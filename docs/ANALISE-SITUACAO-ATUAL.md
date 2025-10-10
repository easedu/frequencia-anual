# 🔍 Análise Completa da Situação Atual - Firebase

> **Data da Análise**: 2025-10-10
> **Status Quota**: ESGOTADA (50k/50k reads)
> **Objetivo**: Mapear TODA a estrutura atual antes da migração para Supabase

---

## 📊 ESTRUTURAS ATUAIS NO FIREBASE

### 1️⃣ V1 - Estrutura Legada (Descontinuada mas ainda existe)

```
Firestore:
└── 2025/
    ├── lista_de_estudantes/       # ❌ LEGADO
    │   └── [documento único com array]
    │       └── estudantes: [
    │             { id, nome, contatos: [...] }
    │           ]
    ├── ano_letivo/                 # ✅ AINDA USADO (dados do calendário)
    │   └── { bimestres, dias letivos }
    ├── faltas/                     # ❌ LEGADO
    │   └── controle/
    │       └── [documentos de faltas antigas]
    ├── atestados/                  # ❌ LEGADO
    │   └── {estudanteId}/
    │       └── [documentos de atestados]
    ├── suspensoes/                 # ❌ LEGADO
    │   └── {estudanteId}/
    │       └── [documentos de suspensões]
    └── interactions/               # ❌ LEGADO
        └── {estudanteId}/
            └── [documentos de interações]
```

**Status**: ⚠️ Dados antigos podem ainda existir aqui

---

### 2️⃣ V2 - Estrutura Escola (Transição)

```
Firestore:
└── 2025/
    └── escola/
        └── students/              # ✅ DUAL-WRITE ATIVO
            └── {estudanteId}/     # ID = timestamp numérico
                ├── id: string
                ├── nome: string
                ├── turma: string
                ├── turno: string
                ├── status: string
                ├── dataNascimento: string
                ├── numeroMatricula: string
                ├── deficiencias: [...]
                ├── contatos: [      # ⚠️ EMBARCADO (não normalizado)
                │     {
                │       nome: string,
                │       parentesco: string,
                │       telefone: string,
                │       email: string
                │     }
                │   ]
                ├── endereco: {...}
                └── bolsaFamilia: boolean
```

**Status**: ✅ ESCRITA ATIVA (dual-write)
**Problema**: Dados embarcados, não normalizado

---

### 3️⃣ V3 - Nova Estrutura Normalizada (Atual)

```
Firestore:
└── estudantes/                    # ✅ ESTRUTURA PRINCIPAL ATUAL
    └── {estudanteId}/             # ID = UUID v4
        ├── estudanteId: string (UUID)
        ├── nome: string
        ├── turma: string
        ├── turno: "MANHÃ" | "TARDE"
        ├── status: "ATIVO" | "INATIVO"
        ├── dataNascimento: string (DDMMYYYY)
        ├── numeroMatricula: string
        ├── anoLetivo: number
        ├── deficiencias: [...] | null
        ├── endereco: {...} | null
        ├── bolsaFamilia: boolean
        ├── createdAt: Timestamp
        ├── updatedAt: Timestamp
        │
        ├── contacts/              # ✅ SUBCOLEÇÃO NORMALIZADA
        │   └── {contactId}/
        │       ├── nome: string
        │       ├── parentesco: string
        │       ├── telefone: string
        │       ├── telefoneNumerico: string
        │       ├── email: string
        │       ├── podeReceberWhatsapp: boolean
        │       ├── createdAt: Timestamp
        │       └── updatedAt: Timestamp
        │
        ├── atestados/             # ✅ SUBCOLEÇÃO
        │   └── {atestadoId}/
        │       ├── startDate: string
        │       ├── days: number
        │       ├── description: string
        │       ├── createdAt: Timestamp
        │       └── updatedAt: Timestamp
        │
        ├── suspensoes/            # ❓ EXISTE?
        │   └── {...}
        │
        └── interactions/          # ❓ EXISTE?
            └── {...}
```

**Status**: ✅ LEITURA E ESCRITA ATIVAS
**Flag**: `USE_V3_READS = true` (desde 05/10/2025)

---

### 4️⃣ Coleções Globais (Independentes de Versão)

```
Firestore:
├── absences/                      # ✅ GLOBAL (controle de faltas)
│   └── {absenceId}/
│       ├── estudanteId: string
│       ├── data: string (DDMMYYYY)
│       ├── tipo: "FALTA" | "PRESENÇA"
│       ├── justificada: boolean
│       ├── bimestre: number
│       ├── mes: number
│       ├── ano: number
│       ├── createdAt: Timestamp
│       └── updatedAt: Timestamp
│
├── tarefas/                       # ✅ GLOBAL (gerenciador de tarefas)
│   └── {taskId}/
│       ├── estudanteId: string
│       ├── title: string
│       ├── description: string
│       ├── priority: "ALTA" | "MÉDIA" | "BAIXA"
│       ├── status: "PENDING" | "IN_PROGRESS" | "COMPLETED"
│       ├── created_by: string
│       ├── assigned_to: string
│       ├── due_date: Timestamp
│       ├── is_resolved: boolean
│       ├── resolution_notes: string
│       ├── action_taken: string
│       ├── recommended_action: string
│       ├── whatsapp_phone: string
│       ├── createdAt: Timestamp
│       └── updatedAt: Timestamp
│
├── users/                         # ✅ GLOBAL (usuários do sistema)
│   └── {userId}/
│       ├── uid: string
│       ├── email: string
│       ├── displayName: string
│       ├── perfil: "admin" | "usuario"
│       ├── createdAt: Timestamp
│       └── updatedAt: Timestamp
│
├── whatsappMessageHistory/        # ✅ GLOBAL (histórico WhatsApp)
│   └── {messageId}/
│       ├── estudanteId: string
│       ├── contatoTelefone: string
│       ├── contatoNome: string
│       ├── estudanteNome: string
│       ├── anoReferencia: number
│       ├── mesReferencia: number
│       ├── quantidadeFaltas: number
│       ├── taskId: string
│       ├── dataPrimeiroEnvio: string
│       ├── status: "SUCCESS" | "FAILED" | "NO_CONTACT"
│       ├── messageId: string
│       ├── sentAt: number
│       ├── retryCount: number
│       └── isDryRun: boolean
│
└── 2025/                          # ✅ ANO LETIVO
    └── ano_letivo/                # ✅ DADOS DO CALENDÁRIO
        └── {
              "1º Bimestre": {
                "dates": [
                  { "date": "2025-02-01", "isChecked": true },
                  ...
                ]
              },
              "2º Bimestre": {...},
              "3º Bimestre": {...},
              "4º Bimestre": {...}
            }
```

---

## 🔴 PROBLEMAS IDENTIFICADOS

### 1. **Triplicação de Dados de Estudantes**

```
MESMO estudante existe em 3 lugares:

V1: 2025/lista_de_estudantes         (array embarcado)
V2: 2025/escola/students/{id}         (documento com ID numérico)
V3: estudantes/{uuid}                 (documento com UUID)

Total de estudantes: 700
Duplicações potenciais: 2.100 registros (!!)
```

### 2. **IDs Duplicados/Conflitantes**

```
V2: estudanteId = "1728394756432" (timestamp)
V3: estudanteId = "550e8400-e29b-41d4-a716-446655440000" (UUID)

PROBLEMA: Qual é o ID "verdadeiro"?
```

### 3. **Dados Embarcados vs Normalizados**

```
V2: contatos = [...] dentro do documento do estudante
V3: contatos = subcoleção contacts/ separada

PROBLEMA: Duplicação de contatos, sincronização difícil
```

### 4. **Atestados em Múltiplos Lugares**

```
V1: 2025/atestados/{estudanteId}/...
V3: estudantes/{uuid}/atestados/...

PROBLEMA: Atestados antigos podem estar em V1, novos em V3
```

### 5. **Faltas Globais vs Locais**

```
GLOBAL: absences/ (coleção raiz)
V3: estudantes/{uuid}/... (sem subcoleção de absences)

DECISÃO NECESSÁRIA: Manter global ou mover para subcoleção?
```

---

## 📈 VOLUME DE DADOS ESTIMADO

| Coleção/Estrutura | Quantidade | Tamanho Médio | Total |
|-------------------|------------|---------------|-------|
| **Estudantes V1** | ~700 | 1KB | ~700KB |
| **Estudantes V2** | ~700 | 2KB | ~1.4MB |
| **Estudantes V3** | ~700 | 1KB | ~700KB |
| **Contatos (V3 subcol)** | ~1.400 | 0.5KB | ~700KB |
| **Absences (global)** | ~5.000 | 0.3KB | ~1.5MB |
| **Atestados V1** | ~50 | 0.5KB | ~25KB |
| **Atestados V3** | ~100 | 0.5KB | ~50KB |
| **Tarefas** | ~50 | 1KB | ~50KB |
| **WhatsApp History** | ~20 | 1KB | ~20KB |
| **Users** | ~12 | 0.5KB | ~6KB |
| **Ano Letivo** | 1 | 50KB | ~50KB |
| **TOTAL** | | | **~5.2MB** |

**Duplicação estimada**: 40-50% (dados replicados em V1/V2/V3)

---

## 🎯 DECISÕES NECESSÁRIAS ANTES DA MIGRAÇÃO

### 1. **Qual versão é a "fonte da verdade"?**
   - [ ] V3 (estudantes/) - **RECOMENDADO** ✅
   - [ ] V2 (2025/escola/students/)
   - [ ] Mesclar dados de todas as versões

### 2. **O que fazer com dados legados?**
   - [ ] Manter V1/V2 intactos (archive)
   - [ ] Deletar após migração bem-sucedida
   - [ ] Exportar para backup externo antes de deletar

### 3. **Estrutura de faltas no Supabase?**
   - [ ] Manter global (tabela absences separada) - **RECOMENDADO** ✅
   - [ ] Mover para subcoleção/tabela relacionada

### 4. **IDs no Supabase?**
   - [ ] Usar UUID v4 da V3 como primary key - **RECOMENDADO** ✅
   - [ ] Gerar novos IDs no Supabase
   - [ ] Manter mapeamento V2 → V3

### 5. **Atestados antigos (V1)?**
   - [ ] Migrar todos para Supabase
   - [ ] Migrar apenas últimos 12 meses
   - [ ] Ignorar (dados históricos sem valor)

---

## 🧹 PLANO DE LIMPEZA DE DADOS

### Etapa 1: Consolidação (Antes da Migração)

```typescript
// Pseudocódigo

// 1. Identificar estudantes únicos
const uniqueStudents = new Map();

// 2. Para cada estudante em V3 (fonte da verdade)
for (const v3Student of estudantesV3) {
  uniqueStudents.set(v3Student.estudanteId, {
    source: 'V3',
    data: v3Student,
    v2Id: null, // será preenchido se encontrar correspondente
  });
}

// 3. Para cada estudante em V2
for (const v2Student of estudantesV2) {
  // Encontrar correspondente em V3 (por nome + turma + data nascimento)
  const match = findMatchInV3(v2Student);

  if (match) {
    // Atualizar mapeamento
    uniqueStudents.get(match.estudanteId).v2Id = v2Student.id;

    // Mesclar dados que podem estar diferentes
    mergeData(uniqueStudents.get(match.estudanteId), v2Student);
  } else {
    // Estudante existe apenas em V2 (dados antigos?)
    console.warn(`Estudante ${v2Student.nome} existe apenas em V2`);
  }
}

// 4. Resultado: Map de estudantes únicos com dados consolidados
```

### Etapa 2: Validação

```typescript
// Verificar integridade

// 1. Todos os estudantes V3 têm contatos?
const semContatos = estudantesV3.filter(e => !e.contacts || e.contacts.length === 0);

// 2. Há estudantes duplicados por nome?
const duplicatedNames = findDuplicates(estudantesV3, 'nome');

// 3. Atestados órfãos (estudanteId não existe)?
const orphanAtestados = atestadosV3.filter(a => !uniqueStudents.has(a.estudanteId));

// 4. Faltas órfãs (estudanteId não existe)?
const orphanAbsences = absences.filter(a => !uniqueStudents.has(a.estudanteId));
```

### Etapa 3: Relatório de Limpeza

```markdown
📊 RELATÓRIO DE CONSOLIDAÇÃO

✅ Estudantes únicos identificados: 700
⚠️ Estudantes apenas em V2 (legado): 5
⚠️ Estudantes sem contatos: 12
⚠️ Nomes duplicados: 3 pares
❌ Atestados órfãos: 2
❌ Faltas órfãs: 0

AÇÕES RECOMENDADAS:
1. Revisar 5 estudantes legados (decidir se migrar)
2. Adicionar contatos aos 12 estudantes
3. Resolver duplicação de nomes (sufixo?)
4. Deletar 2 atestados órfãos
```

---

## 📋 CHECKLIST DE ANÁLISE

### Dados Mapeados
- [x] Estrutura V1 (legado)
- [x] Estrutura V2 (transição)
- [x] Estrutura V3 (atual)
- [x] Coleções globais
- [x] Volume estimado

### Problemas Identificados
- [x] Triplicação de estudantes
- [x] IDs conflitantes
- [x] Dados embarcados vs normalizados
- [x] Atestados em múltiplos lugares
- [x] Decisão sobre faltas (global vs local)

### Próximos Passos
- [ ] Definir decisões arquiteturais (próximo documento)
- [ ] Criar script de consolidação
- [ ] Validar dados consolidados
- [ ] Desenhar schema SQL do Supabase
- [ ] Criar plano de migração faseado

---

**Status**: ✅ Análise completa documentada
**Próximo**: Decisões arquiteturais e schema SQL
**Data**: 2025-10-10
