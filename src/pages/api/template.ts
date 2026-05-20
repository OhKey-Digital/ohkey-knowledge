import type { APIRoute } from 'astro';
import * as XLSX from 'xlsx';

export const GET: APIRoute = async () => {
  const rows = [
    {
      Pregunta: '¿Cuál es la capital de España?',
      Opcion_A: 'Barcelona',
      Opcion_B: 'Madrid',
      Opcion_C: 'Sevilla',
      Opcion_D: 'Valencia',
      Respuesta_Correcta: 'B',
      Categoria: 'Geografía',
      Dificultad: 'Basico',
    },
    {
      Pregunta: '¿Cuántos bytes tiene un kilobyte?',
      Opcion_A: '512',
      Opcion_B: '2048',
      Opcion_C: '1024',
      Opcion_D: '256',
      Respuesta_Correcta: 'C',
      Categoria: 'Informática',
      Dificultad: 'Basico',
    },
    {
      Pregunta: '¿Qué lenguaje usa React por defecto para describir la UI?',
      Opcion_A: 'TypeScript',
      Opcion_B: 'HTML puro',
      Opcion_C: 'JSX',
      Opcion_D: 'Pug',
      Respuesta_Correcta: 'C',
      Categoria: 'Desarrollo Web',
      Dificultad: 'Medio',
    },
    {
      Pregunta: '¿Qué complejidad tiene el algoritmo QuickSort en el peor caso?',
      Opcion_A: 'O(n)',
      Opcion_B: 'O(n log n)',
      Opcion_C: 'O(n²)',
      Opcion_D: 'O(log n)',
      Respuesta_Correcta: 'C',
      Categoria: 'Algoritmos',
      Dificultad: 'Avanzado',
    },
    {
      Pregunta: '¿Qué patrón de diseño es el Observer?',
      Opcion_A: 'Creacional',
      Opcion_B: 'Estructural',
      Opcion_C: 'Funcional',
      Opcion_D: 'Comportamiento',
      Respuesta_Correcta: 'D',
      Categoria: 'Arquitectura',
      Dificultad: 'Avanzado',
    },
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  ws['!cols'] = [
    { wch: 50 }, // Pregunta
    { wch: 25 }, // Opcion_A
    { wch: 25 }, // Opcion_B
    { wch: 25 }, // Opcion_C
    { wch: 25 }, // Opcion_D
    { wch: 18 }, // Respuesta_Correcta
    { wch: 18 }, // Categoria
    { wch: 12 }, // Dificultad
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Preguntas');

  const rawBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

  return new Response(rawBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="plantilla-ohkey.xlsx"',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
