/**
 * WhatsApp Message Status Service
 *
 * @description Serviço para atualizar status de mensagens WhatsApp via webhooks
 * @see docs/WEBHOOK-WHATSAPP-STATUS-MIGRATION.sql
 */

import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/utils/logger';
import type { WhatsAppMessageStatus, StatusHistoryEntry } from '@/types';

/**
 * Resultado de atualização de status
 */
export interface UpdateStatusResult {
  success: boolean;
  messageId?: string;
  oldStatus?: WhatsAppMessageStatus;
  newStatus?: WhatsAppMessageStatus;
  error?: string;
}

/**
 * Serviço de atualização de status de mensagens WhatsApp
 */
export class MessageStatusService {
  /**
   * Atualizar status de uma mensagem pelo message_id
   *
   * @param messageId - ID da mensagem retornado pela Evolution API
   * @param newStatus - Novo status (SENT, DELIVERED, READ, PLAYED, FAILED)
   * @param timestamp - Timestamp Unix (ms) da atualização
   * @returns Resultado da atualização
   *
   * @example
   * await MessageStatusService.updateStatus("3EB0ABC123", "DELIVERED", 1736445605000);
   */
  static async updateStatus(
    messageId: string,
    newStatus: WhatsAppMessageStatus,
    timestamp: number = Date.now()
  ): Promise<UpdateStatusResult> {
    try {
      if (!messageId) {
        return {
          success: false,
          error: 'messageId é obrigatório'
        };
      }

      logger.info('[MessageStatus] Atualizando status', {
        messageId,
        newStatus,
        timestamp
      });

      // 1. Buscar registro existente
      const { data: existing, error: fetchError } = await supabase
        .from('whatsapp_message_history')
        .select('id, current_status, status_history, estudante_nome, contato_telefone')
        .eq('message_id', messageId)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (!existing) {
        logger.warn('[MessageStatus] Mensagem não encontrada no histórico', {
          messageId,
          newStatus
        });
        return {
          success: false,
          messageId,
          error: 'Mensagem não encontrada no histórico'
        };
      }

      const oldStatus = existing.current_status as WhatsAppMessageStatus;

      // 2. Verificar se status já foi atualizado (idempotência)
      if (oldStatus === newStatus) {
        logger.info('[MessageStatus] Status já atualizado (idempotente)', {
          messageId,
          status: newStatus
        });
        return {
          success: true,
          messageId,
          oldStatus,
          newStatus
        };
      }

      // 3. Construir novo histórico de status
      const statusHistory: StatusHistoryEntry[] = existing.status_history || [];
      statusHistory.push({
        status: newStatus,
        timestamp,
        source: 'webhook'
      });

      // 4. Preparar campos a atualizar
      const updateFields: Record<string, any> = {
        current_status: newStatus,
        status_history: statusHistory,
        updated_at: new Date(timestamp).toISOString()
      };

      // 5. Atualizar timestamps específicos por status
      if (newStatus === 'DELIVERED' && !existing.delivered_at) {
        updateFields.delivered_at = new Date(timestamp).toISOString();
      }
      if (newStatus === 'READ' && !existing.read_at) {
        updateFields.read_at = new Date(timestamp).toISOString();
      }
      if (newStatus === 'PLAYED' && !existing.played_at) {
        updateFields.played_at = new Date(timestamp).toISOString();
      }

      // 6. Executar atualização
      const { error: updateError } = await supabase
        .from('whatsapp_message_history')
        .update(updateFields)
        .eq('message_id', messageId);

      if (updateError) {
        throw updateError;
      }

      logger.info('[MessageStatus] Status atualizado com sucesso', {
        messageId,
        oldStatus,
        newStatus,
        estudanteNome: existing.estudante_nome,
        contatoTelefone: existing.contato_telefone
      });

      return {
        success: true,
        messageId,
        oldStatus,
        newStatus
      };

    } catch (error) {
      logger.error('[MessageStatus] Erro ao atualizar status', {
        messageId,
        newStatus
      }, error as Error);

      return {
        success: false,
        messageId,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Buscar status atual de uma mensagem
   *
   * @param messageId - ID da mensagem
   * @returns Status atual e histórico
   */
  static async getStatus(messageId: string): Promise<{
    currentStatus?: WhatsAppMessageStatus;
    statusHistory?: StatusHistoryEntry[];
    deliveredAt?: string;
    readAt?: string;
    playedAt?: string;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_message_history')
        .select('current_status, status_history, delivered_at, read_at, played_at')
        .eq('message_id', messageId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        currentStatus: data.current_status as WhatsAppMessageStatus,
        statusHistory: data.status_history as StatusHistoryEntry[],
        deliveredAt: data.delivered_at,
        readAt: data.read_at,
        playedAt: data.played_at
      };

    } catch (error) {
      logger.error('[MessageStatus] Erro ao buscar status', { messageId }, error as Error);
      return null;
    }
  }

  /**
   * Estatísticas de status de mensagens (para dashboards)
   *
   * @param filters - Filtros opcionais (ano, mês)
   * @returns Contagem por status
   */
  static async getStatusStats(filters?: {
    anoReferencia?: number;
    mesReferencia?: number;
  }): Promise<Record<WhatsAppMessageStatus, number>> {
    try {
      let query = supabase
        .from('whatsapp_message_history')
        .select('current_status');

      if (filters?.anoReferencia) {
        query = query.eq('ano_referencia', filters.anoReferencia);
      }
      if (filters?.mesReferencia) {
        query = query.eq('mes_referencia', filters.mesReferencia);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats: Record<string, number> = {
        PENDING: 0,
        SENT: 0,
        DELIVERED: 0,
        READ: 0,
        PLAYED: 0,
        FAILED: 0
      };

      (data || []).forEach((record: any) => {
        const status = record.current_status || 'PENDING';
        stats[status] = (stats[status] || 0) + 1;
      });

      return stats as Record<WhatsAppMessageStatus, number>;

    } catch (error) {
      logger.error('[MessageStatus] Erro ao buscar estatísticas', filters, error as Error);
      return {
        PENDING: 0,
        SENT: 0,
        DELIVERED: 0,
        READ: 0,
        PLAYED: 0,
        FAILED: 0
      };
    }
  }
}
