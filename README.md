# OhKey Knowledge

Plataforma de evaluación de conocimientos con carga de Excel, quiz interactivo y panel de administración con historial por estudiante.

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Astro 6.3 (SSR, adaptador Vercel) |
| UI | React 18 (islands) |
| Base de datos | Neon (Postgres serverless) |
| Auth admin | JWT + cookie httpOnly |
| Excel | SheetJS (xlsx) |
| Estilos | CSS Modules + variables globales |

## Características

- **Identificación de participantes** — formulario de nombre completo antes de iniciar el quiz; los datos se persisten en la tabla `students`.
- **Quiz interactivo** — preguntas A/B/C/D con temporizador, barra de progreso y feedback de resultado inmediato.
- **Anti-duplicado** — cookie UUID + fingerprint de dispositivo; un intento por persona por quiz.
- **Panel admin** — crear/publicar/cerrar quizzes, ver estadísticas agregadas, listado de todos los envíos y historial individual por estudiante con desglose pregunta a pregunta.
- **Niveles de conocimiento** — Básico (0–59%), Medio (60–79%), Avanzado (80–100%).
- **Plantilla Excel** — endpoint `/api/template` genera un `.xlsx` de ejemplo descargable.

## Requisitos

- Node.js ≥ 18
- pnpm ≥ 8
- Cuenta en [Neon](https://neon.tech) (Postgres serverless)

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
JWT_SECRET=una-cadena-secreta-larga-y-aleatoria
ADMIN_PASSWORD=contraseña-del-panel-admin
```

> En producción (Vercel) estas variables se configuran en el dashboard del proyecto.

## Configuración de la base de datos

Ejecuta el siguiente SQL en la consola de Neon **una sola vez** para crear el esquema completo:

```sql
-- Tabla de quizzes
CREATE TABLE quizzes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  description  TEXT,
  status       TEXT        NOT NULL DEFAULT 'draft', -- draft | published | closed
  questions    JSONB       NOT NULL DEFAULT '[]',
  answers_key  JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  closed_at    TIMESTAMPTZ
);

-- Tabla de estudiantes (identidad estable por nombre normalizado)
CREATE TABLE students (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name  TEXT        NOT NULL,
  name_key   TEXT        NOT NULL UNIQUE, -- minúsculas, sin acentos, espacios normalizados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sesiones de quiz por participante
CREATE TABLE sessions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id      UUID        NOT NULL REFERENCES quizzes(id),
  student_id   UUID        REFERENCES students(id),
  cookie_token TEXT        NOT NULL,
  fingerprint  TEXT        NOT NULL,
  ip_address   TEXT,
  completed    BOOLEAN     NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON sessions(quiz_id);
CREATE INDEX ON sessions(student_id);

-- Respuestas individuales por sesión
CREATE TABLE answers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID        NOT NULL REFERENCES sessions(id),
  question_id     TEXT        NOT NULL,
  selected_answer TEXT,
  is_correct      BOOLEAN     NOT NULL DEFAULT FALSE,
  time_spent_ms   INT         NOT NULL DEFAULT 0,
  answered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON answers(session_id);

-- Resultados finales por sesión
CREATE TABLE results (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID        NOT NULL REFERENCES sessions(id),
  quiz_id          UUID        NOT NULL REFERENCES quizzes(id),
  total_questions  INT         NOT NULL,
  correct_answers  INT         NOT NULL,
  score            INT         NOT NULL,
  level            TEXT        NOT NULL, -- Basico | Medio | Avanzado
  time_spent_sec   INT         NOT NULL DEFAULT 0,
  completed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON results(quiz_id);
CREATE INDEX ON results(session_id);
```

Si ya tienes datos de prueba y quieres empezar desde cero, usa la migración incluida:

```bash
# Contenido en: db/migrations/001_students.sql
# Ejecutar en la consola SQL de Neon
```

## Instalación y desarrollo

```bash
# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo
pnpm dev

# Verificar tipos
pnpm type-check

# Build de producción
pnpm build
```

El servidor de desarrollo arranca en `http://localhost:4321`.

## Formato del archivo Excel

El archivo `.xlsx` debe contener las siguientes columnas (descarga la plantilla en `/api/template`):

| Columna | Requerida | Descripción |
|---------|-----------|-------------|
| `Pregunta` | ✅ | Texto de la pregunta |
| `Opcion_A` | ✅ | Texto de la opción A |
| `Opcion_B` | ✅ | Texto de la opción B |
| `Opcion_C` | — | Texto de la opción C |
| `Opcion_D` | — | Texto de la opción D |
| `Respuesta_Correcta` | ✅ | `A`, `B`, `C` o `D` |
| `Categoria` | — | Categoría libre |
| `Dificultad` | — | `Basico`, `Medio` o `Avanzado` |

Límite: 200 preguntas por archivo, tamaño máximo 10 MB.

## Flujo de uso

### Participante
1. Abre `/quiz` mientras hay un quiz publicado.
2. Ingresa nombre completo (mínimo nombre y apellido).
3. Responde las preguntas con un temporizador activo.
4. Ve su puntaje, nivel y desglose al finalizar.

### Administrador
1. Accede a `/admin` e inicia sesión con `ADMIN_PASSWORD`.
2. **Dashboard** — lista de quizzes con estado; crear, publicar y cerrar quizzes.
3. **Nuevo Quiz** — carga un archivo Excel, revisa las preguntas y guarda.
4. **Estadísticas** — métricas agregadas por quiz: distribución de niveles, puntajes y respuestas por pregunta.
5. **Resultados** — tabla de todos los envíos filtrable por nombre de estudiante o quiz en tiempo real; enlaza al historial individual.
6. **Historial del estudiante** — todos los intentos del estudiante con desglose pregunta a pregunta expandible.

## Despliegue en Vercel

```bash
# Instalar Vercel CLI
pnpm add -g vercel

# Desplegar
vercel --prod
```

Configura las tres variables de entorno (`DATABASE_URL`, `JWT_SECRET`, `ADMIN_PASSWORD`) en el panel de Vercel antes del primer despliegue.

El adaptador `@astrojs/vercel` v10+ es requerido para compatibilidad con Astro 6.

## Estructura del proyecto

```
src/
├── components/
│   ├── admin/
│   │   ├── QuizList.tsx        # Lista de quizzes en dashboard
│   │   ├── QuizUploader.tsx    # Carga y preview de Excel
│   │   ├── ResultsTable.tsx    # Tabla de resultados con búsqueda
│   │   ├── StatsOverview.tsx   # Estadísticas por quiz
│   │   └── StudentHistory.tsx  # Historial por estudiante
│   ├── quiz/
│   │   ├── PublicQuizApp.tsx   # App principal del quiz (identificación → respuestas → resultado)
│   │   ├── QuizCard.tsx        # Tarjeta de pregunta individual
│   │   └── QuizProgress.tsx    # Barra de progreso y temporizador
│   └── ui/
│       ├── Button.tsx
│       └── ProgressBar.tsx
├── layouts/
│   ├── AdminLayout.astro       # Shell del panel admin con sidebar
│   └── BaseLayout.astro        # Layout público
├── lib/
│   ├── auth.ts                 # JWT sign/verify
│   ├── db.ts                   # Cliente Neon
│   ├── excelParser.ts          # Parseo de SheetJS → preguntas
│   ├── fingerprint.ts          # Huella de dispositivo (IP + UA + idioma)
│   ├── quizLogic.ts            # Niveles, mensajes y formateo de tiempo
│   └── validators.ts           # Validación de Excel, nombres y sanitización
├── pages/
│   ├── admin/
│   │   ├── index.astro         # Dashboard
│   │   ├── login.astro         # Login admin
│   │   ├── results.astro       # Resultados de participantes
│   │   ├── student/[id].astro  # Historial individual
│   │   └── quiz/
│   │       ├── [id].astro      # Estadísticas del quiz
│   │       └── new.astro       # Crear quiz
│   ├── api/
│   │   ├── admin/              # Endpoints admin (protegidos por JWT)
│   │   └── quiz/               # Endpoints públicos del quiz
│   ├── index.astro             # Landing page
│   └── quiz.astro              # Página del quiz activo
├── stores/
│   └── quizStore.ts            # Nanostores (estado del quiz privado)
└── types/
    └── quiz.ts                 # Tipos TypeScript compartidos
db/
└── migrations/
    └── 001_students.sql        # Migración: tabla students + student_id en sessions
```
