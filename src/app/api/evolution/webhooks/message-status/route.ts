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
    const webhook: any = await request.json();

    // 🔍 LOG COMPLETO DO WEBHOOK
    console.log('='.repeat(80));
    console.log('📨 WEBHOOK RECEBIDO:', new Date().toISOString());
    console.log('='.repeat(80));
    console.log('Evento:', webhook.event);
    console.log('Instância:', webhook.instance);
    console.log('Data completa:', JSON.stringify(webhook.data, null, 2));
    console.log('='.repeat(80));

    logger.info('[Webhook] Recebido evento', {
      event: webhook.event,
      instance: webhook.instance,
    });

    // 2. Verificar se é evento de atualização de mensagem
    if (webhook.event !== 'messages.update' && webhook.event !== 'MESSAGES_UPDATE') {
      logger.info('[Webhook] Evento não suportado, ignorando', {
        event: webhook.event
      });

      return NextResponse.json({
        success: true,
        message: 'Evento ignorado'
      });
    }

    // 3. Extrair dados (suporta ambos os formatos: Evolution API real e formato antigo)
    const data = webhook.data;

    // Formato Evolution API real (priority)
    let messageId = data.keyId;
    let evolutionStatus = data.status;
    let fromMe = data.fromMe;
    let phoneNumber = data.remoteJid?.replace('@s.whatsapp.net', '') || '';

    // Fallback para formato antigo (se não encontrar no formato novo)
    if (!messageId && data.key?.id) {
      messageId = data.key.id;
      fromMe = data.key.fromMe;
      phoneNumber = extractPhoneFromJid(data.key.remoteJid);

      // Status numérico do formato antigo
      if (data.update?.status !== undefined) {
        const statusCode = data.update.status;
        evolutionStatus = mapStatusCode(statusCode);
      }
    }

    if (!messageId) {
      logger.warn('[Webhook] messageId não encontrado');
      return NextResponse.json({
        success: false,
        error: 'messageId não encontrado'
      }, { status: 400 });
    }

    logger.info('[Webhook] Processando atualização', {
      messageId,
      evolutionStatus,
      fromMe,
      phoneNumber
    });

    // 4. Verificar se mensagem é nossa (fromMe = true)
    if (!fromMe) {
      logger.info('[Webhook] Mensagem recebida (não enviada por nós), ignorando', {
        messageId
      });

      return NextResponse.json({
        success: true,
        message: 'Mensagem recebida (não rastreada)'
      });
    }

    // 5. Mapear status Evolution para nosso formato
    const newStatus = typeof evolutionStatus === 'string'
      ? mapEvolutionStringStatus(evolutionStatus)
      : evolutionStatus;

    logger.info('[Webhook] Status mapeado', {
      messageId,
      evolutionStatus,
      newStatus
    });

    // 6. Atualizar status em family_interactions
    console.log('🔄 Tentando atualizar status...');
    console.log('  messageId:', messageId);
    console.log('  newStatus:', newStatus);

    const interactionResult = await InteractionStatusService.updateStatus(
      messageId,
      newStatus,
      Date.now()
    );

    console.log('✅ Resultado da atualização (family_interactions):');
    console.log('  success:', interactionResult.success);
    console.log('  oldStatus:', interactionResult.oldStatus);
    console.log('  newStatus:', interactionResult.newStatus);
    console.log('  error:', interactionResult.error);

    // 7. Atualizar status em whatsapp_message_history (opcional)
    const historyResult = await MessageStatusService.updateStatus(
      messageId,
      newStatus,
      Date.now()
    );

    console.log('✅ Resultado da atualização (whatsapp_message_history):');
    console.log('  success:', historyResult.success);

    // 8. Verificar se pelo menos interaction foi atualizada (principal)
    if (!interactionResult.success) {
      console.log('❌ FALHA: Interaction não foi atualizada!');
      logger.warn('[Webhook] Falha ao atualizar interaction', {
        messageId,
        error: interactionResult.error
      });

      return NextResponse.json({
        success: false,
        error: interactionResult.error || 'Erro ao atualizar status'
      }, { status: 404 });
    }

    // 9. Sucesso!
    console.log('🎉 SUCESSO: Status atualizado!');
    console.log('='.repeat(80));

    logger.info('[Webhook] Status atualizado com sucesso', {
      messageId,
      oldStatus: interactionResult.oldStatus,
      newStatus: interactionResult.newStatus,
      evolutionStatus,
      phoneNumber
    });

    return NextResponse.json({
      success: true,
      data: {
        messageId,
        oldStatus: interactionResult.oldStatus,
        newStatus: interactionResult.newStatus,
        evolutionStatus,
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
 * Mapear status string da Evolution API para nosso enum
 */
function mapEvolutionStringStatus(status: string): 'SENT' | 'DELIVERED' | 'READ' | 'PENDING' | 'FAILED' {
  const statusMap: Record<string, 'SENT' | 'DELIVERED' | 'READ' | 'PENDING' | 'FAILED'> = {
    'PENDING': 'PENDING',
    'SERVER_ACK': 'SENT',
    'DELIVERY_ACK': 'DELIVERED',
    'READ': 'READ',
    'PLAYED': 'READ',
    'ERROR': 'FAILED',
    'FAILED': 'FAILED',
  };

  return statusMap[status] || 'SENT';
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
