/**
 * Configuração da Evolution API
 *
 * @description Configuração centralizada para Evolution API
 * Gerencia URLs, chaves e validações de configuração
 */

import { EvolutionConfig } from '@/types/whatsapp/evolution';

/**
 * Configuração da Evolution API (centralizada)
 */
export const evolutionConfig: EvolutionConfig = {
  baseUrl: process.env.EVOLUTION_API_BASE_URL || 'http://localhost:8080',
  apiKey: process.env.EVOLUTION_API_KEY || '',
  instanceName: process.env.EVOLUTION_INSTANCE_NAME || 'frequencia-anual',
  timeout: 30000, // 30 segundos
};

/**
 * Resultado de validação de configuração
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validar se configuração está completa
 */
export function validateEvolutionConfig(): ConfigValidationResult {
  const errors: string[] = [];

  if (!evolutionConfig.baseUrl) {
    errors.push('EVOLUTION_API_BASE_URL não configurada');
  }

  if (!evolutionConfig.apiKey) {
    errors.push('EVOLUTION_API_KEY não configurada');
  }

  if (!evolutionConfig.instanceName) {
    errors.push('EVOLUTION_INSTANCE_NAME não configurada');
  }

  // Validar formato da URL
  if (evolutionConfig.baseUrl) {
    try {
      new URL(evolutionConfig.baseUrl);
    } catch {
      errors.push('EVOLUTION_API_BASE_URL não é uma URL válida');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Construir URL completa para endpoint
 *
 * @param endpoint - Endpoint da API (ex: "/message/sendText/{instance}")
 * @returns URL completa (ex: "http://localhost:8080/message/sendText/frequencia-anual")
 */
export function buildEvolutionUrl(endpoint: string): string {
  const base = evolutionConfig.baseUrl.replace(/\/$/, ''); // Remove trailing slash
  let path = endpoint.replace(/^\//, ''); // Remove leading slash

  // Substituir {instance} pelo instanceName
  path = path.replace('{instance}', evolutionConfig.instanceName);

  return `${base}/${path}`;
}

/**
 * Obter configuração atual (útil para logs)
 */
export function getConfigSummary(): {
  baseUrl: string;
  instanceName: string;
  hasApiKey: boolean;
  timeout: number;
} {
  return {
    baseUrl: evolutionConfig.baseUrl,
    instanceName: evolutionConfig.instanceName,
    hasApiKey: !!evolutionConfig.apiKey,
    timeout: evolutionConfig.timeout || 30000,
  };
}
