-- Migración 001: Tabla de estudiantes e identificación de participantes
-- Ejecutar manualmente en la consola de Neon (en este orden)

-- Limpiar datos de prueba existentes
TRUNCATE TABLE answers  CASCADE;
TRUNCATE TABLE results  CASCADE;
TRUNCATE TABLE sessions CASCADE;

-- Tabla de identidad estable por nombre normalizado
CREATE TABLE IF NOT EXISTS students (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name  TEXT        NOT NULL,
  name_key   TEXT        NOT NULL UNIQUE, -- nombre en minúsculas, sin acentos, espacios normalizados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enlace de cada sesión con su estudiante (NULL en sesiones legadas)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id);
CREATE INDEX IF NOT EXISTS idx_sessions_student ON sessions(student_id);
