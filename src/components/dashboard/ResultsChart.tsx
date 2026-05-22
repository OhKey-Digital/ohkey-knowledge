import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import type { AnswerStats } from '../../lib/quizLogic';
import { LEVEL_CONFIG } from '../../lib/quizLogic';
import styles from './ResultsChart.module.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const chartDefaults = {
  color: 'rgba(169,178,255,0.7)',
  font: { family: 'Inter, system-ui, sans-serif' },
};
ChartJS.defaults.color = chartDefaults.color;
ChartJS.defaults.font.family = chartDefaults.font.family;

interface LevelChartProps {
  score: number;
}

export function LevelChart({ score }: LevelChartProps) {
  const empty = 100 - score;
  const level = score >= 80 ? 'Avanzado' : score >= 60 ? 'Medio' : 'Basico';
  const config = LEVEL_CONFIG[level];

  const data = {
    labels: [LEVEL_CONFIG.Basico.label, LEVEL_CONFIG.Medio.label, LEVEL_CONFIG.Avanzado.label, 'Sin puntaje'],
    datasets: [
      {
        data: [
          Math.min(score, 59),
          score >= 60 ? Math.min(score - 59, 20) : 0,
          score >= 80 ? score - 79 : 0,
          empty,
        ],
        backgroundColor: [
          score >= 0 ? LEVEL_CONFIG.Basico.color + 'cc' : 'rgba(169,178,255,0.08)',
          score >= 60 ? LEVEL_CONFIG.Medio.color + 'cc' : 'rgba(169,178,255,0.08)',
          score >= 80 ? LEVEL_CONFIG.Avanzado.color + 'cc' : 'rgba(169,178,255,0.08)',
          'rgba(255,255,255,0.04)',
        ],
        borderColor: [
          LEVEL_CONFIG.Basico.color + '66',
          LEVEL_CONFIG.Medio.color + '66',
          LEVEL_CONFIG.Avanzado.color + '66',
          'transparent',
        ],
        borderWidth: 1,
        hoverOffset: 4,
      },
    ],
  };

  return (
    <div className={styles.chartWrap}>
      <h3 className={styles.chartTitle}>Nivel de Conocimiento</h3>
      <div className={styles.doughnutContainer}>
        <Doughnut
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: true,
            cutout: '70%',
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => ` ${ctx.label}: ${ctx.raw}pts`,
                },
              },
            },
            animation: { animateRotate: true, duration: 900 },
          }}
        />
        <div className={styles.doughnutCenter} style={{ color: config.color }}>
          <span className={styles.doughnutLevel}>{config.label}</span>
        </div>
      </div>
      <div className={styles.legend}>
        {(Object.entries(LEVEL_CONFIG) as [string, typeof LEVEL_CONFIG['Basico']][]).map(([key, cfg]) => (
          <div key={key} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: cfg.color }} />
            <span className={styles.legendLabel}>{cfg.label}</span>
            <span className={styles.legendRange}>{cfg.min}–{cfg.max}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CategoryChartProps {
  stats: AnswerStats;
}

export function CategoryChart({ stats }: CategoryChartProps) {
  const categories = Object.entries(stats.byCategory);
  if (!categories.length) return null;

  const labels = categories.map(([cat]) => cat);
  const correctData = categories.map(([, s]) => s.correct);
  const wrongData = categories.map(([, s]) => s.total - s.correct);

  const data = {
    labels,
    datasets: [
      {
        label: 'Correctas',
        data: correctData,
        backgroundColor: 'rgba(34, 211, 165, 0.7)',
        borderColor: 'rgba(34, 211, 165, 0.9)',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Incorrectas',
        data: wrongData,
        backgroundColor: 'rgba(248, 113, 113, 0.6)',
        borderColor: 'rgba(248, 113, 113, 0.8)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className={styles.chartWrap}>
      <h3 className={styles.chartTitle}>Rendimiento por Categoría</h3>
      <Bar
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { boxWidth: 12, padding: 16 },
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw} preguntas`,
              },
            },
          },
          scales: {
            x: {
              stacked: false,
              grid: { color: 'rgba(169,178,255,0.06)' },
              ticks: { maxRotation: 35, minRotation: 0 },
            },
            y: {
              stacked: false,
              beginAtZero: true,
              ticks: { stepSize: 1 },
              grid: { color: 'rgba(169,178,255,0.06)' },
            },
          },
          animation: { duration: 900 },
        }}
        style={{ minHeight: '220px', maxHeight: '400px' }}
      />
    </div>
  );
}

interface DifficultyChartProps {
  stats: AnswerStats;
}

export function DifficultyChart({ stats }: DifficultyChartProps) {
  const diffs = Object.entries(stats.byDifficulty).filter(([, s]) => s.total > 0);
  if (!diffs.length) return null;

  const labels = diffs.map(([d]) =>
    d === 'Basico' ? 'Básico' : d === 'Sin clasificar' ? 'Sin nivel' : d
  );
  const pctData = diffs.map(([, s]) =>
    s.total ? Math.round((s.correct / s.total) * 100) : 0
  );

  const bgColors = diffs.map(([d]) => {
    if (d === 'Basico') return 'rgba(169,178,255,0.7)';
    if (d === 'Medio') return 'rgba(127,87,255,0.7)';
    if (d === 'Avanzado') return 'rgba(66,51,206,0.85)';
    return 'rgba(169,178,255,0.3)';
  });

  const data = {
    labels,
    datasets: [
      {
        label: '% Aciertos',
        data: pctData,
        backgroundColor: bgColors,
        borderColor: bgColors.map((c) => c.replace(/[\d.]+\)$/, '1)')),
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  return (
    <div className={styles.chartWrap}>
      <h3 className={styles.chartTitle}>Aciertos por Dificultad</h3>
      <Bar
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` Aciertos: ${ctx.raw}%`,
              },
            },
          },
          scales: {
            x: { grid: { color: 'rgba(169,178,255,0.06)' } },
            y: {
              beginAtZero: true,
              max: 100,
              ticks: { callback: (v) => `${v}%` },
              grid: { color: 'rgba(169,178,255,0.06)' },
            },
          },
          animation: { duration: 900 },
        }}
        style={{ minHeight: '200px', maxHeight: '380px' }}
      />
    </div>
  );
}
