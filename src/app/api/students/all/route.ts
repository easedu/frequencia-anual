/**
 * API Route: GET /api/students/all
 *
 * Busca todos os estudantes ativos com cache otimizado para redes lentas.
 *
 * ✅ OTIMIZAÇÕES:
 * - Cache de 30 minutos (estudantes mudam com menos frequência que ano letivo)
 * - Query única otimizada (supabaseAdmin - sem RLS overhead)
 * - Server-side rendering
 * - Timeout de 30s (suficiente para 2G/3G)
 *
 * Performance:
 * - 1ª chamada: ~3-8s (2G/3G)
 * - Próximas: < 500ms (cached) ⚡
 *
 * Formato de retorno (compatível com StudentDataService):
 * {
 *   success: true,
 *   data: [
 *     {
 *       estudanteId: "uuid",
 *       nome: "João Silva",
 *       turma: "5A",
 *       turno: "MANHÃ",
 *       status: "ATIVO",
 *       // ... outros campos
 *     }
 *   ],
 *   cached: false,
 *   count: 150
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { serverCache } from '@/utils/serverCache';
import { logger } from '@/utils/logger';

// ════════════════════════════════════════════════════════════════
// RUNTIME CONFIG (Vercel)
// ════════════════════════════════════════════════════════════════

// ⚠️ IMPORTANTE: maxDuration aumentado para redes 2G/3G
// Vercel Free Plan: max 10s (Edge), max 60s (Serverless)
// Usando nodejs runtime para ter 60s disponíveis
export const runtime = 'nodejs'; // não usar 'edge' (limite de 10s)
export const maxDuration = 60; // 60 segundos para redes muito lentas

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

interface ApiResponse {
  success: boolean;
  data?: unknown[];
  error?: string;
  cached?: boolean;
  count?: number;
}

// ════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════

// Cache de 30 minutos (estudantes mudam com menos frequência)
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════


/**
 * Converter dados do Supabase para formato frontend (compatível com Firebase legacy)
 * Baseado em: studentDataService.ts (conversão que funciona)
 */
function convertSupabaseToFrontend(student: Record<string, unknown>): Record<string, unknown> {
  // Parse address JSONB que pode conter dados legados
  const addressData = (student.address as Record<string, unknown>) || {};

  return {
    // IDs
    estudanteId: student.student_id, // Firebase UUID (compatibilidade)
    id: student.id, // Internal ID (para referência)

    // Dados básicos
    nome: student.name || '',
    turma: student.class || '',
    turno: student.shift || '',
    status: student.status || 'ATIVO',

    // Dados pessoais
    dataNascimento: student.birth_date || undefined,
    matricula: student.registration_number || undefined,
    email: undefined, // Não está no schema Supabase

    // Informações sociais
    bolsaFamilia: student.bolsa_familia || 'NÃO',

    // Endereço (JSONB)
    endereco: addressData,

    // Deficiências (JSONB array)
    deficiencia: parseDisabilities(Array.isArray(student.disabilities) ? student.disabilities : [], addressData),

    // Contatos (se incluídos)
    contatos: Array.isArray(student.student_contacts)
      ? student.student_contacts.map((contact: Record<string, unknown>) => {
          const whatsappData = (contact.whatsapp_data as Record<string, unknown>) || {};

          return {
            id: contact.id,
            nome: contact.name || '',
            parentesco: contact.relationship || '',
            telefone: contact.phone || '',
            telefoneNumerico: contact.phone_numeric || undefined,
            podeReceberMensagem: contact.can_receive_whatsapp,

            // WhatsApp (extraído do JSONB)
            whatsapp: whatsappData.verified
              ? {
                  verified: whatsappData.verified || false,
                  exists: whatsappData.exists || false,
                  verifiedAt: whatsappData.verifiedAt || whatsappData.verified_at || null,
                  name: whatsappData.name || null,
                  number: whatsappData.number || null,
                }
              : undefined,
            whatsappData: whatsappData,
            whatsapp_data: whatsappData,
          };
        })
      : [],

    // Prova São Paulo (exam_scores JSONB)
    provaSaoPaulo: Array.isArray(student.exam_scores) ? student.exam_scores : [],

    // Metadados
    createdAt: student.created_at && typeof student.created_at === 'string' ? new Date(student.created_at).toISOString() : '',
    updatedAt: student.updated_at && typeof student.updated_at === 'string' ? new Date(student.updated_at).toISOString() : '',
    deletedAt: student.deleted_at && typeof student.deleted_at === 'string' ? new Date(student.deleted_at).toISOString() : null,
    deleted: student.deleted || false,
  };
}

/**
 * Helper: Parse disabilities from Supabase JSONB array + legacy data in address
 * Baseado em: studentDataService.ts
 */
function parseDisabilities(disabilities: unknown[], addressData: Record<string, unknown> = {}): Record<string, unknown> {
  // Extrair dados legados de deficiência do address JSONB
  const legacyDeficiencia = (addressData.deficiencia || addressData) as Record<string, unknown>;

  // Se não há disabilities no Supabase MAS há dados legados, usar dados legados
  if ((!disabilities || disabilities.length === 0) && legacyDeficiencia) {
    if (typeof legacyDeficiencia === 'object' && legacyDeficiencia !== null && 'estudanteComDeficiencia' in legacyDeficiencia) {
      return legacyDeficiencia;
    }
  }

  // Se não há disabilities nem dados legados
  if (!disabilities || disabilities.length === 0) {
    return {
      estudanteComDeficiencia: false,
      tipoDeficiencia: [],
    };
  }

  // Se há disabilities array, converter para formato legado
  return {
    estudanteComDeficiencia: disabilities.length > 0,
    tipoDeficiencia: disabilities,
  };
}

// ════════════════════════════════════════════════════════════════
// API ROUTE HANDLER
// ════════════════════════════════════════════════════════════════

export async function GET(_req: NextRequest) {
  try {
    const { searchParams } = new URL(_req.url);

    // Parâmetros opcionais
    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    const includeContacts = searchParams.get('includeContacts') !== 'false'; // default true
    const clearCache = searchParams.get('clearCache') === 'true';

    // ✅ PASSO 1: Verificar cache primeiro (a menos que clearCache=true)
    const cacheKey = `students-all-${includeDeleted}-${includeContacts}`;

    if (clearCache) {
      serverCache.invalidate(cacheKey);
      logger.info('[API /students/all] Cache limpo manualmente', { cacheKey });
    }

    const cached = serverCache.get<unknown[]>(cacheKey);

    if (cached && !clearCache) {
      logger.info('[API /students/all] Cache HIT', {
        count: cached.length,
        includeDeleted,
        includeContacts,
      });

      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
        count: cached.length,
      } as ApiResponse);
    }

    logger.info('[API /students/all] Cache MISS - Buscando no banco', {
      includeDeleted,
      includeContacts,
    });

    // ✅ PASSO 2: Buscar estudantes do Supabase
    // Usar '*' para pegar todas as colunas (evita erros de schema)
    let query = supabaseAdmin
      .from('students')
      .select(
        includeContacts
          ? '*, student_contacts(id, name, relationship, phone, phone_numeric, email, can_receive_whatsapp, whatsapp_data)'
          : '*'
      )
      .order('name', { ascending: true });

    // Filtrar por deleted se necessário
    if (!includeDeleted) {
      query = query.eq('deleted', false);
    }

    const { data: students, error } = (await query) as {
      data: Array<Record<string, unknown>> | null;
      error: unknown;
    };

    if (error) {
      logger.error('[API /students/all] Erro ao buscar estudantes', error as Record<string, unknown>);
      throw error;
    }

    if (!students || students.length === 0) {
      logger.warn('[API /students/all] Nenhum estudante encontrado', {
        includeDeleted,
      });

      return NextResponse.json({
        success: true,
        data: [],
        cached: false,
        count: 0,
      } as ApiResponse);
    }

    // ✅ PASSO 3: Converter para formato frontend
    const convertedStudents = students.map(convertSupabaseToFrontend);

    logger.info('[API /students/all] Estudantes carregados com sucesso', {
      count: convertedStudents.length,
      includeDeleted,
      includeContacts,
    });

    // ✅ PASSO 4: Salvar no cache
    serverCache.set(cacheKey, convertedStudents, CACHE_TTL);

    logger.info('[API /students/all] Cache ARMAZENADO', {
      cacheKey,
      cacheTTL: `${CACHE_TTL / 1000 / 60} minutos`,
      count: convertedStudents.length,
    });

    // ✅ PASSO 5: Retornar resposta
    return NextResponse.json({
      success: true,
      data: convertedStudents,
      cached: false,
      count: convertedStudents.length,
    } as ApiResponse);
  } catch (error) {
    // Serializar erro corretamente (pode ser Error, objeto do Supabase, ou string)
    let errorMessage = 'Erro desconhecido ao buscar estudantes';
    let errorDetails: unknown = undefined;

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = {
        name: error.name,
        stack: error.stack,
      };
    } else if (typeof error === 'object' && error !== null) {
      // Erro do Supabase ou outro objeto
      errorMessage = JSON.stringify(error);
      errorDetails = error;
    } else {
      errorMessage = String(error);
    }

    logger.error('[API /students/all] Erro ao buscar estudantes', {
      message: errorMessage,
      details: errorDetails,
      rawError: error,
    });

    // Log completo para debug em produção (Vercel Logs)
    console.error('[API /students/all] ❌ ERRO COMPLETO:');
    console.error('Tipo:', typeof error);
    console.error('É Error?', error instanceof Error);
    console.error('Conteúdo:', error);
    console.error('JSON:', JSON.stringify(error, null, 2));

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        // Em desenvolvimento, retornar detalhes completos
        ...(process.env.NODE_ENV === 'development' && { details: errorDetails }),
      } as ApiResponse,
      { status: 500 }
    );
  }
}