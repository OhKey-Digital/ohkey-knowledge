import { useEffect, useState } from 'react';
import { formatTime } from '../../lib/quizLogic';

interface Totals {
  total_participants: number;
  avg_score: number;
  avg_time_sec: number;
  level_basico: number;
  level_medio: number;
  level_avanzado: number;
}

interface AnswerDist {
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
  count: number;
}

interface ScoreDist {
  range: string;
  count: number;
}

interface QuizInfo {
  id: string;
  title: string;
  description: string;
  status: string;
  published_at: string | null;
  questions: Array<{ id: string; text: string }>;
}

interface StatsData {
  quiz: QuizInfo;
  totals: Totals;
  answerDist: AnswerDist[];
  scoreDistribution: ScoreDist[];
}

export function StatsOverview({ quizId }: { quizId: string }) {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const load = () => {
    fetch(`/api/admin/quiz/${quizId}/stats`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [quizId]);

  const publish = async () => {
    if (!confirm('¿Publicar este quiz? Se cerrará el activo actual.')) return;
    setPublishing(true);
    await fetch(`/api/admin/quiz/${quizId}/publish`, { method: 'PUT' });
    setPublishing(false);
    load();
  };

  const close = async () => {
    if (!confirm('¿Cerrar el quiz?')) return;
    await fetch(`/api/admin/quiz/${quizId}/close`, { method: 'PUT' });
    load();
  };

  if (loading) return <div style={{ color: 'var(--color-text-muted)' }}>Cargando estadísticas…</div>;
  if (!data) return <div style={{ color: '#f87171' }}>No se pudo cargar el quiz.</div>;

  const { quiz, totals, answerDist, scoreDistribution } = data;

  const questions: Array<{ id: string; text: string }> = typeof quiz.questions === 'string'
    ? JSON.parse(quiz.questions)
    : quiz.questions;

  const totalDist = scoreDistribution.reduce((s, r) => s + r.count, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Quiz header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>{quiz.title}</h2>
          {quiz.description && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{quiz.description}</p>}
          <StatusBadge status={quiz.status} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {quiz.status === 'draft' && (
            <button onClick={publish} disabled={publishing} style={actionBtn('#4ade80')}>
              {publishing ? 'Publicando…' : 'Publicar'}
            </button>
          )}
          {quiz.status === 'published' && (
            <button onClick={close} style={actionBtn('#f87171')}>Cerrar quiz</button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
        <StatCard label="Participantes" value={totals.total_participants} />
        <StatCard label="Puntaje promedio" value={`${totals.avg_score}%`} />
        <StatCard label="Tiempo promedio" value={formatTime(Number(totals.avg_time_sec))} />
        <StatCard label="Nivel Avanzado" value={totals.level_avanzado} highlight />
      </div>

      {/* Distribución de niveles */}
      <Section title="Distribución de niveles">
        <LevelBar label="Avanzado" count={totals.level_avanzado} total={totals.total_participants} color="#4233ce" />
        <LevelBar label="Medio"    count={totals.level_medio}    total={totals.total_participants} color="#7f57ff" />
        <LevelBar label="Básico"   count={totals.level_basico}   total={totals.total_participants} color="#a9b2ff" />
      </Section>

      {/* Distribución de puntajes */}
      {totalDist > 0 && (
        <Section title="Distribución de puntajes">
          {scoreDistribution.map(row => (
            <LevelBar key={row.range} label={row.range + '%'} count={row.count} total={totalDist} color="#7f57ff" />
          ))}
        </Section>
      )}

      {/* Por pregunta */}
      {totals.total_participants > 0 && questions.length > 0 && (
        <Section title="Respuestas por pregunta">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {questions.map((q, i) => {
              const qAnswers = answerDist.filter(a => a.question_id === q.id);
              const qTotal = qAnswers.reduce((s, a) => s + a.count, 0);
              const correctCount = qAnswers.find(a => a.is_correct)?.count ?? 0;
              const pct = qTotal > 0 ? Math.round((correctCount / qTotal) * 100) : 0;
              return (
                <div key={q.id} style={{ background: 'rgba(15,10,40,0.4)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Pregunta {i + 1}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)', marginBottom: '0.75rem', fontWeight: 500 }}>{q.text}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {['A', 'B', 'C', 'D'].map(opt => {
                      const row = qAnswers.find(a => a.selected_answer === opt);
                      const pct = row && qTotal > 0 ? Math.round((row.count / qTotal) * 100) : 0;
                      return (
                        <div key={opt} style={{
                          padding: '0.35rem 0.7rem',
                          borderRadius: 'var(--radius-sm)',
                          background: row?.is_correct ? 'rgba(74,222,128,0.15)' : 'rgba(169,178,255,0.08)',
                          border: `1px solid ${row?.is_correct ? 'rgba(74,222,128,0.3)' : 'rgba(169,178,255,0.15)'}`,
                          fontSize: '0.8rem',
                          color: row?.is_correct ? '#4ade80' : 'var(--color-text-secondary)',
                          fontWeight: 500,
                        }}>
                          {opt}: {pct}% ({row?.count ?? 0})
                        </div>
                      );
                    })}
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
                      {pct}% correcto
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {totals.total_participants === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', background: 'rgba(15,10,40,0.3)', borderRadius: 'var(--radius-lg)' }}>
          Aún no hay participantes para este quiz.
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div style={{ background: 'rgba(30,25,76,0.6)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>{label}</div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: highlight ? 'var(--color-accent-light)' : 'var(--color-text-primary)' }}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(30,25,76,0.6)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '1rem' }}>{title}</h3>
      {children}
    </div>
  );
}

function LevelBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
      <span style={{ width: '80px', fontSize: '0.85rem', color: 'var(--color-text-secondary)', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '9999px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '9999px', transition: 'width 0.5s' }} />
      </div>
      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', width: '60px', textAlign: 'right' }}>{count} ({pct}%)</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    draft:     { label: 'Borrador',  color: '#94a3b8' },
    published: { label: 'Publicado', color: '#4ade80' },
    closed:    { label: 'Cerrado',   color: '#f87171' },
  };
  const s = map[status] ?? map.draft!;
  return (
    <span style={{ display: 'inline-block', marginTop: '0.35rem', fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.7rem', borderRadius: '9999px', background: `${s.color}22`, color: s.color, border: `1px solid ${s.color}44` }}>
      {s.label}
    </span>
  );
}

function actionBtn(color: string): React.CSSProperties {
  return {
    padding: '0.5rem 1.1rem',
    background: `${color}22`,
    color,
    border: `1px solid ${color}44`,
    borderRadius: 'var(--radius-md)',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  };
}
