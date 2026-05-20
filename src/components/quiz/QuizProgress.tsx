import { ProgressBar } from '../ui/ProgressBar';
import styles from './QuizProgress.module.css';

interface QuizProgressProps {
  current: number;
  total: number;
  title: string;
  elapsedSec: number;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function QuizProgress({ current, total, title, elapsedSec }: QuizProgressProps) {
  return (
    <header className={styles.header}>
      <div className={styles.meta}>
        <span className={styles.title} title={title}>{title}</span>
        <span className={styles.timer} aria-label="Tiempo transcurrido">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          {formatTime(elapsedSec)}
        </span>
      </div>
      <ProgressBar value={current} max={total} size="sm" />
      <div className={styles.count} aria-live="polite" aria-atomic="true">
        Pregunta <strong>{current}</strong> de <strong>{total}</strong>
      </div>
    </header>
  );
}
