/**
 * API Route: Buscar usuário por Firebase UID
 *
 * GET /api/users/by-firebase-uid?firebase_uid=xxx
 *
 * Resolve problema de CORS ao mover requisições Supabase para o servidor
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const firebaseUid = request.nextUrl.searchParams.get('firebase_uid');

    if (!firebaseUid) {
      return NextResponse.json(
        { error: 'firebase_uid é obrigatório' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('firebase_uid', firebaseUid)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ data: null });
      }
      throw error;
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Erro ao buscar usuário por Firebase UID:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar usuário' },
      { status: 500 }
    );
  }
}
