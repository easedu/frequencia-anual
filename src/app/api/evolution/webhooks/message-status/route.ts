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
function _validateWebhook(webhook: unknown): webhook is MessageStatusWebhook {
  if (typeof webhook !== 'object' || webhook === null) return false;

  const w = webhook as Record<string, unknown>;

  return (
    w.event === 'MESSAGES_UPDATE' &&
    typeof w.data === 'object' &&
    w.data !== null &&
    typeof (w.data as Record<string, unknown>).key === 'object' &&
    (w.data as Record<string, unknown>).key !== null &&
    typeof ((w.data as Record<string, unknown>).key as Record<string, unknown>).id === 'string' &&
    typeof (w.data as Record<string, unknown>).update === 'object' &&
    (w.data as Record<string, unknown>).update !== null &&
    typeof ((w.data as Record<string, unknown>).update as Record<string, unknown>).status === 'number'
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
    const webhook: unknown = await request.json();

    // 🚨🚨🚨 LOG CHAMATIVO - WEBHOOK RECEBIDO 🚨🚨🚨
    console.log('\n' + '='.repeat(80));
    console.log('🚨🚨🚨 WEBHOOK WHATSAPP RECEBIDO 🚨🚨🚨');
    console.log('='.repeat(80));
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('📊 Webhook #', webhookCounter);
    console.log('⏱️  Tempo desde último:', `${(timeSinceLastWebhook / 1000).toFixed(2)}s`);
    console.log('📦 Payload completo:', JSON.stringify(webhook, null, 2));
    console.log('='.repeat(80) + '\n');

    // 📊 LOG INFO ESTRUTURADO (Para monitoramento de frequência)
    const webhookObj = webhook as Record<string, unknown>;
    const webhookData = webhookObj.data as Record<string, unknown> | undefined;
    const _webhookKey = webhookData?.key as Record<string, unknown> | undefined;
    const _webhookUpdate = webhookData?.update as Record<string, unknown> | undefined;

    // 2. Verificar se é evento de atualização de mensagem
    const webhookTypedForEvent = webhook as Record<string, unknown>;
    if (webhookTypedForEvent.event !== 'messages.update' && webhookTypedForEvent.event !== 'MESSAGES_UPDATE') {
      return NextResponse.json({
        success: true,
        message: 'Evento ignorado'
      });
    }

    // 3. Extrair dados (suporta ambos os formatos: Evolution API real e formato antigo)
    const webhookTyped = webhook as Record<string, unknown>;
    const data = webhookTyped.data as Record<string, unknown>;

    // Formato Evolution API real (priority)
    let messageId = data.keyId as string | undefined;
    let evolutionStatus = data.status as string | undefined;
    let fromMe = data.fromMe as boolean | undefined;
    let phoneNumber = typeof data.remoteJid === 'string'
      ? data.remoteJid.replace('@s.whatsapp.net', '')
      : '';

    // Fallback para formato antigo (se não encontrar no formato novo)
    const key = data.key as Record<string, unknown> | undefined;
    if (!messageId && key?.id) {
      messageId = key.id as string;
      fromMe = key.fromMe as boolean;
      phoneNumber = extractPhoneFromJid(key.remoteJid as string);

      // Status numérico do formato antigo
      const update = data.update as Record<string, unknown> | undefined;
      if (update?.status !== undefined) {
        const statusCode = update.status as number;
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
      return NextResponse.json({
        success: true,
        message: 'Mensagem recebida (não rastreada)'
      });
    }

    // 5. Mapear status Evolution para nosso formato
    const newStatus = typeof evolutionStatus === 'string'
      ? mapEvolutionStringStatus(evolutionStatus)
      : evolutionStatus;

    // Validar que newStatus não é undefined
    if (!newStatus) {
      logger.warn('[Webhook] Status não pôde ser determinado', { messageId, evolutionStatus });
      return NextResponse.json({
        success: false,
        error: 'Status não pôde ser determinado'
      }, { status: 400 });
    }

    // 5.5. Buscar status atual e validar progressão
    const currentStatusData = await InteractionStatusService.getStatus(messageId);
    const currentStatus = currentStatusData?.currentStatus;

    // 5.6. Validar progressão de status
    const isValidProgression = isValidStatusProgression(currentStatus || '', newStatus);

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
    const _updateDuration = Date.now() - updateStartTime;

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
    const webhookForHistory = webhook as Record<string, unknown>;
    const historyEntry: WebhookLogEntry = {
      number: webhookCounter,
      timestamp: new Date().toISOString(),
      messageId: messageId || 'unknown',
      event: webhookForHistory.event as string,
      status: `${interactionResult.oldStatus} → ${interactionResult.newStatus}`,
      timeSinceLastMs: timeSinceLastWebhook,
      processingTimeMs: webhookTotalDuration
    };

    webhookHistory.unshift(historyEntry);
    if (webhookHistory.length > 50) {
      webhookHistory.pop();
    }

    // 🎉🎉🎉 LOG CHAMATIVO - STATUS ATUALIZADO COM SUCESSO 🎉🎉🎉
    console.log('\n' + '✅'.repeat(40));
    console.log('✅ WEBHOOK PROCESSADO COM SUCESSO! ✅');
    console.log('✅'.repeat(40));
    console.log('📨 Message ID:', messageId);
    console.log('🔄 Transição:', `${interactionResult.oldStatus} → ${interactionResult.newStatus}`);
    console.log('⏱️  Tempo de processamento:', `${webhookTotalDuration}ms`);
    console.log('📊 Interaction atualizada:', interactionResult.success ? '✅' : '❌');
    console.log('📝 History atualizada:', historyResult.success ? '✅' : '❌');
    console.log('✅'.repeat(40) + '\n');

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

  interface HealthResponse {
    status: string;
    endpoint: string;
    description: string;
    supportedEvents: string[];
    statistics: {
      totalWebhooksReceived: number;
      lastWebhookAt: string | null;
      timeSinceLastWebhookMs: number | null;
      timeSinceLastWebhookSeconds: string | null;
      averageIntervalSeconds: string | null;
      webhooksPerMinute: string;
    };
    timestamp: string;
    history?: WebhookLogEntry[];
  }

  const response: HealthResponse = {
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
