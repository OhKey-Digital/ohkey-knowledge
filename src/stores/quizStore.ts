import { atom } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
import type { Question, QuizAnswer, QuizState, HistoricalResult } from '../types/quiz';

// Session state (in-memory, restored from sessionStorage across navigations)
export const $questions = atom<Question[]>([]);
export const $answers = atom<QuizAnswer[]>([]);
export const $currentIndex = atom<number>(0);
export const $quizState = atom<QuizState>('idle');
export const $quizTitle = atom<string>('');
export const $startTime = atom<number>(0);
export const $questionStartTime = atom<number>(0);

const SESSION_KEY = 'ohkey:session';

function saveSession(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      questions: $questions.get(),
      answers: $answers.get(),
      currentIndex: $currentIndex.get(),
      quizState: $quizState.get(),
      quizTitle: $quizTitle.get(),
      startTime: $startTime.get(),
      questionStartTime: $questionStartTime.get(),
    }));
  } catch { /* sessionStorage unavailable */ }
}

if (typeof window !== 'undefined') {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (Array.isArray(d.questions) && d.questions.length > 0) {
        $questions.set(d.questions);
        $answers.set(d.answers ?? []);
        $currentIndex.set(d.currentIndex ?? 0);
        $quizState.set(d.quizState ?? 'idle');
        $quizTitle.set(d.quizTitle ?? '');
        $startTime.set(d.startTime ?? 0);
        $questionStartTime.set(d.questionStartTime ?? 0);
      }
    }
  } catch { /* ignore parse errors */ }
}

// Persistent across sessions
export const $historicalResults = persistentAtom<HistoricalResult[]>(
  'ohkey:results',
  [],
  {
    encode: JSON.stringify,
    decode: (raw) => {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
  }
);

export function startQuiz(questions: Question[], title: string): void {
  $questions.set(questions);
  $answers.set([]);
  $currentIndex.set(0);
  $quizState.set('active');
  $quizTitle.set(title);
  $startTime.set(Date.now());
  $questionStartTime.set(Date.now());
  saveSession();
}

export function submitAnswer(selectedAnswer: 'A' | 'B' | 'C' | 'D' | null): void {
  const questions = $questions.get();
  const currentIdx = $currentIndex.get();
  const question = questions[currentIdx];
  if (!question) return;

  const timeSpentMs = Date.now() - $questionStartTime.get();
  const isCorrect = selectedAnswer !== null && selectedAnswer === question.correctAnswer;

  const answer: QuizAnswer = {
    questionId: question.id,
    selectedAnswer,
    isCorrect,
    timeSpentMs,
  };

  $answers.set([...$answers.get(), answer]);

  const nextIndex = currentIdx + 1;
  if (nextIndex >= questions.length) {
    $quizState.set('completed');
  } else {
    $currentIndex.set(nextIndex);
    $questionStartTime.set(Date.now());
  }
  saveSession();
}

export function saveToHistory(result: Omit<HistoricalResult, 'id'>): void {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const existing = $historicalResults.get();
  // Keep last 50 results
  const updated = [{ ...result, id }, ...existing].slice(0, 50);
  $historicalResults.set(updated);
}

export function resetQuiz(): void {
  $questions.set([]);
  $answers.set([]);
  $currentIndex.set(0);
  $quizState.set('idle');
  $quizTitle.set('');
  $startTime.set(0);
  $questionStartTime.set(0);
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}
