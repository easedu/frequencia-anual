/**
 * API Route: Suspensions usando Materialized View
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { errorResponse } from '@/app/api/_utils/response';
import { responseWithCache, mvCacheHeaders, MV_CACHE_STRATEGY } from '@/app/api/_utils/cacheHeaders';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const limit = parseInt(searchParams.get('limit') || '50');
    const severity = searchParams.get('severity');
    const studentId = searchParams.get('studentId');

    let query = supabaseAdmin
      .from('suspensions_with_student_info')
      .select('*')
      .order('start_date', { ascending: false })
      .limit(limit);

    if (severity) {
      query = query.eq('severity', severity);
    }

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;

    if (error) {
      return errorResponse('DATABASE_ERROR', error.message, 500);
    }

    return responseWithCache(
      {
        items: data,
        meta: { total: data.length, source: 'materialized_view' }
      },
      MV_CACHE_STRATEGY,
      mvCacheHeaders()
    );

  } catch (error) {
    return errorResponse('INTERNAL_ERROR', error instanceof Error ? error.message : 'Unknown error', 500);
  }
}
