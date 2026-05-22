import type { APIRoute } from 'astro';
import { sql } from '../../../lib/db';
import { buildFingerprint } from '../../../lib/fingerprint';

export const POST: APIRoute = async ({ request }) => {
  let body: { quizId: string; cookieToken: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Cuerpo inválido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { quizId, cookieToken } = body;
  if (!quizId || !cookieToken) {
    return new Response(JSON.stringify({ error: 'quizId y cookieToken son requeridos' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const fingerprint = await buildFingerprint(request);

  // Triple capa: cookie UUID o fingerprint de dispositivo
  const [existing] = await sql`
    SELECT id, completed
    FROM sessions
    WHERE quiz_id = ${quizId}
      AND (cookie_token = ${cookieToken} OR fingerprint = ${fingerprint})
    LIMIT 1
  `;

  return new Response(JSON.stringify({
    alreadyCompleted: existing?.completed ?? false,
    sessionId: existing?.id ?? null,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
