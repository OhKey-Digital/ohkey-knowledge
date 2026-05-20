import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import {
  $questions,
  $answers,
  $currentIndex,
  $quizState,
  $quizTitle,
  $startTime,
  submitAnswer,
  resetQuiz,
  saveToHistory,
} from '../../stores/quizStore';
import { buildQuizResult } from '../../lib/quizLogic';
import { QuizProgress } from './QuizProgress';
import { QuizCard } from './QuizCard';
import { Button } from '../ui/Button';
import type { AnswerKey } from '../../types/quiz';
import styles from './QuizApp.module.css';

export function QuizApp() {
  const questions = useStore($questions);
  const answers = useStore($answers);
  const currentIndex = useStore($currentIndex);
  const quizState = useStore($quizState);
  const quizTitle = useStore($quizTitle);
  const startTime = useStore($startTime);

  const [elapsedSec, setElapsedSec] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (quizState !== 'active') return;
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [quizState, startTime]);

  useEffect(() => {
    if (quizState === 'idle' && !transitioning) {
      window.location.href = '/';
    }
  }, [quizState, transitioning]);

  useEffect(() => {
    if (quizState !== 'completed') return;
    const result = buildQuizResult(questions, answers, startTime);
    saveToHistory({ ...result, quizTitle });
    setTransitioning(true);
    const t = setTimeout(() => { window.location.href = '/dashboard'; }, 400);
    return () => clearTimeout(t);
  }, [quizState]); // eslint-disable-line react-hooks/exhaustive-deps

  if (quizState === 'idle' || quizState === 'completed') {
    return (
      <div className={styles.centerMsg}>
        <div className={styles.spinner} />
        <p className={styles.centerText}>
          {quizState === 'completed' ? 'Calculando resultados…' : 'Redirigiendo…'}
        </p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) return null;

  const handleAbort = () => {
    if (window.confirm('¿Seguro que quieres salir? Se perderá el progreso actual.')) {
      resetQuiz();
      window.location.href = '/';
    }
  };

  return (
    <div className={styles.wrapper}>
      <QuizProgress
        current={currentIndex + 1}
        total={questions.length}
        title={quizTitle}
        elapsedSec={elapsedSec}
      />

      <QuizCard
        key={currentQuestion.id}
        question={currentQuestion}
        questionNumber={currentIndex + 1}
        onSubmit={(answer: AnswerKey | null) => submitAnswer(answer)}
      />

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={handleAbort}>
          Salir del quiz
        </Button>
        <span className={styles.footerNote}>
          {answers.filter((a) => a.isCorrect).length} correctas · {answers.length} respondidas
        </span>
      </div>
    </div>
  );
}
