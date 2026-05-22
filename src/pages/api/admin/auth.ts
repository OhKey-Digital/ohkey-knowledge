import type { APIRoute } from 'astro';
import { signJWT } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Cuerpo inválido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (!body.password || body.password !== import.meta.env.ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Contraseña incorrecta' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = await signJWT({ role: 'admin' }, import.meta.env.JWT_SECRET);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `admin_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${24 * 3600}`,
    },
  });
};
