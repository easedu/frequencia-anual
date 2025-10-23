/**
 * API Route: Listar todos os usuários ativos
 *
 * GET /api/users/all-active
 *
 * Resolve problema de CORS ao mover requisições Supabase para o servidor
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 🚀 PAGINAÇÃO PROGRESSIVA
    const { data, error, count } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true })
      .range(from, to);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao listar usuários' },
      { status: 500 }
    );
  }
}
