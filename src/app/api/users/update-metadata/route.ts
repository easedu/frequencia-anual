/**
 * API Route: Atualizar metadata do usuário
 *
 * POST /api/users/update-metadata
 * Body: { firebase_uid: string, metadata: object }
 *
 * Atualiza o campo metadata (JSONB) do usuário no Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firebase_uid, metadata } = body;

    if (!firebase_uid) {
      return NextResponse.json(
        { error: 'firebase_uid é obrigatório' },
        { status: 400 }
      );
    }

    if (!metadata || typeof metadata !== 'object') {
      return NextResponse.json(
        { error: 'metadata é obrigatório e deve ser um objeto' },
        { status: 400 }
      );
    }

    // Atualizar metadata do usuário
    // @ts-ignore - Supabase type inference issue with users table
    const result = await supabaseAdmin
      .from('users')
      // @ts-ignore - Type inference issue
      .update({ metadata })
      .eq('firebase_uid', firebase_uid);

    const { error } = result as { error: any };

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar metadata do usuário:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar metadata do usuário' },
      { status: 500 }
    );
  }
}
