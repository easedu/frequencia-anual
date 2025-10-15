/**
 * Evolution API - Serviço de Mensagens
 *
 * @description Serviço para envio de mensagens WhatsApp via Evolution API
 * @see https://doc.evolution-api.com/v2/api-reference/message-controller
 */

import { EvolutionClient } from './evolutionClient';
import { evolutionConfig } from '@/lib/whatsapp/evolutionConfig';
import {
  validatePhoneNumber,
  validateMessage,
  validateDelay,
  maskPhoneNumber
} from '@/lib/whatsapp/evolutionValidator';
import {
  SendTextRequest,
  SendTextResponse,
  SendMessageResult,
  SendMediaRequest
} from '@/types/whatsapp/message';
import { logger } from '@/utils/logger';

/**
 * Serviço de mensagens da Evolution API
 */
export class EvolutionMessageService {
  /**
   * Enviar mensagem de texto
   *
   * @param phone - Número de telefone (com ou sem código do país)
   * @param text - Texto da mensagem
   * @param options - Opções adicionais (delay, linkPreview, etc)
   * @returns Resultado do envio
   *
   * @throws {Error} Se validação falhar ou envio der erro
   *
   * @example
   * const result = await EvolutionMessageService.sendText(
   *   "11987654321",
   *   "Olá! Este é um teste.",
   *   { linkPreview: true, delay: 1000 }
   * );
   */
  static async sendText(
    phone: string,
    text: string,
    options?: Partial<Omit<SendTextRequest, 'number' | 'text'>>
  ): Promise<SendMessageResult> {
    try {
      // Validar telefone
      const phoneValidation = validatePhoneNumber(phone);
      if (!phoneValidation.valid) {
        throw new Error(phoneValidation.error);
      }

      // Validar mensagem
      const messageValidation = validateMessage(text);
      if (!messageValidation.valid) {
        throw new Error(messageValidation.error);
      }

      // Validar delay (se fornecido)
      if (options?.delay !== undefined && !validateDelay(options.delay)) {
        throw new Error('Delay inválido (máximo 5 minutos)');
      }

      // Preparar request
      const request: SendTextRequest = {
        number: phoneValidation.formatted!,
        text: text.trim(),
        linkPreview: options?.linkPreview ?? true, // Padrão: ativar preview
        ...options,
      };

      logger.info('Sending WhatsApp text message via Evolution API', {
        phone: maskPhoneNumber(phone),
        textLength: text.length,
        hasDelay: !!options?.delay,
        linkPreview: request.linkPreview
      });

      // Enviar via Evolution API
      const endpoint = `/message/sendText/{instance}`;
      const response = await EvolutionClient.post<SendTextResponse>(endpoint, request);

      logger.info('WhatsApp message sent successfully', {
        phone: maskPhoneNumber(phone),
        messageId: response.key?.id,
        status: response.status
      });

      // Retornar resultado normalizado
      return {
        success: true,
        messageId: response.key?.id,
        phone: phoneValidation.formatted!,
        status: response.status,
        sentAt: response.messageTimestamp ? parseInt(response.messageTimestamp) : Date.now()
      };

    } catch (error) {
      logger.error('Failed to send WhatsApp message', {
        phone: maskPhoneNumber(phone)
      }, error as Error);

      return {
        success: false,
        phone: phone,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao enviar mensagem'
      };
    }
  }

  /**
   * Enviar mídia (imagem, PDF, etc) - Preparado para implementação futura
   *
   * @param request - Dados da mídia a enviar
   * @returns Resultado do envio
   *
   * @future Implementar quando necessário
   */
  static async sendMedia(request: SendMediaRequest): Promise<SendMessageResult> {
    try {
      // Validar telefone
      const phoneValidation = validatePhoneNumber(request.number);
      if (!phoneValidation.valid) {
        throw new Error(phoneValidation.error);
      }

      logger.info('Sending WhatsApp media via Evolution API', {
        phone: maskPhoneNumber(request.number),
        mediaType: request.mediaType
      });

      // Enviar via Evolution API
      const endpoint = `/message/sendMedia/{instance}`;
      const response = await EvolutionClient.post<SendTextResponse>(endpoint, {
        ...request,
        number: phoneValidation.formatted
      });

      logger.info('WhatsApp media sent successfully', {
        phone: maskPhoneNumber(request.number),
        messageId: response.key?.id
      });

      return {
        success: true,
        messageId: response.key?.id,
        phone: phoneValidation.formatted!,
        status: response.status,
        sentAt: response.messageTimestamp ? parseInt(response.messageTimestamp) : Date.now()
      };

    } catch (error) {
      logger.error('Failed to send WhatsApp media', {
        phone: maskPhoneNumber(request.number),
        mediaType: request.mediaType
      }, error as Error);

      return {
        success: false,
        phone: request.number,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao enviar mídia'
      };
    }
  }
}
