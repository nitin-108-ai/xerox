import { Pool } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

let pool: Pool | null = null;
let pgliteInstance: PGlite | null = null;
let isUsingPgLite = false;

export async function initDb() {
  if (pool || pgliteInstance) {
    return;
  }

  const connectionString = process.env.DATABASE_URL;

  if (connectionString && !process.env.FORCE_PGLITE) {
    try {
      console.log('Connecting to PostgreSQL database via connection string...');
      pool = new Pool({ connectionString });
      await pool.query('SELECT NOW()');
      console.log('Successfully connected to external PostgreSQL.');
      return;
    } catch (err: any) {
      console.warn(`Could not connect to external PostgreSQL (${err.message}). Falling back to embedded PGlite engine.`);
    }
  }

  // Use embedded PGlite on local fast drive
  isUsingPgLite = true;
  const defaultDir = process.env.LOCALAPPDATA 
    ? path.join(process.env.LOCALAPPDATA, 'smart_xerox_pgdata')
    : path.join(process.cwd(), 'data', 'pglite');
  const dataDir = process.env.PGLITE_DATA_DIR || defaultDir;

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  console.log(`Initializing in-process PostgreSQL (PGlite) engine at ${dataDir}...`);
  pgliteInstance = new PGlite(dataDir);
  console.log('PGlite engine initialized successfully.');
}

export async function execSql(sql: string): Promise<void> {
  if (!pool && !pgliteInstance) {
    await initDb();
  }

  if (pool) {
    await pool.query(sql);
  } else if (pgliteInstance) {
    await pgliteInstance.exec(sql);
  }
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
  if (!pool && !pgliteInstance) {
    await initDb();
  }

  if (pool) {
    const res = await pool.query(sql, params);
    return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
  } else if (pgliteInstance) {
    const res = await pgliteInstance.query<T>(sql, params);
    return { rows: res.rows, rowCount: res.rows.length };
  }

  throw new Error('Database not initialized');
}

export async function transaction<T>(callback: (client: { query: typeof query }) => Promise<T>): Promise<T> {
  if (!pool && !pgliteInstance) {
    await initDb();
  }

  if (pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const scopedQuery = async (sql: string, params: any[] = []) => {
        const res = await client.query(sql, params);
        return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
      };
      const result = await callback({ query: scopedQuery as any });
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } else if (pgliteInstance) {
    return await pgliteInstance.transaction(async (tx) => {
      const scopedQuery = async (sql: string, params: any[] = []) => {
        const res = await tx.query(sql, params);
        return { rows: res.rows, rowCount: res.rows.length };
      };
      return await callback({ query: scopedQuery as any });
    });
  }

  throw new Error('Database not initialized');
}

export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
  }
  if (pgliteInstance) {
    await pgliteInstance.close();
    pgliteInstance = null;
  }
}
