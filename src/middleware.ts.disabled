import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rotas que não precisam de autenticação
const PUBLIC_ROUTES = ['/', '/login'];

// Rotas que precisam de autenticação
const PROTECTED_ROUTES = [
  '/home',
  '/marcar-faltas',
  '/controlar-faltas',
  '/cadastrar-estudante',
  '/cadastrar-ano-letivo',
  '/relatorio-bolsa-familia',
  '/perfil-estudante',
  '/perfil-deficiente',
  '/prova-sao-paulo',
  '/gerenciar-usuarios',
  '/admin'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Permitir arquivos estáticos e API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/sw.js') ||
    pathname.startsWith('/manifest.json') ||
    pathname.includes('.') // arquivos com extensão
  ) {
    return NextResponse.next();
  }

  // Verificar se é uma rota protegida
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );
  
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // Para rotas protegidas, deixar o AuthProvider handle a autenticação
  // O middleware serve principalmente para documentar as rotas
  
  console.log(`🛡️ Middleware: ${pathname} - ${isProtectedRoute ? 'PROTECTED' : isPublicRoute ? 'PUBLIC' : 'UNKNOWN'}`);
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.json).*)',
  ],
};