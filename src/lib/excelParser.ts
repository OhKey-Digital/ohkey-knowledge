import * as XLSX from 'xlsx';
import type { Question, ExcelRow, ParseResult, AnswerKey, KnowledgeLevel } from '../types/quiz';
import { validateColumns, validateRows, sanitizeString } from './validators';

export async function parseExcelFile(file: File): Promise<ParseResult> {
  const warnings: string[] = [];
  let workbook: XLSX.WorkBook;

  try {
    const buffer = await file.arrayBuffer();
    workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  } catch {
    return {
      success: false,
      questions: [],
      errors: ['No se pudo leer el archivo. Verifica que no esté corrupto.'],
      warnings: [],
    };
  }

  if (!workbook.SheetNames.length) {
    return {
      success: false,
      questions: [],
      errors: ['El archivo Excel no contiene hojas.'],
      warnings: [],
    };
  }

  const sheetName = workbook.SheetNames[0]!;
  if (workbook.SheetNames.length > 1) {
    warnings.push(
      `Se encontraron ${workbook.SheetNames.length} hojas. Procesando solo "${sheetName}".`
    );
  }

  let rawData: Record<string, unknown>[];
  try {
    rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName]!, {
      defval: '',
      raw: false,
    });
  } catch {
    return {
      success: false,
      questions: [],
      errors: ['Error al extraer datos de la hoja Excel.'],
      warnings,
    };
  }

  if (!rawData.length) {
    return {
      success: false,
      questions: [],
      errors: ['La hoja está vacía o solo tiene encabezados.'],
      warnings,
    };
  }

  const headers = Object.keys(rawData[0]!);
  const colValidation = validateColumns(headers);
  if (!colValidation.valid) {
    return { success: false, questions: [], errors: colValidation.errors, warnings };
  }

  const rows: ExcelRow[] = rawData.map((r) => ({
    Pregunta: sanitizeString(r['Pregunta']),
    Opcion_A: sanitizeString(r['Opcion_A']),
    Opcion_B: sanitizeString(r['Opcion_B']),
    Opcion_C: sanitizeString(r['Opcion_C']),
    Opcion_D: sanitizeString(r['Opcion_D']),
    Respuesta_Correcta: sanitizeString(r['Respuesta_Correcta'], 2),
    Categoria: sanitizeString(r['Categoria'], 100),
    Dificultad: sanitizeString(r['Dificultad'], 20),
  }));

  const rowValidation = validateRows(rows);
  if (!rowValidation.valid) {
    return { success: false, questions: [], errors: rowValidation.errors, warnings };
  }

  const questions: Question[] = rows
    .filter((r) => r.Pregunta.trim())
    .map((r, i) => ({
      id: `q-${i + 1}`,
      text: r.Pregunta,
      options: {
        A: r.Opcion_A,
        B: r.Opcion_B,
        C: r.Opcion_C || '',
        D: r.Opcion_D || '',
      } as Record<AnswerKey, string>,
      correctAnswer: r.Respuesta_Correcta.toUpperCase() as AnswerKey,
      category: r.Categoria || undefined,
      difficulty: normalizeDifficulty(r.Dificultad ?? ''),
    }));

  return { success: true, questions, errors: [], warnings };
}

function normalizeDifficulty(raw: string): KnowledgeLevel | undefined {
  const val = raw.trim();
  if (val === 'Basico' || val === 'Básico') return 'Basico';
  if (val === 'Medio') return 'Medio';
  if (val === 'Avanzado') return 'Avanzado';
  return undefined;
}
