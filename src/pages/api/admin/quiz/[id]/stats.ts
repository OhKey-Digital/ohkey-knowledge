import type { APIRoute } from 'astro';
import { sql } from '../../../../../lib/db';

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  const [quiz] = await sql`
    SELECT id, title, description, status, questions, published_at, closed_at
    FROM quizzes WHERE id = ${id!}
  `;

  if (!quiz) {
    return new Response(JSON.stringify({ error: 'Quiz no encontrado' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const [totals] = await sql`
    SELECT
      COUNT(*)::int                                    AS total_participants,
      COALESCE(ROUND(AVG(score)::numeric, 1), 0)       AS avg_score,
      COALESCE(ROUND(AVG(time_spent_sec)::numeric, 0), 0) AS avg_time_sec,
      COUNT(*) FILTER (WHERE level = 'Basico')::int    AS level_basico,
      COUNT(*) FILTER (WHERE level = 'Medio')::int     AS level_medio,
      COUNT(*) FILTER (WHERE level = 'Avanzado')::int  AS level_avanzado
    FROM results WHERE quiz_id = ${id!}
  `;

  const answerDist = await sql`
    SELECT
      a.question_id,
      a.selected_answer,
      a.is_correct,
      COUNT(*)::int AS count
    FROM answers a
    JOIN sessions s ON s.id = a.session_id
    WHERE s.quiz_id = ${id!} AND s.completed = TRUE
    GROUP BY a.question_id, a.selected_answer, a.is_correct
    ORDER BY a.question_id, a.selected_answer
  `;

  const scoreDistribution = await sql`
    SELECT
      CASE
        WHEN score >= 80 THEN '80-100'
        WHEN score >= 60 THEN '60-79'
        WHEN score >= 40 THEN '40-59'
        ELSE '0-39'
      END AS range,
      COUNT(*)::int AS count
    FROM results WHERE quiz_id = ${id!}
    GROUP BY range
    ORDER BY range DESC
  `;

  return new Response(JSON.stringify({ quiz, totals, answerDist, scoreDistribution }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
