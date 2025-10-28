/**
 * Tipos de Mensagens da Evolution API
 *
 * @description Tipos para envio e recebimento de mensagens WhatsApp
 * @see https://doc.evolution-api.com/v2/api-reference/message-controller
 */

import { EvolutionResponse } from './evolution';

/**
 * Request para enviar mensagem de texto
 */
export interface SendTextRequest {
  number: string;           // "5511987654321" (com código do país)
  text: string;             // Conteúdo da mensagem
  delay?: number;           // Delay em ms antes de enviar
  linkPreview?: boolean;    // Mostrar preview de links (padrão: true)
  mentionsEveryOne?: boolean; // Mencionar todos (@everyone)
  mentioned?: string[];     // Lista de números a mencionar
  quoted?: QuotedMessage;   // Responder mensagem específica
}

/**
 * Resposta ao enviar mensagem de texto
 */
export interface SendTextResponse extends EvolutionResponse<{
  extendedTextMessage?: {
    text: string;
  };
}> {}

/**
 * Request para enviar mídia (imagem, PDF, etc)
 */
export interface SendMediaRequest {
  number: string;
  mediaType: 'image' | 'video' | 'audio' | 'document';
  media: string;            // URL ou base64
  caption?: string;
  fileName?: string;
  delay?: number;
  mentioned?: string[];
}

/**
 * Mensagem citada (reply)
 */
export interface QuotedMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message?: {
    conversation?: string;
  };
}

/**
 * Template de mensagem
 * Usado para mensagens pré-definidas com variáveis
 */
export interface MessageTemplate {
  id: string;
  name: string;
  text: string;
  variables?: string[];     // Ex: ["{nome}", "{faltas}"]
  description?: string;
}

/**
 * Resultado de envio (normalizado)
 */
export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  phone: string;
  status?: string;
  sentAt?: number;
  error?: string;
}

/**
 * Tipos auxiliares para dados genéricos de mensagens
 */
export type MessageData = Record<string, unknown>;
export type MessageMetadata = Record<string, unknown>;
