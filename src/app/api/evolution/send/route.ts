/**
 * API Route: Enviar Mensagem WhatsApp (Evolution API)
 *
 * @route POST /api/evolution/send
 * @description Envia mensagem de texto via Evolution API
 * @auth Requer autenticação (Firebase Auth)
 *
 * @example
 * fetch('/api/evolution/send', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Authorization': `Bearer ${token}`
 *   },
 *   body: JSON.stringify({
 *     phone: "11987654321",
 *     message: "Olá! Teste de mensagem.",
 *     delay: 1000,
 *     linkPreview: true
 *   })
 * });
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateEvolutionConfig } from '@/lib/whatsapp/evolutionConfig';
import { EvolutionMessageService } from '@/services/whatsapp/evolutionMessageService';
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest) {
  try {
    // 🔒 PROTEÇÃO: Validar configuração da Evolution API
    const configValidation = validateEvolutionConfig();
    if (!configValidation.valid) {
      logger.error('Evolution API not configured', {
        errors: configValidation.errors
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
    const { phone, message, delay, linkPreview } = body;

    // Validar campos obrigatórios
    if (!phone || !message) {
      logger.warn('Missing required fields', {
        hasPhone: !!phone,
        hasMessage: !!message
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Telefone e mensagem são obrigatórios'
        },
        { status: 400 }
      );
    }

    // Enviar mensagem via Evolution API
    const result = await EvolutionMessageService.sendText(phone, message, {
      delay,
      linkPreview
    });

    if (!result.success) {
      logger.error('Failed to send message via Evolution API', {
        error: result.error
      });

      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Erro ao enviar mensagem'
        },
        { status: 500 }
      );
    }

    // Sucesso!
    return NextResponse.json({
      success: true,
      message: 'Mensagem enviada com sucesso',
      data: {
        messageId: result.messageId,
        phone: result.phone,
        status: result.status,
        sentAt: result.sentAt
      }
    });

  } catch (error) {
    logger.error('Error in Evolution API send route', {}, error as Error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}
