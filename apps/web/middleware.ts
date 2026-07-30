import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_aqui_para_desenvolvimento';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Ignora chamadas locais de ip, localhost ou URLs do GitHub Codespaces
  let slug = url.searchParams.get('slug') || '';
  
  if (
    !slug &&
    !hostname.startsWith('localhost:') &&
    !hostname.startsWith('127.0.0.1') &&
    !hostname.includes('app.github.dev') &&
    !hostname.includes('githubpreview.dev')
  ) {
    const parts = hostname.split('.');
    if (parts.length >= 2 && parts[0] !== 'www') {
      slug = parts[0];
    }
  }

  // Só injeta novos headers se slug existir, preservando o objeto de requisição original de Server Actions
  let responseOptions: { request: { headers: Headers } } | undefined = undefined;
  if (slug) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-tenant-slug', slug);
    responseOptions = { request: { headers: requestHeaders } };
  }

  // Verifica as rotas god (protegidas)
  if (url.pathname.startsWith('/god')) {
    if (url.pathname === '/god/login') {
      return NextResponse.next(responseOptions);
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

  // Passa adiante com os novos headers injetados se houver slug
  return NextResponse.next(responseOptions);
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
