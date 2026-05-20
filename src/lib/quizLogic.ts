import type { Question, QuizAnswer, KnowledgeLevel, QuizResult } from '../types/quiz';

export const LEVEL_CONFIG: Record<
  KnowledgeLevel,
  { label: string; color: string; bg: string; min: number; max: number }
> = {
  Basico: {
    label: 'Básico',
    color: '#A9B2FF',
    bg: 'rgba(169, 178, 255, 0.15)',
    min: 0,
    max: 59,
  },
  Medio: {
    label: 'Medio',
    color: '#7F57FF',
    bg: 'rgba(127, 87, 255, 0.15)',
    min: 60,
    max: 79,
  },
  Avanzado: {
    label: 'Avanzado',
    color: '#4233CE',
    bg: 'rgba(66, 51, 206, 0.15)',
    min: 80,
    max: 100,
  },
};

export function calculateScore(answers: QuizAnswer[]): number {
  if (!answers.length) return 0;
  const correct = answers.filter((a) => a.isCorrect).length;
  return Math.round((correct / answers.length) * 100);
}

export function determineLevel(score: number): KnowledgeLevel {
  if (score >= 80) return 'Avanzado';
  if (score >= 60) return 'Medio';
  return 'Basico';
}

export function buildQuizResult(
  questions: Question[],
  answers: QuizAnswer[],
  startTime: number
): QuizResult {
  const correctAnswers = answers.filter((a) => a.isCorrect).length;
  const score = calculateScore(answers);
  return {
    totalQuestions: questions.length,
    correctAnswers,
    score,
    level: determineLevel(score),
    completedAt: new Date().toISOString(),
    timeSpentSec: Math.floor((Date.now() - startTime) / 1000),
  };
}

export interface AnswerStats {
  byDifficulty: Record<string, { total: number; correct: number }>;
  byCategory: Record<string, { total: number; correct: number }>;
  perQuestion: Array<{ question: Question; answer: QuizAnswer | undefined; index: number }>;
}

export function getAnswerStats(questions: Question[], answers: QuizAnswer[]): AnswerStats {
  const byDifficulty: Record<string, { total: number; correct: number }> = {};
  const byCategory: Record<string, { total: number; correct: number }> = {};

  const perQuestion = questions.map((q, i) => ({
    question: q,
    answer: answers[i],
    index: i,
  }));

  perQuestion.forEach(({ question, answer }) => {
    if (!answer) return;

    const diff = question.difficulty ?? 'Sin clasificar';
    byDifficulty[diff] ??= { total: 0, correct: 0 };
    byDifficulty[diff]!.total++;
    if (answer.isCorrect) byDifficulty[diff]!.correct++;

    const cat = question.category || 'General';
    byCategory[cat] ??= { total: 0, correct: 0 };
    byCategory[cat]!.total++;
    if (answer.isCorrect) byCategory[cat]!.correct++;
  });

  return { byDifficulty, byCategory, perQuestion };
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function getScoreMessage(score: number): string {
  if (score === 100) return '¡Perfecto! Dominio total del tema.';
  if (score >= 80) return '¡Excelente! Conocimiento avanzado demostrado.';
  if (score >= 60) return 'Buen trabajo. Hay áreas por reforzar.';
  if (score >= 40) return 'Conocimiento básico. Se recomienda repasar el material.';
  return 'Necesitas reforzar los conceptos fundamentales.';
}
