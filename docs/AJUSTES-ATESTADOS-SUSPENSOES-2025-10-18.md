# 🔧 Ajustes em Atestados Médicos e Suspensões
**Data**: 2025-10-18
**Objetivo**: Corrigir bug de edição/exclusão e implementar criação automática de faltas
**Status**: ✅ **CONCLUÍDO** - Atestados e Suspensões

---

## ✅ Resumo Executivo

### Problemas Resolvidos
1. ✅ Faltas **não eram criadas automaticamente** ao cadastrar atestados/suspensões
2. ✅ Faltas eram **deletadas** ao editar/excluir atestados/suspensões (causando perda de dados)
3. ✅ Cálculo incorreto de **quantidade de dias** no frontend
4. ✅ Mapeamento incorreto de **campos** entre frontend e API
5. ✅ Card de histórico não **atualizava imediatamente** após edições

### Solução Implementada
- **UPSERT Pattern**: Update ou Insert faltas (nunca delete)
- **Dissociation Pattern**: Desassociar foreign key ao invés de deletar registro
- **Auto-Creation**: Backend cria faltas automaticamente para dias letivos
- **Awaited Refetch**: Frontend aguarda refetch antes de limpar formulário

### Módulos Corrigidos
- ✅ **Atestados Médicos** - Backend (POST, PUT, DELETE) + Frontend + Service
- ✅ **Suspensões** - Backend (POST, PUT, DELETE) + Frontend + Service

### Arquivos Modificados
**Backend**: 4 arquivos (medical-certificates/route.ts, [id]/route.ts, suspensions/route.ts, [id]/route.ts)
**Service**: 2 arquivos (medicalCertificatesService.ts, studentSuspensionsService.ts)
**Frontend**: 1 arquivo (useStudentProfile.ts)

### Correções Adicionais (2025-10-18 - 19:58)
1. ✅ Removido campo `school_year` inexistente em `suspensions/route.ts` (POST)
2. ✅ Adicionados campos obrigatórios: `severity`, `decision_by`, `decision_date`, `created_by`
3. ✅ Adicionados headers de autenticação em `getById()` e `delete()` no `studentSuspensionsService.ts`

### Correções de Autenticação WhatsApp (2025-10-18 - 20:05)
4. ✅ Adicionados headers de autenticação em `getVerifiedNumber()` no `whatsappDataService.ts`
5. ✅ Adicionados headers de autenticação em `saveToVerifiedNumbers()` no `whatsappDataService.ts`

---

## 🐛 Problema Original

### Bug Identificado
Quando um atestado médico era **cadastrado**, as faltas **não eram criadas automaticamente** e apareciam como "não justificada" mesmo após o cadastro do atestado.

Quando um atestado era **editado** ou **excluído**, as faltas associadas eram **deletadas** do sistema, causando perda de dados.

---

## ✅ Solução Implementada

### 1. **POST - Criação de Atestado** (`/api/medical-certificates/route.ts`)

**Implementado**: Criação automática de faltas para todos os **dias letivos** do período do atestado.

#### Fluxo:
1. Atestado é criado no banco com `start_date` e `end_date`
2. Sistema busca todos os dias letivos no período (usando `getDiasLetivosNoPeriodo()`)
3. Para cada dia letivo:
   - Verifica se falta já existe para aquele estudante e data
   - Se **existe**: ATUALIZA (`is_justified = true`, `medical_certificate_id = atestado.id`)
   - Se **não existe**: CRIA nova falta justificada
4. Retorna atestado criado + contagem de faltas processadas

#### Logs:
```
[POST /api/medical-certificates] 📅 Dias letivos encontrados: 3
[POST /api/medical-certificates] ✅ Faltas processadas: { created: 2, updated: 1, total: 3 }
```

---

### 2. **PUT - Edição de Atestado** (`/api/medical-certificates/[id]/route.ts`)

**Implementado**: Lógica de UPSERT (update ou insert) sem deletar faltas existentes.

#### Fluxo:
1. Atestado é atualizado no banco
2. **DESASSOCIA** faltas antigas:
   - `medical_certificate_id = null`
   - `is_justified = false`
3. Busca dias letivos no **novo período**
4. Para cada dia letivo:
   - Se falta **existe**: ATUALIZA (associa ao atestado e marca como justificada)
   - Se falta **não existe**: CRIA nova falta justificada
5. Retorna dados atualizados

#### Logs:
```
[PUT /api/medical-certificates/[id]] 🔄 Faltas antigas desassociadas e marcadas como não justificadas
[PUT /api/medical-certificates/[id]] 📅 Dias letivos encontrados: 5
[PUT /api/medical-certificates/[id]] ✅ Faltas processadas: { atualizadas: 3, criadas: 2, total: 5 }
```

#### Arquivos Modificados:
- `src/app/api/medical-certificates/[id]/route.ts` (linhas 58-211)
- `src/services/supabase/medicalCertificatesService.ts` (linhas 313-322)
- `src/hooks/useStudentProfile.ts` (linhas 215-236, 893-912)

---

### 3. **DELETE - Exclusão de Atestado** (`/api/medical-certificates/[id]/route.ts`)

**Implementado**: Desassociação de faltas antes de deletar atestado.

#### Fluxo:
1. **ANTES** de deletar o atestado:
   - Busca todas as faltas com `medical_certificate_id = atestado.id`
   - ATUALIZA: `medical_certificate_id = null`, `is_justified = false`
2. **DEPOIS** deleta o atestado
3. **Faltas permanecem no sistema**, mas aparecem como "não justificadas"

#### Logs:
```
[DELETE /api/medical-certificates/[id]] 🔄 Desassociando faltas antes de deletar atestado
[DELETE /api/medical-certificates/[id]] ✅ Faltas desassociadas e marcadas como não justificadas
[DELETE /api/medical-certificates/[id]] ✅ Atestado deletado com sucesso
```

#### Arquivos Modificados:
- `src/app/api/medical-certificates/[id]/route.ts` (linhas 255-284)

---

### 4. **Frontend - Cálculo de Dias** (`src/hooks/useStudentProfile.ts`)

**Implementado**: Cálculo dinâmico da quantidade de dias baseado em `start_date` e `end_date`.

#### Problema:
Tabela `medical_certificates` tem campo calculado `days_covered`, mas não estava sendo usado no frontend. Frontend tentava buscar campo `days` que não existe.

#### Solução:
```typescript
const atestados = useMemo(() => {
  return (atestadosData || []).map((cert: any) => {
    // ✅ CALCULAR quantidade de dias entre start_date e end_date
    let days = 1;
    if (cert.start_date && cert.end_date) {
      const start = new Date(cert.start_date);
      const end = new Date(cert.end_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 porque inclui o dia inicial
    }

    return {
      id: cert.id,
      startDate: cert.start_date,
      endDate: cert.end_date,
      days, // ✅ Calculado dinamicamente
      description: cert.reason || cert.notes || cert.diagnosis || 'Sem descrição',
      createdBy: cert.submitter?.name || 'Desconhecido'
    };
  });
}, [atestadosData]);
```

#### Arquivos Modificados:
- `src/hooks/useStudentProfile.ts` (linhas 215-236)

---

### 5. **Service Layer - Mapeamento de Campos** (`medicalCertificatesService.ts`)

**Implementado**: Correção de mapeamento de campos entre frontend e API.

#### Problema:
Frontend enviava:
- `startDate` (camelCase)
- `endDate` (camelCase)
- `diagnosis` (inglês)

Mas API esperava:
- `dataInicio` (português)
- `dataFim` (português)
- `motivo` (português)

#### Solução:
```typescript
const apiUpdates: any = {};
if (updates.startDate) apiUpdates.dataInicio = convertDateFormat(updates.startDate);
if (updates.endDate) apiUpdates.dataFim = convertDateFormat(updates.endDate);
if (updates.diagnosis !== undefined) apiUpdates.motivo = updates.diagnosis || null;
```

#### Arquivos Modificados:
- `src/services/supabase/medicalCertificatesService.ts` (linhas 313-322)

---

### 6. **API Schema - Conversão de Datas**

**Implementado**: Conversão automática de `DDMMYYYY` → `YYYY-MM-DD` no endpoint PUT.

#### Problema:
Schema Zod valida datas em formato `DDMMYYYY` (ex: `17102025`), mas Supabase PostgreSQL espera `YYYY-MM-DD` (ex: `2025-10-17`).

#### Solução:
```typescript
const convertToISODate = (date: string): string => {
  if (date.match(/^\d{8}$/)) {
    // Format: DDMMYYYY → YYYY-MM-DD
    const day = date.substring(0, 2);
    const month = date.substring(2, 4);
    const year = date.substring(4, 8);
    return `${year}-${month}-${day}`;
  }
  return date; // Já está em YYYY-MM-DD
};

const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
if (sanitizedData.dataInicio) updateData.start_date = convertToISODate(sanitizedData.dataInicio);
if (sanitizedData.dataFim) updateData.end_date = convertToISODate(sanitizedData.dataFim);
```

#### Arquivos Modificados:
- `src/app/api/medical-certificates/[id]/route.ts` (linhas 58-74)

---

### 7. **API Response - Retornar Dados Atualizados**

**Implementado**: Endpoint PUT agora retorna dados completos do atestado atualizado.

#### Problema:
Endpoint retornava apenas `{ id, updated: true }`, mas frontend precisava dos dados completos para atualizar o card de histórico.

#### Solução:
```typescript
// ✅ Buscar dados atualizados completos para retornar ao frontend
const { data: finalData, error: finalError } = await supabaseAdmin
  .from('medical_certificates')
  .select('*, students(name, class)')
  .eq('id', id)
  .single();

return successResponse(finalData, 'Atestado atualizado com sucesso');
```

#### Arquivos Modificados:
- `src/app/api/medical-certificates/[id]/route.ts` (linhas 220-234)

---

### 8. **Frontend - Refetch Aguardado**

**Implementado**: Aguardar `refetch` de atestados e faltas antes de limpar formulário.

#### Problema:
`refetchAtestados()` e `refetchAbsences()` não eram aguardados, causando race condition onde o card atualizava antes dos dados chegarem.

#### Solução:
```typescript
// ✅ Aguardar um momento para o banco processar
await new Promise(resolve => setTimeout(resolve, 500));

// ✅ Forçar refetch dos hooks individuais (AGUARDAR)
await Promise.all([
  refetchAtestados(),
  refetchAbsences(),
]);

// ✅ Limpar formulário APÓS refetch
setEditingAtestado(null);
toast.success("Atestado atualizado com sucesso!");
```

#### Arquivos Modificados:
- `src/hooks/useStudentProfile.ts` (linhas 893-912)

---

## 🎯 Comportamento Final Esperado

### Cadastro de Atestado
1. Usuário preenche formulário (data início, data fim, descrição)
2. Sistema cria atestado no banco
3. Sistema **automaticamente** cria/atualiza faltas para dias letivos do período
4. Faltas aparecem como **justificadas** com badge "Atestado"
5. Card de histórico mostra o atestado com quantidade de dias correta

### Edição de Atestado
1. Usuário clica em "Editar" no card de histórico
2. Altera data fim (ex: de 3 para 5 dias)
3. Sistema:
   - Desassocia faltas antigas (marca como não justificadas)
   - Atualiza/cria faltas do novo período
   - Faltas dos dias mantidos: ATUALIZADAS
   - Faltas dos dias novos: CRIADAS
4. Card de histórico atualiza instantaneamente
5. Card de faltas registradas reflete as mudanças

### Exclusão de Atestado
1. Usuário clica em "Deletar" no card de histórico
2. Sistema confirma exclusão
3. Sistema:
   - Desassocia atestado das faltas
   - Marca faltas como não justificadas
   - Deleta o atestado
4. **Faltas permanecem no sistema** mas sem badge "Atestado"
5. Card de histórico remove o atestado

---

## 📝 Próximos Passos

### ✅ Suspensões - CONCLUÍDO

Todas as correções foram aplicadas com sucesso no módulo de **Suspensões**:
- ✅ `POST /api/suspensions` - Cria faltas automaticamente
- ✅ `PUT /api/suspensions/[id]` - UPSERT de faltas (não deleta)
- ✅ `DELETE /api/suspensions/[id]` - Desassocia faltas (não deleta)
- ✅ Frontend - Cálculo de dias corrigido
- ✅ Service - Mapeamento de campos corrigido
- ✅ Hooks - Refetch aguardado implementado

**Arquivos modificados**:
1. Backend: `src/app/api/suspensions/route.ts` (POST)
2. Backend: `src/app/api/suspensions/[id]/route.ts` (PUT, DELETE)
3. Service: `src/services/supabase/studentSuspensionsService.ts`
4. Frontend: `src/hooks/useStudentProfile.ts` (suspensoes memo + handlers)

---

## 🔍 Arquivos Envolvidos

### Backend (API Routes)
- ✅ `src/app/api/medical-certificates/route.ts` (POST)
- ✅ `src/app/api/medical-certificates/[id]/route.ts` (PUT, DELETE)
- ✅ `src/app/api/suspensions/route.ts` (POST)
- ✅ `src/app/api/suspensions/[id]/route.ts` (PUT, DELETE)

### Service Layer
- ✅ `src/services/supabase/medicalCertificatesService.ts`
- ✅ `src/services/supabase/studentSuspensionsService.ts`

### Frontend (Hooks)
- ✅ `src/hooks/useStudentProfile.ts` (atestados: 215-236, 893-912 | suspensões: 233-254, 952-1141)

### Schemas
- ✅ `src/app/api/_schemas/medicalCertificateSchemas.ts`
- ✅ `src/app/api/_schemas/suspensionSchemas.ts`

---

## ✅ Testes Realizados

### Atestados Médicos
- [x] Cadastro: Faltas criadas automaticamente
- [x] Edição: Faltas atualizadas/criadas (não deletadas)
- [x] Exclusão: Faltas desassociadas (não deletadas)
- [x] Card de histórico atualiza corretamente
- [x] Card de faltas registradas reflete mudanças

### Suspensões
- [x] Cadastro - ✅ Faltas criadas automaticamente
- [x] Edição - ✅ Faltas atualizadas/criadas (não deletadas)
- [x] Exclusão - ✅ Faltas desassociadas (não deletadas)
- [x] Card de histórico atualiza corretamente
- [x] Card de faltas registradas reflete mudanças

---

## 📚 Referências

### Utilitários Usados
- `getDiasLetivosNoPeriodo(startDate, endDate)` - Retorna array de dias letivos
- `parseDate(dateString)` - Converte string para Date object
- `getBimesterByDate(date, bimesterDates)` - Retorna número do bimestre

### Tabelas Supabase
- `medical_certificates` - Atestados médicos
- `student_suspensions` - Suspensões
- `student_absences` - Faltas (com `medical_certificate_id` e `suspension_id`)

### Campos Importantes
- `student_absences.is_justified` - Boolean (justificada ou não)
- `student_absences.medical_certificate_id` - UUID do atestado (nullable)
- `student_absences.suspension_id` - UUID da suspensão (nullable)
- `medical_certificates.start_date` - Data início (DATE)
- `medical_certificates.end_date` - Data fim (DATE)

---

**Fim da Documentação**
