import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Automatically ensures that the pgvector extension is enabled in PostgreSQL
 * before Prisma runs schema synchronization.
 */
async function initDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn('[db-init]: No DATABASE_URL found, skipping extension initialization.');
    return;
  }

  const isLocal =
    databaseUrl.includes('localhost') ||
    databaseUrl.includes('127.0.0.1') ||
    databaseUrl.includes('postgres:5432');

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('[db-init]: pgvector extension verified / enabled successfully.');
  } catch (err) {
    console.warn(`[db-init]: Note on pgvector extension: ${err.message}`);
  } finally {
    try {
      await client.end();
    } catch {
      // Ignore cleanup error
    }
  }
}

initDb();
