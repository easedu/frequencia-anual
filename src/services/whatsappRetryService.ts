import type { WhatsAppSendResult } from '@/types';
import { logger } from '@/utils/logger';

const WHATSAPP_API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BASE_URL_API_HABIB_KYRILLOS || 'http://localhost:3000';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5 segundos

/**
 * Aguarda X milissegundos (promise-based)
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Serviço para enviar mensagens WhatsApp com retry automático
 */
export class WhatsAppRetryService {
  /**
   * Envia mensagem WhatsApp com retry (até 3 tentativas, delay 5s)
   */
  static async sendWithRetry(params: {
    phone: string;
    message: string;
    isDryRun?: boolean;
  }): Promise<WhatsAppSendResult> {
    const { phone, message, isDryRun = false } = params;

    // Modo Dry-Run: simular envio sem chamar API real
    if (isDryRun) {
      logger.info('[WhatsAppRetry] DRY-RUN: Simulando envio', { phone });
      await sleep(100); // Simular latência
      return {
        success: true,
        messageId: `DRY-RUN-${Date.now()}`,
        phone,
        status: 'sent',
        sentAt: Date.now(),
        retryCount: 0
      };
    }

    let lastError: string = '';

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.info(`[WhatsAppRetry] Tentativa ${attempt}/${MAX_RETRIES}`, { phone });

        const response = await fetch(`${WHATSAPP_API_URL}/api/evolution/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, message })
        });

        const data = await response.json();

        // ✅ Sucesso: API retornou success=true
        if (data.success && data.data?.messageId) {
          logger.info(`[WhatsAppRetry] ✅ Sucesso na tentativa ${attempt}`, {
            phone,
            messageId: data.data.messageId,
            status: data.data.status
          });

          return {
            success: true,
            messageId: data.data.messageId,
            phone,
            status: data.data.status || 'sent',
            sentAt: data.data.sentAt || Date.now(),
            retryCount: attempt - 1 // Quantas retries até sucesso
          };
        }

        // Falha da API (ex: número sem WhatsApp)
        lastError = data.error || data.message || 'Erro desconhecido';
        logger.warn(`[WhatsAppRetry] ⚠️ Falha na tentativa ${attempt}: ${lastError}`, { phone });

        // Se não tem WhatsApp, não adianta tentar de novo
        if (data.data?.hasWhatsApp === false) {
          logger.warn('[WhatsAppRetry] Número não possui WhatsApp, abortando retries', { phone });
          break;
        }

      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Erro de rede';
        logger.error(`[WhatsAppRetry] ❌ Erro na tentativa ${attempt}`, error as Error);
      }

      // Se não foi a última tentativa, aguardar delay
      if (attempt < MAX_RETRIES) {
        logger.info(`[WhatsAppRetry] Aguardando ${RETRY_DELAY_MS}ms antes da próxima tentativa...`);
        await sleep(RETRY_DELAY_MS);
      }
    }

    // Esgotou tentativas
    logger.error(`[WhatsAppRetry] ❌ Falha após ${MAX_RETRIES} tentativas`, {
      phone,
      lastError
    });

    return {
      success: false,
      phone,
      status: 'not_sent',
      retryCount: MAX_RETRIES,
      error: lastError
    };
  }

  /**
   * Delay entre envios para evitar rate limiting (5s fixo)
   */
  static async delayBetweenMessages(): Promise<void> {
    logger.info('[WhatsAppRetry] Aguardando 5s antes do próximo envio...');
    await sleep(5000);
  }
}
