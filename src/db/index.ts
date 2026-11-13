import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

// Add global connection pool caching to persist across hot-reloads & serverless warm starts
declare global {
  var _postgresPool: Pool | undefined;
}

/**
 * Membersihkan query parameter ?sslmode=... pada connection string Supabase/Vercel
 * agar node-postgres (pg) selalu menghormati opsi ssl: { rejectUnauthorized: false }.
 */
function sanitizeConnectionString(rawUrl: string): { cleanUrl: string; isLocal: boolean } {
  const isLocal = rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1');
  try {
    const parsed = new URL(rawUrl);
    parsed.searchParams.delete('sslmode');
    parsed.searchParams.delete('supa');
    return { cleanUrl: parsed.toString(), isLocal };
  } catch {
    return { cleanUrl: rawUrl, isLocal };
  }
}

/**
 * Menentukan connection string atau parameter Postgres yang tersedia di environment:
 * Prioritas: Supabase/Vercel Postgres URL -> Host Params -> Cloud SQL (AI Studio)
 */
export function getDatabaseConfigInfo(): {
  hasPostgres: boolean;
  provider: 'Supabase / PostgreSQL' | 'Cloud SQL PostgreSQL' | 'None';
} {
  const connStr =
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.POSTGRES_PRISMA_URL;

  if (connStr) {
    return { hasPostgres: true, provider: 'Supabase / PostgreSQL' };
  }

  if (process.env.POSTGRES_HOST && process.env.POSTGRES_USER) {
    return { hasPostgres: true, provider: 'Supabase / PostgreSQL' };
  }

  if (process.env.SQL_HOST && process.env.SQL_USER) {
    return { hasPostgres: true, provider: 'Cloud SQL PostgreSQL' };
  }

  return { hasPostgres: false, provider: 'None' };
}

export const createPool = () => {
  if (!global._postgresPool) {
    const rawConnStr =
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.DATABASE_URL ||
      process.env.SUPABASE_DB_URL ||
      process.env.POSTGRES_PRISMA_URL;

    if (rawConnStr) {
      const { cleanUrl, isLocal } = sanitizeConnectionString(rawConnStr);
      global._postgresPool = new Pool({
        connectionString: cleanUrl,
        ssl: isLocal ? false : { rejectUnauthorized: false },
        max: 5,
        idleTimeoutMillis: 20000,
        connectionTimeoutMillis: 15000,
      });
    } else if (process.env.POSTGRES_HOST && process.env.POSTGRES_USER) {
      const isLocal =
        process.env.POSTGRES_HOST.includes('localhost') ||
        process.env.POSTGRES_HOST.includes('127.0.0.1');
      global._postgresPool = new Pool({
        host: process.env.POSTGRES_HOST,
        port: Number(process.env.POSTGRES_PORT || 5432),
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DATABASE || 'postgres',
        ssl: isLocal ? false : { rejectUnauthorized: false },
        max: 5,
        idleTimeoutMillis: 20000,
        connectionTimeoutMillis: 15000,
      });
    } else {
      global._postgresPool = new Pool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 10,
        connectionTimeoutMillis: 15000,
      });
    }

    // Prevent unhandled pool-level errors from crashing the application
    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

export const pool = createPool();
export const db = drizzle(pool, { schema });
