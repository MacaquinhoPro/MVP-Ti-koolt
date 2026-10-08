import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_ROL } from '@/lib/sesion';

export async function POST(req: Request) {
  const { rol } = await req.json();
  const valor = rol === 'mostrador' ? 'mostrador' : 'admin';
  const c = await cookies();
  c.set(COOKIE_ROL, valor, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return NextResponse.json({ ok: true, rol: valor });
}
