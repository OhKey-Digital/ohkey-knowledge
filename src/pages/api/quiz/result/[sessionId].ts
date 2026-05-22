import type { APIRoute } from 'astro';
import { sql } from '../../../../lib/db';

export const GET: APIRoute = async ({ params }) => {
  const { sessionId } = params;

  const [result] = await sql`
    SELECT
      r.id,
      r.score,
      r.level,
      r.correct_answers,
      r.total_questions,
      r.time_spent_sec,
      r.completed_at,
      q.title AS quiz_title,
      q.questions
    FROM results r
    JOIN sessions s ON s.id = r.session_id
    JOIN quizzes q ON q.id = r.quiz_id
    WHERE r.session_id = ${sessionId!}
  `;

  if (!result) {
    return new Response(JSON.stringify({ error: 'Resultado no encontrado' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const answers = await sql`
    SELECT question_id, selected_answer, is_correct, time_spent_ms
    FROM answers WHERE session_id = ${sessionId!}
    ORDER BY answered_at ASC
  `;

  return new Response(JSON.stringify({ result, answers }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
