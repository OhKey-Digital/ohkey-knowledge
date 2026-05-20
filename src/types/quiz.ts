export type AnswerKey = 'A' | 'B' | 'C' | 'D';
export type KnowledgeLevel = 'Basico' | 'Medio' | 'Avanzado';
export type QuizState = 'idle' | 'active' | 'completed';

export interface Question {
  id: string;
  text: string;
  options: Record<AnswerKey, string>;
  correctAnswer: AnswerKey;
  category?: string;
  difficulty?: KnowledgeLevel;
}

export interface QuizAnswer {
  questionId: string;
  selectedAnswer: AnswerKey | null;
  isCorrect: boolean;
  timeSpentMs: number;
}

export interface QuizResult {
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  level: KnowledgeLevel;
  completedAt: string;
  timeSpentSec: number;
}

export interface HistoricalResult extends QuizResult {
  id: string;
  quizTitle: string;
}

export interface ExcelRow {
  Pregunta: string;
  Opcion_A: string;
  Opcion_B: string;
  Opcion_C: string;
  Opcion_D: string;
  Respuesta_Correcta: string;
  Categoria?: string;
  Dificultad?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ParseResult {
  success: boolean;
  questions: Question[];
  errors: string[];
  warnings: string[];
}
