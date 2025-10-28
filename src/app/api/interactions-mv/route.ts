/**
 * API Route: Interactions usando Materialized View
 * Elimina N+1 queries usando interactions_with_student_info
 * ✅ OTIMIZAÇÃO FASE 1: HTTP Cache headers configurados
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { errorResponse } from '@/app/api/_utils/response';
import { responseWithCache, mvCacheHeaders, MV_CACHE_STRATEGY } from '@/app/api/_utils/cacheHeaders';

// Interface para dados da materialized view
interface InteractionWithStudentInfo {
  id: string;
  student_id: string;
  interaction_date: string;
  interaction_type: string;
  description: string;
  created_by: string;
  is_sensitive: boolean;
  created_at: string;
  student_name?: string;
  student_class?: string;
  [key: string]: unknown;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const limit = parseInt(searchParams.get('limit') || '50');
    const cursor = searchParams.get('cursor');
    const studentId = searchParams.get('studentId');
    const interactionType = searchParams.get('type');

    let query = supabaseAdmin
      .from('interactions_with_student_info')
      .select('*')
      .order('interaction_date', { ascending: false })
      .limit(limit + 1);

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    if (interactionType) {
      query = query.eq('interaction_type', interactionType);
    }

    if (cursor) {
      query = query.lt('interaction_date', cursor);
    }

    const result = await query;
    const { data, error } = result as { data: InteractionWithStudentInfo[] | null; error: Error | null };

    if (error) {
      return errorResponse('DATABASE_ERROR', error.message, 500);
    }

    const interactions = data || [];
    const hasNextPage = interactions.length > limit;
    const items = hasNextPage ? interactions.slice(0, limit) : interactions;
    const nextCursor = hasNextPage && items.length > 0 ? items[items.length - 1].interaction_date : null;

    // ✅ OTIMIZAÇÃO FASE 1: Response com cache headers
    return responseWithCache(
      {
        items,
        pagination: { limit, hasNextPage, nextCursor },
        meta: { total: items.length, source: 'materialized_view' }
      },
      MV_CACHE_STRATEGY,
      mvCacheHeaders()
    );

  } catch (error) {
    return errorResponse('INTERNAL_ERROR', error instanceof Error ? error.message : 'Unknown error', 500);
  }
}
