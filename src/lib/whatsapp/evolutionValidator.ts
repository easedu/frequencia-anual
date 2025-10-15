/**
 * Validadores para Evolution API
 *
 * @description Validações de telefone, mensagens e outros inputs
 * Garante que os dados enviados à Evolution API estão no formato correto
 */

/**
 * Resultado de validação de telefone
 */
export interface PhoneValidationResult {
  valid: boolean;
  error?: string;
  formatted?: string;
}

/**
 * Resultado de validação de mensagem
 */
export interface MessageValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validar número de telefone brasileiro
 *
 * @param phone - Número de telefone (com ou sem formatação)
 * @returns Resultado da validação com número formatado
 *
 * @example
 * validatePhoneNumber("11987654321")
 * // { valid: true, formatted: "5511987654321" }
 *
 * validatePhoneNumber("(11) 98765-4321")
 * // { valid: true, formatted: "5511987654321" }
 */
export function validatePhoneNumber(phone: string): PhoneValidationResult {
  if (!phone) {
    return {
      valid: false,
      error: 'Número de telefone é obrigatório'
    };
  }

  // Remover caracteres não numéricos
  const clean = phone.replace(/\D/g, '');

  // Validar comprimento (10-13 dígitos)
  if (clean.length < 10 || clean.length > 13) {
    return {
      valid: false,
      error: 'Telefone deve ter entre 10 e 13 dígitos'
    };
  }

  // Adicionar código do Brasil (55) se necessário
  let formatted = clean;
  if (!formatted.startsWith('55')) {
    formatted = `55${clean}`;
  }

  // Validar formato brasileiro: 55 + DDD (2 dígitos) + 9 + número (8 dígitos)
  // Exemplo: 5511987654321
  const brazilianPattern = /^55\d{2}9\d{8}$/;

  if (!brazilianPattern.test(formatted)) {
    return {
      valid: false,
      error: 'Formato de telefone brasileiro inválido. Deve ser: DDD + 9 + 8 dígitos'
    };
  }

  return {
    valid: true,
    formatted
  };
}

/**
 * Validar mensagem de texto
 *
 * @param text - Texto da mensagem
 * @returns Resultado da validação
 */
export function validateMessage(text: string): MessageValidationResult {
  if (!text || !text.trim()) {
    return {
      valid: false,
      error: 'Mensagem não pode estar vazia'
    };
  }

  // WhatsApp tem limite de ~65536 caracteres
  if (text.length > 65000) {
    return {
      valid: false,
      error: 'Mensagem muito longa (máximo 65.000 caracteres)'
    };
  }

  return { valid: true };
}

/**
 * Validar múltiplos números de telefone
 *
 * @param phones - Array de telefones
 * @returns Array de resultados de validação
 */
export function validateMultiplePhones(phones: string[]): PhoneValidationResult[] {
  if (!Array.isArray(phones) || phones.length === 0) {
    return [{
      valid: false,
      error: 'Lista de telefones vazia ou inválida'
    }];
  }

  return phones.map(phone => validatePhoneNumber(phone));
}

/**
 * Verificar se todos os números são válidos
 *
 * @param phones - Array de telefones
 * @returns true se todos válidos, false se algum inválido
 */
export function areAllPhonesValid(phones: string[]): boolean {
  const results = validateMultiplePhones(phones);
  return results.every(result => result.valid);
}

/**
 * Formatar telefone para exibição (mascarado)
 * Usado para logs sem expor número completo
 *
 * @param phone - Número de telefone
 * @returns Telefone mascarado (ex: "5511****4321")
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 8) {
    return '****';
  }

  const clean = phone.replace(/\D/g, '');
  const start = clean.substring(0, 4);
  const end = clean.substring(clean.length - 4);

  return `${start}****${end}`;
}

/**
 * Validar delay (deve ser número positivo)
 *
 * @param delay - Delay em milissegundos
 * @returns true se válido
 */
export function validateDelay(delay?: number): boolean {
  if (delay === undefined) return true;
  return typeof delay === 'number' && delay >= 0 && delay <= 300000; // Max 5 minutos
}
