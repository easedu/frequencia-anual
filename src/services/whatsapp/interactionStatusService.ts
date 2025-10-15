/**
 * WhatsApp Interaction Status Service
 *
 * @description Serviço para atualizar status WhatsApp em family_interactions
 * @rationale Status salvo onde a mensagem é exibida (melhor UX)
 */

import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/utils/logger';
import type { WhatsAppMessageStatus, StatusHistoryEntry } from '@/types';

/**
 * Resultado de atualização de status
 */
export interface UpdateInteractionStatusResult {
  success: boolean;
  interactionId?: string;
  oldStatus?: WhatsAppMessageStatus;
  newStatus?: WhatsAppMessageStatus;
  error?: string;
}

/**
 * Serviço de atualização de status WhatsApp em interações familiares
 */
export class InteractionStatusService {
  /**
   * Atualizar status WhatsApp de uma interação pelo whatsapp_message_id
   *
   * @param messageId - ID da mensagem retornado pela Evolution API
   * @param newStatus - Novo status (SENT, DELIVERED, READ, PLAYED, FAILED)
   * @param timestamp - Timestamp Unix (ms) da atualização
   * @returns Resultado da atualização
   */
  static async updateStatus(
    messageId: string,
    newStatus: WhatsAppMessageStatus,
    timestamp: number = Date.now()
  ): Promise<UpdateInteractionStatusResult> {
    try {
      if (!messageId) {
        return {
          success: false,
          error: 'messageId é obrigatório'
        };
      }

      logger.info('[InteractionStatus] Atualizando status WhatsApp', {
        messageId,
        newStatus,
        timestamp
      });

      // 1. Buscar interação existente
      console.log('[InteractionStatus] 🔍 Buscando interação...');
      console.log('  messageId:', messageId);

      const { data: existing, error: fetchError } = await supabase
        .from('family_interactions')
        .select('id, whatsapp_status, whatsapp_status_history, student_id, description')
        .eq('whatsapp_message_id', messageId)
        .maybeSingle();

      console.log('[InteractionStatus] Resultado da busca:');
      console.log('  found:', !!existing);
      console.log('  error:', fetchError);
      if (existing) {
        console.log('  id:', existing.id);
        console.log('  current status:', existing.whatsapp_status);
      }

      if (fetchError) {
        throw fetchError;
      }

      if (!existing) {
        console.log('[InteractionStatus] ❌ Interação NÃO encontrada!');
        logger.warn('[InteractionStatus] Interação não encontrada', {
          messageId,
          newStatus
        });
        return {
          success: false,
          error: 'Interação não encontrada'
        };
      }

      const oldStatus = existing.whatsapp_status as WhatsAppMessageStatus;

      // 2. Verificar se status já foi atualizado (idempotência)
      if (oldStatus === newStatus) {
        logger.info('[InteractionStatus] Status já atualizado (idempotente)', {
          messageId,
          status: newStatus
        });
        return {
          success: true,
          interactionId: existing.id,
          oldStatus,
          newStatus
        };
      }

      // 3. Construir novo histórico de status
      const statusHistory: StatusHistoryEntry[] = existing.whatsapp_status_history || [];
      statusHistory.push({
        status: newStatus,
        timestamp,
        source: 'webhook'
      });

      // 4. Preparar campos a atualizar
      const updateFields: Record<string, any> = {
        whatsapp_status: newStatus,
        whatsapp_status_history: statusHistory,
        whatsapp_updated_at: new Date(timestamp).toISOString()
      };

      // 5. Atualizar timestamps específicos por status
      if (newStatus === 'DELIVERED' && !existing.whatsapp_delivered_at) {
        updateFields.whatsapp_delivered_at = new Date(timestamp).toISOString();
      }
      if (newStatus === 'READ' && !existing.whatsapp_read_at) {
        updateFields.whatsapp_read_at = new Date(timestamp).toISOString();
      }
      if (newStatus === 'PLAYED' && !existing.whatsapp_played_at) {
        updateFields.whatsapp_played_at = new Date(timestamp).toISOString();
      }

      // 6. Executar atualização
      const { error: updateError } = await supabase
        .from('family_interactions')
        .update(updateFields)
        .eq('whatsapp_message_id', messageId);

      if (updateError) {
        throw updateError;
      }

      logger.info('[InteractionStatus] Status WhatsApp atualizado com sucesso', {
        interactionId: existing.id,
        messageId,
        oldStatus,
        newStatus,
        studentId: existing.student_id
      });

      return {
        success: true,
        interactionId: existing.id,
        oldStatus,
        newStatus
      };

    } catch (error) {
      logger.error('[InteractionStatus] Erro ao atualizar status', {
        messageId,
        newStatus
      }, error as Error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Buscar status atual de uma interação WhatsApp
   *
   * @param messageId - ID da mensagem
   * @returns Status atual e timestamps
   */
  static async getStatus(messageId: string): Promise<{
    currentStatus?: WhatsAppMessageStatus;
    statusHistory?: StatusHistoryEntry[];
    deliveredAt?: string;
    readAt?: string;
    playedAt?: string;
    sentAt?: string;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('family_interactions')
        .select('whatsapp_status, whatsapp_status_history, whatsapp_sent_at, whatsapp_delivered_at, whatsapp_read_at, whatsapp_played_at')
        .eq('whatsapp_message_id', messageId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        currentStatus: data.whatsapp_status as WhatsAppMessageStatus,
        statusHistory: data.whatsapp_status_history as StatusHistoryEntry[],
        sentAt: data.whatsapp_sent_at,
        deliveredAt: data.whatsapp_delivered_at,
        readAt: data.whatsapp_read_at,
        playedAt: data.whatsapp_played_at
      };

    } catch (error) {
      logger.error('[InteractionStatus] Erro ao buscar status', { messageId }, error as Error);
      return null;
    }
  }

  /**
   * Estatísticas de status WhatsApp (para dashboards)
   *
   * @param filters - Filtros opcionais (estudante, período)
   * @returns Contagem por status
   */
  static async getStatusStats(filters?: {
    studentId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Record<WhatsAppMessageStatus | 'TOTAL', number>> {
    try {
      let query = supabase
        .from('family_interactions')
        .select('whatsapp_status')
        .eq('interaction_type', 'Contato digital')
        .not('whatsapp_message_id', 'is', null);

      if (filters?.studentId) {
        query = query.eq('student_id', filters.studentId);
      }
      if (filters?.startDate) {
        query = query.gte('interaction_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('interaction_date', filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats: Record<string, number> = {
        PENDING: 0,
        SENT: 0,
        DELIVERED: 0,
        READ: 0,
        PLAYED: 0,
        FAILED: 0,
        TOTAL: 0
      };

      (data || []).forEach((record: any) => {
        const status = record.whatsapp_status || 'PENDING';
        stats[status] = (stats[status] || 0) + 1;
        stats.TOTAL += 1;
      });

      return stats as Record<WhatsAppMessageStatus | 'TOTAL', number>;

    } catch (error) {
      logger.error('[InteractionStatus] Erro ao buscar estatísticas', filters, error as Error);
      return {
        PENDING: 0,
        SENT: 0,
        DELIVERED: 0,
        READ: 0,
        PLAYED: 0,
        FAILED: 0,
        TOTAL: 0
      };
    }
  }
}
