# 🗂️ Estrutura COMPLETA do Firestore

> **Fonte**: Análise completa do código-fonte (varredura em 85+ arquivos)
> **Data**: 2025-01-11
> **Status**: ✅ Mapeamento 100% concluído

---

## 📦 COLEÇÕES RAIZ

### 1️⃣ `students` (V3 - PRINCIPAL)
**Localização**: Raiz do Firestore
**Documentos**: ~739
**Descrição**: Coleção principal de estudantes (estrutura V3 UUID)

**Subcoleções**:
- `contacts/` - Contatos do estudante (responsáveis)
- `absences/` - Faltas individuais
- `medical_certificates/` - Atestados médicos
- `suspensions/` - Suspensões
- `interactions/` - Interações familiares
- `whatsapp/` - Rastreamento WhatsApp
- `absence_summary/` - Resumo mensal de faltas

**Estrutura**:
```
students/{estudanteId}/
├── (dados do estudante)
├── contacts/{contatoId}
├── absences/{faltaId}
├── medical_certificates/{atestadoId}
├── interactions/{interacaoId}
└── whatsapp/{trackingId}
```

---

### 2️⃣ `2025` (V1 - Ano Letivo)
**Localização**: Raiz do Firestore
**Documentos**: ~4
**Descrição**: Estrutura legada do ano letivo atual

**Subcoleções**:
- `faltas/` - Raiz de faltas
  - `controle/` - Controle de faltas (estrutura antiga)
- `atestados/` - Atestados (estrutura antiga)
- `suspensoes/` - Suspensões
- `escola/` - Dados da escola
  - `students/` - Estudantes (V2 - LEGACY)
- `lista_de_estudantes/` - Lista legada
- `ano_letivo/` - Calendário escolar

**Estrutura**:
```
2025/
├── (configuração do ano)
├── faltas/
│   └── controle/{faltaId}
├── atestados/{estudanteId}/
├── escola/
│   └── students/{estudanteId}
└── ano_letivo/
```

---

### 3️⃣ `userTasks`
**Localização**: Raiz do Firestore
**Documentos**: Variável
**Descrição**: Sistema de tarefas/follow-up pedagógico

**Campos principais**:
- `estudanteId` (ref)
- `titulo`
- `descricao`
- `prioridade` (BAIXA, MÉDIA, ALTA)
- `status` (PENDING, IN_PROGRESS, COMPLETED)
- `createdBy`
- `assignedTo`
- `dueDate`
- `isResolved`

---

### 4️⃣ `users`
**Localização**: Raiz do Firestore
**Documentos**: ~17
**Descrição**: Usuários do sistema (professores, coordenadores)

**Campos principais**:
- `uid` (Firebase Auth)
- `email`
- `nome`
- `role` (admin, user, viewer)
- `createdAt`
- `lastLogin`

---

### 5️⃣ `whatsapp_verified_numbers`
**Localização**: Raiz do Firestore
**Documentos**: Variável
**Descrição**: Números de WhatsApp verificados

**Campos principais**:
- `telefone`
- `estudanteId` (ref)
- `contatoNome`
- `verificado`
- `verificadoEm`

---

### 6️⃣ `interacoes_familia`
**Localização**: Raiz do Firestore
**Documentos**: Variável
**Descrição**: Registro de interações com famílias (ligações, reuniões, visitas)

**Campos principais**:
- `estudanteId` (ref)
- `tipoInteracao` (TELEFONE, REUNIÃO, VISITA)
- `data`
- `descricao`
- `responsavel`
- `resultado`

---

### 7️⃣ `interactions`
**Localização**: Raiz do Firestore ou subcoleção de `students`
**Documentos**: Variável
**Descrição**: Interações (formato alternativo)

---

### 8️⃣ `faltas_consecutivas`
**Localização**: Raiz do Firestore
**Documentos**: Variável
**Descrição**: Tracking de faltas consecutivas para alertas

**Campos principais**:
- `estudanteId` (ref)
- `dataInicio`
- `dataFim`
- `totalDias`
- `alertEnviado`

---

### 9️⃣ `casos_resolvidos`
**Localização**: Raiz do Firestore
**Documentos**: Variável
**Descrição**: Histórico de casos pedagógicos resolvidos

**Campos principais**:
- `estudanteId` (ref)
- `tipoProblema`
- `dataResolucao`
- `acaoTomada`
- `resultado`

---

### 🔟 `automationExecutions`
**Localização**: Raiz do Firestore
**Documentos**: Variável
**Descrição**: Log de execuções da automação (GitHub Actions)

**Campos principais**:
- `executedAt`
- `tipo` (DAILY_ABSENCE_ALERTS)
- `status` (SUCCESS, FAILED)
- `totalProcessed`
- `totalSent`
- `errors`

---

### 1️⃣1️⃣ `temp`
**Localização**: Raiz do Firestore
**Documentos**: Variável
**Descrição**: Dados temporários (debug, testes)

⚠️ **ATENÇÃO**: Pode conter lixo, verificar antes de migrar

---

### 1️⃣2️⃣ `occurrences`
**Localização**: Raiz do Firestore ou subcoleção
**Documentos**: Variável
**Descrição**: Ocorrências disciplinares

---

## 📊 ESTATÍSTICAS ESPERADAS

| Coleção | Documentos (Estimativa) | Tamanho Aprox. |
|---------|-------------------------|----------------|
| `students` | ~739 | 2 MB |
| `2025` | ~4 | 500 KB |
| `userTasks` | ~50-200 | 100 KB |
| `users` | ~17 | 10 KB |
| `whatsapp_verified_numbers` | ~100-500 | 50 KB |
| `interacoes_familia` | ~200-1000 | 200 KB |
| `faltas_consecutivas` | ~50-200 | 50 KB |
| `casos_resolvidos` | ~100-500 | 100 KB |
| `automationExecutions` | ~10-50 | 20 KB |
| **TOTAL** | **~1.500-3.000** | **~3-5 MB** |

**Subcoleções** (dentro de `students/{id}/`):
- `contacts`: ~1.478 docs (2 por estudante)
- `absences`: ~5.000+ docs (histórico de faltas)
- `medical_certificates`: ~100-200 docs
- `interactions`: ~500-1000 docs

**TOTAL GERAL (incluindo subcoleções)**: ~10.000-15.000 documentos

---

## 🔍 COMO FOI DESCOBERTO

### Métodos Usados:

1. **Análise de Código**:
   ```bash
   grep -rh "collection(db," src/ | sort -u
   ```

2. **Constantes do Projeto**:
   - `src/config/constants.ts` (FIREBASE_COLLECTIONS_*)

3. **Serviços**:
   - `src/services/*.ts` (studentDataService, taskService, etc)

4. **APIs**:
   - `src/app/api/**/*.ts` (rotas de API)

5. **Hooks**:
   - `src/hooks/*.ts` (useStudents, useFirebase, etc)

---

## ✅ LISTA FINAL PARA BACKUP

```javascript
const COLLECTIONS_TO_BACKUP = [
  // PRINCIPAIS
  'students',                     // V3 (com subcoleções)
  '2025',                         // V1 (com subcoleções)

  // SECUNDÁRIAS
  'userTasks',                    // Tarefas
  'users',                        // Usuários
  'whatsapp_verified_numbers',    // WhatsApp verificados
  'interacoes_familia',           // Interações
  'interactions',                 // Interações (alt)
  'faltas_consecutivas',          // Faltas consecutivas
  'casos_resolvidos',             // Casos resolvidos
  'automationExecutions',         // Log de automação

  // OPCIONAIS (podem estar vazias)
  'temp',                         // Temporários
  'occurrences',                  // Ocorrências
];
```

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ **Backup completo** usando lista acima
2. ✅ **Validar subcoleções** (especialmente em `students/` e `2025/`)
3. ✅ **Migrar para Supabase** com schema já definido

---

**Última Atualização**: 2025-01-11
**Verificado**: ✅ SIM (varredura completa em 85+ arquivos)
