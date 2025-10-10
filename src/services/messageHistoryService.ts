import { db } from '@/firebase.config';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import type { WhatsAppMessageHistory } from '@/types';
import { logger } from '@/utils/logger';

const COLLECTION_NAME = 'whatsappMessageHistory';

/**
 * Serviço para gerenciar histórico de mensagens WhatsApp enviadas
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

      const q = query(
        collection(db, COLLECTION_NAME),
        where('estudanteId', '==', estudanteId),
        where('contatoTelefone', '==', contatoTelefone),
        where('anoReferencia', '==', anoReferencia),
        where('mesReferencia', '==', mesReferencia),
        where('quantidadeFaltas', '==', quantidadeFaltas)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        logger.info('[MessageHistory] Mensagem já enviada anteriormente', {
          estudanteId,
          contatoTelefone,
          anoReferencia,
          mesReferencia,
          quantidadeFaltas,
          existingRecords: snapshot.size
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
      const historyRecord: Omit<WhatsAppMessageHistory, 'dataPrimeiroEnvio'> & {
        dataPrimeiroEnvio: ReturnType<typeof serverTimestamp>;
      } = {
        ...data,
        dataPrimeiroEnvio: serverTimestamp() as any
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), historyRecord);

      logger.info('[MessageHistory] Registro criado com sucesso', {
        docId: docRef.id,
        estudanteId: data.estudanteId,
        contatoTelefone: data.contatoTelefone,
        status: data.status
      });

      return docRef.id;
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

      const q = query(
        collection(db, COLLECTION_NAME),
        where('estudanteId', '==', estudanteId),
        where('anoReferencia', '==', anoReferencia),
        where('mesReferencia', '==', mesReferencia)
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        ...doc.data(),
        dataPrimeiroEnvio: doc.data().dataPrimeiroEnvio?.toDate?.()?.toISOString() || new Date().toISOString()
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

      const q = query(
        collection(db, COLLECTION_NAME),
        where('anoReferencia', '==', anoReferencia),
        where('mesReferencia', '==', mesReferencia)
      );

      const snapshot = await getDocs(q);

      const stats = {
        total: snapshot.size,
        success: 0,
        failed: 0,
        noContact: 0
      };

      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === 'SUCCESS') stats.success++;
        else if (data.status === 'FAILED') stats.failed++;
        else if (data.status === 'NO_CONTACT') stats.noContact++;
      });

      return stats;
    } catch (error) {
      logger.error('[MessageHistory] Erro ao calcular estatísticas', error as Error);
      return { total: 0, success: 0, failed: 0, noContact: 0 };
    }
  }
}
