/**
 * Util Utilitários de Resposta Padronizada
 *
 * Fornece funções para criar respostas consistentes em todas as API Routes
 * OTIMIZADO: Inclui políticas de cache HTTP para performance
 */

import { NextResponse } from 'next/server';

// ============================================================================
// CONFIGURAÇÕES DE CACHE HTTP
// ============================================================================

/**
 * Cache policies para diferentes tipos de dados
 * OTIMIZAÇÃO: Reduzir requests redundantes com cache edge/CDN
 */
export const CACHE_POLICIES = {
  // Dados que mudam frequentemente (estudantes, faltas)
  dynamic: {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    'CDN-Cache-Control': 'max-age=60',
    'Vercel-CDN-Cache-Control': 'max-age=60',
  },

  // Dados que mudam raramente (configurações, ano letivo)
  static: {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    'CDN-Cache-Control': 'max-age=3600',
    'Vercel-CDN-Cache-Control': 'max-age=3600',
  },

  // Dados privados (dados do usuário logado)
  private: {
    'Cache-Control': 'private, max-age=60',
  },

  // Sem cache (mutations, dados sensíveis)
  none: {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
};

export type CachePolicy = keyof typeof CACHE_POLICIES;

/**
 * Tipo de resposta de sucesso
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Tipo de resposta de erro
 */
export interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
  details?: any;
}

/**
 * Resposta de sucesso padronizada
 *
 * @param data - Dados a retornar
 * @param statusOrMessage - Mensagem de sucesso (opcional) ou status code (number)
 * @param status - Status HTTP (padrão: 200)
 *
 * @example
 * ```typescript
 * return successResponse({ student: newStudent }, 'Estudante criado', 201);
 * return successResponse({ student: newStudent }, 201); // Aceita number como segundo parâmetro
 * ```
 */
export function successResponse<T>(
  data: T,
  statusOrMessage?: string | number,
  status?: number
): NextResponse {
  const isStatusNumber = typeof statusOrMessage === 'number';
  const finalStatus = isStatusNumber ? statusOrMessage : (status ?? 200);
  const message = isStatusNumber ? undefined : statusOrMessage;

  const response: SuccessResponse<T> = {
    success: true,
    data,
  };

  if (message) {
    response.message = message;
  }

  return NextResponse.json(response, { status: finalStatus });
}

/**
 * Resposta de erro padronizada
 *
 * @param error - Tipo do erro
 * @param statusOrMessage - Mensagem de erro descritiva (ou status code number)
 * @param statusParam - Status HTTP (padrão: 400)
 * @param details - Detalhes adicionais (opcional)
 *
 * @example
 * ```typescript
 * return errorResponse('NOT_FOUND', 'Estudante não encontrado', 404);
 * return errorResponse('Erro ao processar', 500); // Aceita number como segundo parâmetro
 * ```
 */
export function errorResponse(
  error: string,
  statusOrMessage?: string | number,
  statusParam?: number,
  details?: any
): NextResponse {
  // Se statusOrMessage é number, é o status code
  const isStatusNumber = typeof statusOrMessage === 'number';
  const status = isStatusNumber ? statusOrMessage : (statusParam ?? 400);
  const message = isStatusNumber ? undefined : statusOrMessage;

  const response: ErrorResponse = {
    success: false,
    error,
  };

  if (message) {
    response.message = message;
  }

  if (details) {
    response.details = details;
  }

  return NextResponse.json(response, { status });
}

/**
 * Resposta de erro de validação (Zod)
 *
 * @param errors - Erros do Zod
 *
 * @example
 * ```typescript
 * if (!validation.success) {
 *   return validationErrorResponse(validation.error.errors);
 * }
 * ```
 */
export function validationErrorResponse(errors: any): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
      details: errors,
    },
    { status: 400 }
  );
}

/**
 * Resposta de não autorizado (401)
 */
export function unauthorizedResponse(
  message: string = 'Usuário não autenticado. Faça login para continuar.'
): NextResponse {
  return errorResponse('UNAUTHORIZED', message, 401);
}

/**
 * Resposta de proibido (403)
 */
export function forbiddenResponse(
  message: string = 'Você não tem permissão para acessar este recurso.'
): NextResponse {
  return errorResponse('FORBIDDEN', message, 403);
}

/**
 * Resposta de não encontrado (404)
 */
export function notFoundResponse(
  resource: string = 'Recurso',
  id?: string
): NextResponse {
  const message = id
    ? `${resource} com ID "${id}" não encontrado.`
    : `${resource} não encontrado.`;

  return errorResponse('NOT_FOUND', message, 404);
}

/**
 * Resposta de conflito (409)
 */
export function conflictResponse(
  message: string = 'Recurso já existe.'
): NextResponse {
  return errorResponse('CONFLICT', message, 409);
}

/**
 * Resposta de erro interno (500)
 */
export function internalErrorResponse(
  message: string = 'Erro interno do servidor. Tente novamente mais tarde.',
  details?: any
): NextResponse {
  return errorResponse('INTERNAL_ERROR', message, 500, details);
}

/**
 * Resposta com paginação
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function paginatedResponse<T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
  cachePolicy: CachePolicy = 'dynamic'
): NextResponse {
  const responseData = {
    success: true,
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };

  return NextResponse.json(responseData, {
    status: 200,
    headers: {
      ...CACHE_POLICIES[cachePolicy],
      'Vary': 'Accept-Encoding, Authorization',
    },
  });
}
