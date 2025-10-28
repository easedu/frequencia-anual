/**
 * API Route: Atualizar usuário
 *
 * PUT /api/users/update
 * Body: { firebase_uid: string, updates: object }
 *
 * Resolve problema de CORS ao mover requisições Supabase para o servidor
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';


export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { firebase_uid, updates } = body;

    if (!firebase_uid) {
      return NextResponse.json(
        { error: 'firebase_uid é obrigatório' },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'updates é obrigatório e deve ser um objeto' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update(updates as never)
      .eq('firebase_uid', firebase_uid);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar usuário' },
      { status: 500 }
    );
  }
}
