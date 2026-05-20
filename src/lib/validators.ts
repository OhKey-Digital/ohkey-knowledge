import type { ExcelRow, ValidationResult } from '../types/quiz';

const ALLOWED_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/octet-stream',
]);

const REQUIRED_COLUMNS = [
  'Pregunta',
  'Opcion_A',
  'Opcion_B',
  'Opcion_C',
  'Opcion_D',
  'Respuesta_Correcta',
] as const;

const VALID_ANSWERS = new Set(['A', 'B', 'C', 'D']);
const VALID_DIFFICULTIES = new Set(['Basico', 'Básico', 'Medio', 'Avanzado', '']);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_QUESTIONS = 200;

export function validateFile(file: File): ValidationResult {
  const errors: string[] = [];

  const name = file.name.toLowerCase();
  if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
    errors.push('El archivo debe tener extensión .xlsx o .xls');
  }

  if (!ALLOWED_MIME_TYPES.has(file.type) && file.type !== '') {
    errors.push(`Tipo MIME no permitido: ${file.type}`);
  }

  if (file.size === 0) {
    errors.push('El archivo está vacío');
  } else if (file.size > MAX_FILE_SIZE) {
    errors.push('El archivo supera el límite de 10 MB');
  }

  return { valid: errors.length === 0, errors };
}

export function validateColumns(headers: string[]): ValidationResult {
  const errors: string[] = [];
  const normalized = new Set(headers.map((h) => h.trim()));

  for (const col of REQUIRED_COLUMNS) {
    if (!normalized.has(col)) {
      errors.push(`Columna requerida faltante: "${col}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateRows(rows: ExcelRow[]): ValidationResult {
  const errors: string[] = [];

  if (rows.length === 0) {
    return { valid: false, errors: ['El archivo no contiene ninguna pregunta'] };
  }

  if (rows.length > MAX_QUESTIONS) {
    errors.push(`El archivo excede el máximo de ${MAX_QUESTIONS} preguntas`);
  }

  rows.forEach((row, i) => {
    const rowNum = i + 2;

    if (!row.Pregunta.trim()) {
      errors.push(`Fila ${rowNum}: La pregunta no puede estar vacía`);
    }

    if (!row.Opcion_A.trim() || !row.Opcion_B.trim()) {
      errors.push(`Fila ${rowNum}: Las opciones A y B son obligatorias`);
    }

    const ans = row.Respuesta_Correcta.trim().toUpperCase();
    if (!VALID_ANSWERS.has(ans)) {
      errors.push(
        `Fila ${rowNum}: Respuesta_Correcta debe ser A, B, C o D (encontrado: "${row.Respuesta_Correcta}")`
      );
    }

    const diff = (row.Dificultad ?? '').trim();
    if (diff && !VALID_DIFFICULTIES.has(diff)) {
      errors.push(
        `Fila ${rowNum}: Dificultad debe ser Basico, Medio o Avanzado (encontrado: "${diff}")`
      );
    }
  });

  return { valid: errors.length === 0, errors };
}

export function sanitizeString(value: unknown, maxLen = 500): string {
  if (value === null || value === undefined) return '';
  const MAP: Record<string, string> = {
    '<': '',
    '>': '',
    '"': '&quot;',
    "'": '&#39;',
    '&': '&amp;',
  };
  return String(value)
    .trim()
    .replace(/[<>"'&]/g, (c) => MAP[c] ?? c)
    .slice(0, maxLen);
}
