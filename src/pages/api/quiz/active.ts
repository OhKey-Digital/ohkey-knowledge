import type { APIRoute } from 'astro';
import { sql } from '../../../lib/db';

export const GET: APIRoute = async () => {
  // Devuelve las preguntas CON correctAnswer para feedback inmediato en el cliente
  const [quiz] = await sql`
    SELECT id, title, description, questions, answers_key, published_at
    FROM quizzes
    WHERE status = 'published'
    ORDER BY published_at DESC
    LIMIT 1
  `;

  if (!quiz) {
    return new Response(JSON.stringify({ quiz: null }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Combinar questions con answers_key para enviar correctAnswer al cliente
  const questions = (typeof quiz.questions === 'string' ? JSON.parse(quiz.questions) : quiz.questions) as Array<Record<string, unknown>>;
  const answersKey = (typeof quiz.answers_key === 'string' ? JSON.parse(quiz.answers_key) : quiz.answers_key) as Record<string, string>;

  const fullQuestions = questions.map((q: Record<string, unknown>) => ({
    ...q,
    correctAnswer: answersKey[q.id as string],
  }));

  return new Response(JSON.stringify({
    quiz: {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      published_at: quiz.published_at,
      questions: fullQuestions,
    }
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
