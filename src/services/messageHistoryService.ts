import type { WhatsAppMessageHistory } from '@/types';
import { logger } from '@/utils/logger';

/**
 * Serviço para gerenciar histórico de mensagens WhatsApp enviadas (API VERSION)
 * Previne duplicatas e rastreia status de envios
 * Refatorado para usar /api/messages/history
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

      const queryParams = new URLSearchParams({
        estudante_id: estudanteId,
        contato_telefone: contatoTelefone,
        ano_referencia: anoReferencia.toString(),
        mes_referencia: mesReferencia.toString(),
        quantidade_faltas: quantidadeFaltas.toString(),
        limit: '1'
      });

      const response = await fetch(`/api/messages/history?${queryParams}`);

      if (!response.ok) throw new Error(`API returned ${response.status}`);

      const result = await response.json();
      const wasAlreadySent = result.data && result.data.length > 0;

      if (wasAlreadySent) {
        logger.info('[MessageHistory] Mensagem já enviada anteriormente', {
          estudanteId,
          contatoTelefone,
          anoReferencia,
          mesReferencia,
          quantidadeFaltas,
          existingRecords: result.data.length
        });
      }

      return wasAlreadySent;
    } catch (error) {
      logger.error('[MessageHistory] Erro ao verificar histórico', error as Error);
      // Em caso de erro, assumir que NÃO foi enviado (fail-safe para enviar)
      return false;
    }
  }

  /**
   * Registra envio de mensagem no histórico via API
   */
  static async recordSent(data: Omit<WhatsAppMessageHistory, 'dataPrimeiroEnvio'>): Promise<string | null> {
    try {
      const response = await fetch('/api/messages/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estudante_id: data.estudanteId,
          contato_telefone: data.contatoTelefone,
          ano_referencia: data.anoReferencia,
          mes_referencia: data.mesReferencia,
          quantidade_faltas: data.quantidadeFaltas,
          estudante_nome: data.estudanteNome,
          contato_nome: data.contatoNome,
          task_id: data.taskId || null,
          status: data.status,
          message_id: data.messageId || null,
          sent_at: data.sentAt || null,
          retry_count: data.retryCount || 0,
          is_dry_run: data.isDryRun || false,
        }),
      });

      if (response.status === 409) {
        logger.warn('[MessageHistory] Duplicata detectada pela API (409)', {
          estudanteId: data.estudanteId,
          contatoTelefone: data.contatoTelefone
        });
        return null;
      }

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const result = await response.json();

      logger.info('[MessageHistory] Registro criado com sucesso via API', {
        docId: result.data?.id,
        estudanteId: data.estudanteId,
        contatoTelefone: data.contatoTelefone,
        status: data.status,
        messageId: data.messageId
      });

      return result.data?.id || null;
    } catch (error) {
      logger.error('[MessageHistory] Erro ao criar registro via API', error as Error);
      return null;
    }
  }

  /**
   * Busca todos os registros de um estudante no mês/ano via API
   */
  static async getStudentHistory(params: {
    estudanteId: string;
    anoReferencia: number;
    mesReferencia: number;
  }): Promise<WhatsAppMessageHistory[]> {
    try {
      const { estudanteId, anoReferencia, mesReferencia } = params;

      const queryParams = new URLSearchParams({
        estudante_id: estudanteId,
        ano_referencia: anoReferencia.toString(),
        mes_referencia: mesReferencia.toString()
      });

      const response = await fetch(`/api/messages/history?${queryParams}`);

      if (!response.ok) throw new Error(`API returned ${response.status}`);

      const result = await response.json();

      // Map API response to interface
      return (result.data || []).map((record: any) => ({
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

      const queryParams = new URLSearchParams({
        ano_referencia: anoReferencia.toString(),
        mes_referencia: mesReferencia.toString(),
        limit: '9999' // Precisamos de todos para calcular stats
      });

      const response = await fetch(`/api/messages/history?${queryParams}`);

      if (!response.ok) throw new Error(`API returned ${response.status}`);

      const result = await response.json();
      const records = result.data || [];

      const stats = {
        total: records.length,
        success: 0,
        failed: 0,
        noContact: 0
      };

      records.forEach((record: WhatsAppMessageHistory) => {
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
