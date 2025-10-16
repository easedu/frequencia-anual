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

// 📊 Contador global de webhooks (em memória)
let webhookCounter = 0;
let lastWebhookTime = Date.now();

// 📝 Histórico dos últimos webhooks (últimos 50)
interface WebhookLogEntry {
  number: number;
  timestamp: string;
  messageId: string;
  event: string;
  status: string;
  timeSinceLastMs: number;
  processingTimeMs?: number;
}

const webhookHistory: WebhookLogEntry[] = [];

/**
 * POST /api/evolution/webhooks/message-status
 * Recebe evento de atualização de status da Evolution API
 */
export async function POST(request: NextRequest) {
  const webhookStartTime = Date.now();
  webhookCounter++;

  // 📊 Calcular intervalo desde último webhook
  const timeSinceLastWebhook = webhookStartTime - lastWebhookTime;
  lastWebhookTime = webhookStartTime;

  try {
    // 1. Parse do body
    const webhook: any = await request.json();

    // 📊 LOG INFO ESTRUTURADO (Para monitoramento de frequência)
    logger.info('📨 [Webhook] Novo evento recebido', {
      webhookNumber: webhookCounter,
      timeSinceLastWebhookMs: timeSinceLastWebhook,
      timeSinceLastWebhookSeconds: (timeSinceLastWebhook / 1000).toFixed(2),
      event: webhook.event,
      instance: webhook.instance,
      timestamp: new Date().toISOString(),
      requestHeaders: {
        userAgent: request.headers.get('user-agent'),
        contentType: request.headers.get('content-type'),
        origin: request.headers.get('origin')
      },
      webhookData: {
        hasData: !!webhook.data,
        hasKey: !!webhook.data?.key,
        hasUpdate: !!webhook.data?.update,
        messageId: webhook.data?.key?.id || webhook.data?.keyId,
        remoteJid: webhook.data?.key?.remoteJid || webhook.data?.remoteJid,
        fromMe: webhook.data?.key?.fromMe ?? webhook.data?.fromMe,
        statusCode: webhook.data?.update?.status,
        statusString: webhook.data?.status
      }
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

    // 5.5. Buscar status atual e validar progressão
    const currentStatusData = await InteractionStatusService.getStatus(messageId);
    const currentStatus = currentStatusData?.currentStatus;

    // 5.6. Validar progressão de status
    const isValidProgression = isValidStatusProgression(currentStatus, newStatus);

    if (!isValidProgression) {
      logger.warn('[Webhook] Regressão de status bloqueada', {
        messageId,
        currentStatus,
        attemptedStatus: newStatus
      });

      return NextResponse.json({
        success: true,
        message: 'Atualização ignorada (regressão de status)',
        data: {
          messageId,
          currentStatus,
          attemptedStatus: newStatus,
          reason: 'Regressão de status não permitida'
        }
      });
    }

    // 6. Atualizar status em family_interactions

    const updateStartTime = Date.now();
    const interactionResult = await InteractionStatusService.updateStatus(
      messageId,
      newStatus,
      Date.now()
    );
    const updateDuration = Date.now() - updateStartTime;

    // 7. Atualizar status em whatsapp_message_history (opcional)
    const historyResult = await MessageStatusService.updateStatus(
      messageId,
      newStatus,
      Date.now()
    );

    // 8. Verificar se pelo menos interaction foi atualizada (principal)
    if (!interactionResult.success) {
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
    const webhookTotalDuration = Date.now() - webhookStartTime;

    // 📝 Adicionar ao histórico
    const historyEntry: WebhookLogEntry = {
      number: webhookCounter,
      timestamp: new Date().toISOString(),
      messageId: messageId || 'unknown',
      event: webhook.event,
      status: `${interactionResult.oldStatus} → ${interactionResult.newStatus}`,
      timeSinceLastMs: timeSinceLastWebhook,
      processingTimeMs: webhookTotalDuration
    };

    webhookHistory.unshift(historyEntry);
    if (webhookHistory.length > 50) {
      webhookHistory.pop();
    }

    logger.info('[Webhook] Status atualizado', {
      messageId,
      statusTransition: `${interactionResult.oldStatus} → ${interactionResult.newStatus}`
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
        updatedHistory: historyResult.success,
        processingTimeMs: webhookTotalDuration
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
 * Hierarquia de status WhatsApp (ordem de progressão)
 */
const STATUS_HIERARCHY: Record<string, number> = {
  'PENDING': 0,
  'SENT': 1,
  'DELIVERED': 2,
  'READ': 3,
  'PLAYED': 4,
  'FAILED': -1, // Status final (erro)
};

/**
 * Verificar se novo status é uma progressão válida
 *
 * @param oldStatus - Status atual
 * @param newStatus - Novo status proposto
 * @returns true se é progressão válida, false se é regressão
 *
 * @example
 * isValidStatusProgression('SENT', 'DELIVERED') // true (1 → 2)
 * isValidStatusProgression('DELIVERED', 'SENT') // false (2 → 1, regressão!)
 * isValidStatusProgression('SENT', 'SENT') // true (idempotente)
 */
function isValidStatusProgression(
  oldStatus: string | undefined,
  newStatus: string
): boolean {
  // Se não tem status anterior, aceitar qualquer status
  if (!oldStatus) {
    return true;
  }

  // Se são iguais, é idempotente (válido)
  if (oldStatus === newStatus) {
    return true;
  }

  const oldLevel = STATUS_HIERARCHY[oldStatus] ?? -1;
  const newLevel = STATUS_HIERARCHY[newStatus] ?? -1;

  // FAILED é status final, só aceita se for o mesmo
  if (oldStatus === 'FAILED') {
    return false;
  }

  // Novo status deve ser maior que o antigo (progressão)
  return newLevel > oldLevel;
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
 * Endpoint de verificação de saúde (health check) + Estatísticas
 */
export async function GET(request: NextRequest) {
  const uptimeSeconds = (Date.now() - (lastWebhookTime - (webhookCounter > 0 ? Date.now() - lastWebhookTime : 0))) / 1000;
  const averageIntervalSeconds = webhookCounter > 1 ? uptimeSeconds / webhookCounter : 0;

  // Query params para controlar resposta
  const { searchParams } = new URL(request.url);
  const includeHistory = searchParams.get('history') === 'true';
  const limit = parseInt(searchParams.get('limit') || '10');

  const response: any = {
    status: 'online',
    endpoint: '/api/evolution/webhooks/message-status',
    description: 'Webhook receptor de status de mensagens WhatsApp (Evolution API)',
    supportedEvents: ['MESSAGES_UPDATE', 'messages.update'],
    statistics: {
      totalWebhooksReceived: webhookCounter,
      lastWebhookAt: webhookCounter > 0 ? new Date(lastWebhookTime).toISOString() : null,
      timeSinceLastWebhookMs: webhookCounter > 0 ? Date.now() - lastWebhookTime : null,
      timeSinceLastWebhookSeconds: webhookCounter > 0 ? ((Date.now() - lastWebhookTime) / 1000).toFixed(2) : null,
      averageIntervalSeconds: averageIntervalSeconds > 0 ? averageIntervalSeconds.toFixed(2) : null,
      webhooksPerMinute: webhookCounter > 0 && uptimeSeconds > 0 ? ((webhookCounter / uptimeSeconds) * 60).toFixed(2) : '0'
    },
    timestamp: new Date().toISOString()
  };

  // Incluir histórico se solicitado
  if (includeHistory) {
    response.history = webhookHistory.slice(0, Math.min(limit, 50));
  }

  return NextResponse.json(response);
}
