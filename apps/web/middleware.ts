import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_aqui_para_desenvolvimento';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // 1. Extração de slug com suporte a multi-nível (*.portal.ericksantana.dev.br), IPs e porta
  let slug = url.searchParams.get('slug') || '';

  if (!slug) {
    const hostWithoutPort = (hostname ? hostname.split(':')[0] || '' : '').toLowerCase().trim();

    const isLocalOrDev =
      hostWithoutPort === 'localhost' ||
      hostWithoutPort === '127.0.0.1' ||
      hostWithoutPort.includes('app.github.dev') ||
      hostWithoutPort.includes('githubpreview.dev');

    const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostWithoutPort);

    if (!isLocalOrDev && !isIpAddress) {
      const configuredRootDomain = process.env.ROOT_DOMAIN?.toLowerCase().trim();
      const baseDomain = configuredRootDomain || 'portal.ericksantana.dev.br';

      if (hostWithoutPort === baseDomain || hostWithoutPort === `www.${baseDomain}`) {
        // Domínio raiz sem subdomínio de tenant
        slug = '';
      } else if (hostWithoutPort.endsWith(`.${baseDomain}`)) {
        // Ex: curso1.portal.ericksantana.dev.br -> extrai "curso1"
        const sub = hostWithoutPort.slice(0, -(baseDomain.length + 1));
        const subParts = sub.split('.').filter(p => p !== 'www');
        slug = subParts[subParts.length - 1] || '';
      } else {
        // Fallback para outros domínios com subdomínio (ex: curso.meudominio.com.br)
        const parts = hostWithoutPort.split('.');
        const isBrDomain = parts.length >= 3 && parts[parts.length - 1] === 'br';
        const rootPartsCount = isBrDomain ? 3 : 2;

        if (parts.length > rootPartsCount) {
          const subdomains = parts.slice(0, parts.length - rootPartsCount).filter(p => p !== 'www');
          const portalIndex = subdomains.indexOf('portal');
          if (portalIndex > 0) {
            slug = subdomains[portalIndex - 1] || '';
          } else if (portalIndex === 0 && subdomains.length === 1) {
            slug = '';
          } else if (subdomains.length > 0) {
            slug = subdomains[0] || '';
          }
        }
      }
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
