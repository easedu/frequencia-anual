# 🚀 PLANO DE MIGRAÇÃO: Absences V1/V2 → V3 (Estrutura Híbrida)

## ⚠️ PRINCÍPIO FUNDAMENTAL: ZERO PERDA DE DADOS

**Regra de Ouro**: NUNCA deletar dados da estrutura antiga até validação 100% completa da nova estrutura.

---

## 📋 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Análise de Impacto](#análise-de-impacto)
3. [Fase 0: Preparação e Backup](#fase-0-preparação-e-backup)
4. [Fase 1: Otimização Rápida (Índices)](#fase-1-otimização-rápida)
5. [Fase 2: Migração para V3](#fase-2-migração-para-v3)
6. [Fase 3: Dual-Write](#fase-3-dual-write)
7. [Fase 4: Validação](#fase-4-validação)
8. [Fase 5: Cutover](#fase-5-cutover)
9. [Fase 6: Cleanup](#fase-6-cleanup)
10. [Rollback Plan](#rollback-plan)

---

## 📊 VISÃO GERAL

### Estrutura Atual (V1/V2)
```
2025/
  └── faltas/
      └── controle/
          ├── {doc1}: { estudanteId, data, justified, atestadoId, turma, ... }
          ├── {doc2}: { estudanteId, data, justified, atestadoId, turma, ... }
          └── ... (~50.000 documentos)
```

### Estrutura Alvo (V3 Híbrida)
```
students/
  └── {studentId}/
      └── absences/
          ├── {absenceId}: { data, justified, atestadoId }
          └── ...

absences_summary/
  └── {YYYY-MM}/
      └── {studentId}: { dates[], count, justified, unjustified, lastUpdated }
```

### Objetivos
- ✅ **Performance**: 13s → 2-3s (4-6x mais rápido)
- ✅ **Custo**: Reduzir reads em 90%
- ✅ **Escalabilidade**: Suportar 10k+ estudantes
- ✅ **Zero downtime**: Sistema continua funcionando durante migração
- ✅ **Zero perda de dados**: 100% dos dados preservados

---

## 🎯 ANÁLISE DE IMPACTO

### Arquivos que Usam Absences (27 arquivos mapeados)

#### **LEITURA - Alta Prioridade (Requerem modificação)**

| Arquivo | Função | Impacto | Ação |
|---------|--------|---------|------|
| `src/services/firebase/attendanceService.ts` | `getAbsenceRecords()` | **CRÍTICO** | Migrar para V3 |
| `src/services/firebase/attendanceService.ts` | `getStudentAbsences()` | **CRÍTICO** | Usar subcoleção V3 |
| `src/services/firebase/attendanceService.ts` | `getAbsencesByDateRange()` | **ALTO** | Usar summary V3 |
| `src/app/api/students/absence-multiples/route.ts` | `loadStudentAbsencesForMonth()` | **CRÍTICO** | Usar summary V3 |
| `src/app/api/students/consecutive-absences/route.ts` | `loadAbsences()` | **CRÍTICO** | Usar summary V3 |
| `src/hooks/attendance/useStudentRecords.ts` | Hook de dados | **ALTO** | Adaptar para V3 |
| `src/hooks/useAttendanceData.ts` | Hook de dados | **ALTO** | Adaptar para V3 |
| `src/app/perfil-estudante/page.tsx` | UI de perfil | **MÉDIO** | Testar após migração |
| `src/app/relatorio-bolsa-familia/page.tsx` | Relatório | **MÉDIO** | Testar após migração |
| `src/app/monitorar-faltas-consecutivas/page.tsx` | Monitor | **MÉDIO** | Testar após migração |

#### **ESCRITA - Alta Prioridade (Requerem modificação)**

| Arquivo | Função | Impacto | Ação |
|---------|--------|---------|------|
| `src/services/firebase/attendanceService.ts` | `addAbsenceRecord()` | **CRÍTICO** | Dual-write V2+V3 |
| `src/services/firebase/attendanceService.ts` | `addAbsenceRecords()` | **CRÍTICO** | Dual-write V2+V3 |
| `src/app/marcar-faltas/page.tsx` | Marcar turma | **CRÍTICO** | Dual-write V2+V3 |

#### **COMPONENTES - Média Prioridade (Podem precisar ajustes)**

| Arquivo | Tipo | Impacto | Ação |
|---------|------|---------|------|
| `src/components/RegisteredAbsencesCard.tsx` | UI | **MÉDIO** | Testar |
| `src/components/TaskDashboard.tsx` | UI | **BAIXO** | Testar |
| `src/components/TaskManager.tsx` | UI | **BAIXO** | Testar |
| `src/components/attendance/BimesterAbsences.tsx` | UI | **MÉDIO** | Testar |
| `src/components/cards/DayOfWeekDistributionCard.tsx` | Charts | **BAIXO** | Testar |
| `src/components/cards/TemporalAnalysisCard.tsx` | Charts | **BAIXO** | Testar |
| `src/components/charts/EvolutionChart.tsx` | Charts | **BAIXO** | Testar |

#### **SCRIPTS - Baixa Prioridade (Podem ser descontinuados)**

| Arquivo | Função | Ação |
|---------|--------|------|
| `scripts/standardize-dates.ts` | Padronizar datas | Executar antes da migração |
| `scripts/verify-student-ids.ts` | Verificar IDs | Executar antes da migração |
| `scripts/fix-orphan-absences.ts` | Corrigir órfãos | Executar antes da migração |
| `scripts/fix-invalid-student-ids.ts` | Corrigir IDs | Executar antes da migração |

---

## 🔧 FASE 0: PREPARAÇÃO E BACKUP

### **Objetivo**: Garantir segurança total antes de qualquer mudança

### **Etapa 0.1: Backup Completo dos Dados**

**Script**: `scripts/migration/00-backup-absences.mjs`

```javascript
/**
 * BACKUP COMPLETO: Exporta TODAS as faltas para arquivo JSON
 * EXECUÇÃO: Uma vez antes de iniciar migração
 * ROLLBACK: Restaurar do arquivo JSON se necessário
 */
```

**Ações**:
1. ✅ Exportar todas as faltas de `2025/faltas/controle` para JSON
2. ✅ Salvar em `backups/absences-backup-YYYY-MM-DD-HHmmss.json`
3. ✅ Gerar checksum MD5 do arquivo
4. ✅ Contar total de documentos exportados
5. ✅ Validar que arquivo está íntegro

**Validação**:
- [ ] Arquivo JSON criado com sucesso
- [ ] Total de docs no arquivo = Total de docs no Firestore
- [ ] Checksum MD5 salvo
- [ ] Arquivo > 0 bytes

**Rollback**: Não aplicável (apenas leitura)

---

### **Etapa 0.2: Análise de Qualidade dos Dados**

**Script**: `scripts/migration/01-analyze-data-quality.mjs`

```javascript
/**
 * ANÁLISE DE QUALIDADE: Identifica problemas nos dados ANTES da migração
 */
```

**Validações**:
1. ✅ Estudantes órfãos (IDs que não existem em `students/`)
2. ✅ Datas inválidas ou formato incorreto
3. ✅ Duplicatas (mesmo estudante + mesma data)
4. ✅ Campos obrigatórios faltando
5. ✅ Faltas justificadas sem `atestadoId`

**Ações Corretivas**:
- [ ] Executar scripts de correção se necessário
- [ ] Documentar problemas encontrados
- [ ] Decidir se migra dados problemáticos ou corrige antes

**Validação**:
- [ ] Relatório de qualidade gerado
- [ ] Problemas críticos: 0
- [ ] Problemas menores: documentados

---

### **Etapa 0.3: Criar Estrutura V3 no Firestore**

**Script**: `scripts/migration/02-create-v3-structure.mjs`

```javascript
/**
 * CRIAR ESTRUTURA: Prepara collections V3 (sem dados ainda)
 */
```

**Ações**:
1. ✅ Criar collection `absences_summary/` (vazia)
2. ✅ Criar índices necessários
3. ✅ Criar regras de segurança temporárias
4. ✅ Testar permissões de leitura/escrita

**Índices Necessários**:
```javascript
// Collection Group: absences
{
  collectionGroup: "absences",
  fields: [
    { fieldPath: "data", order: "ASCENDING" },
  ]
}

// Collection: absences_summary/{month}
{
  collection: "absences_summary",
  fields: [
    { fieldPath: "count", order: "DESCENDING" },
  ]
}
```

**Validação**:
- [ ] Collections criadas
- [ ] Índices ativos (status: "READY")
- [ ] Regras de segurança aplicadas
- [ ] Teste de escrita bem-sucedido

---

### **Etapa 0.4: Criar Scripts de Validação**

**Scripts**:
1. `scripts/migration/utils/validate-data-integrity.mjs` - Validar integridade
2. `scripts/migration/utils/compare-v2-v3.mjs` - Comparar V2 vs V3
3. `scripts/migration/utils/count-records.mjs` - Contar registros

**Validações Implementadas**:
- ✅ Total de faltas V2 = Total de faltas V3
- ✅ Faltas por estudante V2 = Faltas por estudante V3
- ✅ Datas e flags (justified) idênticos
- ✅ Summary counts corretos

---

## ⚡ FASE 1: OTIMIZAÇÃO RÁPIDA (ÍNDICES)

### **Objetivo**: Ganho rápido de performance SEM migração de dados

**Tempo estimado**: 30 minutos
**Risco**: Baixo
**Ganho**: 1.6x mais rápido (13s → 8s)

---

### **Etapa 1.1: Criar Índices Compostos**

**Firestore Console** → Indexes → Create Index

**Índice 1: Consultas por estudante**
```
Collection: 2025/faltas/controle
Fields:
  - estudanteId (Ascending)
  - data (Ascending)
Query scope: Collection
```

**Índice 2: Consultas por turma + data**
```
Collection: 2025/faltas/controle
Fields:
  - turma (Ascending)
  - data (Ascending)
Query scope: Collection
```

**Índice 3: Consultas por data + justified**
```
Collection: 2025/faltas/controle
Fields:
  - data (Ascending)
  - justified (Ascending)
Query scope: Collection
```

**Validação**:
- [ ] Índices criados (status: "Building")
- [ ] Aguardar status: "READY" (~5-10 minutos)
- [ ] Testar queries usando índices

---

### **Etapa 1.2: Otimizar Código AttendanceService**

**Arquivo**: `src/services/firebase/attendanceService.ts`

**Mudanças**:

```typescript
// ANTES (linha 43)
static async getStudentAbsences(estudanteId: string): Promise<AbsenceRecord[]> {
  const allRecords = await AttendanceService.getAbsenceRecords(); // 🚨 Busca tudo
  return allRecords.filter(record => record.estudanteId === estudanteId);
}

// DEPOIS (otimizado com índice)
static async getStudentAbsences(estudanteId: string): Promise<AbsenceRecord[]> {
  try {
    const q = query(
      collection(db, FIREBASE_PATHS.absenceControl()),
      where('estudanteId', '==', estudanteId)
    );
    const snapshot = await getDocs(q);

    const records: AbsenceRecord[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      records.push({
        estudanteId: data.estudanteId || '',
        data: data.data || '',
        justified: data.justified || false,
        atestadoId: data.atestadoId,
      });
    });

    return records;
  } catch (error) {
    logger.error('Erro ao buscar faltas do estudante', error as Error);
    throw error;
  }
}
```

**Impacto**:
- De 50.000 reads → ~68 reads (735x menos)
- De 3-5s → 500ms (6-10x mais rápido)

**Validação**:
- [ ] Código modificado
- [ ] Testes unitários passando
- [ ] Testar em desenvolvimento
- [ ] Performance medida

---

### **Etapa 1.3: Otimizar API absence-multiples**

**Arquivo**: `src/app/api/students/absence-multiples/route.ts`

**Mudanças**:

```typescript
// Aumentar batch size de 10 para 30 (máximo do Firestore 'in')
const batchSize = 30; // ANTES: 10

// Aumentar paralelismo de 3 para 5
const maxConcurrentBatches = 5; // ANTES: 3
```

**Impacto**:
- De 68 queries → 23 queries (3x menos)
- De ~10s → ~4-5s (2x mais rápido)

**Validação**:
- [ ] Código modificado
- [ ] API testada com dados reais
- [ ] Performance medida
- [ ] Sem timeouts

---

### **Etapa 1.4: Validar Fase 1 Completa**

**Critérios de Sucesso**:
- [ ] Índices ativos e funcionando
- [ ] API absence-multiples: < 8s (antes: 13s)
- [ ] AttendanceService.getStudentAbsences: < 1s (antes: 3-5s)
- [ ] Nenhum erro em produção
- [ ] Regras de negócio intactas

**Se validação falhar**: Reverter mudanças de código, manter índices

---

## 🔄 FASE 2: MIGRAÇÃO PARA V3

### **Objetivo**: Migrar dados de V2 para V3 SEM interromper operação

**Tempo estimado**: 4-6 horas (execução) + 2-3 dias (desenvolvimento)
**Risco**: Médio (mitigado por dual-write)
**Ganho**: 4-6x mais rápido após cutover

---

### **Etapa 2.1: Script de Migração Histórica**

**Script**: `scripts/migration/03-migrate-historical-data.mjs`

**Estratégia**:
1. **Não deletar V2**: Manter dados originais intactos
2. **Copiar para V3**: Subcoleções + Summary
3. **Processar em batches**: 50 estudantes por vez
4. **Checkpoint**: Salvar progresso a cada 100 estudantes
5. **Retry automático**: Se falhar, retomar do último checkpoint

**Pseudocódigo**:
```javascript
async function migrateHistoricalAbsences() {
  // 1. Buscar todos os estudantes
  const students = await getStudents();

  // 2. Para cada estudante
  for (const student of students) {
    // 3. Buscar faltas V2
    const absencesV2 = await getAbsencesV2(student.id);

    // 4. Migrar para subcoleção V3
    await migrateToSubcollection(student.id, absencesV2);

    // 5. Atualizar summary mensal
    await updateMonthlySummary(student.id, absencesV2);

    // 6. Checkpoint
    await saveProgress(student.id);
  }

  // 7. Validar integridade
  await validateMigration();
}
```

**Detalhamento**:

**Passo 1**: Preparar batches
```javascript
const students = await getAllStudents(); // 736 estudantes
const batches = chunk(students, 50); // 15 batches de 50
```

**Passo 2**: Processar batch
```javascript
for (const batch of batches) {
  const promises = batch.map(async student => {
    // Buscar faltas V2
    const absencesV2 = await getDocs(
      query(
        collection(db, '2025/faltas/controle'),
        where('estudanteId', '==', student.id)
      )
    );

    // Agrupar por mês
    const byMonth = groupByMonth(absencesV2);

    // Migrar para V3
    const writeBatch = db.batch();

    // Subcoleções
    absencesV2.forEach(absence => {
      const ref = doc(
        collection(db, `students/${student.id}/absences`)
      );
      writeBatch.set(ref, {
        data: absence.data,
        justified: absence.justified,
        atestadoId: absence.atestadoId,
        createdAt: absence.createdAt,
        createdBy: absence.createdBy,
      });
    });

    // Summary mensal
    Object.entries(byMonth).forEach(([month, absences]) => {
      const summaryRef = doc(
        db,
        `absences_summary/${month}/${student.id}`
      );
      writeBatch.set(summaryRef, {
        dates: absences.map(a => a.data),
        count: absences.length,
        justified: absences.filter(a => a.justified).length,
        unjustified: absences.filter(a => !a.justified).length,
        lastUpdated: serverTimestamp(),
      });
    });

    await writeBatch.commit();
  });

  await Promise.all(promises);

  // Checkpoint
  await saveCheckpoint(batch[batch.length - 1].id);

  // Pausa para não sobrecarregar Firebase
  await sleep(2000);
}
```

**Validação após cada batch**:
- [ ] Batch commitado com sucesso
- [ ] Checkpoint salvo
- [ ] Nenhum erro crítico
- [ ] Log de progresso

**Validação final**:
- [ ] Total de faltas V2 = Total em subcoleções V3
- [ ] Total de faltas V2 = Soma de todos os summaries
- [ ] Executar script `compare-v2-v3.mjs`
- [ ] 100% de match

**Rollback**: Deletar apenas dados V3 (V2 intacto)

---

### **Etapa 2.2: Validação Intensiva Pós-Migração**

**Script**: `scripts/migration/04-validate-migration.mjs`

**Validações**:

1. **Contagem Total**
```javascript
const countV2 = await countAbsencesV2();
const countV3Subcollections = await countAbsencesV3Subcollections();
const countV3Summary = await countFromSummary();

assert(countV2 === countV3Subcollections);
assert(countV2 === countV3Summary);
```

2. **Validação por Estudante** (amostra de 100 estudantes)
```javascript
const sampleStudents = randomSample(students, 100);

for (const student of sampleStudents) {
  const absencesV2 = await getAbsencesV2(student.id);
  const absencesV3 = await getAbsencesV3(student.id);

  assert(absencesV2.length === absencesV3.length);

  // Comparar datas
  const datesV2 = absencesV2.map(a => a.data).sort();
  const datesV3 = absencesV3.map(a => a.data).sort();
  assert(JSON.stringify(datesV2) === JSON.stringify(datesV3));
}
```

3. **Validação de Summary**
```javascript
for (const month of months) {
  const summaryDocs = await getSummaryForMonth(month);

  for (const doc of summaryDocs) {
    const studentId = doc.id;
    const subcollectionCount = await countAbsencesInSubcollection(
      studentId,
      month
    );

    assert(doc.count === subcollectionCount);
  }
}
```

**Critérios de Sucesso**:
- [ ] 100% dos dados migrados
- [ ] 0 discrepâncias encontradas
- [ ] Checksums idênticos
- [ ] Relatório de validação gerado

**Se falhar**: Analisar discrepâncias, corrigir e re-executar migração

---

## 🔀 FASE 3: DUAL-WRITE

### **Objetivo**: Escrever em V2 E V3 simultaneamente durante período de transição

**Duração**: 1-2 semanas (para acumular dados de teste)
**Risco**: Baixo (fallback sempre para V2)

---

### **Etapa 3.1: Implementar Dual-Write no AttendanceService**

**Arquivo**: `src/services/firebase/attendanceService.ts`

**Estratégia**: Escrever em V2 (original) + V3 (novo) em **transação**

```typescript
static async addAbsenceRecord(
  record: Omit<AbsenceRecord, 'id'>,
  userId?: string
): Promise<void> {
  try {
    const batch = writeBatch(db);

    // 1. ESCRITA V2 (original - sempre primeira prioridade)
    const v2Ref = doc(collection(db, FIREBASE_PATHS.absenceControl()));
    const recordDataV2 = {
      estudanteId: record.estudanteId,
      data: record.data,
      justified: record.justified,
      atestadoId: record.atestadoId,
      turma: record.turma, // Adicionar turma se disponível
      ...addCreationAudit({}, userId),
      ...initializeSoftDelete(),
    };
    batch.set(v2Ref, recordDataV2);

    // 2. ESCRITA V3 (subcoleção)
    const v3SubRef = doc(
      collection(db, FIREBASE_PATHS_V3.absences(record.estudanteId))
    );
    const recordDataV3 = {
      data: record.data,
      justified: record.justified,
      atestadoId: record.atestadoId,
      ...addCreationAudit({}, userId),
      ...initializeSoftDelete(),
    };
    batch.set(v3SubRef, recordDataV3);

    // 3. ATUALIZAR SUMMARY V3
    const month = record.data.substring(0, 7); // YYYY-MM
    const summaryRef = doc(db, `absences_summary/${month}/${record.estudanteId}`);

    // Usar increment do Firestore
    batch.set(
      summaryRef,
      {
        count: increment(1),
        [record.justified ? 'justified' : 'unjustified']: increment(1),
        dates: arrayUnion(record.data),
        lastUpdated: serverTimestamp(),
      },
      { merge: true }
    );

    // 4. COMMIT ATÔMICO
    await batch.commit();

    logger.info(`[DUAL-WRITE] Falta registrada V2+V3: ${record.estudanteId} em ${record.data}`);

  } catch (error) {
    logger.error('[DUAL-WRITE] Erro ao registrar falta', error as Error);

    // FALLBACK: Se falhar, tentar só V2
    try {
      await addDoc(
        collection(db, FIREBASE_PATHS.absenceControl()),
        {
          ...record,
          ...addCreationAudit({}, userId),
          ...initializeSoftDelete(),
        }
      );
      logger.warn('[DUAL-WRITE] Fallback para V2 apenas');
    } catch (fallbackError) {
      logger.error('[DUAL-WRITE] Falha total', fallbackError as Error);
      throw fallbackError;
    }
  }
}
```

**Validação**:
- [ ] Dual-write implementado
- [ ] Testes unitários cobrindo cenários:
  - [ ] Sucesso V2 + V3
  - [ ] Falha V3, fallback V2
  - [ ] Rollback em caso de erro
- [ ] Logs detalhados de cada operação

---

### **Etapa 3.2: Implementar Dual-Write em Batch**

**Arquivo**: `src/services/firebase/attendanceService.ts`

```typescript
static async addAbsenceRecords(
  records: Omit<AbsenceRecord, 'id'>[],
  userId?: string
): Promise<void> {
  try {
    const batch = writeBatch(db);
    const summaryUpdates = new Map<string, any>(); // month -> updates

    records.forEach((record) => {
      // V2
      const v2Ref = doc(collection(db, FIREBASE_PATHS.absenceControl()));
      batch.set(v2Ref, {
        estudanteId: record.estudanteId,
        data: record.data,
        justified: record.justified,
        atestadoId: record.atestadoId,
        ...addCreationAudit({}, userId),
        ...initializeSoftDelete(),
      });

      // V3 Subcoleção
      const v3SubRef = doc(
        collection(db, FIREBASE_PATHS_V3.absences(record.estudanteId))
      );
      batch.set(v3SubRef, {
        data: record.data,
        justified: record.justified,
        atestadoId: record.atestadoId,
        ...addCreationAudit({}, userId),
        ...initializeSoftDelete(),
      });

      // Acumular updates de summary
      const month = record.data.substring(0, 7);
      const key = `${month}/${record.estudanteId}`;

      if (!summaryUpdates.has(key)) {
        summaryUpdates.set(key, {
          count: 0,
          justified: 0,
          unjustified: 0,
          dates: [],
        });
      }

      const summary = summaryUpdates.get(key);
      summary.count++;
      summary[record.justified ? 'justified' : 'unjustified']++;
      summary.dates.push(record.data);
    });

    // V3 Summary
    summaryUpdates.forEach((updates, key) => {
      const summaryRef = doc(db, `absences_summary/${key}`);
      batch.set(
        summaryRef,
        {
          count: increment(updates.count),
          justified: increment(updates.justified),
          unjustified: increment(updates.unjustified),
          dates: arrayUnion(...updates.dates),
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );
    });

    await batch.commit();
    logger.info(`[DUAL-WRITE BATCH] ${records.length} faltas registradas V2+V3`);

  } catch (error) {
    logger.error('[DUAL-WRITE BATCH] Erro', error as Error);
    throw error;
  }
}
```

---

### **Etapa 3.3: Atualizar Tela de Marcar Faltas**

**Arquivo**: `src/app/marcar-faltas/page.tsx`

**Mudança**: Chamar novo `AttendanceService.addAbsenceRecords()` que já faz dual-write

**Validação**:
- [ ] Tela funciona normalmente
- [ ] Faltas aparecem em tempo real
- [ ] Dados salvos em V2 + V3
- [ ] Summary atualizado corretamente

---

### **Etapa 3.4: Monitoramento de Dual-Write**

**Script**: `scripts/migration/05-monitor-dual-write.mjs`

**Executa diariamente durante período de dual-write**:

1. Comparar contagem V2 vs V3 para novos dados
2. Identificar discrepâncias
3. Reportar problemas
4. Sugerir correções

**Alertas**:
- [ ] Se discrepância > 1%, enviar alerta
- [ ] Se summary desatualizado > 1 hora, investigar
- [ ] Logs de erros de dual-write

---

## ✅ FASE 4: VALIDAÇÃO

### **Objetivo**: Garantir que V3 está 100% confiável antes de cutover

**Duração**: 1 semana de testes

---

### **Etapa 4.1: Testes Automatizados**

**Script**: `scripts/migration/06-automated-tests.mjs`

**Testes**:

1. **Teste de Integridade**
   - [ ] Todos os estudantes têm subcoleção `absences/`
   - [ ] Todos os meses têm documentos em `absences_summary/`
   - [ ] Contagens batem

2. **Teste de Performance**
   - [ ] Consulta de 1 estudante: < 100ms
   - [ ] API absence-multiples: < 3s
   - [ ] API consecutive-absences: < 5s

3. **Teste de Consistência**
   - [ ] Faltas V2 = Faltas V3 (100% match)
   - [ ] Summary correto para todos os meses
   - [ ] Flags justified corretos

---

### **Etapa 4.2: Testes Manuais em Produção**

**Checklist**:

1. **Marcar Faltas**
   - [ ] Marcar turma inteira
   - [ ] Verificar dados em V2
   - [ ] Verificar dados em V3
   - [ ] Verificar summary atualizado

2. **Consultar Faltas**
   - [ ] Perfil de estudante mostra faltas corretas
   - [ ] Relatório Bolsa Família correto
   - [ ] Monitor de consecutivas correto

3. **APIs**
   - [ ] `/api/students/absence-multiples` retorna correto
   - [ ] `/api/students/consecutive-absences` retorna correto
   - [ ] Performance dentro do esperado

---

### **Etapa 4.3: Validação de Stakeholders**

**Ações**:
- [ ] Demonstrar sistema funcionando com V3
- [ ] Apresentar métricas de performance
- [ ] Apresentar redução de custos
- [ ] Obter aprovação para cutover

---

## 🚀 FASE 5: CUTOVER (MIGRAÇÃO AUTORITATIVA)

### **Objetivo**: Tornar V3 a fonte autoritativa de dados

**Duração**: 1 dia (execução cautelosa)
**Risco**: Médio-Alto (mitigado por rollback)

---

### **Etapa 5.1: Migrar AttendanceService para V3**

**Arquivo**: `src/services/firebase/attendanceService.ts`

**Mudanças**:

**ANTES (dual-write)**:
```typescript
static async addAbsenceRecord(record, userId) {
  // Escreve V2 + V3
}

static async getStudentAbsences(estudanteId) {
  // Lê de V2
}
```

**DEPOIS (V3 autoritativo)**:
```typescript
static async addAbsenceRecord(record, userId) {
  // Escreve APENAS V3 (subcoleção + summary)
  // Remove escrita V2
}

static async getStudentAbsences(estudanteId) {
  // Lê de V3 (subcoleção)
  const absencesRef = collection(
    db,
    FIREBASE_PATHS_V3.absences(estudanteId)
  );
  const snapshot = await getDocs(absencesRef);
  // ...
}
```

**Validação**:
- [ ] Código modificado
- [ ] Testes unitários atualizados
- [ ] Deploy em staging
- [ ] Testes em staging: 100% pass

---

### **Etapa 5.2: Migrar APIs para V3**

**Arquivo**: `src/app/api/students/absence-multiples/route.ts`

**Mudanças**:

```typescript
async function loadStudentAbsencesForMonth(
  studentIds: string[],
  schoolDaysInMonth: string[],
  referenceMonth: string, // "2025-01"
  suspensionsByStudent: Map<string, Set<string>>
): Promise<Record<string, number>> {
  const cacheKey = `absences-month-${referenceMonth}-${studentIds.length}`;
  const cached = apiCache.get(cacheKey);
  if (cached) return cached;

  try {
    // NOVA ESTRATÉGIA: Usar absences_summary
    const summaryRef = collection(db, `absences_summary/${referenceMonth}`);
    const summarySnap = await getDocs(summaryRef);

    const absencesByStudent: Record<string, number> = {};

    // Inicializar todos com 0
    studentIds.forEach(id => {
      absencesByStudent[id] = 0;
    });

    const studentIdsSet = new Set(studentIds);

    summarySnap.docs.forEach(docSnap => {
      const studentId = docSnap.id;

      // Filtrar apenas estudantes da lista
      if (!studentIdsSet.has(studentId)) return;

      const data = docSnap.data();

      // Contar apenas faltas não justificadas
      const unjustified = data.unjustified || 0;

      // Excluir dias de suspensão (verificar dates individuais se necessário)
      const studentSuspensions = suspensionsByStudent.get(studentId);
      let finalCount = unjustified;

      if (studentSuspensions && studentSuspensions.size > 0) {
        // Precisa verificar dates individuais
        const dates = data.dates || [];
        finalCount = dates.filter(date =>
          !studentSuspensions.has(date)
        ).length;
      }

      absencesByStudent[studentId] = finalCount;
    });

    apiCache.set(cacheKey, absencesByStudent, 30);
    return absencesByStudent;

  } catch (error) {
    console.error('[ERROR] Erro ao carregar faltas:', error);
    return {};
  }
}
```

**Impacto**:
- De ~74 queries (batch de 10) → **1 query** para summary do mês
- De ~10 segundos → **~500ms** (20x mais rápido!)

**Validação**:
- [ ] API retorna mesmos resultados que V2
- [ ] Performance < 3s
- [ ] Regras de negócio intactas

---

### **Etapa 5.3: Deploy Gradual**

**Estratégia**: Blue-Green Deployment

1. **Deploy em Staging**
   - [ ] Código V3 deployado
   - [ ] Testes automatizados: 100% pass
   - [ ] Testes manuais completos

2. **Deploy em Produção (50% Traffic)**
   - [ ] Feature flag ativado para 50% usuários
   - [ ] Monitorar erros
   - [ ] Monitorar performance
   - [ ] Se OK após 24h, prosseguir

3. **Deploy 100% Traffic**
   - [ ] Feature flag 100%
   - [ ] Monitorar por 48h
   - [ ] Se OK, remover feature flag

---

### **Etapa 5.4: Monitoramento Pós-Cutover**

**Métricas**:
- [ ] Taxa de erro: < 0.1%
- [ ] Performance APIs: < 3s (P95)
- [ ] Reads do Firestore: redução de 80-90%
- [ ] Custos: redução de 80-90%

**Alertas**:
- [ ] Se erro > 1%, rollback imediato
- [ ] Se performance > 5s, investigar
- [ ] Se discrepâncias de dados, investigar

---

## 🧹 FASE 6: CLEANUP

### **Objetivo**: Remover código legado e dados V2 (APÓS validação completa)

**Duração**: 1 mês após cutover (período de segurança)

---

### **Etapa 6.1: Remover Código Legado**

**Ações**:
- [ ] Remover funções V2 do AttendanceService
- [ ] Remover imports V2 de todos os arquivos
- [ ] Remover feature flags
- [ ] Atualizar documentação

---

### **Etapa 6.2: Arquivar Dados V2**

**⚠️ NÃO DELETAR! Apenas arquivar**

**Script**: `scripts/migration/07-archive-v2-data.mjs`

```javascript
// Exportar V2 para arquivo
await exportV2ToJSON('archives/absences-v2-YYYY-MM-DD.json');

// Mover V2 para collection de arquivo
await moveCollection(
  '2025/faltas/controle',
  'archives/2025/faltas/controle'
);
```

**Validação**:
- [ ] Backup V2 completo criado
- [ ] Dados V2 movidos para `archives/`
- [ ] Sistema funcionando 100% com V3
- [ ] Periodo de 30 dias sem incidentes

---

### **Etapa 6.3: Deletar Dados V2 (OPCIONAL - após 6 meses)**

**⚠️ APENAS SE**:
- [ ] 6 meses sem incidentes
- [ ] Backup V2 verificado e íntegro
- [ ] Aprovação de stakeholders
- [ ] Compliance OK

---

## 🔙 ROLLBACK PLAN

### **Cenários de Rollback**

#### **Rollback Fase 1 (Índices)**
- **Quando**: Índices causando problemas
- **Ação**: Deletar índices via Firestore Console
- **Impacto**: Performance volta ao normal
- **Dados perdidos**: Nenhum

#### **Rollback Fase 2 (Migração)**
- **Quando**: Dados V3 incorretos
- **Ação**: Deletar collections V3, manter V2
- **Impacto**: Sistema continua em V2
- **Dados perdidos**: Nenhum (V2 intacto)

#### **Rollback Fase 3 (Dual-Write)**
- **Quando**: Dual-write causando erros
- **Ação**: Reverter código para escrita V2 apenas
- **Impacto**: Perde dados V3 escritos durante dual-write
- **Dados perdidos**: V3 apenas (re-migrar depois)

#### **Rollback Fase 5 (Cutover)**
- **Quando**: V3 em produção com problemas
- **Ação**:
  1. Reverter deploy (git revert)
  2. Voltar para V2 autoritativo
  3. Comparar dados V2 vs V3
  4. Re-migrar dados perdidos se necessário
- **Impacto**: Downtime de 5-10 minutos
- **Dados perdidos**: Potencialmente dados escritos durante cutover (mitigado por backup)

---

## 📊 MÉTRICAS DE SUCESSO

### **Performance**
- ✅ API absence-multiples: 13s → **< 3s** (4x mais rápido)
- ✅ AttendanceService.getStudentAbsences: 3-5s → **< 100ms** (30-50x mais rápido)
- ✅ Consultas cross-student: 10s → **< 2s** (5x mais rápido)

### **Custo**
- ✅ Reads diários: -90%
- ✅ Custo mensal Firestore: -80%

### **Qualidade**
- ✅ 100% dos dados migrados
- ✅ 0% de perda de dados
- ✅ 0% de downtime
- ✅ < 0.1% taxa de erro

### **Escalabilidade**
- ✅ Suporta 10k+ estudantes
- ✅ Suporta 1M+ faltas
- ✅ Performance estável

---

## 📅 TIMELINE ESTIMADO

| Fase | Duração | Responsável | Status |
|------|---------|-------------|--------|
| **Fase 0**: Preparação | 1-2 dias | Dev Team | ⏳ Pendente |
| **Fase 1**: Índices | 4 horas | Dev Team | ⏳ Pendente |
| **Fase 2**: Migração | 3-4 dias | Dev Team | ⏳ Pendente |
| **Fase 3**: Dual-Write | 1-2 semanas | Dev Team | ⏳ Pendente |
| **Fase 4**: Validação | 1 semana | QA + Dev | ⏳ Pendente |
| **Fase 5**: Cutover | 1 dia | Dev Team | ⏳ Pendente |
| **Fase 6**: Cleanup | 1 mês depois | Dev Team | ⏳ Pendente |
| **TOTAL** | ~4-6 semanas | - | - |

---

## 🎯 CHECKPOINTS CRÍTICOS

### **Checkpoint 1: Antes de Iniciar**
- [ ] Backup completo criado
- [ ] Stakeholders informados
- [ ] Rollback plan revisado
- [ ] Equipe alinhada

### **Checkpoint 2: Após Migração Histórica**
- [ ] 100% dos dados migrados
- [ ] Validação 100% OK
- [ ] Performance medida

### **Checkpoint 3: Após 1 Semana de Dual-Write**
- [ ] Nenhum erro crítico
- [ ] Dados V2 = V3
- [ ] Pronto para cutover

### **Checkpoint 4: Após Cutover**
- [ ] Performance OK
- [ ] Erros < 0.1%
- [ ] Stakeholders satisfeitos

### **Checkpoint 5: Após 1 Mês**
- [ ] Sistema estável
- [ ] Métricas de sucesso atingidas
- [ ] Pronto para cleanup

---

## 📞 CONTATOS DE EMERGÊNCIA

- **Dev Lead**: [Nome]
- **DBA Firebase**: [Nome]
- **Product Owner**: [Nome]
- **On-Call Engineer**: [Nome]

---

## 📚 REFERÊNCIAS

- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Firestore Data Modeling](https://firebase.google.com/docs/firestore/manage-data/structure-data)
- [Firestore Indexes](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Migration Strategies](https://cloud.google.com/architecture/migration-to-gcp-getting-started)

---

**Documento criado em**: 2025-01-04
**Última atualização**: 2025-01-04
**Versão**: 1.0
**Status**: 📋 Pronto para execução
