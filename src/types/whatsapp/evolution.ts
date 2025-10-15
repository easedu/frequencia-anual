/**
 * Tipos da Evolution API
 *
 * @description Tipos TypeScript para integração com Evolution API v2
 * @see https://doc.evolution-api.com/v2/api-reference
 */

/**
 * Configuração da Evolution API
 */
export interface EvolutionConfig {
  baseUrl: string;          // http://localhost:8080 ou URL do servidor
  apiKey: string;           // API key para autenticação
  instanceName: string;     // Nome da instância WhatsApp
  timeout?: number;         // Timeout em ms (padrão: 30000)
}

/**
 * Resposta padrão da Evolution API
 */
export interface EvolutionResponse<T = unknown> {
  key?: {
    remoteJid: string;      // "5511987654321@s.whatsapp.net"
    fromMe: boolean;
    id: string;             // ID da mensagem
  };
  message?: T;
  messageTimestamp?: string;
  status?: 'PENDING' | 'SENT' | 'RECEIVED' | 'READ' | 'FAILED';
}

/**
 * Erro da Evolution API
 */
export interface EvolutionError {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
}

/**
 * Status da instância
 */
export interface InstanceStatus {
  instance: string;
  status: 'open' | 'connecting' | 'close';
  qrcode?: {
    base64: string;
    code: string;
  };
}

/**
 * Informações da instância
 */
export interface InstanceInfo {
  instanceName: string;
  status: 'connected' | 'disconnected' | 'connecting';
  profileName?: string;
  profilePictureUrl?: string;
  phoneNumber?: string;
}