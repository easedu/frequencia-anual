/**
 * API Route: Buscar usuário por Firebase UID
 *
 * GET /api/users/by-firebase-uid?firebase_uid=xxx
 *
 * Resolve problema de CORS ao mover requisições Supabase para o servidor
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    // Aceitar 'uid' ou 'firebase_uid'
    const firebaseUid = request.nextUrl.searchParams.get('uid') ||
                        request.nextUrl.searchParams.get('firebase_uid');

    if (!firebaseUid) {
      return NextResponse.json(
        { error: 'uid ou firebase_uid é obrigatório' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
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

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page: 1,
        limit: 1,
        total: data ? 1 : 0,
        totalPages: data ? 1 : 0
      }
    });
  } catch (error) {
    console.error('Erro ao buscar usuário por Firebase UID:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar usuário' },
      { status: 500 }
    );
  }
}
