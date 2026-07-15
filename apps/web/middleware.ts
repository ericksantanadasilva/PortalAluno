import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_aqui_para_desenvolvimento';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Ignora chamadas locais de ip ou localhost sem subdomínio
  let slug = '';
  // Expressão regular para pegar a parte do subdomínio: ex "teste.localhost:3000" ou "teste.meudominio.com"
  // Considera o primeiro fragmento antes do primeiro ponto, ignorando 'www'.
  if (!hostname.startsWith('localhost:') && !hostname.startsWith('127.0.0.1')) {
    const parts = hostname.split('.');
    if (parts.length >= 2 && parts[0] !== 'www') {
      slug = parts[0];
    }
  }

  // Clona os headers da requisição original para podermos injetar o slug
  const requestHeaders = new Headers(request.headers);
  if (slug) {
    requestHeaders.set('x-tenant-slug', slug);
  }

  // Verifica as rotas god (protegidas)
  if (url.pathname.startsWith('/god')) {
    if (url.pathname === '/god/login') {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    const token = request.cookies.get('god_token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/god/login', request.url));
    }

    try {
      const { payload } = await jwtVerify(token, secretKey);
      if (payload.role !== 'super_admin') {
        return NextResponse.redirect(new URL('/god/login', request.url));
      }
    } catch (error) {
      const response = NextResponse.redirect(new URL('/god/login', request.url));
      response.cookies.delete('god_token');
      return response;
    }
  }

  // Passa adiante com os novos headers injetados
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    }
  });
}

// Configura o middleware para rodar em todas as rotas (menos arquivos estáticos)
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
