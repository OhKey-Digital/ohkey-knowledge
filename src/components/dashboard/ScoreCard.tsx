import type { KnowledgeLevel } from '../../types/quiz';
import { LEVEL_CONFIG, formatTime, getScoreMessage } from '../../lib/quizLogic';
import styles from './ScoreCard.module.css';

interface ScoreCardProps {
  score: number;
  level: KnowledgeLevel;
  correct: number;
  total: number;
  timeSpentSec: number;
  quizTitle: string;
}

export function ScoreCard({ score, level, correct, total, timeSpentSec, quizTitle }: ScoreCardProps) {
  const config = LEVEL_CONFIG[level];

  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <div>
          <p className={styles.quizTitle}>{quizTitle}</p>
          <h2 className={styles.heading}>Resultado Final</h2>
        </div>
        <span
          className={styles.levelBadge}
          style={{ background: config.bg, color: config.color, borderColor: `${config.color}40` }}
        >
          {config.label}
        </span>
      </div>

      <div className={styles.scoreRing}>
        <svg viewBox="0 0 100 100" className={styles.ringsvg} aria-hidden="true">
          <circle cx="50" cy="50" r="42" className={styles.trackCircle} />
          <circle
            cx="50"
            cy="50"
            r="42"
            className={styles.fillCircle}
            style={{
              strokeDasharray: `${2 * Math.PI * 42}`,
              strokeDashoffset: `${2 * Math.PI * 42 * (1 - score / 100)}`,
              stroke: config.color,
            }}
          />
        </svg>
        <div className={styles.scoreInner}>
          <span className={styles.scoreNum} style={{ color: config.color }}>
            {score}
          </span>
          <span className={styles.scorePct}>%</span>
        </div>
      </div>

      <p className={styles.message}>{getScoreMessage(score)}</p>

      <div className={styles.stats}>
        <Stat label="Correctas" value={`${correct} / ${total}`} />
        <Stat label="Incorrectas" value={`${total - correct} / ${total}`} />
        <Stat label="Tiempo" value={formatTime(timeSpentSec)} />
        <Stat label="Precisión" value={`${score}%`} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}
