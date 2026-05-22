import type { APIRoute } from 'astro';
import { sql } from '../../../lib/db';
import { buildFingerprint } from '../../../lib/fingerprint';
import { determineLevel } from '../../../lib/quizLogic';
import type { AnswerKey } from '../../../types/quiz';

interface SubmitBody {
  quizId: string;
  cookieToken: string;
  answers: Array<{ questionId: string; selectedAnswer: AnswerKey | null; timeSpentMs: number }>;
  timeSpentSec: number;
}

export const POST: APIRoute = async ({ request }) => {
  let body: SubmitBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Cuerpo inválido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { quizId, cookieToken, answers, timeSpentSec } = body;

  if (!quizId || !cookieToken || !Array.isArray(answers) || answers.length === 0) {
    return new Response(JSON.stringify({ error: 'Datos incompletos' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const fingerprint = await buildFingerprint(request);
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  // Verificar que no exista una sesión completada
  const [dup] = await sql`
    SELECT id FROM sessions
    WHERE quiz_id = ${quizId} AND completed = TRUE
      AND (cookie_token = ${cookieToken} OR fingerprint = ${fingerprint})
    LIMIT 1
  `;
  if (dup) {
    return new Response(JSON.stringify({ error: 'Ya completaste este quiz', sessionId: dup.id }), { status: 409, headers: { 'Content-Type': 'application/json' } });
  }

  // Obtener answers_key del quiz
  const [quiz] = await sql`SELECT answers_key FROM quizzes WHERE id = ${quizId} AND status = 'published'`;
  if (!quiz) {
    return new Response(JSON.stringify({ error: 'Quiz no encontrado o no está activo' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const answersKey: Record<string, AnswerKey> = typeof quiz.answers_key === 'string'
    ? JSON.parse(quiz.answers_key)
    : quiz.answers_key;

  // Crear o recuperar sesión incompleta
  let sessionId: string;
  const [existing] = await sql`
    SELECT id FROM sessions WHERE quiz_id = ${quizId} AND cookie_token = ${cookieToken} AND completed = FALSE
  `;

  if (existing) {
    sessionId = existing.id as string;
  } else {
    const [newSession] = await sql`
      INSERT INTO sessions (quiz_id, cookie_token, fingerprint, ip_address)
      VALUES (${quizId}, ${cookieToken}, ${fingerprint}, ${ip})
      RETURNING id
    `;
    sessionId = newSession.id as string;
  }

  // Evaluar y guardar respuestas
  const evaluated = answers.map(a => ({
    questionId: a.questionId,
    selectedAnswer: a.selectedAnswer,
    isCorrect: a.selectedAnswer !== null && a.selectedAnswer === answersKey[a.questionId],
    timeSpentMs: a.timeSpentMs,
  }));

  await Promise.all(
    evaluated.map(a => sql`
      INSERT INTO answers (session_id, question_id, selected_answer, is_correct, time_spent_ms)
      VALUES (${sessionId}, ${a.questionId}, ${a.selectedAnswer}, ${a.isCorrect}, ${a.timeSpentMs})
    `)
  );

  // Calcular resultado
  const correct = evaluated.filter(a => a.isCorrect).length;
  const total = evaluated.length;
  const score = Math.round((correct / total) * 100);
  const level = determineLevel(score);

  const [result] = await sql`
    INSERT INTO results (session_id, quiz_id, total_questions, correct_answers, score, level, time_spent_sec)
    VALUES (${sessionId}, ${quizId}, ${total}, ${correct}, ${score}, ${level}, ${timeSpentSec})
    RETURNING id, score, level, correct_answers, total_questions, time_spent_sec, completed_at
  `;

  await sql`UPDATE sessions SET completed = TRUE, completed_at = NOW() WHERE id = ${sessionId}`;

  return new Response(JSON.stringify({ result, sessionId }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
