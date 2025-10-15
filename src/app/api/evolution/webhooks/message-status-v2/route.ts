/**
 * API Route: Webhook de Status de Mensagens WhatsApp (Evolution API v2)
 *
 * @route POST /api/evolution/webhooks/message-status-v2
 * @description Suporta o formato REAL da Evolution API
 */

import { NextRequest, NextResponse } from 'next/server';
import { InteractionStatusService } from '@/services/whatsapp/interactionStatusService';
import { logger } from '@/utils/logger';

/**
 * Mapear status string da Evolution API para nosso enum
 */
function mapEvolutionStatus(status: string): 'SENT' | 'DELIVERED' | 'READ' | 'PENDING' | 'FAILED' {
  const statusMap: Record<string, 'SENT' | 'DELIVERED' | 'READ' | 'PENDING' | 'FAILED'> = {
    'PENDING': 'PENDING',
    'SERVER_ACK': 'SENT',
    'DELIVERY_ACK': 'DELIVERED',
    'READ': 'READ',
    'PLAYED': 'READ', // Tratamos áudio ouvido como lido
    'ERROR': 'FAILED',
    'FAILED': 'FAILED',
  };

  return statusMap[status] || 'SENT';
}

/**
 * POST /api/evolution/webhooks/message-status-v2
 * Recebe evento de atualização de status da Evolution API
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse do body
    const webhook: any = await request.json();

    logger.info('[Webhook v2] Recebido evento', {
      event: webhook.event,
      instance: webhook.instance,
    });

    // 2. Verificar se é evento de atualização de mensagem
    if (webhook.event !== 'messages.update') {
      logger.info('[Webhook v2] Evento não é messages.update, ignorando', {
        event: webhook.event
      });

      return NextResponse.json({
        success: true,
        message: 'Evento ignorado (não é messages.update)'
      });
    }

    // 3. Extrair dados do webhook (formato Evolution API real)
    const data = webhook.data;
    const messageId = data.keyId; // ✅ Formato real: keyId
    const evolutionStatus = data.status; // ✅ Formato real: string (DELIVERY_ACK, READ, etc)
    const fromMe = data.fromMe;
    const phoneNumber = data.remoteJid?.replace('@s.whatsapp.net', '') || '';

    if (!messageId) {
      logger.warn('[Webhook v2] keyId não encontrado');
      return NextResponse.json({
        success: false,
        error: 'keyId não encontrado'
      }, { status: 400 });
    }

    logger.info('[Webhook v2] Processando atualização', {
      messageId,
      evolutionStatus,
      fromMe,
      phoneNumber
    });

    // 4. Verificar se mensagem é nossa (fromMe = true)
    if (!fromMe) {
      logger.info('[Webhook v2] Mensagem recebida (não enviada por nós), ignorando', {
        messageId
      });

      return NextResponse.json({
        success: true,
        message: 'Mensagem recebida (não rastreada)'
      });
    }

    // 5. Mapear status Evolution para nosso formato
    const newStatus = mapEvolutionStatus(evolutionStatus);

    logger.info('[Webhook v2] Status mapeado', {
      messageId,
      evolutionStatus,
      newStatus
    });

    // 6. Atualizar status em family_interactions
    const result = await InteractionStatusService.updateStatus(
      messageId,
      newStatus,
      Date.now()
    );

    if (!result.success) {
      logger.warn('[Webhook v2] Falha ao atualizar status', {
        messageId,
        error: result.error
      });

      return NextResponse.json({
        success: false,
        error: result.error || 'Erro ao atualizar status'
      }, { status: 404 });
    }

    // 7. Sucesso!
    logger.info('[Webhook v2] Status atualizado com sucesso', {
      messageId,
      oldStatus: result.oldStatus,
      newStatus: result.newStatus,
      evolutionStatus
    });

    return NextResponse.json({
      success: true,
      data: {
        messageId,
        oldStatus: result.oldStatus,
        newStatus: result.newStatus,
        evolutionStatus,
        phoneNumber
      }
    });

  } catch (error) {
    logger.error('[Webhook v2] Erro ao processar webhook', {}, error as Error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

/**
 * GET /api/evolution/webhooks/message-status-v2
 * Health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: '/api/evolution/webhooks/message-status-v2',
    description: 'Webhook receptor de status WhatsApp (Evolution API formato real)',
    supportedEvents: ['messages.update'],
    statusMapping: {
      'PENDING': 'PENDING',
      'SERVER_ACK': 'SENT',
      'DELIVERY_ACK': 'DELIVERED',
      'READ': 'READ',
      'PLAYED': 'READ',
      'ERROR': 'FAILED',
      'FAILED': 'FAILED'
    },
    timestamp: new Date().toISOString()
  });
}
