import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_aqui_para_desenvolvimento';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request: NextRequest) {
  // Se a rota for /god/login, deixamos passar livremente.
  if (request.nextUrl.pathname === '/god/login') {
    return NextResponse.next();
  }

  // Verifica o cookie god_token
  const token = request.cookies.get('god_token')?.value;

  if (!token) {
    // Sem token, manda pro login do god mode
    return NextResponse.redirect(new URL('/god/login', request.url));
  }

  try {
    // Valida o JWT usando jose
    const { payload } = await jwtVerify(token, secretKey);

    // O payload foi validado. Confirmamos se é super admin
    if (payload.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/god/login', request.url));
    }

    // Acesso permitido!
    return NextResponse.next();
  } catch (error) {
    // Token expirado, inválido ou malformado
    const response = NextResponse.redirect(new URL('/god/login', request.url));
    // Limpamos o cookie inválido para não causar loop infinito de erros
    response.cookies.delete('god_token');
    return response;
  }
}

// Configura o middleware para rodar apenas nas rotas necessárias
export const config = {
  matcher: ['/god/:path*'],
};
