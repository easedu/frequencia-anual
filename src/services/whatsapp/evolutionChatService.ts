/**
 * Evolution API - Serviço de Chat/Verificação
 *
 * @description Serviço para verificação de números WhatsApp via Evolution API
 * @see https://doc.evolution-api.com/v2/api-reference/chat-controller
 */

import { EvolutionClient } from './evolutionClient';
import { evolutionConfig } from '@/lib/whatsapp/evolutionConfig';
import {
  validatePhoneNumber,
  validateMultiplePhones,
  maskPhoneNumber
} from '@/lib/whatsapp/evolutionValidator';
import {
  CheckWhatsAppRequest,
  CheckWhatsAppResponse,
  WhatsAppCheckResult,
  BatchCheckResult
} from '@/types/whatsapp/chat';
import { logger } from '@/utils/logger';

/**
 * Serviço de chat/verificação da Evolution API
 */
export class EvolutionChatService {
  /**
   * Verificar se número tem WhatsApp
   *
   * @param phone - Número de telefone (com ou sem código do país)
   * @returns Resultado da verificação
   *
   * @throws {Error} Se validação falhar
   *
   * @example
   * const result = await EvolutionChatService.checkWhatsApp("11987654321");
   * console.log(result.hasWhatsApp); // true/false
   */
  static async checkWhatsApp(phone: string): Promise<WhatsAppCheckResult> {
    try {
      // Validar telefone
      const phoneValidation = validatePhoneNumber(phone);
      if (!phoneValidation.valid) {
        throw new Error(phoneValidation.error);
      }

      logger.info('Checking WhatsApp number via Evolution API', {
        phone: maskPhoneNumber(phone)
      });

      // Preparar request
      const request: CheckWhatsAppRequest = {
        numbers: [phoneValidation.formatted!]
      };

      // Verificar via Evolution API
      const endpoint = `/chat/whatsappNumbers/{instance}`;
      const response = await EvolutionClient.post<CheckWhatsAppResponse[]>(
        endpoint,
        request
      );

      // Evolution API retorna array, pegar primeiro item
      const result = response[0];

      logger.info('WhatsApp check completed', {
        phone: maskPhoneNumber(phone),
        hasWhatsApp: result.exists
      });

      // Retornar resultado normalizado
      return {
        phone: phoneValidation.formatted!,
        hasWhatsApp: result.exists,
        jid: result.jid,
        verifiedAt: Date.now()
      };

    } catch (error) {
      logger.error('Failed to check WhatsApp number', {
        phone: maskPhoneNumber(phone)
      }, error as Error);

      return {
        phone: phone,
        hasWhatsApp: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao verificar número',
        verifiedAt: Date.now()
      };
    }
  }

  /**
   * Verificar múltiplos números WhatsApp
   *
   * @param phones - Array de números de telefone
   * @returns Resultado da verificação em lote
   *
   * @example
   * const result = await EvolutionChatService.checkMultipleWhatsApp([
   *   "11987654321",
   *   "11987654322"
   * ]);
   */
  static async checkMultipleWhatsApp(phones: string[]): Promise<BatchCheckResult> {
    try {
      if (!phones || phones.length === 0) {
        throw new Error('Lista de telefones vazia');
      }

      // Validar todos os números
      const validations = validateMultiplePhones(phones);

      // Filtrar apenas números válidos
      const validPhones = validations
        .filter(v => v.valid)
        .map(v => v.formatted!);

      const invalidPhones = validations.filter(v => !v.valid);

      if (validPhones.length === 0) {
        return {
          success: false,
          total: phones.length,
          verified: 0,
          results: [],
          errors: invalidPhones.map(p => p.error || 'Número inválido')
        };
      }

      logger.info('Checking multiple WhatsApp numbers via Evolution API', {
        total: phones.length,
        valid: validPhones.length,
        invalid: invalidPhones.length
      });

      // Preparar request
      const request: CheckWhatsAppRequest = {
        numbers: validPhones
      };

      // Verificar via Evolution API
      const endpoint = `/chat/whatsappNumbers/{instance}`;
      const response = await EvolutionClient.post<CheckWhatsAppResponse[]>(
        endpoint,
        request
      );

      // Processar resultados
      const results: WhatsAppCheckResult[] = response.map(item => ({
        phone: item.number,
        hasWhatsApp: item.exists,
        jid: item.jid,
        verifiedAt: Date.now()
      }));

      // Adicionar números inválidos aos resultados
      invalidPhones.forEach(invalid => {
        results.push({
          phone: phones[validations.indexOf(invalid)],
          hasWhatsApp: false,
          error: invalid.error,
          verifiedAt: Date.now()
        });
      });

      logger.info('Multiple WhatsApp checks completed', {
        total: phones.length,
        verified: results.length,
        withWhatsApp: results.filter(r => r.hasWhatsApp).length
      });

      return {
        success: true,
        total: phones.length,
        verified: results.length,
        results,
        errors: invalidPhones.map(p => p.error || 'Número inválido')
      };

    } catch (error) {
      logger.error('Failed to check multiple WhatsApp numbers', {
        total: phones.length
      }, error as Error);

      return {
        success: false,
        total: phones.length,
        verified: 0,
        results: [],
        errors: [error instanceof Error ? error.message : 'Erro desconhecido']
      };
    }
  }
}
