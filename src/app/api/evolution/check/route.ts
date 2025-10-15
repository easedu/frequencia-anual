/**
 * API Route: Verificar Número WhatsApp (Evolution API)
 *
 * @route POST /api/evolution/check
 * @description Verifica se número(s) tem WhatsApp ativo
 * @auth Requer autenticação (Firebase Auth)
 *
 * @example Single check
 * fetch('/api/evolution/check', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Authorization': `Bearer ${token}`
 *   },
 *   body: JSON.stringify({
 *     phone: "11987654321"
 *   })
 * });
 *
 * @example Batch check
 * fetch('/api/evolution/check', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Authorization': `Bearer ${token}`
 *   },
 *   body: JSON.stringify({
 *     phones: ["11987654321", "11987654322", "11987654323"]
 *   })
 * });
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/middleware/auth';
import { validateEvolutionConfig } from '@/lib/whatsapp/evolutionConfig';
import { EvolutionChatService } from '@/services/whatsapp/evolutionChatService';
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest) {
  try {
    // 🔒 PROTEÇÃO 1: Validar autenticação
    const authResult = await validateAuth(request);

    if (authResult instanceof NextResponse) {
      return authResult; // Retorna erro 401
    }

    const { user } = authResult;

    // 🔒 PROTEÇÃO 2: Validar configuração da Evolution API
    const configValidation = validateEvolutionConfig();
    if (!configValidation.valid) {
      logger.error('Evolution API not configured', {
        errors: configValidation.errors,
        userId: user.id
      });

      return NextResponse.json(
        {
          success: false,
          error: 'API WhatsApp não configurada',
          details: configValidation.errors
        },
        { status: 500 }
      );
    }

    // Parsear body
    const body = await request.json();
    const { phone, phones } = body;

    // Determinar se é verificação única ou em lote
    const isBatch = phones && Array.isArray(phones);

    if (!phone && !isBatch) {
      logger.warn('Missing phone parameter', { userId: user.id });

      return NextResponse.json(
        {
          success: false,
          error: 'Telefone(s) não fornecido(s). Use "phone" para único ou "phones" para múltiplos.'
        },
        { status: 400 }
      );
    }

    // Verificação em lote
    if (isBatch) {
      logger.info('Processing batch WhatsApp check', {
        userId: user.id,
        count: phones.length
      });

      const result = await EvolutionChatService.checkMultipleWhatsApp(phones);

      return NextResponse.json({
        success: result.success,
        message: `Verificados ${result.verified} de ${result.total} números`,
        data: {
          total: result.total,
          verified: result.verified,
          withWhatsApp: result.results.filter(r => r.hasWhatsApp).length,
          results: result.results
        },
        errors: result.errors
      });
    }

    // Verificação única
    logger.info('Processing single WhatsApp check', {
      userId: user.id
    });

    const result = await EvolutionChatService.checkWhatsApp(phone);

    if (result.error) {
      logger.error('Failed to check WhatsApp number', {
        userId: user.id,
        error: result.error
      });

      return NextResponse.json(
        {
          success: false,
          error: result.error
        },
        { status: 500 }
      );
    }

    // Sucesso!
    logger.info('WhatsApp check completed', {
      userId: user.id,
      hasWhatsApp: result.hasWhatsApp
    });

    return NextResponse.json({
      success: true,
      message: result.hasWhatsApp
        ? 'Número tem WhatsApp'
        : 'Número não tem WhatsApp',
      data: {
        phone: result.phone,
        hasWhatsApp: result.hasWhatsApp,
        jid: result.jid,
        verifiedAt: result.verifiedAt
      }
    });

  } catch (error) {
    logger.error('Error in Evolution API check route', {}, error as Error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}
