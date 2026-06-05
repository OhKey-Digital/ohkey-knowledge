import type { APIRoute } from 'astro';
import { sql } from '../../../../lib/db';

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  const [student] = await sql`
    SELECT id, full_name, name_key, created_at
    FROM students WHERE id = ${id!}
  `;

  if (!student) {
    return new Response(JSON.stringify({ error: 'Estudiante no encontrado' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const [stats] = await sql`
    SELECT
      COUNT(r.id)::int                               AS total_attempts,
      COALESCE(ROUND(AVG(r.score)::numeric, 1), 0)  AS avg_score
    FROM results r
    JOIN sessions s ON s.id = r.session_id
    WHERE s.student_id = ${id!}
  `;

  const attempts = await sql`
    SELECT
      r.session_id,
      q.id    AS quiz_id,
      q.title AS quiz_title,
      r.score,
      r.level,
      r.correct_answers,
      r.total_questions,
      r.time_spent_sec,
      r.completed_at
    FROM results r
    JOIN sessions s ON s.id = r.session_id
    JOIN quizzes  q ON q.id = r.quiz_id
    WHERE s.student_id = ${id!}
    ORDER BY r.completed_at DESC
  `;

  return new Response(JSON.stringify({ student, stats, attempts }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
