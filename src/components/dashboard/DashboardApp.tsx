import { useStore } from '@nanostores/react';
import { $questions, $answers, $quizTitle, $startTime, $historicalResults, resetQuiz } from '../../stores/quizStore';
import { buildQuizResult, getAnswerStats } from '../../lib/quizLogic';
import { ScoreCard } from './ScoreCard';
import { LevelChart, CategoryChart, DifficultyChart } from './ResultsChart';
import { QuestionReview } from './QuestionReview';
import { HistoryPanel } from './HistoryPanel';
import { Button } from '../ui/Button';
import styles from './DashboardApp.module.css';

export function DashboardApp() {
  const questions = useStore($questions);
  const answers = useStore($answers);
  const quizTitle = useStore($quizTitle);
  const startTime = useStore($startTime);
  const history = useStore($historicalResults);

  const hasCurrentSession = questions.length > 0 && answers.length > 0;

  const handleNewQuiz = () => {
    resetQuiz();
    window.location.href = '/';
  };

  if (!hasCurrentSession) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📊</div>
        <h2 className={styles.emptyTitle}>Sin resultados recientes</h2>
        <p className={styles.emptyText}>
          Completa un quiz para ver tu análisis de conocimiento aquí.
        </p>
        {history.length > 0 && (
          <div className={styles.historySection}>
            <HistoryPanel history={history} />
          </div>
        )}
        <Button onClick={handleNewQuiz} size="lg">
          Subir un quiz
        </Button>
      </div>
    );
  }

  const result = buildQuizResult(questions, answers, startTime);
  const stats = getAnswerStats(questions, answers);
  const hasCategories = Object.keys(stats.byCategory).some((k) => k !== 'General' || stats.byCategory['General']!.total > 0);
  const hasDifficulties = Object.values(stats.byDifficulty).some((s) => s.total > 0);

  return (
    <div className={styles.wrapper}>
      <div className={styles.actions}>
        <Button variant="secondary" size="sm" onClick={handleNewQuiz}>
          ← Nuevo quiz
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.print()}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
            </svg>
          }
        >
          Imprimir
        </Button>
      </div>

      {/* Score summary */}
      <ScoreCard
        score={result.score}
        level={result.level}
        correct={result.correctAnswers}
        total={result.totalQuestions}
        timeSpentSec={result.timeSpentSec}
        quizTitle={quizTitle}
      />

      {/* Charts grid */}
      <div className={styles.chartsGrid}>
        <LevelChart score={result.score} />
        {hasDifficulties && <DifficultyChart stats={stats} />}
      </div>

      {hasCategories && (
        <CategoryChart stats={stats} />
      )}

      {/* Question-by-question review */}
      <QuestionReview stats={stats} />

      {/* Historical results */}
      {history.length > 1 && (
        <div className={styles.historySection}>
          <HistoryPanel history={history} />
        </div>
      )}
    </div>
  );
}
