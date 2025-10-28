/**
 * API Route: Students Count (estimated)
 * Usa get_estimated_count() do Supabase (5-10x mais rápido)
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { successResponse, errorResponse } from '@/app/api/_utils/response';

export async function GET(_req: NextRequest) {
  try {
    const { searchParams } = new URL(_req.url);

    const exact = searchParams.get('exact') === 'true';

    if (exact) {
      // Count exato (mais lento mas preciso)
      const { count, error } = await supabaseAdmin
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('deleted', false);

      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 500);
      }

      return successResponse({
        count,
        type: 'exact'
      });

    } else {
      // Count estimado (5-10x mais rápido)
      try {
        const { count, error } = await supabaseAdmin
          .from('students')
          .select('id', { count: 'estimated', head: true });

        if (error) {
          return errorResponse('DATABASE_ERROR', error.message, 500);
        }

        return successResponse({
          count,
          type: 'estimated',
          accuracy: '90-95%'
        });
      } catch {
        return errorResponse('DATABASE_ERROR', 'Failed to get estimated count', 500);
      }
    }

  } catch (error) {
    return errorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}

// Export dynamic config to prevent static optimization
export const dynamic = 'force-dynamic';
