/**
 * Error Handler Centralizado
 *
 * Captura e trata erros de forma consistente em todas as API Routes
 */

import { NextResponse } from 'next/server';
import { PostgrestError } from '@supabase/supabase-js';
import { ZodError } from 'zod';
import { errorResponse, internalErrorResponse, validationErrorResponse } from './response';

/**
 * Tipos de erro conhecidos
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  DATABASE = 'DATABASE_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  INTERNAL = 'INTERNAL_ERROR',
}

/**
 * Error customizado da aplicação
 */
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public status: number = 400,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Handler principal de erros
 *
 * @param error - Erro capturado
 * @param context - Contexto adicional (ex: nome da rota)
 *
 * @example
 * ```typescript
 * try {
 *   // código
 * } catch (error) {
 *   return handleError(error, 'GET /api/students');
 * }
 * ```
 */
export function handleError(error: unknown, context?: string): NextResponse {
  // Log do erro (desenvolvimento)
  if (process.env.NODE_ENV === 'development') {
    console.error(`[Error Handler] ${context || 'Unknown context'}:`, error);
  }

  // 1. Erro customizado da aplicação
  if (error instanceof AppError) {
    return errorResponse(error.type, error.message, error.status, error.details);
  }

  // 2. Erro de validação Zod
  if (error instanceof ZodError) {
    return validationErrorResponse(error.errors);
  }

  // 3. Erro do Supabase/PostgreSQL
  if (isPostgrestError(error)) {
    return handleDatabaseError(error);
  }

  // 4. Erro genérico
  if (error instanceof Error) {
    return internalErrorResponse(
      'Erro interno do servidor.',
      process.env.NODE_ENV === 'development' ? error.message : undefined
    );
  }

  // 5. Erro desconhecido
  return internalErrorResponse('Erro desconhecido.');
}

/**
 * Verifica se é erro do Supabase/PostgreSQL
 */
function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'details' in error
  );
}

/**
 * Trata erros de banco de dados (Supabase/PostgreSQL)
 */
function handleDatabaseError(error: PostgrestError): NextResponse {
  const { code, message, details, hint } = error;

  // Mapear códigos PostgreSQL para respostas HTTP
  switch (code) {
    // Violação de constraint única (duplicate key)
    case '23505':
      return errorResponse(
        ErrorType.CONFLICT,
        'Registro já existe.',
        409,
        { hint, details }
      );

    // Violação de foreign key (referência inexistente)
    case '23503':
      return errorResponse(
        ErrorType.NOT_FOUND,
        'Referência a registro inexistente.',
        404,
        { hint, details }
      );

    // Violação de not null
    case '23502':
      return errorResponse(
        ErrorType.VALIDATION,
        'Campo obrigatório faltando.',
        400,
        { hint, details }
      );

    // Row Level Security (RLS) - acesso negado
    case '42501':
    case 'PGRST301':
      return errorResponse(
        ErrorType.FORBIDDEN,
        'Acesso negado a este recurso.',
        403
      );

    // Timeout
    case '57014':
      return errorResponse(
        ErrorType.INTERNAL,
        'A operação demorou muito tempo. Tente novamente.',
        408
      );

    // Erro genérico de banco
    default:
      return internalErrorResponse(
        'Erro ao acessar banco de dados.',
        process.env.NODE_ENV === 'development' ? { code, message, details, hint } : undefined
      );
  }
}

/**
 * Wrapper para executar código com tratamento de erro automático
 *
 * @example
 * ```typescript
 * export const GET = withAuth(async (req, userId) => {
 *   return withErrorHandling(async () => {
 *     const data = await fetchData();
 *     return successResponse(data);
 *   }, 'GET /api/students');
 * });
 * ```
 */
export async function withErrorHandling(
  fn: () => Promise<NextResponse>,
  context?: string
): Promise<NextResponse> {
  try {
    return await fn();
  } catch (error) {
    return handleError(error, context);
  }
}
