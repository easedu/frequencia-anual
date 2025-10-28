/**
 * Middleware de Validação
 *
 * Valida body, query params e params com schemas Zod
 *
 * @example
 * ```typescript
 * export const POST = withAuth(
 *   withValidation(createStudentSchema, async (req, userId, data) => {
 *     // data é tipado e validado
 *   })
 * );
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodSchema } from 'zod';
import { validationErrorResponse } from '../_utils/response';

export type ValidatedHandler<T> = (
  req: NextRequest,
  userId: string,
  data: T
) => Promise<NextResponse>;

/**
 * Valida o body da requisição com schema Zod
 */
export function withValidation<T>(
  schema: ZodSchema<T>,
  handler: ValidatedHandler<T>
) {
  return async (req: NextRequest, userId: string): Promise<NextResponse> => {
    try {
      // 1. Parse body
      const body = await req.json();

      // 2. Validar com Zod
      const validation = schema.safeParse(body);

      if (!validation.success) {
        return validationErrorResponse(validation.error.errors);
      }

      // 3. Executar handler com dados validados
      return await handler(req, userId, validation.data);
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid JSON',
            message: 'Corpo da requisição não é um JSON válido.',
          },
          { status: 400 }
        );
      }

      throw error;
    }
  };
}

/**
 * Valida query params com schema Zod
 */
export function validateQueryParams<T = unknown>(
  req: NextRequest,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>
): { success: true; data: T } | { success: false; response: NextResponse } {
  const { searchParams } = new URL(req.url);

  // Converter URLSearchParams para objeto
  const params: Record<string, string | null> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  // Validar
  const validation = schema.safeParse(params);

  if (!validation.success) {
    return {
      success: false,
      response: validationErrorResponse(validation.error.errors),
    };
  }

  return {
    success: true,
    data: validation.data,
  };
}

/**
 * Sanitiza string (remove tags HTML e caracteres perigosos)
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < e >
    .replace(/javascript:/gi, '') // Remove javascript:
    .replace(/on\w+=/gi, ''); // Remove event handlers (onclick=, etc)
}

/**
 * Sanitiza objeto recursivamente
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'string'
          ? sanitizeString(item)
          : typeof item === 'object' && item !== null
          ? sanitizeObject(item as Record<string, unknown>)
          : item
      );
    } else {
      result[key] = value;
    }
  }

  return result as T;
}
