import { useEffect, useState } from 'react';

interface Quiz {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'closed';
  created_at: string;
  published_at: string | null;
  total_participants: number;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft:     { label: 'Borrador',   color: '#94a3b8' },
  published: { label: 'Publicado',  color: '#4ade80' },
  closed:    { label: 'Cerrado',    color: '#f87171' },
};

export function QuizList() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch('/api/admin/quiz/list')
      .then(r => r.json())
      .then(data => { setQuizzes(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const publish = async (id: string) => {
    if (!confirm('¿Publicar este quiz? Se cerrará el quiz activo actual.')) return;
    setActionId(id);
    await fetch(`/api/admin/quiz/${id}/publish`, { method: 'PUT' });
    setActionId(null);
    load();
  };

  const close = async (id: string) => {
    if (!confirm('¿Cerrar el quiz? Los participantes no podrán responder más.')) return;
    setActionId(id);
    await fetch(`/api/admin/quiz/${id}/close`, { method: 'PUT' });
    setActionId(null);
    load();
  };

  if (loading) return <div style={{ color: 'var(--color-text-muted)', padding: '2rem 0' }}>Cargando quizzes…</div>;

  if (quizzes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--color-text-muted)' }}>
        <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>No hay quizzes aún.</p>
        <a href="/admin/quiz/new" style={{ color: 'var(--color-accent-light)', fontWeight: 600 }}>Crear el primero →</a>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {quizzes.map(quiz => {
        const st = STATUS_LABEL[quiz.status] ?? STATUS_LABEL.draft!;
        return (
          <div key={quiz.id} style={{
            background: 'rgba(30, 25, 76, 0.6)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text-primary)' }}>{quiz.title}</span>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.6rem',
                  borderRadius: '9999px', background: `${st.color}22`, color: st.color,
                  border: `1px solid ${st.color}44`,
                }}>{st.label}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {quiz.total_participants} participantes · Creado {new Date(quiz.created_at).toLocaleDateString('es')}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <a
                href={`/admin/quiz/${quiz.id}`}
                style={{ padding: '0.45rem 1rem', background: 'rgba(66,51,206,0.25)', color: 'var(--color-accent-light)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}
              >
                Estadísticas
              </a>

              {quiz.status === 'draft' && (
                <button
                  onClick={() => publish(quiz.id)}
                  disabled={actionId === quiz.id}
                  style={{ padding: '0.45rem 1rem', background: 'rgba(74,222,128,0.2)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  {actionId === quiz.id ? 'Publicando…' : 'Publicar'}
                </button>
              )}

              {quiz.status === 'published' && (
                <button
                  onClick={() => close(quiz.id)}
                  disabled={actionId === quiz.id}
                  style={{ padding: '0.45rem 1rem', background: 'rgba(248,113,113,0.2)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  {actionId === quiz.id ? 'Cerrando…' : 'Cerrar'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
