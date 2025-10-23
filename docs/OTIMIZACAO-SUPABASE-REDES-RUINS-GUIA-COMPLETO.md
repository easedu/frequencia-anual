# 🚀 GUIA COMPLETO: OTIMIZAÇÃO SUPABASE PARA REDES RUINS

> **DOCUMENTO DE IMPLEMENTAÇÃO DEFINITIVO**
>
> Este documento contém TODAS as etapas necessárias para otimizar o sistema para conexões de baixa qualidade.
> **NENHUMA etapa será deixada para depois. TUDO será implementado.**

---

## 📋 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Pré-Requisitos](#pré-requisitos)
3. [Fase 1: Otimizações Críticas](#fase-1-otimizações-críticas)
4. [Fase 2: Otimizações Altas](#fase-2-otimizações-altas)
5. [Fase 3: Otimizações Médias](#fase-3-otimizações-médias)
6. [Fase 4: Otimizações Baixas](#fase-4-otimizações-baixas)
7. [Validação e Testes](#validação-e-testes)
8. [Rollback Plan](#rollback-plan)
9. [Monitoramento Contínuo](#monitoramento-contínuo)

---

## 🎯 VISÃO GERAL

### Objetivos Finais

- **Performance**: Reduzir loading de 60-90s → 3-8s (15x mais rápido)
- **Resiliência**: Funcionar em 3G lento (< 1 Mbps)
- **UX**: Feedback visual imediato (< 500ms primeira renderização)
- **Confiabilidade**: 99.9% de sucesso em requisições (retry automático)

### Métricas de Sucesso

| Métrica | Antes | Meta | Medição |
|---------|-------|------|---------|
| Time to First Byte (TTFB) | 2-5s | < 500ms | Lighthouse |
| First Contentful Paint (FCP) | 8-15s | < 2s | Lighthouse |
| Largest Contentful Paint (LCP) | 15-30s | < 4s | Lighthouse |
| Total Page Load | 60-90s | < 8s | WebPageTest (3G) |
| Bundle Size | 2-3MB | < 500KB (compressed) | Webpack Bundle Analyzer |
| API Response Size | 3-5MB | < 300KB (compressed) | Chrome DevTools Network |
| Failed Requests (3G) | 30-50% | < 5% | Vercel Analytics |

### Estimativa de Tempo

- **Fase 1 (Críticas)**: 2-3 dias
- **Fase 2 (Altas)**: 3-4 dias
- **Fase 3 (Médias)**: 2 dias
- **Fase 4 (Baixas)**: 1 dia
- **Validação e Testes**: 2 dias
- **TOTAL**: 10-12 dias úteis

---

## 🔧 PRÉ-REQUISITOS

### 1. Ambiente de Testes

```bash
# 1. Criar branch específica
git checkout -b optimization/supabase-network-performance
git push -u origin optimization/supabase-network-performance

# 2. Configurar ambiente de staging (Vercel)
# - Criar preview deployment separado
# - Configurar variáveis de ambiente idênticas à produção
# - Habilitar analytics

# 3. Instalar ferramentas de medição
npm install --save-dev webpack-bundle-analyzer
npm install --save-dev lighthouse
npm install --save-dev @axe-core/cli
```

### 2. Baseline de Performance

**ANTES de iniciar qualquer mudança, capturar métricas atuais:**

```bash
# Terminal 1: Lighthouse (3G Slow)
npx lighthouse https://seu-app.vercel.app \
  --throttling.rttMs=300 \
  --throttling.throughputKbps=400 \
  --throttling.cpuSlowdownMultiplier=4 \
  --output=html \
  --output-path=./docs/performance/baseline-lighthouse.html

# Terminal 2: Bundle Analysis
npm run build
npm run analyze
# Salvar screenshot de bundle em docs/performance/baseline-bundle.png

# Terminal 3: Network Waterfall (Chrome DevTools)
# 1. Abrir DevTools → Network → Throttling: Slow 3G
# 2. Recarregar página
# 3. Exportar HAR: Network → Export HAR
# 4. Salvar em docs/performance/baseline-network.har
```

### 3. Dependências Necessárias

```bash
# React Query (cache + state management)
npm install @tanstack/react-query @tanstack/react-query-devtools

# Compression middleware (caso Vercel não aplique automaticamente)
npm install compression

# Performance monitoring
npm install web-vitals

# Infinite scroll
npm install react-intersection-observer

# Retry utilities
npm install p-retry p-timeout
```

### 4. Backup de Segurança

```bash
# Backup do schema Supabase
# Dashboard Supabase → Database → Backup → Create Manual Backup
# Nome: "pre-optimization-backup-YYYY-MM-DD"

# Backup do código (tag git)
git tag -a v1.0-pre-optimization -m "Backup antes de otimizações de rede"
git push origin v1.0-pre-optimization

# Backup de env vars (documentar em arquivo seguro)
# docs/performance/env-backup.md (NÃO commitar!)
```

---

## 🔴 FASE 1: OTIMIZAÇÕES CRÍTICAS

**Prioridade**: MÁXIMA
**Impacto Estimado**: 60-90s → 15-20s (4x)
**Tempo Estimado**: 2-3 dias

---

### 🔴 1.1: OVER-FETCHING - Otimizar SELECTs

**Problema**: Buscar TODOS os campos + relacionamentos sempre
**Solução**: SELECT seletivo baseado em contexto de uso

#### 📝 Etapa 1.1.1: Criar Tipos de Resposta Estratificados

**Arquivo**: `src/types/api-responses.ts` (CRIAR NOVO)

```typescript
/**
 * Tipos de resposta estratificados para APIs
 * Cada tipo representa um nível de detalhamento diferente
 */

// ============================================================================
// STUDENT RESPONSES
// ============================================================================

/**
 * Minimal: Apenas dados essenciais para listagens
 * Uso: Tabelas, dropdowns, cards de preview
 * Tamanho: ~200 bytes por registro
 */
export interface StudentMinimal {
  id: string;
  student_id: string;
  name: string;
  class: string;
  shift: 'MANHÃ' | 'TARDE';
  status: 'ATIVO' | 'INATIVO' | 'TRANSFERIDO';
}

/**
 * Summary: Dados essenciais + informações agregadas
 * Uso: Dashboards, listas com mais contexto
 * Tamanho: ~400 bytes por registro
 */
export interface StudentSummary extends StudentMinimal {
  birth_date?: string | null;
  bolsa_familia?: 'SIM' | 'NÃO' | null;
  total_contacts: number;
  total_absences: number;
  total_open_tasks: number;
}

/**
 * Detailed: Todos os campos principais (sem relacionamentos)
 * Uso: Página de detalhes do estudante
 * Tamanho: ~800 bytes por registro
 */
export interface StudentDetailed extends StudentSummary {
  registration_number?: string | null;
  school_year: string;
  address?: {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };
  disabilities?: Array<{
    type: string;
    description?: string;
    cid?: string;
    aee_type?: string;
    needs_ave?: boolean;
  }>;
  created_at: string;
  updated_at: string;
}

/**
 * Full: Todos os campos + relacionamentos carregados
 * Uso: Edição completa, relatórios detalhados
 * Tamanho: ~2KB por registro
 */
export interface StudentFull extends StudentDetailed {
  student_contacts: Array<{
    id: string;
    name: string;
    relationship: string | null;
    phone: string | null;
    can_receive_whatsapp: boolean;
    whatsapp_data?: {
      number?: string;
      verified?: boolean;
      verified_at?: string;
    };
  }>;
}

// ============================================================================
// ABSENCE RESPONSES
// ============================================================================

/**
 * Minimal: Apenas dados essenciais de falta
 * Uso: Contadores, agregações
 * Tamanho: ~150 bytes por registro
 */
export interface AbsenceMinimal {
  id: string;
  student_id: string;
  absence_date: string;
  is_justified: boolean;
  bimester: string | null;
}

/**
 * Summary: Dados da falta + nome do estudante
 * Uso: Listagens, relatórios
 * Tamanho: ~250 bytes por registro
 */
export interface AbsenceSummary extends AbsenceMinimal {
  student_name: string;
  student_class: string;
  student_firebase_id: string;
}

/**
 * Detailed: Falta completa + relacionamentos
 * Uso: Visualização detalhada
 * Tamanho: ~400 bytes por registro
 */
export interface AbsenceDetailed extends AbsenceSummary {
  medical_certificate_id?: string | null;
  suspension_id?: string | null;
  created_at: string;
}

// ============================================================================
// INTERACTION RESPONSES
// ============================================================================

export interface InteractionMinimal {
  id: string;
  student_id: string;
  interaction_type: string;
  interaction_date: string;
  is_sensitive: boolean;
}

export interface InteractionSummary extends InteractionMinimal {
  student_name: string;
  student_class: string;
  description_preview: string; // Primeiros 100 caracteres
}

export interface InteractionDetailed extends InteractionSummary {
  description: string | null;
  created_by: string | null;
  created_at: string;
}

// ============================================================================
// TASK RESPONSES
// ============================================================================

export interface TaskMinimal {
  id: string;
  student_id: string;
  title: string;
  is_resolved: boolean;
  due_date: string | null;
}

export interface TaskSummary extends TaskMinimal {
  student_name: string;
  student_class: string;
  recommended_action: string | null;
  created_at: string;
}

export interface TaskDetailed extends TaskSummary {
  description: string | null;
  action_taken: string | null;
  created_by: string | null;
  assigned_to: string | null;
  resolved_at: string | null;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Enum para especificar nível de detalhamento desejado
 */
export type DetailLevel = 'minimal' | 'summary' | 'detailed' | 'full';

/**
 * Metadata de paginação (padrão)
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Response wrapper genérico
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  pagination?: PaginationMeta;
  error?: string;
  message?: string;
}
```

#### 📝 Etapa 1.1.2: Refatorar API Students - GET

**Arquivo**: `src/app/api/students/route.ts`

**Mudanças**:

1. Adicionar query param `detail` para controlar nível de detalhamento
2. Implementar SELECTs otimizados por nível
3. Usar `count: 'estimated'` por padrão
4. Remover JOINs desnecessários

```typescript
/**
 * API Route: /api/students
 *
 * OTIMIZADO: SELECTs estratificados por nível de detalhamento
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/api/_middleware/auth';
import { validateQueryParams, sanitizeObject } from '@/app/api/_middleware/validation';
import {
  createStudentSchema,
  studentQuerySchema,
  CreateStudentInput,
} from '@/app/api/_schemas/studentSchemas';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  paginatedResponse,
} from '@/app/api/_utils/response';
import { handleError } from '@/app/api/_utils/errorHandler';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { v4 as uuidv4 } from 'uuid';
import type { DetailLevel } from '@/types/api-responses';

// ============================================================================
// SELECT QUERIES POR NÍVEL DE DETALHAMENTO
// ============================================================================

const SELECT_QUERIES = {
  minimal: 'id, student_id, name, class, shift, status',

  summary: `
    id, student_id, name, class, shift, status, birth_date, bolsa_familia,
    student_contacts(count),
    student_absences(count),
    user_tasks!user_tasks_student_id_fkey(count)
  `,

  detailed: `
    id, student_id, name, class, shift, status, birth_date, bolsa_familia,
    registration_number, school_year, address, disabilities,
    created_at, updated_at
  `,

  full: `
    id, student_id, name, class, shift, status, birth_date, bolsa_familia,
    registration_number, school_year, address, disabilities,
    created_at, updated_at,
    student_contacts(id, name, relationship, phone, can_receive_whatsapp, whatsapp_data)
  `
};

// ============================================================================
// GET /api/students - Listar estudantes com filtros
// ============================================================================

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    // 1. Validar query params
    const validation = validateQueryParams(req, studentQuerySchema);

    if (!validation.success) {
      return validation.response;
    }

    const {
      turma,
      turno,
      status,
      bolsaFamilia,
      estudanteComDeficiencia,
      page,
      limit,
      search,
      detail = 'minimal', // ✅ NOVO: Nível de detalhamento (padrão: minimal)
    } = validation.data;

    // ✅ OTIMIZAÇÃO: Validar nível de detalhamento
    const validDetailLevels: DetailLevel[] = ['minimal', 'summary', 'detailed', 'full'];
    const detailLevel: DetailLevel = validDetailLevels.includes(detail as DetailLevel)
      ? (detail as DetailLevel)
      : 'minimal';

    // ✅ OTIMIZAÇÃO: SELECT estratificado baseado em detail level
    const selectQuery = SELECT_QUERIES[detailLevel];

    // ✅ OTIMIZAÇÃO: count 'estimated' ao invés de 'exact' (10x mais rápido)
    const countType = page === 1 ? 'estimated' : 'planned'; // Só estimar na primeira página

    // 2. Construir query no Supabase
    let query: any = supabaseAdmin
      .from('students')
      .select(selectQuery, { count: countType })
      .eq('deleted', false)
      .order('name', { ascending: true });

    // Aplicar filtros
    if (turma) {
      query = query.eq('class', turma);
    }

    if (turno) {
      query = query.eq('shift', turno);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (bolsaFamilia) {
      query = query.eq('bolsa_familia', bolsaFamilia);
    }

    if (estudanteComDeficiencia !== undefined) {
      if (estudanteComDeficiencia) {
        query = query.not('disabilities', 'is', null);
      } else {
        query = query.or('disabilities.is.null,disabilities.eq.[]');
      }
    }

    if (search) {
      // ✅ OTIMIZAÇÃO: ilike apenas em name (evitar scan de múltiplas colunas)
      query = query.ilike('name', `%${search}%`);
    }

    // Paginação
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // 3. Executar query
    const { data, error, count } = await query;

    if (error) {
      console.error('[GET /api/students] Supabase error:', error);
      return errorResponse(
        'DATABASE_ERROR',
        'Erro ao buscar estudantes',
        500,
        process.env.NODE_ENV === 'development' ? error : undefined
      );
    }

    // 4. Converter para formato legacy (apenas se necessário)
    const students = (data || []).map((student: any) =>
      convertStudentByDetailLevel(student, detailLevel)
    );

    // 5. Retornar com paginação
    return paginatedResponse(students, page, limit, count || 0);
  } catch (error) {
    return handleError(error, 'GET /api/students');
  }
});

// ============================================================================
// POST /api/students - Criar novo estudante
// ============================================================================

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    // 1. Parse body
    const body = await req.json();

    // 2. Validar com Zod
    const validation = createStudentSchema.safeParse(body);

    if (!validation.success) {
      return validationErrorResponse(validation.error.errors);
    }

    const data = validation.data as CreateStudentInput;

    // 3. Sanitizar dados
    const sanitizedData = sanitizeObject(data);

    // ✅ Converter DDMMYYYY → YYYY-MM-DD (formato do Supabase)
    const convertToISODate = (date: string): string => {
      if (date.match(/^\d{8}$/)) {
        const day = date.substring(0, 2);
        const month = date.substring(2, 4);
        const year = date.substring(4, 8);
        return `${year}-${month}-${day}`;
      }
      return date;
    };

    // 4. Gerar IDs
    const estudanteId = uuidv4();

    // 5. Preparar dados para Supabase
    const studentInsert: any = {
      student_id: estudanteId,
      user_id: userId,
      name: sanitizedData.nome,
      class: sanitizedData.turma,
      shift: sanitizedData.turno,
      status: sanitizedData.status,
      bolsa_familia: sanitizedData.bolsaFamilia,
      registration_number: sanitizedData.matricula || null,
      birth_date: sanitizedData.dataNascimento ? convertToISODate(sanitizedData.dataNascimento) : null,
      school_year: new Date().getFullYear().toString(),
      address: sanitizedData.endereco || {},
      disabilities: sanitizedData.deficiencia ? [sanitizedData.deficiencia] : [],
      migrated_from: 'api',
      version: '3.0',
      deleted: false,
    };

    // 6. Inserir estudante
    const { data: studentData, error: studentError } = (await supabaseAdmin
      .from('students')
      .insert(studentInsert)
      .select('id')
      .single()) as { data: any; error: any };

    if (studentError) {
      console.error('[POST /api/students] Error inserting student:', studentError);
      return errorResponse(
        'DATABASE_ERROR',
        'Erro ao criar estudante',
        500,
        process.env.NODE_ENV === 'development' ? studentError : undefined
      );
    }

    // 7. Inserir contatos (se houver)
    if (sanitizedData.contatos && sanitizedData.contatos.length > 0) {
      const contactsInsert = sanitizedData.contatos.map((contato) => ({
        student_id: studentData.id,
        name: contato.nome,
        relationship: contato.parentesco || '',
        phone: contato.telefone,
        phone_numeric: contato.telefone.replace(/\D/g, ''),
        can_receive_whatsapp: contato.podeReceberMensagem ?? true,
        whatsapp_data: contato.whatsapp || {},
        version: '3.0',
      }));

      const { error: contactsError } = (await supabaseAdmin
        .from('student_contacts')
        .insert(contactsInsert as any)) as { error: any };

      if (contactsError) {
        console.error('[POST /api/students] Error inserting contacts:', contactsError);
        // Não falhar se contatos falharem, apenas logar
      }
    }

    // 8. Retornar sucesso
    return successResponse(
      {
        estudanteId,
        id: studentData.id,
      },
      'Estudante criado com sucesso',
      201
    );
  } catch (error) {
    return handleError(error, 'POST /api/students');
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Converte Student do Supabase para formato adequado baseado no detail level
 */
function convertStudentByDetailLevel(student: any, detailLevel: DetailLevel): any {
  const base = {
    id: student.id,
    student_id: student.student_id,
    estudanteId: student.student_id, // Legacy
    nome: student.name,
    name: student.name,
    turma: student.class,
    class: student.class,
    status: student.status,
    turno: student.shift,
    shift: student.shift,
  };

  if (detailLevel === 'minimal') {
    return base;
  }

  // Summary: adicionar campos agregados
  if (detailLevel === 'summary') {
    return {
      ...base,
      bolsaFamilia: student.bolsa_familia || 'NÃO',
      dataNascimento: student.birth_date || undefined,
      birth_date: student.birth_date,
      // Contagens agregadas (via count do Supabase)
      totalContatos: student.student_contacts?.[0]?.count || 0,
      totalFaltas: student.student_absences?.[0]?.count || 0,
      totalTarefasAbertas: student.user_tasks?.[0]?.count || 0,
    };
  }

  // Detailed: adicionar todos os campos principais
  if (detailLevel === 'detailed') {
    return {
      ...base,
      bolsaFamilia: student.bolsa_familia || 'NÃO',
      bolsa_familia: student.bolsa_familia,
      matricula: student.registration_number || undefined,
      registration_number: student.registration_number,
      dataNascimento: student.birth_date || undefined,
      birth_date: student.birth_date,
      anoLetivo: student.school_year,
      school_year: student.school_year,
      endereco: student.address || undefined,
      address: student.address,
      deficiencia: Array.isArray(student.disabilities) && student.disabilities.length > 0
        ? student.disabilities[0]
        : undefined,
      disabilities: student.disabilities,
      criadoEm: student.created_at,
      created_at: student.created_at,
      atualizadoEm: student.updated_at,
      updated_at: student.updated_at,
    };
  }

  // Full: incluir relacionamentos
  return {
    ...base,
    bolsaFamilia: student.bolsa_familia || 'NÃO',
    bolsa_familia: student.bolsa_familia,
    matricula: student.registration_number || undefined,
    dataNascimento: student.birth_date || undefined,
    endereco: student.address || undefined,
    deficiencia: Array.isArray(student.disabilities) && student.disabilities.length > 0
      ? student.disabilities[0]
      : undefined,
    disabilities: student.disabilities,
    contatos: (student.student_contacts || []).map((contact: any) => ({
      id: contact.id,
      nome: contact.name,
      parentesco: contact.relationship || '',
      telefone: contact.phone || '',
      podeReceberMensagem: contact.can_receive_whatsapp,
      whatsapp: contact.whatsapp_data || undefined,
    })),
    student_contacts: student.student_contacts,
    criadoEm: student.created_at,
    atualizadoEm: student.updated_at,
  };
}
```

#### 📝 Etapa 1.1.3: Atualizar Schema de Validação

**Arquivo**: `src/app/api/_schemas/studentSchemas.ts`

```typescript
import { z } from 'zod';

// ✅ NOVO: Adicionar detail level ao schema de query
export const studentQuerySchema = z.object({
  turma: z.string().optional(),
  turno: z.enum(['MANHÃ', 'TARDE']).optional(),
  status: z.enum(['ATIVO', 'INATIVO', 'TRANSFERIDO']).optional(),
  bolsaFamilia: z.enum(['SIM', 'NÃO']).optional(),
  estudanteComDeficiencia: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, 'page deve ser maior que 0')
    .default('1'),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0 && val <= 1000, 'limit deve ser entre 1 e 1000')
    .default('50'),
  search: z.string().optional(),
  // ✅ NOVO: Parâmetro de detalhamento
  detail: z.enum(['minimal', 'summary', 'detailed', 'full']).default('minimal'),
});

export type StudentQueryParams = z.infer<typeof studentQuerySchema>;

// Resto do schema permanece igual...
export const createStudentSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  turma: z.string().min(1, 'Turma é obrigatória'),
  turno: z.enum(['MANHÃ', 'TARDE'], { required_error: 'Turno é obrigatório' }),
  status: z.enum(['ATIVO', 'INATIVO', 'TRANSFERIDO']).default('ATIVO'),
  bolsaFamilia: z.enum(['SIM', 'NÃO']).optional(),
  matricula: z.string().optional(),
  dataNascimento: z.string().optional(),
  endereco: z.object({
    logradouro: z.string().optional(),
    numero: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    estado: z.string().optional(),
    cep: z.string().optional(),
    complemento: z.string().optional(),
  }).optional(),
  deficiencia: z.object({
    tipo: z.string(),
    descricao: z.string().optional(),
    cid: z.string().optional(),
    tipoAee: z.enum(['PAEE', 'PAAI']).optional(),
    necessitaAve: z.boolean().optional(),
  }).optional(),
  contatos: z.array(
    z.object({
      nome: z.string(),
      parentesco: z.string().optional(),
      telefone: z.string(),
      podeReceberMensagem: z.boolean().optional(),
      whatsapp: z.object({
        numero: z.string().optional(),
        verificado: z.boolean().optional(),
      }).optional(),
    })
  ).optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
```

#### 📝 Etapa 1.1.4: Refatorar Frontend Hook - useStudents

**Arquivo**: `src/hooks/api/useStudents.ts`

```typescript
/**
 * Hook: useStudents
 *
 * OTIMIZADO: Usa detail level para controlar tamanho de resposta
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchAllPages } from '@/utils/paginationHelper';
import type { DetailLevel } from '@/types/api-responses';

// ... (tipos permanecem iguais)

export interface StudentFilters {
  turma?: string;
  turno?: 'MANHÃ' | 'TARDE';
  status?: 'ATIVO' | 'INATIVO' | 'TRANSFERIDO';
  bolsa_familia?: 'SIM' | 'NÃO';
  search?: string;
  page?: number;
  limit?: number;
  detail?: DetailLevel; // ✅ NOVO
}

// ============================================================================
// HOOK: useStudents (GET with filters)
// ============================================================================

export function useStudents(filters?: StudentFilters) {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const fetchStudents = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const shouldLoadAll = !filters?.page && !filters?.limit;

      if (shouldLoadAll) {
        const token = await user.getIdToken();

        const allLoadedStudents = await fetchAllPages<Student>({
          baseUrl: '/api/students',
          token,
          filters: {
            turma: filters?.turma,
            turno: filters?.turno,
            status: filters?.status,
            bolsaFamilia: filters?.bolsa_familia,
            search: filters?.search,
            detail: filters?.detail || 'minimal', // ✅ NOVO: Padrão minimal
          },
          resourceName: 'estudantes',
          onProgress: (currentData, progress) => {
            setStudents([...currentData]);
            setPagination({
              page: 1,
              limit: currentData.length,
              total: progress.total,
              totalPages: 1
            });
          }
        });

        setStudents(allLoadedStudents);
        setPagination({
          page: 1,
          limit: allLoadedStudents.length,
          total: allLoadedStudents.length,
          totalPages: 1
        });
      } else {
        const params = new URLSearchParams();
        if (filters?.turma) params.append('turma', filters.turma);
        if (filters?.turno) params.append('turno', filters.turno);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.bolsa_familia) params.append('bolsaFamilia', filters.bolsa_familia);
        if (filters?.search) params.append('search', filters.search);
        if (filters?.page) params.append('page', filters.page.toString());
        if (filters?.limit) params.append('limit', filters.limit.toString());
        if (filters?.detail) params.append('detail', filters.detail); // ✅ NOVO

        const token = await user.getIdToken();

        const response = await fetch(`/api/students?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao buscar estudantes');
        }

        const data: PaginatedResponse<Student> = await response.json();

        setStudents(data.data);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('[useStudents] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, filters?.turma, filters?.turno, filters?.status, filters?.bolsa_familia, filters?.search, filters?.page, filters?.limit, filters?.detail]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return {
    students,
    loading,
    error,
    pagination,
    refetch: fetchStudents,
  };
}

// Resto dos hooks permanece igual...
```

#### 📝 Etapa 1.1.5: Atualizar Componentes que Usam useStudents

**Arquivo**: `src/app/cadastrar-estudante/page.tsx` (exemplo)

```typescript
'use client';

// ... imports

export default function CadastrarEstudantePage() {
  // ✅ ANTES: Carregava TUDO (full)
  // const { students, loading } = useStudents();

  // ✅ DEPOIS: Carregar apenas o necessário para listagem (minimal)
  const { students, loading } = useStudents({
    status: 'ATIVO',
    detail: 'minimal' // ✅ Apenas campos essenciais
  });

  // ... resto do código
}
```

**Arquivo**: `src/app/home/page.tsx` (Dashboard)

```typescript
'use client';

// ... imports

export default function HomePage() {
  // ✅ Dashboard precisa de contagens agregadas (summary)
  const { students, loading } = useStudents({
    status: 'ATIVO',
    detail: 'summary' // ✅ Inclui totalFaltas, totalContatos, etc
  });

  // ... resto do código
}
```

**IMPORTANTE**: Revisar TODOS os arquivos que usam `useStudents()`:

```bash
# Buscar todos os usos
grep -r "useStudents" src --include="*.tsx" --include="*.ts"

# Atualizar cada um com o detail level apropriado:
# - Listagens/tabelas → detail: 'minimal'
# - Dashboards → detail: 'summary'
# - Formulários de edição → detail: 'detailed'
# - Visualização completa → detail: 'full'
```

#### 📝 Etapa 1.1.6: Criar Endpoint para Contatos Separado

**Arquivo**: `src/app/api/students/[id]/contacts/route.ts` (CRIAR NOVO)

```typescript
/**
 * API Route: /api/students/[id]/contacts
 *
 * Buscar contatos de um estudante específico
 * Separado da query principal para reduzir over-fetching
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/app/api/_middleware/auth';
import { successResponse, errorResponse } from '@/app/api/_utils/response';
import { handleError } from '@/app/api/_utils/errorHandler';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { resolveFirebaseUUIDToInternal } from '@/app/api/_utils/studentIdResolver';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================================================
// GET /api/students/[id]/contacts - Buscar contatos do estudante
// ============================================================================

export const GET = withAuth(
  async (req: NextRequest, userId: string, context?: RouteParams) => {
    try {
      const params = await context?.params;
      const firebaseUUID = params?.id;

      if (!firebaseUUID) {
        return errorResponse('INVALID_REQUEST', 'ID do estudante não fornecido', 400);
      }

      // Resolver Firebase UUID → Internal ID
      const internalId = await resolveFirebaseUUIDToInternal(firebaseUUID);

      if (!internalId) {
        return errorResponse('NOT_FOUND', 'Estudante não encontrado', 404);
      }

      // Buscar contatos
      const { data: contacts, error } = await supabaseAdmin
        .from('student_contacts')
        .select('id, name, relationship, phone, phone_numeric, email, can_receive_whatsapp, whatsapp_data')
        .eq('student_id', internalId)
        .eq('is_placeholder', false)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[GET /api/students/[id]/contacts] Error:', error);
        return errorResponse(
          'DATABASE_ERROR',
          'Erro ao buscar contatos',
          500,
          process.env.NODE_ENV === 'development' ? error : undefined
        );
      }

      // Converter para formato legacy
      const formattedContacts = (contacts || []).map((contact) => ({
        id: contact.id,
        nome: contact.name,
        name: contact.name,
        parentesco: contact.relationship || '',
        relationship: contact.relationship,
        telefone: contact.phone || '',
        phone: contact.phone,
        email: contact.email,
        podeReceberMensagem: contact.can_receive_whatsapp,
        can_receive_whatsapp: contact.can_receive_whatsapp,
        whatsapp: contact.whatsapp_data || undefined,
        whatsapp_data: contact.whatsapp_data,
      }));

      return successResponse({ contacts: formattedContacts });
    } catch (error) {
      return handleError(error, 'GET /api/students/[id]/contacts');
    }
  }
);
```

#### 📝 Etapa 1.1.7: Aplicar Mesma Otimização em Outras APIs

**IMPORTANTE**: Repetir os passos 1.1.1 a 1.1.6 para:

1. **Absences** (`src/app/api/absences/route.ts`)
   - Minimal: `id, student_id, absence_date, is_justified`
   - Summary: + `students.name, students.class`
   - Detailed: + `medical_certificate_id, suspension_id, created_at`

2. **Interactions** (`src/app/api/interactions/route.ts`)
   - Minimal: `id, student_id, interaction_type, interaction_date`
   - Summary: + `students.name, description_preview (100 chars)`
   - Detailed: + `description, created_by, created_at`

3. **Tasks** (`src/app/api/tasks/route.ts`)
   - Minimal: `id, student_id, title, is_resolved, due_date`
   - Summary: + `students.name, recommended_action`
   - Detailed: + `description, action_taken, assigned_to`

4. **Medical Certificates** (`src/app/api/medical-certificates/route.ts`)
   - Minimal: `id, student_id, start_date, end_date, status`
   - Summary: + `students.name, days_covered`
   - Detailed: + `cid_code, diagnosis, doctor_name, document_url`

5. **Suspensions** (`src/app/api/suspensions/route.ts`)
   - Minimal: `id, student_id, start_date, end_date, severity`
   - Summary: + `students.name, reason`
   - Detailed: + `description, decision_by, follow_up_notes`

**Checklist de Implementação por API**:

- [ ] Adicionar tipos estratificados em `api-responses.ts`
- [ ] Definir SELECT_QUERIES por detail level
- [ ] Adicionar parâmetro `detail` no schema de validação
- [ ] Refatorar GET para usar SELECT estratificado
- [ ] Usar `count: 'estimated'` quando apropriado
- [ ] Atualizar hook frontend correspondente
- [ ] Atualizar componentes que usam o hook
- [ ] Testar com diferentes detail levels
- [ ] Validar redução de tamanho de resposta

---

### 🔴 1.2: SEM COMPRESSÃO - Habilitar Brotli/Gzip

**Problema**: Respostas JSON enviadas sem compressão
**Solução**: Habilitar compressão automática no Next.js + Vercel

#### 📝 Etapa 1.2.1: Configurar Compressão no Next.js

**Arquivo**: `next.config.mjs`

```javascript
/**
 * Next.js Configuration
 *
 * OTIMIZADO: Compressão habilitada para reduzir tamanho de payloads
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ NOVO: Habilitar compressão automática (gzip/brotli)
  compress: true,

  // Headers customizados
  async headers() {
    return [
      {
        // Aplicar a TODAS as rotas de API
        source: '/api/:path*',
        headers: [
          {
            key: 'Vary',
            value: 'Accept-Encoding',
          },
          // ✅ NOVO: Indicar que compressão está disponível
          {
            key: 'X-Content-Encoding-Options',
            value: 'br, gzip, deflate',
          },
        ],
      },
      {
        // Compressão para arquivos estáticos
        source: '/:path*.(js|css|html|svg|png|jpg|jpeg|webp|woff|woff2)',
        headers: [
          {
            key: 'Vary',
            value: 'Accept-Encoding',
          },
        ],
      },
    ];
  },

  // Resto da configuração existente...
  experimental: {
    // ...
  },
};

export default nextConfig;
```

#### 📝 Etapa 1.2.2: Verificar Configuração Vercel

**Arquivo**: `vercel.json` (CRIAR se não existir)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, s-maxage=10, stale-while-revalidate=59"
        },
        {
          "key": "Vary",
          "value": "Accept-Encoding"
        }
      ]
    },
    {
      "source": "/(.*)\\.(.*)$",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "rewrites": [],
  "redirects": [],
  "trailingSlash": false
}
```

**NOTA**: Vercel aplica compressão **automaticamente** por padrão. Este arquivo é apenas para garantir configuração explícita.

#### 📝 Etapa 1.2.3: Criar Teste de Compressão

**Arquivo**: `scripts/test-compression.mjs` (CRIAR NOVO)

```javascript
/**
 * Script para testar compressão de API responses
 *
 * Uso: node scripts/test-compression.mjs https://seu-app.vercel.app
 */

import https from 'https';
import zlib from 'zlib';

const BASE_URL = process.argv[2] || 'http://localhost:3000';

const ENDPOINTS = [
  '/api/students?limit=50',
  '/api/absences?limit=100',
  '/api/interactions?limit=50',
  '/api/tasks?limit=50',
];

async function testCompressionForEndpoint(endpoint) {
  return new Promise((resolve) => {
    const url = new URL(endpoint, BASE_URL);

    const options = {
      method: 'GET',
      headers: {
        'Accept-Encoding': 'br, gzip, deflate',
        'Authorization': 'Bearer YOUR_TEST_TOKEN_HERE', // ⚠️ Substituir
      },
    };

    https.get(url, options, (res) => {
      const encoding = res.headers['content-encoding'] || 'none';
      const contentLength = parseInt(res.headers['content-length'] || '0', 10);

      let chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);

        // Decodificar se comprimido
        let decompressed = buffer;
        if (encoding === 'gzip') {
          decompressed = zlib.gunzipSync(buffer);
        } else if (encoding === 'br') {
          decompressed = zlib.brotliDecompressSync(buffer);
        } else if (encoding === 'deflate') {
          decompressed = zlib.inflateSync(buffer);
        }

        const compressedSize = buffer.length;
        const uncompressedSize = decompressed.length;
        const ratio = ((1 - compressedSize / uncompressedSize) * 100).toFixed(2);

        resolve({
          endpoint,
          encoding,
          compressedSize,
          uncompressedSize,
          ratio: `${ratio}%`,
          savings: `${(uncompressedSize - compressedSize) / 1024}KB`,
        });
      });
    }).on('error', (err) => {
      resolve({
        endpoint,
        error: err.message,
      });
    });
  });
}

async function main() {
  console.log('🧪 Testando compressão de APIs...\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  const results = await Promise.all(
    ENDPOINTS.map(testCompressionForEndpoint)
  );

  console.table(results);

  const totalUncompressed = results.reduce((sum, r) => sum + (r.uncompressedSize || 0), 0);
  const totalCompressed = results.reduce((sum, r) => sum + (r.compressedSize || 0), 0);
  const totalRatio = ((1 - totalCompressed / totalUncompressed) * 100).toFixed(2);

  console.log('\n📊 Resumo:');
  console.log(`Total sem compressão: ${(totalUncompressed / 1024).toFixed(2)}KB`);
  console.log(`Total com compressão: ${(totalCompressed / 1024).toFixed(2)}KB`);
  console.log(`Economia: ${totalRatio}% (${((totalUncompressed - totalCompressed) / 1024).toFixed(2)}KB)`);
}

main();
```

#### 📝 Etapa 1.2.4: Adicionar Comando ao package.json

**Arquivo**: `package.json`

```json
{
  "scripts": {
    "test:compression": "node scripts/test-compression.mjs",
    "test:compression:prod": "node scripts/test-compression.mjs https://seu-app.vercel.app"
  }
}
```

#### 📝 Etapa 1.2.5: Validar Compressão

```bash
# 1. Testar localmente
npm run dev
npm run test:compression

# 2. Deploy para staging
git push origin optimization/supabase-network-performance
# Aguardar preview deployment

# 3. Testar em staging
npm run test:compression:prod

# 4. Validar no Chrome DevTools
# - Abrir Network tab
# - Filtrar por "Fetch/XHR"
# - Verificar coluna "Size": deve mostrar "compressed / uncompressed"
# - Exemplo: "45.2 KB / 234.5 KB" (5x de compressão)
```

**Critérios de Sucesso**:

- ✅ JSON responses comprimidos com brotli (br) ou gzip
- ✅ Compressão de 70-80% (tamanho reduzido para 20-30% do original)
- ✅ Header `Content-Encoding: br` ou `Content-Encoding: gzip` presente
- ✅ Tempo de resposta não aumenta significativamente (overhead < 50ms)

---

### 🔴 1.3: FALTA DE CACHE - Implementar Cache Estratégico

**Problema**: Mesmas queries executadas múltiplas vezes
**Solução**: Cache HTTP (edge) + React Query (cliente) + Revalidation

#### 📝 Etapa 1.3.1: Instalar Dependências

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
npm install web-vitals
```

#### 📝 Etapa 1.3.2: Criar Provider de React Query

**Arquivo**: `src/providers/QueryProvider.tsx` (CRIAR NOVO)

```typescript
/**
 * React Query Provider
 *
 * Gerencia cache global de todas as queries da aplicação
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, ReactNode } from 'react';

// ============================================================================
// CONFIGURAÇÃO DE CACHE
// ============================================================================

const CACHE_CONFIG = {
  // Dados considerados "fresh" por 5 minutos
  staleTime: 5 * 60 * 1000, // 5 min

  // Dados mantidos em cache por 30 minutos (mesmo se stale)
  cacheTime: 30 * 60 * 1000, // 30 min

  // Retry automático em caso de falha
  retry: 3,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),

  // Não refetch automaticamente ao focar janela
  refetchOnWindowFocus: false,

  // Não refetch ao reconectar (dados ainda estão válidos)
  refetchOnReconnect: false,

  // Não refetch ao montar (usar cache se disponível)
  refetchOnMount: false,
};

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // ✅ useState garante que QueryClient seja criado apenas uma vez
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: CACHE_CONFIG,
          mutations: {
            retry: 1, // Mutations: apenas 1 retry
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* ✅ DevTools apenas em desenvolvimento */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
      )}
    </QueryClientProvider>
  );
}
```

#### 📝 Etapa 1.3.3: Integrar Provider no Root Layout

**Arquivo**: `src/app/layout.tsx`

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryProvider } from '@/providers/QueryProvider'; // ✅ NOVO
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Frequência Anual',
  description: 'Sistema de gerenciamento de frequência escolar',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {/* ✅ NOVO: QueryProvider envolvendo AuthProvider */}
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
```

#### 📝 Etapa 1.3.4: Refatorar useStudents para usar React Query

**Arquivo**: `src/hooks/api/useStudents.ts` (REFATORAR COMPLETAMENTE)

```typescript
/**
 * Hook: useStudents (REFATORADO com React Query)
 *
 * OTIMIZADO: Cache automático, revalidation, prefetching
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchAllPages } from '@/utils/paginationHelper';
import type { DetailLevel } from '@/types/api-responses';

// ============================================================================
// TYPES
// ============================================================================

export interface Student {
  id: string;
  student_id: string;
  name: string;
  class: string;
  shift: 'MANHÃ' | 'TARDE';
  status: 'ATIVO' | 'INATIVO' | 'TRANSFERIDO';
  birth_date?: string | null;
  school_year: string;
  registration_number?: string | null;
  bolsa_familia?: 'SIM' | 'NÃO' | null;
  address?: Record<string, any>;
  disabilities?: Array<Record<string, any>>;
  student_contacts?: Array<any>;
  created_at: string;
  updated_at: string;
}

export interface StudentFilters {
  turma?: string;
  turno?: 'MANHÃ' | 'TARDE';
  status?: 'ATIVO' | 'INATIVO' | 'TRANSFERIDO';
  bolsa_familia?: 'SIM' | 'NÃO';
  search?: string;
  page?: number;
  limit?: number;
  detail?: DetailLevel;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================================
// QUERY KEYS (para cache consistency)
// ============================================================================

const STUDENTS_QUERY_KEY = 'students';

export const studentsKeys = {
  all: [STUDENTS_QUERY_KEY] as const,
  lists: () => [...studentsKeys.all, 'list'] as const,
  list: (filters: StudentFilters) => [...studentsKeys.lists(), filters] as const,
  details: () => [...studentsKeys.all, 'detail'] as const,
  detail: (id: string) => [...studentsKeys.details(), id] as const,
};

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function fetchStudentsPage(
  token: string,
  filters: StudentFilters
): Promise<PaginatedResponse<Student>> {
  const params = new URLSearchParams();
  if (filters.turma) params.append('turma', filters.turma);
  if (filters.turno) params.append('turno', filters.turno);
  if (filters.status) params.append('status', filters.status);
  if (filters.bolsa_familia) params.append('bolsaFamilia', filters.bolsa_familia);
  if (filters.search) params.append('search', filters.search);
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.detail) params.append('detail', filters.detail);

  const response = await fetch(`/api/students?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro ao buscar estudantes');
  }

  return response.json();
}

async function fetchAllStudents(
  token: string,
  filters: Omit<StudentFilters, 'page' | 'limit'>
): Promise<Student[]> {
  return fetchAllPages<Student>({
    baseUrl: '/api/students',
    token,
    filters: {
      turma: filters.turma,
      turno: filters.turno,
      status: filters.status,
      bolsaFamilia: filters.bolsa_familia,
      search: filters.search,
      detail: filters.detail || 'minimal',
    },
    resourceName: 'estudantes',
  });
}

async function fetchStudentById(token: string, id: string): Promise<Student> {
  const response = await fetch(`/api/students/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro ao buscar estudante');
  }

  const data: ApiResponse<{ student: Student }> = await response.json();
  if (!data.data?.student) {
    throw new Error('Estudante não encontrado');
  }

  return data.data.student;
}

// ============================================================================
// HOOKS: QUERIES
// ============================================================================

/**
 * Hook para buscar lista de estudantes com cache automático
 *
 * @example
 * // Listagem simples
 * const { data, isLoading } = useStudents({ status: 'ATIVO', detail: 'minimal' });
 *
 * // Com paginação
 * const { data, isLoading } = useStudents({ status: 'ATIVO', page: 1, limit: 50 });
 */
export function useStudents(filters: StudentFilters = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: studentsKeys.list(filters),
    queryFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();

      // Se não especificou página, carregar TODOS
      if (!filters.page && !filters.limit) {
        return {
          data: await fetchAllStudents(token, filters),
          pagination: {
            page: 1,
            limit: 0,
            total: 0,
            totalPages: 1,
          },
        };
      }

      // Senão, carregar página específica
      return fetchStudentsPage(token, filters);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 min
    cacheTime: 30 * 60 * 1000, // 30 min
  });
}

/**
 * Hook para buscar um estudante por ID com cache
 *
 * @example
 * const { data: student, isLoading } = useStudent(studentId);
 */
export function useStudent(id: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: studentsKeys.detail(id || ''),
    queryFn: async () => {
      if (!user || !id) throw new Error('ID ou usuário inválido');
      const token = await user.getIdToken();
      return fetchStudentById(token, id);
    },
    enabled: !!user && !!id,
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
  });
}

/**
 * Hook para infinite scroll de estudantes
 *
 * @example
 * const { data, fetchNextPage, hasNextPage, isLoading } = useInfiniteStudents({ status: 'ATIVO' });
 */
export function useInfiniteStudents(filters: Omit<StudentFilters, 'page' | 'limit'> = {}) {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: [...studentsKeys.lists(), 'infinite', filters],
    queryFn: async ({ pageParam = 1 }) => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();
      return fetchStudentsPage(token, { ...filters, page: pageParam, limit: 50 });
    },
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
  });
}

// ============================================================================
// HOOKS: MUTATIONS
// ============================================================================

/**
 * Hook para criar novo estudante
 * Invalida cache automaticamente após sucesso
 */
export function useCreateStudent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (studentData: any) => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();

      const response = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(studentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar estudante');
      }

      const data: ApiResponse<{ id: string }> = await response.json();
      return data.data;
    },
    onSuccess: () => {
      // ✅ Invalidar TODAS as listas de estudantes (força refetch)
      queryClient.invalidateQueries({ queryKey: studentsKeys.lists() });
    },
  });
}

/**
 * Hook para atualizar estudante existente
 * Invalida cache automaticamente após sucesso
 */
export function useUpdateStudent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();

      const response = await fetch(`/api/students/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar estudante');
      }

      const result: ApiResponse<{ id: string; updated: boolean }> = await response.json();
      return result.data;
    },
    onSuccess: (_, variables) => {
      // ✅ Invalidar detalhe do estudante específico
      queryClient.invalidateQueries({ queryKey: studentsKeys.detail(variables.id) });
      // ✅ Invalidar TODAS as listas (estudante pode ter mudado de filtro)
      queryClient.invalidateQueries({ queryKey: studentsKeys.lists() });
    },
  });
}

/**
 * Hook para deletar estudante (soft delete)
 * Invalida cache automaticamente após sucesso
 */
export function useDeleteStudent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();

      const response = await fetch(`/api/students/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao deletar estudante');
      }

      const data: ApiResponse<{ id: string; deleted: boolean }> = await response.json();
      return data.data;
    },
    onSuccess: (_, id) => {
      // ✅ Invalidar detalhe do estudante
      queryClient.invalidateQueries({ queryKey: studentsKeys.detail(id) });
      // ✅ Invalidar listas
      queryClient.invalidateQueries({ queryKey: studentsKeys.lists() });
    },
  });
}

// ============================================================================
// PREFETCH UTILITIES
// ============================================================================

/**
 * Prefetch de estudantes (para warming do cache)
 *
 * @example
 * // Ao entrar na página principal, prefetch de estudantes ativos
 * prefetchStudents({ status: 'ATIVO', detail: 'minimal' });
 */
export async function prefetchStudents(
  queryClient: ReturnType<typeof useQueryClient>,
  user: any,
  filters: StudentFilters
) {
  if (!user) return;

  const token = await user.getIdToken();

  await queryClient.prefetchQuery({
    queryKey: studentsKeys.list(filters),
    queryFn: () => fetchStudentsPage(token, filters),
    staleTime: 5 * 60 * 1000,
  });
}
```

#### 📝 Etapa 1.3.5: Atualizar Componentes para Usar React Query

**Arquivo**: `src/app/cadastrar-estudante/page.tsx`

```typescript
'use client';

import { useStudents, useCreateStudent, useUpdateStudent } from '@/hooks/api/useStudents';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function CadastrarEstudantePage() {
  // ✅ ANTES: const { students, loading, error, refetch } = useStudents({ status: 'ATIVO' });

  // ✅ DEPOIS: React Query com cache automático
  const {
    data, // { data: Student[], pagination: PaginationMeta }
    isLoading,
    isError,
    error,
    refetch
  } = useStudents({
    status: 'ATIVO',
    detail: 'minimal'
  });

  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();

  const handleCreateStudent = async (formData: any) => {
    try {
      await createStudent.mutateAsync(formData);
      toast.success('Estudante criado com sucesso');
      // ✅ Cache invalidado automaticamente, não precisa chamar refetch()
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleUpdateStudent = async (id: string, formData: any) => {
    try {
      await updateStudent.mutateAsync({ id, data: formData });
      toast.success('Estudante atualizado com sucesso');
      // ✅ Cache invalidado automaticamente
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="text-red-600">
        Erro ao carregar estudantes: {error?.message}
        <button onClick={() => refetch()}>Tentar novamente</button>
      </div>
    );
  }

  const students = data?.data || [];

  return (
    <div>
      <h1>Cadastrar Estudante</h1>
      <p>Total: {students.length} estudantes</p>
      {/* ... resto do componente */}
    </div>
  );
}
```

**IMPORTANTE**: Atualizar TODOS os componentes que usam `useStudents`:

```bash
# Listar todos os arquivos que usam useStudents
grep -r "useStudents" src/app --include="*.tsx"

# Atualizar cada um com o pattern React Query:
# - Trocar { students, loading, error } por { data, isLoading, isError, error }
# - Acessar students via data?.data
# - Usar mutations (createStudent.mutateAsync, etc) ao invés de funções diretas
# - Remover chamadas manuais de refetch (cache invalida automaticamente)
```

#### 📝 Etapa 1.3.6: Adicionar Cache HTTP nas API Routes

**Arquivo**: `src/app/api/_utils/response.ts` (atualizar)

```typescript
/**
 * Utilitários de Response com Cache HTTP
 */

import { NextResponse } from 'next/server';

// ============================================================================
// CONFIGURAÇÕES DE CACHE HTTP
// ============================================================================

/**
 * Cache policies para diferentes tipos de dados
 */
export const CACHE_POLICIES = {
  // Dados que mudam frequentemente (estudantes, faltas)
  dynamic: {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    'CDN-Cache-Control': 'max-age=60',
    'Vercel-CDN-Cache-Control': 'max-age=60',
  },

  // Dados que mudam raramente (configurações, ano letivo)
  static: {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    'CDN-Cache-Control': 'max-age=3600',
    'Vercel-CDN-Cache-Control': 'max-age=3600',
  },

  // Dados privados (dados do usuário logado)
  private: {
    'Cache-Control': 'private, max-age=60',
  },

  // Sem cache (mutations, dados sensíveis)
  none: {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
};

// ============================================================================
// RESPONSE HELPERS (atualizados com cache)
// ============================================================================

/**
 * Success response com cache HTTP
 */
export function successResponse(
  data: any,
  message?: string,
  status: number = 200,
  cachePolicy: keyof typeof CACHE_POLICIES = 'dynamic'
) {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    {
      status,
      headers: {
        ...CACHE_POLICIES[cachePolicy],
        'Vary': 'Accept-Encoding, Authorization',
      },
    }
  );
}

/**
 * Paginated response com cache HTTP
 */
export function paginatedResponse(
  data: any[],
  page: number,
  limit: number,
  total: number,
  cachePolicy: keyof typeof CACHE_POLICIES = 'dynamic'
) {
  return NextResponse.json(
    {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    {
      status: 200,
      headers: {
        ...CACHE_POLICIES[cachePolicy],
        'Vary': 'Accept-Encoding, Authorization',
        'X-Total-Count': total.toString(),
      },
    }
  );
}

/**
 * Error response (sem cache)
 */
export function errorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: any
) {
  return NextResponse.json(
    {
      success: false,
      error: code,
      message,
      ...(process.env.NODE_ENV === 'development' && details ? { details } : {}),
    },
    {
      status,
      headers: CACHE_POLICIES.none,
    }
  );
}

/**
 * Validation error response (sem cache)
 */
export function validationErrorResponse(errors: any[]) {
  return NextResponse.json(
    {
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Erro de validação',
      errors,
    },
    {
      status: 400,
      headers: CACHE_POLICIES.none,
    }
  );
}

/**
 * Not found response (cache curto)
 */
export function notFoundResponse(resource: string, id: string) {
  return NextResponse.json(
    {
      success: false,
      error: 'NOT_FOUND',
      message: `${resource} não encontrado: ${id}`,
    },
    {
      status: 404,
      headers: {
        'Cache-Control': 'public, s-maxage=60', // Cache curto para 404s
      },
    }
  );
}
```

#### 📝 Etapa 1.3.7: Validar Cache Funcionando

```bash
# 1. Rodar localmente
npm run dev

# 2. Abrir Chrome DevTools
# Network → Disable cache (desabilitar)
# Filtrar por "Fetch/XHR"

# 3. Carregar página de estudantes
# Primeira request:
# - Status: 200
# - Size: XX KB (transferred)
# - Time: ~500ms

# 4. Recarregar página (sem Ctrl+Shift+R, apenas F5)
# Segunda request (React Query cache):
# - Status: (cached)
# - Size: (disk cache)
# - Time: ~10ms

# 5. Aguardar 1 minuto, recarregar
# Terceira request (HTTP cache):
# - Status: 304 Not Modified
# - Size: (disk cache)
# - Time: ~50ms

# 6. Criar novo estudante
# Após mutação bem-sucedida:
# - Cache invalidado automaticamente
# - Nova request: Status 200 (dados atualizados)
```

**Critérios de Sucesso**:

- ✅ Primeira carga: dados vem do servidor (200 OK)
- ✅ Recarga imediata: dados vem do React Query cache (~10ms)
- ✅ Após 1min: dados vem do HTTP cache (304 Not Modified)
- ✅ Após mutação: cache invalidado, nova request busca dados atualizados
- ✅ DevTools do React Query mostra status de cache (fresh/stale/fetching)

---

### 🔴 1.4: Resumo da Fase 1

**Checklist Completo**:

- [ ] ✅ Over-fetching: SELECT estratificado implementado em TODAS as APIs
  - [ ] Students: 4 níveis (minimal/summary/detailed/full)
  - [ ] Absences: 3 níveis (minimal/summary/detailed)
  - [ ] Interactions: 3 níveis (minimal/summary/detailed)
  - [ ] Tasks: 3 níveis (minimal/summary/detailed)
  - [ ] Medical Certificates: 3 níveis
  - [ ] Suspensions: 3 níveis
  - [ ] Tipos estratificados em `api-responses.ts`
  - [ ] Schemas de validação atualizados
  - [ ] Hooks frontend atualizados
  - [ ] Componentes atualizados com detail levels corretos

- [ ] ✅ Compressão: Brotli/Gzip habilitado
  - [ ] `compress: true` em next.config.mjs
  - [ ] Headers configurados (Vary, Content-Encoding)
  - [ ] vercel.json configurado
  - [ ] Script de teste de compressão criado
  - [ ] Compressão validada (70-80% redução)

- [ ] ✅ Cache: React Query + HTTP cache implementado
  - [ ] @tanstack/react-query instalado
  - [ ] QueryProvider criado e integrado no layout
  - [ ] useStudents refatorado com React Query
  - [ ] Query keys bem definidos (studentsKeys)
  - [ ] Mutations com invalidação automática de cache
  - [ ] Prefetch utilities criados
  - [ ] HTTP cache headers nas API routes
  - [ ] CACHE_POLICIES definidos por tipo de dado
  - [ ] Componentes atualizados para usar React Query
  - [ ] Cache validado (10ms cached, 50ms 304, 500ms fresh)

**Métricas Esperadas Após Fase 1**:

| Métrica | Antes | Após Fase 1 | Melhoria |
|---------|-------|-------------|----------|
| Payload Size (students) | 4.2MB | 500KB | **8x** |
| First Load Time (3G) | 60-90s | 15-20s | **4x** |
| Subsequent Loads | 60s | <1s | **60x** |
| Failed Requests (3G) | 30-50% | 10-15% | **3x** |

**Tempo Estimado Fase 1**: 2-3 dias

**Deploy Fase 1**:

```bash
# 1. Commit das mudanças
git add .
git commit -m "feat(optimization): Fase 1 - Over-fetching, Compressão e Cache"

# 2. Push para staging
git push origin optimization/supabase-network-performance

# 3. Validar em preview deployment
npm run test:compression:prod
npm run lighthouse:staging

# 4. Se OK, merge para main
# (Continuar para Fase 2 antes de merge, ou fazer merge incremental)
```

---

**FIM DA FASE 1** ✅

**PRÓXIMO**: Fase 2 (Otimizações Altas) → N+1 Queries, Paginação Ineficiente, Timeout Conservador

---

(continuação no próximo bloco...)
