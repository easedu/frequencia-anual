/**
 * API Route: Absences usando Materialized View
 * Elimina N+1 queries usando absences_with_student_info
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { successResponse, errorResponse } from '@/app/api/_utils/response';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Parâmetros de paginação
    const limit = parseInt(searchParams.get('limit') || '50');
    const cursor = searchParams.get('cursor');

    // Filtros
    const bimester = searchParams.get('bimester');
    const studentClass = searchParams.get('class');
    const isJustified = searchParams.get('isJustified');

    // Query na Materialized View (SEM JOIN!)
    let query = supabaseAdmin
      .from('absences_with_student_info')
      .select('*')
      .order('absence_date', { ascending: false })
      .limit(limit + 1); // +1 para detectar hasNextPage

    // Aplicar filtros
    if (bimester) {
      query = query.eq('bimester', parseInt(bimester));
    }

    if (studentClass) {
      query = query.eq('student_class', studentClass);
    }

    if (isJustified !== null && isJustified !== undefined) {
      query = query.eq('is_justified', isJustified === 'true');
    }

    // Cursor-based pagination
    if (cursor) {
      query = query.lt('absence_date', cursor);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[API absences-mv] Supabase error:', error);
      return errorResponse('DATABASE_ERROR', error.message, 500);
    }

    // Detectar se há próxima página
    const hasNextPage = data.length > limit;
    const items = hasNextPage ? data.slice(0, limit) : data;
    const nextCursor = hasNextPage ? items[items.length - 1].absence_date : null;

    // ✅ OTIMIZAÇÃO Fase 1: Response com HTTP Cache headers
    return NextResponse.json(
      {
        success: true,
        data: {
          items,
          pagination: {
            limit,
            hasNextPage,
            nextCursor
          },
          meta: {
            total: items.length,
            source: 'materialized_view', // Indicador de que usa MV
            timestamp: new Date().toISOString(),
          }
        }
      },
      {
        status: 200,
        headers: {
          // ✅ HTTP Cache headers (5 min cache + 10 min stale)
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'Vary': 'Accept-Encoding, Authorization',
          'X-Source': 'materialized_view',
        },
      }
    );

  } catch (error) {
    console.error('[API absences-mv] Error:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}

// Metadata para documentação
export const metadata = {
  description: 'Absences API usando Materialized View (sem N+1 queries)',
  performance: {
    expected: '50-200ms',
    improvement: '5-10x mais rápido que JOIN manual'
  }
};
