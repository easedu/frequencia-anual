/**
 * API Route: Buscar usuário por Email
 *
 * GET /api/users/by-email?email=xxx@exemplo.com
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
    const email = request.nextUrl.searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'email é obrigatório' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ data: null });
      }
      throw error;
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Erro ao buscar usuário por email:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar usuário' },
      { status: 500 }
    );
  }
}
