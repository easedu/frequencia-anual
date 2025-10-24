/**
 * API Route: /api/admin/materialized-views
 *
 * FASE 2 - OTIMIZAÇÃO: Monitoramento de Materialized Views
 *
 * Endpoints:
 * - GET: Obter metadata e estatísticas das MVs
 * - POST: Forçar refresh manual de todas as MVs
 *
 * Requer: Autenticação (admin apenas)
 *
 * @example
 * ```bash
 * # Ver estatísticas
 * curl -H "Authorization: Bearer $TOKEN" \
 *   http://localhost:3000/api/admin/materialized-views
 *
 * # Forçar refresh manual
 * curl -X POST \
 *   -H "Authorization: Bearer $TOKEN" \
 *   http://localhost:3000/api/admin/materialized-views/refresh
 * ```
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/app/api/_middleware/auth';
import { successResponse, errorResponse } from '@/app/api/_utils/response';
import { handleError } from '@/app/api/_utils/errorHandler';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// ============================================================================
// GET /api/admin/materialized-views - Metadata das MVs
// ============================================================================

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    // Chamar função SQL que retorna metadata de todas as MVs
    const { data, error } = (await supabaseAdmin.rpc('get_mv_metadata')) as {
      data: any;
      error: any;
    };

    if (error) {
      console.error('[GET /api/admin/materialized-views] Supabase error:', error);
      return errorResponse('DATABASE_ERROR', 'Erro ao buscar metadata de MVs', 500);
    }

    // Formatar resposta
    const views = (data || []).map((view: any) => ({
      viewName: view.view_name,
      rowCount: view.row_count || 0,
      totalSize: view.total_size || '0 bytes',
      lastRefresh: view.last_refresh || null,
    }));

    return successResponse({
      views,
      totalViews: views.length,
      lastChecked: new Date().toISOString(),
    });
  } catch (error) {
    return handleError(error, 'GET /api/admin/materialized-views');
  }
});

// ============================================================================
// POST /api/admin/materialized-views/refresh - Forçar refresh manual
// ============================================================================

// Nota: Para evitar conflito de rotas, vamos usar query param ?action=refresh
// ao invés de criar /api/admin/materialized-views/refresh/route.ts
export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    console.info('[POST /api/admin/materialized-views] Iniciando refresh manual de MVs');

    // Chamar função SQL que atualiza todas as MVs e retorna métricas
    const { data, error } = (await supabaseAdmin.rpc('refresh_all_materialized_views')) as {
      data: any;
      error: any;
    };

    if (error) {
      console.error('[POST /api/admin/materialized-views] Supabase error:', error);
      return errorResponse('DATABASE_ERROR', 'Erro ao atualizar MVs', 500);
    }

    // Formatar resposta com métricas de performance
    const results = (data || []).map((result: any) => ({
      viewName: result.view_name,
      refreshTime: result.refresh_time,
      durationMs: result.duration_ms,
    }));

    const totalDuration = results.reduce((sum: number, r: any) => sum + (r.durationMs || 0), 0);

    console.info(
      `[POST /api/admin/materialized-views] ✅ Refresh concluído em ${totalDuration}ms`
    );

    return successResponse({
      message: 'Materialized views atualizadas com sucesso',
      results,
      totalDuration,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleError(error, 'POST /api/admin/materialized-views');
  }
});

// ============================================================================
// DELETE: Não permitido (MVs são permanentes)
// ============================================================================

export const DELETE = withAuth(async (req: NextRequest, userId: string) => {
  return errorResponse(
    'METHOD_NOT_ALLOWED',
    'DELETE não é permitido. Materialized Views são permanentes.',
    405
  );
});

// ============================================================================
// PUT: Não permitido (use POST para refresh)
// ============================================================================

export const PUT = withAuth(async (req: NextRequest, userId: string) => {
  return errorResponse(
    'METHOD_NOT_ALLOWED',
    'PUT não é permitido. Use POST para refresh manual.',
    405
  );
});

// ============================================================================
// RESPONSE EXAMPLES
// ============================================================================

/**
 * GET /api/admin/materialized-views
 *
 * Response 200 OK:
 * {
 *   "success": true,
 *   "data": {
 *     "views": [
 *       {
 *         "viewName": "absences_with_student_info",
 *         "rowCount": 5432,
 *         "totalSize": "512 kB",
 *         "lastRefresh": "2025-10-24T02:00:00.000Z"
 *       },
 *       {
 *         "viewName": "interactions_with_student_info",
 *         "rowCount": 823,
 *         "totalSize": "128 kB",
 *         "lastRefresh": "2025-10-24T02:00:00.000Z"
 *       },
 *       {
 *         "viewName": "tasks_with_student_info",
 *         "rowCount": 312,
 *         "totalSize": "64 kB",
 *         "lastRefresh": "2025-10-24T02:00:00.000Z"
 *       },
 *       {
 *         "viewName": "certificates_with_student_info",
 *         "rowCount": 98,
 *         "totalSize": "32 kB",
 *         "lastRefresh": "2025-10-24T02:00:00.000Z"
 *       },
 *       {
 *         "viewName": "suspensions_with_student_info",
 *         "rowCount": 45,
 *         "totalSize": "16 kB",
 *         "lastRefresh": "2025-10-24T02:00:00.000Z"
 *       }
 *     ],
 *     "totalViews": 5,
 *     "lastChecked": "2025-10-24T02:05:00.000Z"
 *   }
 * }
 */

/**
 * POST /api/admin/materialized-views
 *
 * Response 200 OK:
 * {
 *   "success": true,
 *   "data": {
 *     "message": "Materialized views atualizadas com sucesso",
 *     "results": [
 *       { "viewName": "absences_with_student_info", "refreshTime": "2025-10-24T02:10:00.000Z", "durationMs": 250 },
 *       { "viewName": "interactions_with_student_info", "refreshTime": "2025-10-24T02:10:00.250Z", "durationMs": 120 },
 *       { "viewName": "tasks_with_student_info", "refreshTime": "2025-10-24T02:10:00.370Z", "durationMs": 80 },
 *       { "viewName": "certificates_with_student_info", "refreshTime": "2025-10-24T02:10:00.450Z", "durationMs": 45 },
 *       { "viewName": "suspensions_with_student_info", "refreshTime": "2025-10-24T02:10:00.495Z", "durationMs": 30 }
 *     ],
 *     "totalDuration": 525,
 *     "refreshedAt": "2025-10-24T02:10:00.500Z"
 *   }
 * }
 */
