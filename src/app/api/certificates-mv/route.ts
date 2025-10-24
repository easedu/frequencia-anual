/**
 * API Route: Medical Certificates usando Materialized View
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { successResponse, errorResponse } from '@/app/api/_utils/response';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const studentId = searchParams.get('studentId');

    let query = supabaseAdmin
      .from('certificates_with_student_info')
      .select('*')
      .order('submitted_date', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;

    if (error) {
      return errorResponse('DATABASE_ERROR', error.message, 500);
    }

    return responseWithCache({
      items: data,
      meta: { total: data.length, source: 'materialized_view' }
    , MV_CACHE_STRATEGY, mvCacheHeaders());

  } catch (error) {
    return errorResponse('INTERNAL_ERROR', error instanceof Error ? error.message : 'Unknown error', 500);
  }
}
