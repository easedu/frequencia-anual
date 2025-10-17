/**
 * API Route: Proxy para Supabase
 *
 * Intercepta TODAS as requisições ao Supabase e as faz pelo servidor
 * Resolve definitivamente problemas de QUIC/HTTP3/CORS
 *
 * Uso:
 * Frontend: GET /api/supabase-proxy?path=/rest/v1/students&select=*
 * Backend: Faz GET https://xccjifrggpgevqftwdkx.supabase.co/rest/v1/students?select=*
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return handleProxy(request, 'GET');
}

export async function POST(request: NextRequest) {
  return handleProxy(request, 'POST');
}

export async function PUT(request: NextRequest) {
  return handleProxy(request, 'PUT');
}

export async function PATCH(request: NextRequest) {
  return handleProxy(request, 'PATCH');
}

export async function DELETE(request: NextRequest) {
  return handleProxy(request, 'DELETE');
}

async function handleProxy(request: NextRequest, method: string) {
  try {
    const path = request.nextUrl.searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { error: 'path query parameter is required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    // Construir URL completa
    const targetUrl = new URL(path, supabaseUrl);

    // Copiar todos os query params exceto 'path'
    request.nextUrl.searchParams.forEach((value, key) => {
      if (key !== 'path') {
        targetUrl.searchParams.append(key, value);
      }
    });

    // Preparar headers
    const headers: HeadersInit = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };

    // Copiar alguns headers da requisição original
    const contentType = request.headers.get('content-type');
    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    const prefer = request.headers.get('prefer');
    if (prefer) {
      headers['Prefer'] = prefer;
    }

    // Preparar body (se POST/PUT/PATCH)
    let body: string | undefined;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        const requestBody = await request.json();
        body = JSON.stringify(requestBody);
      } catch {
        // Body vazio ou inválido
        body = undefined;
      }
    }

    console.log(`🔄 Proxy ${method} ${targetUrl.pathname}${targetUrl.search}`);

    // Fazer requisição ao Supabase via servidor
    const response = await fetch(targetUrl.toString(), {
      method,
      headers,
      body,
      // @ts-ignore - Force HTTP/1.1
      cache: 'no-store',
    });

    // Obter resposta
    const data = await response.text();

    // Copiar headers importantes da resposta
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', response.headers.get('content-type') || 'application/json');

    const contentRange = response.headers.get('content-range');
    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange);
    }

    return new NextResponse(data, {
      status: response.status,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('❌ Proxy error:', error);
    return NextResponse.json(
      { error: 'Proxy request failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
