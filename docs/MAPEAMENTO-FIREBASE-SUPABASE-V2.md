# 🗺️ MAPEAMENTO FIREBASE → SUPABASE (SCHEMA V2)

**Versão**: 2.0 (Padronizado)
**Data**: 2025-10-11
**Status**: ✅ Pronto para Migração

---

## 📋 VISÃO GERAL

Este documento mapeia **exatamente** como os dados do Firebase serão convertidos para o Supabase, usando o novo schema padronizado (inglês + snake_case).

---

## 🗃️ TABELAS - MAPEAMENTO COMPLETO

### 1. `estudantes` → `students`

| Firebase (V3) | Supabase (V2) | Tipo | Notas |
|---------------|---------------|------|-------|
| `id` (doc ID) | `id` | UUID | Novo UUID gerado pelo Supabase |
| `estudanteId` | `student_id` | UUID | **Mantém UUID original do Firebase** |
| `nome` | `name` | VARCHAR(255) | - |
| `turma` | `class` | VARCHAR(10) | Ex: "5A", "6B" |
| `turno` | `shift` | VARCHAR(10) | "MANHÃ" ou "TARDE" |
| `statusEstudante` | `status` | VARCHAR(20) | "ATIVO", "INATIVO", "TRANSFERIDO" |
| `dataNascimento` | `birth_date` | DATE | Converter DDMMYYYY → DATE |
| `anoLetivo` | `school_year` | VARCHAR(4) | Ex: "2025" |
| `numeroMatricula` | `registration_number` | VARCHAR(50) | - |
| `bolsaFamilia` | `bolsa_familia` | VARCHAR(10) | "SIM" ou "NÃO" (mantém português) |
| `endereco` | `address` | JSONB | Estrutura mantida |
| `deficiencias` | `disabilities` | JSONB[] | Array mantido |
| `migratedFrom` | `migrated_from` | VARCHAR(50) | Ex: "firebase_v3" |
| `version` | `version` | VARCHAR(10) | "3.0" |
| `deleted` | `deleted` | BOOLEAN | - |
| `createdAt` | `created_at` | TIMESTAMPTZ | - |
| `updatedAt` | `updated_at` | TIMESTAMPTZ | - |
| - | `migrated_at` | TIMESTAMPTZ | Timestamp da migração |

---

### 2. `contatos` → `student_contacts`

| Firebase (V3) | Supabase (V2) | Tipo | Notas |
|---------------|---------------|------|-------|
| `id` (doc ID) | `id` | UUID | Novo UUID |
| `estudanteId` | `student_id` | UUID | **FK → students.id** |
| `nome` | `name` | VARCHAR(255) | - |
| `parentesco` | `relationship` | VARCHAR(100) | Ex: "Mãe", "Pai" |
| `telefone` | `phone` | VARCHAR(20) | Formatado |
| `telefoneNumerico` | `phone_numeric` | VARCHAR(20) | Apenas dígitos |
| `email` | `email` | VARCHAR(255) | - |
| `podeReceberWhatsapp` | `can_receive_whatsapp` | BOOLEAN | - |
| `whatsapp` | `whatsapp_data` | JSONB | Dados de verificação |
| `migratedFrom` | `migrated_from` | VARCHAR(50) | - |
| `syncedFromOldStructure` | `synced_from_old_structure` | BOOLEAN | - |
| `version` | `version` | VARCHAR(10) | - |
| `_placeholder` | `is_placeholder` | BOOLEAN | - |
| `createdAt` | `created_at` | TIMESTAMPTZ | - |
| `updatedAt` | `updated_at` | TIMESTAMPTZ | - |
| `syncedAt` | `synced_at` | TIMESTAMPTZ | - |

---

### 3. `absences` → `student_absences`

| Firebase (V3) | Supabase (V2) | Tipo | Notas |
|---------------|---------------|------|-------|
| `id` (doc ID) | `id` | UUID | Novo UUID |
| `estudanteId` | `student_id` | UUID | **FK → students.id** |
| `data` | `absence_date` | DATE | Converter DDMMYYYY → DATE |
| `bimestre` | `bimester` | VARCHAR(10) | "B1", "B2", "B3", "B4" |
| `justificada` | `is_justified` | BOOLEAN | - |
| `atestadoId` | `medical_certificate_id` | UUID | **FK → medical_certificates.id** |
| `createdAt` | `created_at` | TIMESTAMPTZ | - |

**Índice Único**: `(student_id, absence_date)` - Previne duplicatas

---

### 4. `absence_summary` → `absence_summaries`

| Firebase (V3) | Supabase (V2) | Tipo | Notas |
|---------------|---------------|------|-------|
| `id` (doc ID) | `id` | UUID | Novo UUID |
| `estudanteId` | `student_id` | UUID | **FK → students.id** |
| `month` | `month` | VARCHAR(7) | Formato: "2025-01" |
| `totalAbsences` | `total_absences` | INTEGER | - |
| `justifiedAbsences` | `justified_absences` | INTEGER | - |
| `unjustifiedAbsences` | `unjustified_absences` | INTEGER | - |
| `createdAt` | `created_at` | TIMESTAMPTZ | - |
| `updatedAt` | `updated_at` | TIMESTAMPTZ | - |

**Índice Único**: `(student_id, month)` - Um resumo por estudante/mês

---

### 5. `atestados` → `medical_certificates`

| Firebase (V3) | Supabase (V2) | Tipo | Notas |
|---------------|---------------|------|-------|
| `id` (doc ID) | `id` | UUID | Novo UUID |
| `estudanteId` | `student_id` | UUID | **FK → students.id** |
| `startDate` | `start_date` | DATE | - |
| `endDate` | `end_date` | DATE | - |
| `days` | `days_covered` | INTEGER | Calculado: end - start + 1 |
| `motivo` | `reason` | TEXT | - |
| `cid` | `cid_code` | VARCHAR(20) | CID-10 |
| `medico` | `doctor_name` | VARCHAR(255) | - |
| `fileUrl` | `file_url` | TEXT | URL do arquivo escaneado |
| `fileName` | `file_name` | TEXT | - |
| `createdAt` | `created_at` | TIMESTAMPTZ | - |
| `updatedAt` | `updated_at` | TIMESTAMPTZ | - |

---

### 6. `interacoes_familia` → `family_interactions`

| Firebase (V1/V3) | Supabase (V2) | Tipo | Notas |
|------------------|---------------|------|-------|
| `id` (doc ID) | `id` | UUID | Novo UUID |
| `estudanteId` | `student_id` | UUID | **FK → students.id** |
| `type` | `interaction_type` | VARCHAR(100) | Ex: "Contato telefônico" |
| `date` | `interaction_date` | DATE | - |
| `description` | `description` | TEXT | - |
| `sensitive` | `is_sensitive` | BOOLEAN | - |
| `createdBy` | `created_by` | VARCHAR(255) | - |
| `createdAt` | `created_at` | TIMESTAMPTZ | - |

**Nota**: Consolidar interações de V1 (`2025/interacoes`) e V3 (`students/{id}/interacoes`)

---

### 7. `user_tasks` → `user_tasks` ✅ (sem mudança)

| Firebase (V3) | Supabase (V2) | Tipo | Notas |
|---------------|---------------|------|-------|
| `id` (doc ID) | `id` | UUID | Novo UUID |
| `estudanteId` | `student_id` | UUID | **FK → students.id** |
| `title` | `title` | VARCHAR(255) | - |
| `description` | `description` | TEXT | - |
| `recommendedAction` | `recommended_action` | VARCHAR(255) | - |
| `isResolved` | `is_resolved` | BOOLEAN | - |
| `actionTaken` | `action_taken` | TEXT | - |
| `createdBy` | `created_by` | VARCHAR(255) | - |
| `assignedTo` | `assigned_to` | VARCHAR(255) | - |
| `createdAt` | `created_at` | TIMESTAMPTZ | - |
| `resolvedAt` | `resolved_at` | TIMESTAMPTZ | - |
| `dueDate` | `due_date` | DATE | - |

---

### 8. `users` → `users` ✅ (ajustes mínimos)

| Firebase Auth | Supabase (V2) | Tipo | Notas |
|---------------|---------------|------|-------|
| `uid` | `firebase_uid` | UUID | **Mantém UID do Firebase Auth** |
| `id` | `id` | UUID | Novo UUID Supabase |
| `email` | `email` | VARCHAR(255) | - |
| `displayName` | `name` | VARCHAR(255) | - |
| `role` | `role` | VARCHAR(50) | "admin", "user", "teacher" |
| `metadata.creationTime` | `created_at` | TIMESTAMPTZ | - |
| `metadata.lastSignInTime` | `last_login_at` | TIMESTAMPTZ | - |
| - | `updated_at` | TIMESTAMPTZ | - |

---

### 9. `whatsapp_verified_numbers` → `whatsapp_verified_numbers` ✅ (ajustes mínimos)

| Firebase (V3) | Supabase (V2) | Tipo | Notas |
|---------------|---------------|------|-------|
| `number` | `phone_number` | VARCHAR(20) | - |
| `verified` | `is_verified` | BOOLEAN | - |
| `verifiedAt` | `verified_at` | TIMESTAMPTZ | - |
| `jid` | `whatsapp_jid` | VARCHAR(255) | Jabber ID |
| `name` | `contact_name` | VARCHAR(255) | - |
| `exists` | `account_exists` | BOOLEAN | - |
| `verificationStatus` | `verification_status` | VARCHAR(50) | - |
| `createdAt` | `created_at` | TIMESTAMPTZ | - |
| `updatedAt` | `updated_at` | TIMESTAMPTZ | - |

---

### 10. `automation_executions` → `automation_executions` ✅ (ajustes mínimos)

| Firebase (V3) | Supabase (V2) | Tipo | Notas |
|---------------|---------------|------|-------|
| `type` | `automation_type` | VARCHAR(100) | - |
| `status` | `execution_status` | VARCHAR(50) | - |
| `message` | `message` | TEXT | - |
| `metadata` | `metadata` | JSONB | - |
| `executedAt` | `executed_at` | TIMESTAMPTZ | - |

---

## 🔗 RELACIONAMENTOS (FOREIGN KEYS)

```
students (core)
  ↓
  ├─→ student_contacts (FK: student_id)
  ├─→ student_absences (FK: student_id)
  ├─→ absence_summaries (FK: student_id)
  ├─→ medical_certificates (FK: student_id)
  ├─→ family_interactions (FK: student_id)
  └─→ user_tasks (FK: student_id)

medical_certificates
  ↓
  └─→ student_absences (FK: medical_certificate_id)
```

---

## 📊 DADOS JSONB - ESTRUTURA MANTIDA

### `students.address`
```json
{
  "street": "Rua das Flores",
  "number": "123",
  "neighborhood": "Centro",
  "city": "São Paulo",
  "state": "SP",
  "zip_code": "01234567",
  "complement": "Apto 45"
}
```

### `students.disabilities`
```json
[
  {
    "type": "Física",
    "description": "Cadeirante",
    "cid": "G80",
    "aee_type": "PAEE",
    "needs_ave": true
  }
]
```

### `student_contacts.whatsapp_data`
```json
{
  "number": "5511987654321",
  "verified": true,
  "verified_at": "2025-01-15T10:30:00Z",
  "exists": true,
  "verification_status": "active"
}
```

---

## 🔄 CONVERSÕES ESPECIAIS

### 1. **Datas**: DDMMYYYY → PostgreSQL DATE

**Firebase**:
```typescript
dataNascimento: "15012010" // String
```

**Supabase**:
```sql
birth_date: '2010-01-15' -- DATE type
```

**Função de Conversão**:
```typescript
function convertFirebaseDateToSQL(firebaseDate: string): string {
  // "15012010" → "2010-01-15"
  const day = firebaseDate.slice(0, 2);
  const month = firebaseDate.slice(2, 4);
  const year = firebaseDate.slice(4, 8);
  return `${year}-${month}-${day}`;
}
```

### 2. **IDs**: Manter Compatibilidade

```typescript
// Firebase (mantido)
estudanteId: "550e8400-e29b-41d4-a716-446655440000"

// Supabase (novo + mantém original)
id: "a1b2c3d4-..."  // Novo UUID (PK do Supabase)
student_id: "550e8400-e29b-41d4-a716-446655440000"  // Original do Firebase
```

### 3. **Foreign Keys**: Resolver após Inserção

**Etapa 1**: Inserir `students` primeiro
```sql
INSERT INTO students (student_id, name, ...) VALUES (...);
```

**Etapa 2**: Mapear `student_id` → `id`
```typescript
const studentIdMap = new Map<string, string>(); // Firebase UUID → Supabase UUID
students.forEach(s => studentIdMap.set(s.student_id, s.id));
```

**Etapa 3**: Inserir dados relacionados
```sql
INSERT INTO student_contacts (student_id, name, ...)
VALUES (
  (SELECT id FROM students WHERE student_id = 'firebase-uuid-here'),
  'Nome do Contato',
  ...
);
```

---

## ⚠️ PONTOS DE ATENÇÃO

### 1. **Órfãos Potenciais**

**Problema**: Contatos/faltas sem estudante correspondente

**Solução**:
```typescript
// Validar antes de inserir
const orphanContacts = contacts.filter(c =>
  !studentIds.has(c.estudanteId)
);

if (orphanContacts.length > 0) {
  console.warn(`${orphanContacts.length} contatos órfãos encontrados`);
  // Decidir: criar estudante placeholder ou ignorar?
}
```

### 2. **Duplicatas**

**Problema**: Múltiplos registros para o mesmo estudante/data

**Solução**: Índices únicos no schema
```sql
CREATE UNIQUE INDEX idx_student_absences_unique
  ON student_absences(student_id, absence_date);
```

### 3. **Dados Faltando**

**Campos obrigatórios com valores nulos**:

| Campo | Fallback |
|-------|----------|
| `name` | "Nome não informado" |
| `class` | "SEM TURMA" |
| `shift` | "MANHÃ" (default) |
| `school_year` | "2025" (ano atual) |

---

## 🎯 VALIDAÇÕES PÓS-MIGRAÇÃO

```sql
-- 1. Contar registros (deve bater com Firebase)
SELECT 'students' AS table, COUNT(*) FROM students
UNION ALL
SELECT 'student_contacts', COUNT(*) FROM student_contacts
UNION ALL
SELECT 'student_absences', COUNT(*) FROM student_absences;

-- 2. Verificar órfãos (deve ser 0)
SELECT COUNT(*)
FROM student_contacts c
LEFT JOIN students s ON s.id = c.student_id
WHERE s.id IS NULL;

-- 3. Verificar duplicatas (deve ser 0)
SELECT student_id, absence_date, COUNT(*)
FROM student_absences
GROUP BY student_id, absence_date
HAVING COUNT(*) > 1;

-- 4. Verificar dados obrigatórios nulos
SELECT COUNT(*) FROM students WHERE name IS NULL;
SELECT COUNT(*) FROM students WHERE class IS NULL;
```

---

## 📚 REFERÊNCIAS CRUZADAS

- **Schema SQL**: `supabase-schema-v2-padronizado.sql`
- **Types TypeScript**: `src/lib/supabaseClient.ts`
- **Guia de Migração**: `docs/GUIA-MIGRACAO-SUPABASE-PASSO-A-PASSO.md`
- **Backup Original**: `firestore-backup-2025-10-11.json`

---

## ✅ CHECKLIST DE USO

Ao criar scripts de migração, use este documento para:

- [ ] Mapear nomes de colunas corretamente
- [ ] Converter tipos de dados (dates, booleans)
- [ ] Resolver foreign keys
- [ ] Validar dados obrigatórios
- [ ] Detectar órfãos e duplicatas
- [ ] Manter IDs originais do Firebase
- [ ] Preencher timestamps de migração

---

**Última Atualização**: 2025-10-11
**Versão**: 2.0 (Standardized Schema)
