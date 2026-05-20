import { useState } from 'react';
import type { Question, AnswerKey } from '../../types/quiz';
import { Button } from '../ui/Button';
import styles from './QuizCard.module.css';

const OPTION_KEYS: AnswerKey[] = ['A', 'B', 'C', 'D'];

interface QuizCardProps {
  question: Question;
  questionNumber: number;
  onSubmit: (answer: AnswerKey | null) => void;
}

type CardState = 'answering' | 'revealed';

export function QuizCard({ question, questionNumber, onSubmit }: QuizCardProps) {
  const [selected, setSelected] = useState<AnswerKey | null>(null);
  const [cardState, setCardState] = useState<CardState>('answering');

  const handleSelect = (key: AnswerKey) => {
    if (cardState === 'revealed') return;
    setSelected(key);
  };

  const handleConfirm = () => {
    if (cardState === 'revealed') return;
    setCardState('revealed');
  };

  const handleNext = () => {
    onSubmit(selected);
    setSelected(null);
    setCardState('answering');
  };

  const getOptionClass = (key: AnswerKey): string => {
    const classes = [styles.option];
    if (cardState === 'answering') {
      if (selected === key) classes.push(styles.selected);
    } else {
      if (key === question.correctAnswer) classes.push(styles.correct);
      else if (selected === key) classes.push(styles.wrong);
      else classes.push(styles.dim);
    }
    return classes.join(' ');
  };

  const availableOptions = OPTION_KEYS.filter((k) => question.options[k]);

  return (
    <article className={styles.card}>
      {question.difficulty && (
        <span className={`${styles.diffBadge} ${styles[`diff_${question.difficulty}`]}`}>
          {question.difficulty}
        </span>
      )}
      {question.category && (
        <span className={styles.catBadge}>{question.category}</span>
      )}

      <p className={styles.questionNum}>Pregunta {questionNumber}</p>
      <h2 className={styles.questionText}>{question.text}</h2>

      <div className={styles.options} role="radiogroup" aria-label="Opciones de respuesta">
        {availableOptions.map((key) => (
          <button
            key={key}
            className={getOptionClass(key)}
            onClick={() => handleSelect(key)}
            disabled={cardState === 'revealed'}
            aria-pressed={selected === key}
            aria-label={`Opción ${key}: ${question.options[key]}`}
          >
            <span className={styles.optionKey}>{key}</span>
            <span className={styles.optionText}>{question.options[key]}</span>
            {cardState === 'revealed' && key === question.correctAnswer && (
              <svg className={styles.checkIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {cardState === 'revealed' && key === selected && selected !== question.correctAnswer && (
              <svg className={styles.crossIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
          </button>
        ))}
      </div>

      {cardState === 'revealed' && (
        <div
          className={`${styles.feedback} ${selected === question.correctAnswer ? styles.feedbackCorrect : styles.feedbackWrong}`}
          role="status"
          aria-live="polite"
        >
          {selected === question.correctAnswer
            ? '¡Correcto!'
            : `Respuesta correcta: ${question.correctAnswer}`}
        </div>
      )}

      <div className={styles.actions}>
        {cardState === 'answering' ? (
          <Button
            onClick={handleConfirm}
            disabled={selected === null}
            fullWidth
          >
            {selected === null ? 'Selecciona una respuesta' : 'Confirmar respuesta'}
          </Button>
        ) : (
          <Button onClick={handleNext} fullWidth>
            Siguiente pregunta →
          </Button>
        )}
      </div>
    </article>
  );
}
