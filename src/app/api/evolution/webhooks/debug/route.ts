/**
 * API Route: Debug de Webhooks da Evolution API
 *
 * @route POST /api/evolution/webhooks/debug
 * @description Endpoint de debug que loga TUDO que recebe
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Logar TUDO no console
    console.log('='.repeat(80));
    console.log('🔍 WEBHOOK RECEBIDO:', new Date().toISOString());
    console.log('='.repeat(80));
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    console.log('Body completo:', JSON.stringify(body, null, 2));
    console.log('='.repeat(80));

    return NextResponse.json({
      success: true,
      message: 'Debug webhook recebido',
      received: body
    });

  } catch (error) {
    console.error('❌ Erro ao processar debug webhook:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: '/api/evolution/webhooks/debug',
    description: 'Endpoint de debug para webhooks da Evolution API',
    timestamp: new Date().toISOString()
  });
}
