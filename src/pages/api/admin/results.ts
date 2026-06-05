import type { APIRoute } from 'astro';
import { sql } from '../../../lib/db';
import { normalizeName } from '../../../lib/validators';

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get('q')?.trim() ?? '';

  let rows;

  if (q) {
    const nameKey = `%${normalizeName(q)}%`;
    rows = await sql`
      SELECT
        r.session_id,
        r.score,
        r.level,
        r.correct_answers,
        r.total_questions,
        r.time_spent_sec,
        r.completed_at,
        q.id              AS quiz_id,
        q.title           AS quiz_title,
        s.student_id,
        COALESCE(st.full_name, 'Anónimo') AS student_name
      FROM results r
      JOIN sessions s  ON s.id  = r.session_id
      JOIN quizzes  q  ON q.id  = r.quiz_id
      LEFT JOIN students st ON st.id = s.student_id
      WHERE st.name_key ILIKE ${nameKey}
      ORDER BY r.completed_at DESC
    `;
  } else {
    rows = await sql`
      SELECT
        r.session_id,
        r.score,
        r.level,
        r.correct_answers,
        r.total_questions,
        r.time_spent_sec,
        r.completed_at,
        q.id              AS quiz_id,
        q.title           AS quiz_title,
        s.student_id,
        COALESCE(st.full_name, 'Anónimo') AS student_name
      FROM results r
      JOIN sessions s  ON s.id  = r.session_id
      JOIN quizzes  q  ON q.id  = r.quiz_id
      LEFT JOIN students st ON st.id = s.student_id
      ORDER BY r.completed_at DESC
    `;
  }

  return new Response(JSON.stringify(rows), {
    headers: { 'Content-Type': 'application/json' },
  });
};
