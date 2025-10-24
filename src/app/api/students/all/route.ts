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
  data?: any[];
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
 * Converter data ISO (yyyy-mm-dd) para formato brasileiro (dd/mm/yyyy)
 */
function convertISOToBrazilian(isoDate: string | null): string {
  if (!isoDate) return '';

  // Se já está em formato brasileiro (dd/mm/yyyy), retorna
  if (isoDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    return isoDate;
  }

  // Se está em ISO format (yyyy-mm-dd)
  if (isoDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  }

  // Se está em formato DDMMYYYY (sem separadores)
  if (isoDate.match(/^\d{8}$/)) {
    const day = isoDate.substring(0, 2);
    const month = isoDate.substring(2, 4);
    const year = isoDate.substring(4, 8);
    return `${day}/${month}/${year}`;
  }

  // Fallback: retornar original
  return isoDate;
}

/**
 * Converter formato brasileiro (dd/mm/yyyy) para DDMMYYYY (sem separadores)
 */
function brazilianToCompact(brDate: string): string {
  if (!brDate) return '';

  // Se está em formato dd/mm/yyyy, remover separadores
  if (brDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    return brDate.replace(/\//g, '');
  }

  // Se já está sem separadores, retornar
  return brDate;
}

/**
 * Converter dados do Supabase para formato frontend (compatível com Firebase legacy)
 */
function convertSupabaseToFrontend(student: any): any {
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
    dataNascimento: brazilianToCompact(convertISOToBrazilian(student.birth_date)),
    genero: student.gender || '',
    corRaca: student.race || '',
    cpf: student.cpf || '',
    numeroRA: student.ra_number || '',
    numeroRG: student.rg_number || '',

    // Endereço
    cep: student.address_zip || '',
    logradouro: student.address_street || '',
    numeroEndereco: student.address_number || '',
    complemento: student.address_complement || '',
    bairro: student.address_neighborhood || '',
    cidade: student.address_city || '',
    estado: student.address_state || '',

    // Informações sociais
    bolsaFamilia: student.bolsa_familia === true ? 'SIM' : 'NÃO',
    auxilioBrasil: student.auxilio_brasil === true ? 'SIM' : 'NÃO',

    // Deficiências
    deficiencias: Array.isArray(student.disabilities) ? student.disabilities : [],
    aee: student.special_education_service || '',
    possuiAVE: student.has_school_assistant === true ? 'SIM' : 'NÃO',

    // Contatos (se incluídos)
    contatos: Array.isArray(student.student_contacts)
      ? student.student_contacts.map((contact: any) => ({
          nome: contact.name || '',
          parentesco: contact.relationship || '',
          telefone: contact.phone || '',
          telefone2: contact.phone2 || '',
          email: contact.email || '',

          // WhatsApp
          numeroWhatsapp: contact.whatsapp_number || '',
          statusWhatsapp: contact.whatsapp_status || 'NAO_VERIFICADO',
          ultimaVerificacao: contact.whatsapp_last_verified
            ? new Date(contact.whatsapp_last_verified).toISOString()
            : null,
          idWhatsapp: contact.whatsapp_id || null,
          profilePicUrl: contact.whatsapp_profile_pic || null,
        }))
      : [],

    // Metadados
    createdAt: student.created_at ? new Date(student.created_at).toISOString() : '',
    updatedAt: student.updated_at ? new Date(student.updated_at).toISOString() : '',
    deletedAt: student.deleted_at ? new Date(student.deleted_at).toISOString() : null,
    deleted: student.deleted || false,
  };
}

// ════════════════════════════════════════════════════════════════
// API ROUTE HANDLER
// ════════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

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

    const cached = serverCache.get<any[]>(cacheKey);

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
    let query = supabaseAdmin
      .from('students')
      .select(
        includeContacts
          ? `
            id,
            student_id,
            name,
            class,
            shift,
            status,
            birth_date,
            gender,
            race,
            cpf,
            ra_number,
            rg_number,
            address_zip,
            address_street,
            address_number,
            address_complement,
            address_neighborhood,
            address_city,
            address_state,
            bolsa_familia,
            auxilio_brasil,
            disabilities,
            special_education_service,
            has_school_assistant,
            created_at,
            updated_at,
            deleted_at,
            deleted,
            student_contacts (
              name,
              relationship,
              phone,
              phone2,
              email,
              whatsapp_number,
              whatsapp_status,
              whatsapp_last_verified,
              whatsapp_id,
              whatsapp_profile_pic
            )
          `
          : `
            id,
            student_id,
            name,
            class,
            shift,
            status,
            birth_date,
            gender,
            race,
            cpf,
            ra_number,
            rg_number,
            address_zip,
            address_street,
            address_number,
            address_complement,
            address_neighborhood,
            address_city,
            address_state,
            bolsa_familia,
            auxilio_brasil,
            disabilities,
            special_education_service,
            has_school_assistant,
            created_at,
            updated_at,
            deleted_at,
            deleted
          `
      )
      .order('name', { ascending: true });

    // Filtrar por deleted se necessário
    if (!includeDeleted) {
      query = query.eq('deleted', false);
    }

    const { data: students, error } = (await query) as {
      data: any[] | null;
      error: any;
    };

    if (error) {
      logger.error('[API /students/all] Erro ao buscar estudantes', error);
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error('[API /students/all] Erro ao buscar estudantes', {
      message: errorMessage,
      stack: errorStack,
      error: error,
    });

    // Log completo para debug em produção
    console.error('[API /students/all] Erro completo:', error);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage || 'Erro desconhecido ao buscar estudantes',
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      } as ApiResponse,
      { status: 500 }
    );
  }
}