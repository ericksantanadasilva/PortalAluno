'use server';

import { cookies } from 'next/headers';
import { prisma } from '@repo/database';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_aqui_para_desenvolvimento';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function godLoginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Preencha todos os campos.' };
  }

  try {
    // Busca o usuário. Como é god, podemos buscar só por email se for único no sistema,
    // mas o ideal é garantir que tenha a role super_admin.
    const user = await prisma.user.findFirst({
      where: { email }
    });

    if (!user || user.role !== 'super_admin') {
      return { error: 'Credenciais inválidas ou sem permissão.' };
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return { error: 'Credenciais inválidas ou sem permissão.' };
    }

    // Gerar o JWT com jose
    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      role: user.role
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(secretKey);

    // Salvar no Cookie (HTTP-Only)
    const cookieStore = await cookies();
    cookieStore.set('god_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 horas
    });

    return { success: true };
  } catch (err) {
    console.error('Erro no login god:', err);
    return { error: 'Ocorreu um erro interno. Tente novamente.' };
  }
}

export async function godLogoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('god_token');
}
