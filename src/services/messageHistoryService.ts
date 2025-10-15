import { supabase } from '@/lib/supabaseClient';
import type { WhatsAppMessageHistory } from '@/types';
import { logger } from '@/utils/logger';

const TABLE_NAME = 'whatsapp_message_history';

/**
 * Serviço para gerenciar histórico de mensagens WhatsApp enviadas (SUPABASE)
 * Previne duplicatas e rastreia status de envios
 */
export class MessageHistoryService {
  /**
   * Verifica se já foi enviada mensagem para essa combinação exata
   */
  static async wasAlreadySent(params: {
    estudanteId: string;
    contatoTelefone: string;
    anoReferencia: number;
    mesReferencia: number;
    quantidadeFaltas: number;
  }): Promise<boolean> {
    try {
      const { estudanteId, contatoTelefone, anoReferencia, mesReferencia, quantidadeFaltas } = params;

      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('id')
        .eq('estudante_id', estudanteId)
        .eq('contato_telefone', contatoTelefone)
        .eq('ano_referencia', anoReferencia)
        .eq('mes_referencia', mesReferencia)
        .eq('quantidade_faltas', quantidadeFaltas)
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        logger.info('[MessageHistory] Mensagem já enviada anteriormente', {
          estudanteId,
          contatoTelefone,
          anoReferencia,
          mesReferencia,
          quantidadeFaltas,
          existingRecords: data.length
        });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('[MessageHistory] Erro ao verificar histórico', error as Error);
      // Em caso de erro, assumir que NÃO foi enviado (fail-safe para enviar)
      return false;
    }
  }

  /**
   * Registra envio de mensagem no histórico
   */
  static async recordSent(data: Omit<WhatsAppMessageHistory, 'dataPrimeiroEnvio'>): Promise<string | null> {
    try {
      // Determinar status inicial baseado no sucesso do envio
      const initialStatus = data.status === 'SUCCESS' ? 'SENT' : 'FAILED';
      const timestamp = data.sentAt || Date.now();

      // Map Firebase field names to Supabase snake_case
      const historyRecord = {
        estudante_id: data.estudanteId,
        contato_telefone: data.contatoTelefone,
        ano_referencia: data.anoReferencia,
        mes_referencia: data.mesReferencia,
        quantidade_faltas: data.quantidadeFaltas,
        estudante_nome: data.estudanteNome,
        contato_nome: data.contatoNome,
        task_id: data.taskId || null,
        status: data.status,  // LEGACY: SUCCESS/FAILED/NO_CONTACT
        message_id: data.messageId || null,
        sent_at: data.sentAt || null,
        retry_count: data.retryCount || 0,
        is_dry_run: data.isDryRun || false,
        // 🆕 Novos campos de rastreamento de status
        current_status: initialStatus,
        status_history: [
          {
            status: initialStatus,
            timestamp,
            source: 'api'
          }
        ],
        updated_at: new Date(timestamp).toISOString(),
        // data_primeiro_envio será preenchido automaticamente pelo Supabase (default now())
      };

      const { data: inserted, error} = await (supabase
        .from(TABLE_NAME)
        .insert(historyRecord as any)
        .select('id')
        .single() as any);

      if (error) throw error;

      logger.info('[MessageHistory] Registro criado com sucesso', {
        docId: inserted?.id,
        estudanteId: data.estudanteId,
        contatoTelefone: data.contatoTelefone,
        status: data.status,
        currentStatus: initialStatus,
        messageId: data.messageId
      });

      return inserted?.id || null;
    } catch (error) {
      logger.error('[MessageHistory] Erro ao criar registro', error as Error);
      return null;
    }
  }

  /**
   * Busca todos os registros de um estudante no mês/ano
   */
  static async getStudentHistory(params: {
    estudanteId: string;
    anoReferencia: number;
    mesReferencia: number;
  }): Promise<WhatsAppMessageHistory[]> {
    try {
      const { estudanteId, anoReferencia, mesReferencia } = params;

      const { data, error } = await (supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('estudante_id', estudanteId)
        .eq('ano_referencia', anoReferencia)
        .eq('mes_referencia', mesReferencia) as any);

      if (error) throw error;

      // Map Supabase snake_case back to camelCase
      return (data || []).map((record: any) => ({
        estudanteId: record.estudante_id,
        contatoTelefone: record.contato_telefone,
        anoReferencia: record.ano_referencia,
        mesReferencia: record.mes_referencia,
        quantidadeFaltas: record.quantidade_faltas,
        estudanteNome: record.estudante_nome,
        contatoNome: record.contato_nome,
        taskId: record.task_id,
        dataPrimeiroEnvio: record.data_primeiro_envio,
        status: record.status,
        messageId: record.message_id,
        sentAt: record.sent_at,
        retryCount: record.retry_count,
        isDryRun: record.is_dry_run
      })) as WhatsAppMessageHistory[];
    } catch (error) {
      logger.error('[MessageHistory] Erro ao buscar histórico do estudante', error as Error);
      return [];
    }
  }

  /**
   * Estatísticas de envios (para relatórios)
   */
  static async getStats(params: {
    anoReferencia: number;
    mesReferencia: number;
  }): Promise<{
    total: number;
    success: number;
    failed: number;
    noContact: number;
  }> {
    try {
      const { anoReferencia, mesReferencia } = params;

      const { data, error } = await (supabase
        .from(TABLE_NAME)
        .select('status')
        .eq('ano_referencia', anoReferencia)
        .eq('mes_referencia', mesReferencia) as any);

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        success: 0,
        failed: 0,
        noContact: 0
      };

      (data || []).forEach((record: any) => {
        if (record.status === 'SUCCESS') stats.success++;
        else if (record.status === 'FAILED') stats.failed++;
        else if (record.status === 'NO_CONTACT') stats.noContact++;
      });

      return stats;
    } catch (error) {
      logger.error('[MessageHistory] Erro ao calcular estatísticas', error as Error);
      return { total: 0, success: 0, failed: 0, noContact: 0 };
    }
  }
}
