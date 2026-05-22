import { useState } from 'react';
import { parseExcelFile } from '../../lib/excelParser';
import type { Question } from '../../types/quiz';

type Phase = 'idle' | 'parsed' | 'saving' | 'done' | 'error';

export function QuizUploader() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [quizId, setQuizId] = useState('');
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File) => {
    setError('');
    const result = await parseExcelFile(file);
    if (!result.success || result.questions.length === 0) {
      setError(result.errors[0] ?? 'Error al parsear el archivo');
      return;
    }
    setQuestions(result.questions);
    const base = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
    setTitle(base.charAt(0).toUpperCase() + base.slice(1));
    setPhase('parsed');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleSave = async () => {
    if (!title.trim()) { setError('El título es requerido'); return; }
    setPhase('saving');
    const res = await fetch('/api/admin/quiz/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), description: description.trim(), questions }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Error al guardar');
      setPhase('parsed');
      return;
    }
    const quiz = await res.json();
    setQuizId(quiz.id);
    setPhase('done');
  };

  if (phase === 'done') {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✓</div>
        <h2 style={{ color: '#4ade80', marginBottom: '0.5rem' }}>Quiz guardado</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
          Quiz "<strong style={{ color: 'var(--color-text-primary)' }}>{title}</strong>" listo con {questions.length} preguntas.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/admin" style={btnStyle('secondary')}>← Volver al Dashboard</a>
          <a href={`/admin/quiz/${quizId}`} style={btnStyle('primary')}>Ver estadísticas</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '640px' }}>
      {phase === 'idle' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragging ? 'var(--color-accent-vibrant)' : 'rgba(169,178,255,0.25)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '3rem 2rem',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.15s, background 0.15s',
            background: dragging ? 'rgba(66,51,206,0.1)' : 'transparent',
          }}
          onClick={() => document.getElementById('fileInput')?.click()}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📄</div>
          <p style={{ color: 'var(--color-text-primary)', fontWeight: 600, marginBottom: '0.4rem' }}>
            Arrastra tu archivo Excel aquí
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            o haz clic para seleccionar · .xlsx
          </p>
          <input id="fileInput" type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleInput} />
        </div>
      )}

      {phase === 'parsed' && (
        <>
          <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', color: '#4ade80', fontSize: '0.9rem' }}>
            {questions.length} preguntas cargadas correctamente
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <FieldRow label="Título del quiz *">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ej: Evaluación de React Avanzado"
                style={inputStyle}
              />
            </FieldRow>
            <FieldRow label="Descripción (opcional)">
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Breve descripción del quiz para los participantes"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </FieldRow>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => { setPhase('idle'); setQuestions([]); }} style={btnStyle('secondary') as React.CSSProperties}>
              Cambiar archivo
            </button>
            <button onClick={handleSave} style={btnStyle('primary') as React.CSSProperties}>
              Guardar Quiz
            </button>
          </div>
        </>
      )}

      {phase === 'saving' && (
        <div style={{ color: 'var(--color-text-muted)', padding: '1rem' }}>Guardando quiz…</div>
      )}

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '0.7rem 0.9rem',
  background: 'rgba(15,10,40,0.8)',
  border: '1px solid rgba(169,178,255,0.2)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-text-primary)',
  fontSize: '0.9rem',
  fontFamily: 'inherit',
  outline: 'none',
  width: '100%',
};

function btnStyle(variant: 'primary' | 'secondary') {
  const base: React.CSSProperties = {
    padding: '0.65rem 1.25rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    fontFamily: 'inherit',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
  };
  if (variant === 'primary') return { ...base, background: 'var(--color-primary)', color: 'white' };
  return { ...base, background: 'rgba(169,178,255,0.1)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' };
}
