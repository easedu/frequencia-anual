/**
 * Tipos de Chat e Verificação da Evolution API
 *
 * @description Tipos para verificação de números WhatsApp
 * @see https://doc.evolution-api.com/v2/api-reference/chat-controller
 */

/**
 * Request para verificar números WhatsApp
 */
export interface CheckWhatsAppRequest {
  numbers: string[];        // ["5511987654321", "5511987654322"]
}

/**
 * Resposta de verificação da Evolution API
 */
export interface CheckWhatsAppResponse {
  exists: boolean;          // Se o número tem WhatsApp
  jid: string;              // "5511987654321@s.whatsapp.net"
  number: string;           // Número verificado
}

/**
 * Resultado consolidado de verificação (normalizado)
 */
export interface WhatsAppCheckResult {
  phone: string;            // Telefone original
  hasWhatsApp: boolean;     // Se tem WhatsApp
  jid?: string;             // JID do WhatsApp (se exists=true)
  name?: string;            // Nome do contato (se disponível)
  verifiedAt?: number;      // Timestamp da verificação
  error?: string;           // Mensagem de erro (se houver)
}

/**
 * Resultado de verificação em lote
 */
export interface BatchCheckResult {
  success: boolean;
  total: number;
  verified: number;
  results: WhatsAppCheckResult[];
  errors?: string[];
}
