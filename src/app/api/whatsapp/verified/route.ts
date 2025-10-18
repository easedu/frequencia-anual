/**
 * API Route: /api/whatsapp/verified
 *
 * GET - Lista números verificados do WhatsApp
 * POST - Adiciona número verificado
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/app/api/_middleware/auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { errorResponse, successResponse } from '@/app/api/_utils/response'
import { handleError } from '@/app/api/_utils/errorHandler'
import { logger } from '@/utils/logger'
import { z } from 'zod'

// ============================================================================
// SCHEMAS
// ============================================================================

const verifiedNumberFiltersSchema = z.object({
  phone_number: z.string().optional(),
  is_verified: z.enum(['true', 'false']).optional(),
  account_exists: z.enum(['true', 'false']).optional(),
  limit: z.string().regex(/^\d+$/).transform(val => Math.min(parseInt(val), 1000)).optional().default('100'),
  offset: z.string().regex(/^\d+$/).optional().default('0'),
})

const createVerifiedNumberSchema = z.object({
  phone_number: z.string().regex(/^\d{10,13}$/, 'Telefone deve ter 10-13 dígitos'),
  is_verified: z.boolean().optional().default(false),
  whatsapp_jid: z.string().nullable().optional(),
  contact_name: z.string().nullable().optional(),
  account_exists: z.boolean().optional().default(false),
  verification_status: z.string().nullable().optional(),
})

/**
 * GET /api/whatsapp/verified
 * Lista números verificados com filtros opcionais
 *
 * Query params:
 * - phone_number: Número de telefone (exato)
 * - is_verified: 'true' | 'false'
 * - account_exists: 'true' | 'false'
 * - limit: Número de resultados (default: 100)
 * - offset: Offset para paginação (default: 0)
 *
 * @example
 * GET /api/whatsapp/verified?phone_number=5511988384664
 * GET /api/whatsapp/verified?is_verified=true&account_exists=true
 */
export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const { searchParams } = new URL(request.url)

    // Validar filtros
    const filters = verifiedNumberFiltersSchema.parse({
      phone_number: searchParams.get('phone_number') || undefined,
      is_verified: searchParams.get('is_verified') || undefined,
      account_exists: searchParams.get('account_exists') || undefined,
      limit: searchParams.get('limit') || '100',
      offset: searchParams.get('offset') || '0',
    })

    const limit = parseInt(filters.limit)
    const offset = parseInt(filters.offset)

    // Construir query
    let query = supabaseAdmin
      .from('whatsapp_verified_numbers')
      .select('*', { count: 'exact' })

    // Aplicar filtros
    if (filters.phone_number) {
      query = query.eq('phone_number', filters.phone_number)
    }

    if (filters.is_verified) {
      query = query.eq('is_verified', filters.is_verified === 'true')
    }

    if (filters.account_exists) {
      query = query.eq('account_exists', filters.account_exists === 'true')
    }

    // Aplicar paginação e ordenação
    query = query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      logger.error('Erro ao buscar números verificados', error)
      return errorResponse(error.message, 500)
    }

    return NextResponse.json({
      data: data || [],
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    return handleError(error)
  }
});

/**
 * POST /api/whatsapp/verified
 * Adiciona ou atualiza número verificado
 *
 * Body:
 * {
 *   "phone_number": "5511988384664",
 *   "is_verified": true,
 *   "whatsapp_jid": "5511988384664@s.whatsapp.net" (opcional),
 *   "contact_name": "Nome do Contato" (opcional),
 *   "account_exists": true,
 *   "verification_status": "VERIFIED" (opcional)
 * }
 *
 * @example
 * POST /api/whatsapp/verified
 * {
 *   "phone_number": "5511988384664",
 *   "is_verified": true,
 *   "account_exists": true,
 *   "contact_name": "João Silva"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar dados
    const validated = createVerifiedNumberSchema.parse(body)

    // Verificar se número já existe
    const { data: existing, error: searchError } = await supabaseAdmin
      .from('whatsapp_verified_numbers')
      .select('id')
      .eq('phone_number', validated.phone_number)
      .maybeSingle()

    if (searchError) {
      logger.error('Erro ao verificar número existente', searchError)
      return errorResponse(searchError.message, 500)
    }

    let result

    if (existing) {
      // Atualizar existente
      const updateData: Record<string, any> = {
        is_verified: validated.is_verified,
        account_exists: validated.account_exists,
        updated_at: new Date().toISOString()
      }

      if (validated.whatsapp_jid !== undefined) updateData.whatsapp_jid = validated.whatsapp_jid
      if (validated.contact_name !== undefined) updateData.contact_name = validated.contact_name
      if (validated.verification_status !== undefined) updateData.verification_status = validated.verification_status

      if (validated.is_verified) {
        updateData.verified_at = new Date().toISOString()
      }

      const { data, error } = await supabaseAdmin
        .from('whatsapp_verified_numbers')
      // @ts-ignore - Supabase type mismatch
        .update({...updateData} as any)
        .eq('id', (existing as any)?.id)
        .select()
        .single()

      if (error) {
        logger.error('Erro ao atualizar número verificado', error)
        return errorResponse(error.message, 500)
      }

      result = data as any
      logger.info('Número verificado atualizado', { phone: validated.phone_number })
    } else {
      // Criar novo
      const { data, error } = await supabaseAdmin
        .from('whatsapp_verified_numbers')
        .insert({
          phone_number: validated.phone_number,
          is_verified: validated.is_verified || false,
          verified_at: validated.is_verified ? new Date().toISOString() : null,
          whatsapp_jid: validated.whatsapp_jid || null,
          contact_name: validated.contact_name || null,
          account_exists: validated.account_exists || false,
          verification_status: validated.verification_status || null,
        } as any)
        .select()
        .single()

      if (error) {
        logger.error('Erro ao criar número verificado', error)
        return errorResponse(error.message, 500)
      }

      result = data as any
      logger.info('Número verificado criado', { phone: validated.phone_number })
    }

    return successResponse(result, existing ? 200 : 201)
  } catch (error) {
    return handleError(error)
  }
}
