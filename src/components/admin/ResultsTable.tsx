import { useEffect, useState, useMemo } from 'react';
import { formatTime } from '../../lib/quizLogic';
import type { ResultRow } from '../../types/quiz';

const LEVEL_COLOR: Record<string, string> = {
  Avanzado: '#4233ce',
  Medio:    '#7f57ff',
  Basico:   '#a9b2ff',
};

export function ResultsTable() {
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/admin/results')
      .then(r => r.json())
      .then(data => { setRows(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(r => r.student_name.toLowerCase().includes(q) || r.quiz_title.toLowerCase().includes(q));
  }, [rows, search]);

  if (loading) {
    return <div style={{ color: 'var(--color-text-muted)', padding: '2rem 0' }}>Cargando resultados…</div>;
  }

  if (rows.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--color-text-muted)' }}>
        <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Aún no hay envíos registrados.</p>
        <p style={{ fontSize: '0.9rem' }}>Publica un quiz y comparte el enlace para recibir participantes.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Buscador */}
      <div style={{ position: 'relative', maxWidth: '400px' }}>
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          width="16" height="16"
          style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }}
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          placeholder="Buscar por nombre o quiz…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '0.6rem 0.75rem 0.6rem 2.25rem',
            background: 'rgba(30,25,76,0.6)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-primary)',
            fontSize: '0.9rem',
            fontFamily: 'inherit',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Contador */}
      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
        {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
        {search && ` para "${search}"`}
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', background: 'rgba(15,10,40,0.3)', borderRadius: 'var(--radius-lg)' }}>
          Sin resultados para esa búsqueda.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {/* Encabezado */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1fr',
            gap: '0.75rem',
            padding: '0.5rem 1rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            <span>Estudiante</span>
            <span>Quiz</span>
            <span>Fecha</span>
            <span>Puntaje</span>
            <span>Nivel</span>
            <span>Tiempo</span>
          </div>

          {filtered.map(row => {
            const levelColor = LEVEL_COLOR[row.level] ?? '#a9b2ff';
            const fecha = new Date(row.completed_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
            const isClickable = !!row.student_id;

            const content = (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1fr',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                alignItems: 'center',
                background: 'rgba(30,25,76,0.5)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                transition: isClickable ? 'background 0.15s, border-color 0.15s' : undefined,
                cursor: isClickable ? 'pointer' : 'default',
                textDecoration: 'none',
                color: 'inherit',
              }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.student_name}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.quiz_title}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{fecha}</span>
                <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{row.score}%</span>
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
                  {row.level}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{formatTime(row.time_spent_sec)}</span>
              </div>
            );

            if (isClickable) {
              return (
                <a key={row.session_id} href={`/admin/student/${row.student_id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                  {content}
                </a>
              );
            }
            return <div key={row.session_id}>{content}</div>;
          })}
        </div>
      )}
    </div>
  );
}
