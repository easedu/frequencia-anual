/**
 * Tipos de Webhooks da Evolution API
 *
 * @description Tipos para recebimento de eventos via webhooks
 * @see https://doc.evolution-api.com/v2/en/webhooks
 */

import { WhatsAppMessageStatus } from '../index';

/**
 * Tipos de eventos de webhook suportados
 */
export type WebhookEventType =
  | 'MESSAGES_UPDATE'       // Atualização de status de mensagem
  | 'MESSAGES_UPSERT'       // Nova mensagem recebida/enviada
  | 'CONNECTION_UPDATE'     // Status da conexão WhatsApp
  | 'QRCODE_UPDATED';       // QR Code atualizado

/**
 * Estrutura de chave de mensagem (key)
 */
export interface MessageKey {
  remoteJid: string;        // ID do destinatário (5511987654321@s.whatsapp.net)
  fromMe: boolean;          // true se mensagem foi enviada por nós
  id: string;               // ID único da mensagem (message_id)
}

/**
 * Atualização de status de mensagem
 */
export interface MessageStatusUpdate {
  status: number;           // Status code (0=ERROR, 1=PENDING, 2=SERVER_ACK, 3=DELIVERY_ACK, 4=READ, 5=PLAYED)
  timestamp?: number;       // Timestamp Unix (segundos)
}

/**
 * Webhook de atualização de status (MESSAGES_UPDATE)
 */
export interface MessageStatusWebhook {
  event: 'MESSAGES_UPDATE';
  instance: string;         // Nome da instância Evolution API
  data: {
    key: MessageKey;
    update: MessageStatusUpdate;
  };
  destination?: string;     // Número de destino
  date_time: string;        // ISO 8601
  sender: string;           // Número de origem
  server_url: string;       // URL do servidor Evolution API
  apikey: string;           // API key (para validação)
}

/**
 * Webhook genérico (estrutura base)
 */
export interface EvolutionWebhook {
  event: WebhookEventType;
  instance: string;
  data: unknown;
  date_time: string;
  server_url: string;
  apikey: string;
}

/**
 * Mapeamento de status codes para WhatsAppMessageStatus
 */
export const STATUS_CODE_MAP: Record<number, WhatsAppMessageStatus> = {
  0: 'FAILED',      // ERROR
  1: 'PENDING',     // PENDING
  2: 'SENT',        // SERVER_ACK (mensagem chegou no servidor WhatsApp)
  3: 'DELIVERED',   // DELIVERY_ACK (mensagem entregue no dispositivo)
  4: 'READ',        // READ (mensagem lida)
  5: 'PLAYED',      // PLAYED (mídia reproduzida)
};

/**
 * Converter status code numérico para WhatsAppMessageStatus
 */
export function mapStatusCode(code: number): WhatsAppMessageStatus {
  return STATUS_CODE_MAP[code] || 'PENDING';
}

/**
 * Extrair número de telefone do remoteJid
 * @example "5511987654321@s.whatsapp.net" → "5511987654321"
 */
export function extractPhoneFromJid(jid: string): string {
  return jid.split('@')[0];
}
