import type { HistoricalResult } from '../../types/quiz';
import { LEVEL_CONFIG } from '../../lib/quizLogic';
import styles from './HistoryPanel.module.css';

interface HistoryPanelProps {
  history: HistoricalResult[];
}

export function HistoryPanel({ history }: HistoryPanelProps) {
  if (!history.length) return null;

  const recent = history.slice(0, 10);

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>Historial de Resultados</h3>
      <div className={styles.list}>
        {recent.map((r) => {
          const cfg = LEVEL_CONFIG[r.level];
          const date = new Date(r.completedAt).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });
          return (
            <div key={r.id} className={styles.row}>
              <div className={styles.rowLeft}>
                <p className={styles.rowTitle}>{r.quizTitle}</p>
                <p className={styles.rowDate}>{date}</p>
              </div>
              <div className={styles.rowRight}>
                <span className={styles.score}>{r.score}%</span>
                <span
                  className={styles.level}
                  style={{ color: cfg.color, background: cfg.bg, borderColor: `${cfg.color}40` }}
                >
                  {cfg.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
