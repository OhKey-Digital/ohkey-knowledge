import type { APIRoute } from 'astro';
import { sql } from '../../../../lib/db';

export const GET: APIRoute = async () => {
  const quizzes = await sql`
    SELECT
      q.id,
      q.title,
      q.description,
      q.status,
      q.created_at,
      q.published_at,
      q.closed_at,
      COUNT(r.id)::int AS total_participants
    FROM quizzes q
    LEFT JOIN results r ON r.quiz_id = q.id
    GROUP BY q.id
    ORDER BY q.created_at DESC
  `;

  return new Response(JSON.stringify(quizzes), {
    headers: { 'Content-Type': 'application/json' },
  });
};
