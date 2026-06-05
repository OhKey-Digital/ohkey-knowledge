import { useEffect, useState } from 'react';
import { formatTime } from '../../lib/quizLogic';
import type { StudentHistory as StudentHistoryType, StudentAttempt } from '../../types/quiz';

const LEVEL_COLOR: Record<string, string> = {
  Avanzado: '#4233ce',
  Medio:    '#7f57ff',
  Basico:   '#a9b2ff',
};

interface AnswerDetail {
  question_id: string;
  selected_answer: string | null;
  is_correct: boolean;
  time_spent_ms: number;
}

interface QuestionDetail {
  id: string;
  text: string;
  options: Record<string, string>;
  correctAnswer: string;
}

interface AttemptDetail {
  answers: AnswerDetail[];
  questions: QuestionDetail[];
}

export function StudentHistory({ studentId }: { studentId: string }) {
  const [data, setData] = useState<StudentHistoryType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/student/${studentId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [studentId]);

  if (loading) return <div style={{ color: 'var(--color-text-muted)', padding: '2rem 0' }}>Cargando historial…</div>;
  if (!data || !data.student) return <div style={{ color: '#f87171' }}>No se pudo cargar el historial.</div>;

  const { student, stats, attempts } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Encabezado del estudiante */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
          {student.full_name}
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          Primer intento: {new Date(student.created_at).toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Tarjetas de estadísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
        <StatCard label="Total de intentos" value={stats.total_attempts} />
        <StatCard label="Puntaje promedio" value={`${stats.avg_score}%`} highlight />
      </div>

      {/* Lista de intentos */}
      <div style={{ background: 'rgba(30,25,76,0.6)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
          Historial de intentos
        </h3>

        {attempts.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Sin intentos registrados.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {attempts.map(attempt => (
              <AttemptRow key={attempt.session_id} attempt={attempt} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AttemptRow({ attempt }: { attempt: StudentAttempt }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<AttemptDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const levelColor = LEVEL_COLOR[attempt.level] ?? '#a9b2ff';
  const fecha = new Date(attempt.completed_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });

  const toggle = async () => {
    if (!expanded && !detail) {
      setLoadingDetail(true);
      try {
        const res = await fetch(`/api/quiz/result/${attempt.session_id}`);
        const json = await res.json();
        const questions: QuestionDetail[] = typeof json.result.questions === 'string'
          ? JSON.parse(json.result.questions)
          : json.result.questions;
        setDetail({ answers: json.answers, questions });
      } catch {
        // sin desglose
      }
      setLoadingDetail(false);
    }
    setExpanded(v => !v);
  };

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      {/* Fila resumen */}
      <button
        onClick={toggle}
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
          gap: '0.75rem',
          padding: '0.85rem 1rem',
          background: 'rgba(15,10,40,0.3)',
          border: 'none',
          cursor: 'pointer',
          alignItems: 'center',
          fontFamily: 'inherit',
          textAlign: 'left',
          color: 'inherit',
          transition: 'background 0.15s',
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.9rem' }}>
          {attempt.quiz_title}
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{fecha}</span>
        <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{attempt.score}%</span>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '0.15rem 0.55rem',
          background: `${levelColor}22`,
          border: `1px solid ${levelColor}44`,
          borderRadius: '9999px',
          color: levelColor,
          fontSize: '0.75rem',
          fontWeight: 600,
          width: 'fit-content',
        }}>
          {attempt.level}
        </span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '1rem', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>
          ▾
        </span>
      </button>

      {/* Desglose expandido */}
      {expanded && (
        <div style={{ padding: '1rem', background: 'rgba(10,7,30,0.4)', borderTop: '1px solid var(--color-border)' }}>
          {loadingDetail ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Cargando desglose…</p>
          ) : detail ? (
            <QuestionBreakdown detail={detail} />
          ) : (
            <p style={{ color: '#f87171', fontSize: '0.85rem' }}>No se pudo cargar el desglose.</p>
          )}
        </div>
      )}
    </div>
  );
}

function QuestionBreakdown({ detail }: { detail: AttemptDetail }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {detail.questions.map((q, i) => {
        const ans = detail.answers.find(a => a.question_id === q.id);
        const isCorrect = ans?.is_correct ?? false;
        const selected = ans?.selected_answer ?? null;

        return (
          <div key={q.id} style={{
            background: 'rgba(30,25,76,0.4)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem',
            borderLeft: `3px solid ${isCorrect ? '#4ade80' : '#f87171'}`,
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
              Pregunta {i + 1} · {isCorrect ? '✓ Correcta' : '✗ Incorrecta'}
              {ans && <span style={{ marginLeft: '0.5rem' }}>· {(ans.time_spent_ms / 1000).toFixed(1)}s</span>}
            </div>
            <div style={{ fontSize: '0.88rem', color: 'var(--color-text-primary)', marginBottom: '0.5rem', fontWeight: 500 }}>
              {q.text}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {(['A', 'B', 'C', 'D'] as const).map(opt => {
                const isSelected = selected === opt;
                const isAnswer = q.correctAnswer === opt;
                let bg = 'rgba(169,178,255,0.06)';
                let border = 'rgba(169,178,255,0.12)';
                let color = 'var(--color-text-muted)';

                if (isAnswer) { bg = 'rgba(74,222,128,0.12)'; border = 'rgba(74,222,128,0.3)'; color = '#4ade80'; }
                if (isSelected && !isAnswer) { bg = 'rgba(248,113,113,0.12)'; border = 'rgba(248,113,113,0.3)'; color = '#f87171'; }

                return (
                  <div key={opt} style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    background: bg,
                    border: `1px solid ${border}`,
                    fontSize: '0.78rem',
                    color,
                    fontWeight: isSelected || isAnswer ? 600 : 400,
                  }}>
                    {opt}{isSelected ? ' ← tu respuesta' : ''}{isAnswer && !isSelected ? ' ← correcta' : ''}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div style={{ background: 'rgba(30,25,76,0.6)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>{label}</div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: highlight ? 'var(--color-accent-light)' : 'var(--color-text-primary)' }}>
        {value}
      </div>
    </div>
  );
}
