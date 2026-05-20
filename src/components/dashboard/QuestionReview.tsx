import type { AnswerStats } from '../../lib/quizLogic';
import styles from './QuestionReview.module.css';

interface QuestionReviewProps {
  stats: AnswerStats;
}

export function QuestionReview({ stats }: QuestionReviewProps) {
  return (
    <div className={styles.wrap}>
      <h3 className={styles.heading}>Revisión de Respuestas</h3>
      <div className={styles.list}>
        {stats.perQuestion.map(({ question, answer, index }) => {
          const isCorrect = answer?.isCorrect ?? false;
          const selected = answer?.selectedAnswer;
          return (
            <div
              key={question.id}
              className={`${styles.item} ${isCorrect ? styles.correct : styles.wrong}`}
            >
              <div className={styles.itemHeader}>
                <span className={styles.qNum}>#{index + 1}</span>
                {question.difficulty && (
                  <span className={styles.diff}>{question.difficulty}</span>
                )}
                {question.category && (
                  <span className={styles.cat}>{question.category}</span>
                )}
                <span className={`${styles.badge} ${isCorrect ? styles.badgeOk : styles.badgeErr}`}>
                  {isCorrect ? '✓ Correcta' : '✗ Incorrecta'}
                </span>
              </div>
              <p className={styles.qText}>{question.text}</p>
              <div className={styles.answers}>
                {(['A', 'B', 'C', 'D'] as const).filter((k) => question.options[k]).map((k) => (
                  <div
                    key={k}
                    className={[
                      styles.opt,
                      k === question.correctAnswer ? styles.optCorrect : '',
                      k === selected && selected !== question.correctAnswer ? styles.optWrong : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <span className={styles.optKey}>{k}</span>
                    <span className={styles.optText}>{question.options[k]}</span>
                    {k === question.correctAnswer && (
                      <span className={styles.tag}>Correcta</span>
                    )}
                    {k === selected && selected !== question.correctAnswer && (
                      <span className={styles.tagWrong}>Tu respuesta</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
