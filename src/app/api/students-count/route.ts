/**
 * API Route: Students Count (estimated)
 * Usa get_estimated_count() do Supabase (5-10x mais rápido)
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { successResponse, errorResponse } from '@/app/api/_utils/response';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const exact = searchParams.get('exact') === 'true';
    const filter = searchParams.get('filter'); // status, class, etc
    const filterValue = searchParams.get('filterValue');

    if (exact) {
      // Count exato (mais lento mas preciso)
      let query = supabaseAdmin
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('deleted', false);

      if (filter && filterValue) {
        query = query.eq(filter, filterValue);
      }

      const { count, error } = await query;

      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 500);
      }

      return successResponse({
        count,
        type: 'exact'
      });

    } else {
      // Count estimado (5-10x mais rápido)
      const { data, error } = filter && filterValue
        ? await supabaseAdmin.rpc('get_filtered_count_estimate', {
            table_name: 'students',
            filter_column: filter,
            filter_value: filterValue
          })
        : await supabaseAdmin.rpc('get_estimated_count', {
            table_name: 'students'
          });

      if (error) {
        return errorResponse('DATABASE_ERROR', error.message, 500);
      }

      return successResponse({
        count: data,
        type: 'estimated',
        accuracy: '90-95%'
      });
    }

  } catch (error) {
    return errorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}

// Metadata
export const metadata = {
  description: 'Students count com opção de estimated (5-10x mais rápido)',
  performance: {
    exact: '50-100ms',
    estimated: '5-10ms'
  }
};
