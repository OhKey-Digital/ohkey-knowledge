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

type Phase = 'checking' | 'identify' | 'already_done' | 'active' | 'submitting' | 'done' | 'error';

const STUDENT_NAME_KEY = 'ohkey_student_name';

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
  const [studentName, setStudentName] = useState('');
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
          // Precargar nombre si el estudiante ya participó en otro quiz
          const saved = localStorage.getItem(STUDENT_NAME_KEY) ?? '';
          setStudentName(saved);
          setPhase('identify');
        }
      })
      .catch(() => {
        setPhase('identify');
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

  const handleIdentify = (name: string) => {
    setStudentName(name);
    localStorage.setItem(STUDENT_NAME_KEY, name);
    startTimeRef.current = Date.now();
    questionStartRef.current = Date.now();
    setPhase('active');
  };

  const handleAnswer = async (selected: AnswerKey | null) => {
    const timeSpentMs = Date.now() - questionStartRef.current;
    const newAnswer = { questionId: quiz.questions[currentIndex]!.id, selectedAnswer: selected, timeSpentMs };
    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);

    if (currentIndex + 1 >= quiz.questions.length) {
      setPhase('submitting');
      const token = getCookieToken();
      const timeSpentSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
      try {
        const res = await fetch('/api/quiz/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quizId: quiz.id, cookieToken: token, studentName, answers: newAnswers, timeSpentSec }),
        });
        const data = await res.json();
        if (res.status === 409) {
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

  if (phase === 'identify') {
    return <IdentifyForm initialName={studentName} quizTitle={quiz.title} onSubmit={handleIdentify} />;
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
    return <ResultView result={result} quizTitle={quiz.title} studentName={studentName} />;
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

// --- Formulario de identificación ---

function IdentifyForm({ initialName, quizTitle, onSubmit }: { initialName: string; quizTitle: string; onSubmit: (name: string) => void }) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');

  const validate = (value: string): string => {
    const trimmed = value.trim();
    if (trimmed.length < 3) return 'El nombre debe tener al menos 3 caracteres';
    if (!/\s/.test(trimmed)) return 'Ingresa nombre y apellido';
    return '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate(name);
    if (err) { setError(err); return; }
    onSubmit(name.trim());
  };

  return (
    <div style={{ maxWidth: '440px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>👤</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '0.4rem' }}>
          ¿Quién responde?
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
          Antes de comenzar <strong style={{ color: 'var(--color-accent-light)' }}>{quizTitle}</strong>, ingresa tu nombre completo.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label htmlFor="student-name" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            Nombre completo
          </label>
          <input
            id="student-name"
            type="text"
            autoFocus
            autoComplete="name"
            placeholder="Ej. María González"
            value={name}
            onChange={e => { setName(e.target.value); if (error) setError(validate(e.target.value)); }}
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(30,25,76,0.6)',
              border: `1px solid ${error ? '#f87171' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-primary)',
              fontSize: '1rem',
              fontFamily: 'inherit',
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--color-accent-light)'; }}
            onBlur={e => { (e.target as HTMLInputElement).style.borderColor = error ? '#f87171' : 'var(--color-border)'; }}
          />
          {error && (
            <span style={{ fontSize: '0.8rem', color: '#f87171' }}>{error}</span>
          )}
        </div>

        <Button type="submit" style={{ marginTop: '0.5rem' }}>
          Comenzar quiz →
        </Button>
      </form>
    </div>
  );
}

// --- Vista de resultado ---

function ResultView({ result, quizTitle, studentName }: { result: SubmitResult; quizTitle: string; studentName: string }) {
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
        Gracias por participar, <strong style={{ color: 'var(--color-text-secondary)' }}>{studentName}</strong>. Tu resultado ha sido registrado.
      </div>
    </div>
  );
}
