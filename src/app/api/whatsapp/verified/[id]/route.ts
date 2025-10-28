/**
 * API Route: /api/whatsapp/verified/[id]
 *
 * GET - Busca número verificado específico
 * PUT - Atualiza número verificado
 * DELETE - Remove número verificado
 */

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { errorResponse, successResponse } from '@/app/api/_utils/response'
import { handleError } from '@/app/api/_utils/errorHandler'
import { logger } from '@/utils/logger'
import { z } from 'zod'

// ============================================================================
// TYPES
// ============================================================================

interface WhatsAppVerifiedNumberUpdate {
  is_verified?: boolean;
  verified_at?: string;
  whatsapp_jid?: string | null;
  contact_name?: string | null;
  account_exists?: boolean;
  verification_status?: string | null;
  updated_at: string;
}

// ============================================================================
// SCHEMAS
// ============================================================================

const updateVerifiedNumberSchema = z.object({
  is_verified: z.boolean().optional(),
  whatsapp_jid: z.string().nullable().optional(),
  contact_name: z.string().nullable().optional(),
  account_exists: z.boolean().optional(),
  verification_status: z.string().nullable().optional(),
})

/**
 * GET /api/whatsapp/verified/[id]
 * Busca número verificado específico por ID
 *
 * @example
 * GET /api/whatsapp/verified/550e8400-e29b-41d4-a716-446655440000
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('whatsapp_verified_numbers')
      .select('*')
      .eq('id', await context.params.then(p => p.id))
      .single()

    if (error) {
      logger.error('Erro ao buscar número verificado', { id: await context.params.then(p => p.id), error })
      return errorResponse(error.message, 404)
    }

    return successResponse(data)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * PUT /api/whatsapp/verified/[id]
 * Atualiza número verificado existente
 *
 * Body:
 * {
 *   "is_verified": boolean (opcional),
 *   "whatsapp_jid": "string" (opcional),
 *   "contact_name": "string" (opcional),
 *   "account_exists": boolean (opcional),
 *   "verification_status": "string" (opcional)
 * }
 *
 * @example
 * PUT /api/whatsapp/verified/550e8400-e29b-41d4-a716-446655440000
 * {
 *   "is_verified": true,
 *   "contact_name": "João Silva Atualizado"
 * }
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()

    // Validar dados
    const validated = updateVerifiedNumberSchema.parse(body)

    // Montar objeto de atualização (apenas campos fornecidos)
    const updateData: Partial<WhatsAppVerifiedNumberUpdate> = {
      updated_at: new Date().toISOString()
    }

    if (validated.is_verified !== undefined) {
      updateData.is_verified = validated.is_verified
      if (validated.is_verified) {
        updateData.verified_at = new Date().toISOString()
      }
    }

    if (validated.whatsapp_jid !== undefined) updateData.whatsapp_jid = validated.whatsapp_jid
    if (validated.contact_name !== undefined) updateData.contact_name = validated.contact_name
    if (validated.account_exists !== undefined) updateData.account_exists = validated.account_exists
    if (validated.verification_status !== undefined) updateData.verification_status = validated.verification_status

    // Atualizar no Supabase
    const { data, error } = await supabaseAdmin
      .from('whatsapp_verified_numbers')
      .update(updateData as never)
      .eq('id', await context.params.then(p => p.id))
      .select()
      .single()

    if (error) {
      logger.error('Erro ao atualizar número verificado', { id: await context.params.then(p => p.id), error })
      return errorResponse(error.message, 500)
    }

    return successResponse(data)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * DELETE /api/whatsapp/verified/[id]
 * Remove número verificado do sistema
 *
 * @example
 * DELETE /api/whatsapp/verified/550e8400-e29b-41d4-a716-446655440000
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await supabaseAdmin
      .from('whatsapp_verified_numbers')
      .delete()
      .eq('id', await context.params.then(p => p.id))

    if (error) {
      logger.error('Erro ao deletar número verificado', { id: await context.params.then(p => p.id), error })
      return errorResponse(error.message, 500)
    }

    return successResponse({ message: 'Número verificado deletado com sucesso' })
  } catch (error) {
    return handleError(error)
  }
}
