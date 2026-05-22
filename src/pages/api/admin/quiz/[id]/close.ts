import type { APIRoute } from 'astro';
import { sql } from '../../../../../lib/db';

export const PUT: APIRoute = async ({ params }) => {
  const { id } = params;

  const [quiz] = await sql`
    UPDATE quizzes
    SET status = 'closed', closed_at = NOW()
    WHERE id = ${id!} AND status = 'published'
    RETURNING id, title, status, closed_at
  `;

  if (!quiz) {
    return new Response(JSON.stringify({ error: 'Quiz no encontrado o no está publicado' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify(quiz), { headers: { 'Content-Type': 'application/json' } });
};
