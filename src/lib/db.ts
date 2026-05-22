import { neon } from '@neondatabase/serverless';

if (!import.meta.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está configurada en las variables de entorno');
}

export const sql = neon(import.meta.env.DATABASE_URL);
