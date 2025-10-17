/**
 * Utilitários de Resposta Padronizada
 *
 * Fornece funções para criar respostas consistentes em todas as API Routes
 */

import { NextResponse } from 'next/server';

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
 * @param message - Mensagem de sucesso (opcional)
 * @param status - Status HTTP (padrão: 200)
 *
 * @example
 * ```typescript
 * return successResponse({ student: newStudent }, 'Estudante criado', 201);
 * ```
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse {
  const response: SuccessResponse<T> = {
    success: true,
    data,
  };

  if (message) {
    response.message = message;
  }

  return NextResponse.json(response, { status });
}

/**
 * Resposta de erro padronizada
 *
 * @param error - Tipo do erro
 * @param message - Mensagem de erro descritiva
 * @param status - Status HTTP (padrão: 400)
 * @param details - Detalhes adicionais (opcional)
 *
 * @example
 * ```typescript
 * return errorResponse('NOT_FOUND', 'Estudante não encontrado', 404);
 * ```
 */
export function errorResponse(
  error: string,
  message?: string,
  status: number = 400,
  details?: any
): NextResponse {
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
  items: T[];
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
  message?: string
): NextResponse {
  const data: PaginatedResponse<T> = {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };

  return successResponse(data, message);
}
