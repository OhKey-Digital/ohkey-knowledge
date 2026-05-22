import { useState, useEffect, useRef } from 'react';
import { QuizCard } from './QuizCard';
import { QuizProgress } from './QuizProgress';
import { Button } from '../ui/Button';
import { formatTime, determineLevel, getScoreMessage } from '../../lib/quizLogic';
import type { Question, AnswerKey } from '../../types/quiz';
import styles from './QuizApp.module.css';

interface PublicQuiz {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

interface SubmitResult {
  id: string;
  score: number;
  level: string;
  correct_answers: number;
  total_questions: number;
  time_spent_sec: number;
}

type Phase = 'checking' | 'already_done' | 'active' | 'submitting' | 'done' | 'error';

function getCookieToken(): string {
  const existing = document.cookie.split(';').find(c => c.trim().startsWith('ohkey_token='));
  if (existing) return existing.split('=').slice(1).join('=').trim();
  const token = crypto.randomUUID();
  const maxAge = 30 * 24 * 3600;
  document.cookie = `ohkey_token=${token}; max-age=${maxAge}; path=/; SameSite=Strict`;
  return token;
}

export function PublicQuizApp({ quiz }: { quiz: PublicQuiz }) {
  const [phase, setPhase] = useState<Phase>('checking');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<{ questionId: string; selectedAnswer: AnswerKey | null; timeSpentMs: number }>>([]);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [existingSessionId, setExistingSessionId] = useState<string | null>(null);
  const startTimeRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());
  const [elapsedSec, setElapsedSec] = useState(0);

  // Comprobar si ya completó este quiz
  useEffect(() => {
    const token = getCookieToken();
    fetch('/api/quiz/check-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId: quiz.id, cookieToken: token }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.alreadyCompleted) {
          setExistingSessionId(data.sessionId);
          setPhase('already_done');
        } else {
          startTimeRef.current = Date.now();
          questionStartRef.current = Date.now();
          setPhase('active');
        }
      })
      .catch(() => {
        startTimeRef.current = Date.now();
        setPhase('active');
      });
  }, [quiz.id]);

  // Timer
  useEffect(() => {
    if (phase !== 'active') return;
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const handleAnswer = async (selected: AnswerKey | null) => {
    const timeSpentMs = Date.now() - questionStartRef.current;
    const newAnswer = { questionId: quiz.questions[currentIndex]!.id, selectedAnswer: selected, timeSpentMs };
    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);

    if (currentIndex + 1 >= quiz.questions.length) {
      // Último: enviar
      setPhase('submitting');
      const token = getCookieToken();
      const timeSpentSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
      try {
        const res = await fetch('/api/quiz/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quizId: quiz.id, cookieToken: token, answers: newAnswers, timeSpentSec }),
        });
        const data = await res.json();
        if (res.status === 409) {
          // Ya completado (race condition)
          setExistingSessionId(data.sessionId ?? null);
          setPhase('already_done');
        } else if (res.ok) {
          setResult(data.result);
          setPhase('done');
        } else {
          setPhase('error');
        }
      } catch {
        setPhase('error');
      }
    } else {
      setCurrentIndex(i => i + 1);
      questionStartRef.current = Date.now();
    }
  };

  if (phase === 'checking') {
    return (
      <div className={styles.centerMsg}>
        <div className={styles.spinner} />
        <p className={styles.centerText}>Preparando quiz…</p>
      </div>
    );
  }

  if (phase === 'already_done') {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
        <h2 style={{ color: 'var(--color-accent-light)', marginBottom: '0.75rem', fontSize: '1.5rem', fontWeight: 800 }}>
          Ya participaste
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Ya completaste este quiz. Solo se permite una respuesta por persona.
        </p>
        {existingSessionId && (
          <a
            href={`/resultado?s=${existingSessionId}`}
            style={{ display: 'inline-block', padding: '0.7rem 1.5rem', background: 'var(--color-primary)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 600, textDecoration: 'none' }}
          >
            Ver mis resultados
          </a>
        )}
      </div>
    );
  }

  if (phase === 'submitting') {
    return (
      <div className={styles.centerMsg}>
        <div className={styles.spinner} />
        <p className={styles.centerText}>Enviando respuestas…</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#f87171' }}>
        <p>Hubo un error al enviar tus respuestas. Intenta de nuevo.</p>
        <Button onClick={() => window.location.reload()} style={{ marginTop: '1rem' }}>Recargar</Button>
      </div>
    );
  }

  if (phase === 'done' && result) {
    return <ResultView result={result} quizTitle={quiz.title} />;
  }

  const currentQuestion = quiz.questions[currentIndex];
  if (!currentQuestion) return null;

  return (
    <div className={styles.wrapper}>
      <QuizProgress
        current={currentIndex + 1}
        total={quiz.questions.length}
        title={quiz.title}
        elapsedSec={elapsedSec}
      />
      <QuizCard
        key={currentQuestion.id}
        question={currentQuestion}
        questionNumber={currentIndex + 1}
        onSubmit={handleAnswer}
      />
    </div>
  );
}

function ResultView({ result, quizTitle }: { result: SubmitResult; quizTitle: string }) {
  const LEVEL_COLOR: Record<string, string> = {
    Avanzado: '#4233ce',
    Medio:    '#7f57ff',
    Basico:   '#a9b2ff',
  };
  const color = LEVEL_COLOR[result.level] ?? '#a9b2ff';

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBlock: '1rem' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
          {quizTitle}
        </div>
        <div style={{ fontSize: '4rem', fontWeight: 800, color, lineHeight: 1, marginBottom: '0.25rem' }}>
          {result.score}%
        </div>
        <div style={{ display: 'inline-block', padding: '0.3rem 1rem', background: `${color}22`, border: `1px solid ${color}55`, borderRadius: '9999px', color, fontWeight: 700, fontSize: '0.9rem' }}>
          Nivel {result.level}
        </div>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.75rem', fontSize: '0.95rem' }}>
          {getScoreMessage(result.score)}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
        {[
          { label: 'Correctas', value: `${result.correct_answers}/${result.total_questions}` },
          { label: 'Puntaje',   value: `${result.score}%` },
          { label: 'Tiempo',    value: formatTime(result.time_spent_sec) },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'rgba(30,25,76,0.6)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem' }}>{label}</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        Gracias por participar. Tu resultado ha sido registrado.
      </div>
    </div>
  );
}
