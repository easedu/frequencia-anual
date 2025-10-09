/**
 * Schemas Zod comuns reutilizáveis
 *
 * Schemas básicos usados em múltiplos contextos
 */

import { z } from 'zod';

/**
 * Schema para validação de UUID v4
 */
export const uuidSchema = z.string().uuid('ID deve ser um UUID válido');

/**
 * Schema para validação de data ISO 8601
 * Formato: YYYY-MM-DDTHH:mm:ss.sssZ
 */
export const isoDateSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
  'Data deve estar no formato ISO 8601'
);

/**
 * Schema para validação de CPF (apenas dígitos)
 */
export const cpfSchema = z.string()
  .regex(/^\d{11}$/, 'CPF deve conter 11 dígitos');

/**
 * Schema para validação de telefone brasileiro (apenas dígitos)
 * Aceita 10 ou 11 dígitos (com ou sem 9 no celular)
 */
export const phoneSchema = z.string()
  .regex(/^\d{10,11}$/, 'Telefone deve conter 10 ou 11 dígitos');

/**
 * Schema para validação de CEP (apenas dígitos)
 */
export const cepSchema = z.string()
  .regex(/^\d{8}$/, 'CEP deve conter 8 dígitos');

/**
 * Schema para validação de email
 */
export const emailSchema = z.string()
  .email('Email inválido')
  .optional()
  .or(z.literal(''));