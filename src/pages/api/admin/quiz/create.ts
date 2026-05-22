import type { APIRoute } from 'astro';
import { sql } from '../../../../lib/db';
import type { Question, AnswerKey } from '../../../../types/quiz';

export const POST: APIRoute = async ({ request }) => {
  let body: { title: string; description?: string; questions: Question[] };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Cuerpo inválido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { title, description, questions } = body;

  if (!title?.trim() || !Array.isArray(questions) || questions.length === 0) {
    return new Response(JSON.stringify({ error: 'Título y preguntas son requeridos' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Separar respuestas correctas de las preguntas públicas
  const answersKey: Record<string, AnswerKey> = {};
  const publicQuestions = questions.map(q => {
    answersKey[q.id] = q.correctAnswer;
    const { correctAnswer: _, ...pub } = q;
    return pub;
  });

  const [quiz] = await sql`
    INSERT INTO quizzes (title, description, questions, answers_key)
    VALUES (
      ${title.trim()},
      ${description?.trim() ?? ''},
      ${JSON.stringify(publicQuestions)},
      ${JSON.stringify(answersKey)}
    )
    RETURNING id, title, status, created_at
  `;

  return new Response(JSON.stringify(quiz), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
