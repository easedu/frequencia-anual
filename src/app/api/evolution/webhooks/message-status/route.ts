/**
 * API Route: Webhook de Status de Mensagens WhatsApp (Evolution API)
 *
 * @route POST /api/evolution/webhooks/message-status
 * @description Recebe atualizações de status de mensagens da Evolution API
 * @webhook Evolution API → Esta rota (automático)
 *
 * @example Payload Evolution API
 * {
 *   "event": "MESSAGES_UPDATE",
 *   "instance": "instance-name",
 *   "data": {
 *     "key": {
 *       "remoteJid": "5511987654321@s.whatsapp.net",
 *       "fromMe": true,
 *       "id": "3EB0ABC123..."
 *     },
 *     "update": {
 *       "status": 3,  // 0=ERROR, 1=PENDING, 2=SENT, 3=DELIVERED, 4=READ, 5=PLAYED
 *       "timestamp": 1736445605
 *     }
 *   },
 *   "date_time": "2025-10-15T14:30:05.000Z",
 *   "server_url": "https://evolution-api.com",
 *   "apikey": "xxx"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { MessageStatusService } from '@/services/whatsapp/messageStatusService';
import { InteractionStatusService } from '@/services/whatsapp/interactionStatusService';
import { logger } from '@/utils/logger';
import {
  MessageStatusWebhook,
  mapStatusCode,
  extractPhoneFromJid
} from '@/types/whatsapp/webhook';

/**
 * Validar webhook da Evolution API
 * OPCIONAL: Adicionar validação de API key se necessário
 */
function validateWebhook(webhook: any): webhook is MessageStatusWebhook {
  return (
    webhook &&
    webhook.event === 'MESSAGES_UPDATE' &&
    webhook.data &&
    webhook.data.key &&
    webhook.data.key.id &&
    webhook.data.update &&
    typeof webhook.data.update.status === 'number'
  );
}

/**
 * POST /api/evolution/webhooks/message-status
 * Recebe evento de atualização de status da Evolution API
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse do body
    const webhook: MessageStatusWebhook = await request.json();

    logger.info('[Webhook] Recebido evento de status', {
      event: webhook.event,
      instance: webhook.instance,
      messageId: webhook.data?.key?.id,
      statusCode: webhook.data?.update?.status
    });

    // 2. Validar estrutura do webhook
    if (!validateWebhook(webhook)) {
      logger.warn('[Webhook] Evento inválido ou não suportado', {
        event: webhook.event
      });

      return NextResponse.json({
        success: false,
        error: 'Evento inválido ou não suportado'
      }, { status: 400 });
    }

    // 3. Extrair dados do webhook
    const { key, update } = webhook.data;
    const messageId = key.id;
    const statusCode = update.status;
    const timestamp = update.timestamp ? update.timestamp * 1000 : Date.now(); // Segundos → ms
    const phoneNumber = extractPhoneFromJid(key.remoteJid);

    // 4. Mapear status code numérico para WhatsAppMessageStatus
    const newStatus = mapStatusCode(statusCode);

    logger.info('[Webhook] Processando atualização de status', {
      messageId,
      phoneNumber,
      statusCode,
      newStatus,
      timestamp,
      fromMe: key.fromMe
    });

    // 5. Verificar se mensagem é nossa (fromMe = true)
    if (!key.fromMe) {
      logger.info('[Webhook] Mensagem recebida (não enviada por nós), ignorando', {
        messageId,
        phoneNumber
      });

      return NextResponse.json({
        success: true,
        message: 'Mensagem recebida (não rastreada)'
      });
    }

    // 6. Atualizar status em family_interactions (PRINCIPAL - onde é visualizado)
    const interactionResult = await InteractionStatusService.updateStatus(
      messageId,
      newStatus,
      timestamp
    );

    // 7. Atualizar status em whatsapp_message_history (SECUNDÁRIO - índice para buscas)
    const historyResult = await MessageStatusService.updateStatus(
      messageId,
      newStatus,
      timestamp
    );

    // 8. Verificar se pelo menos uma atualização foi bem-sucedida
    if (!interactionResult.success && !historyResult.success) {
      logger.warn('[Webhook] Falha ao atualizar status em ambas as tabelas', {
        messageId,
        newStatus,
        interactionError: interactionResult.error,
        historyError: historyResult.error
      });

      return NextResponse.json({
        success: false,
        error: interactionResult.error || historyResult.error || 'Erro ao atualizar status'
      }, { status: 404 });
    }

    // 9. Sucesso!
    logger.info('[Webhook] Status atualizado com sucesso', {
      messageId,
      oldStatus: interactionResult.oldStatus || historyResult.oldStatus,
      newStatus: interactionResult.newStatus || historyResult.newStatus,
      phoneNumber,
      updatedInteraction: interactionResult.success,
      updatedHistory: historyResult.success
    });

    return NextResponse.json({
      success: true,
      data: {
        messageId,
        oldStatus: interactionResult.oldStatus || historyResult.oldStatus,
        newStatus: interactionResult.newStatus || historyResult.newStatus,
        phoneNumber,
        updatedInteraction: interactionResult.success,
        updatedHistory: historyResult.success
      }
    });

  } catch (error) {
    logger.error('[Webhook] Erro ao processar webhook', {}, error as Error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

/**
 * GET /api/evolution/webhooks/message-status
 * Endpoint de verificação de saúde (health check)
 */
export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: '/api/evolution/webhooks/message-status',
    description: 'Webhook receptor de status de mensagens WhatsApp (Evolution API)',
    supportedEvents: ['MESSAGES_UPDATE'],
    timestamp: new Date().toISOString()
  });
}
