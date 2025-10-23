/**
 * API Route: Interactions usando Materialized View
 * Elimina N+1 queries usando interactions_with_student_info
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { successResponse, errorResponse } from '@/app/api/_utils/response';

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

    const { data, error } = await query;

    if (error) {
      return errorResponse('DATABASE_ERROR', error.message, 500);
    }

    const hasNextPage = data.length > limit;
    const items = hasNextPage ? data.slice(0, limit) : data;
    const nextCursor = hasNextPage ? items[items.length - 1].interaction_date : null;

    return successResponse({
      items,
      pagination: { limit, hasNextPage, nextCursor },
      meta: { total: items.length, source: 'materialized_view' }
    });

  } catch (error) {
    return errorResponse('INTERNAL_ERROR', error instanceof Error ? error.message : 'Unknown error', 500);
  }
}
