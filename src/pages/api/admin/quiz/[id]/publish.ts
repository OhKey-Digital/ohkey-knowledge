import type { APIRoute } from 'astro';
import { sql } from '../../../../../lib/db';

export const PUT: APIRoute = async ({ params }) => {
  const { id } = params;

  // Cierra cualquier quiz publicado actualmente
  await sql`UPDATE quizzes SET status = 'closed', closed_at = NOW() WHERE status = 'published'`;

  const [quiz] = await sql`
    UPDATE quizzes
    SET status = 'published', published_at = NOW()
    WHERE id = ${id!} AND status = 'draft'
    RETURNING id, title, status, published_at
  `;

  if (!quiz) {
    return new Response(JSON.stringify({ error: 'Quiz no encontrado o ya fue publicado' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify(quiz), { headers: { 'Content-Type': 'application/json' } });
};
