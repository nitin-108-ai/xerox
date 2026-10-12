import type { Request, Response } from 'express';
import { app } from '../backend/src/app.js';
import { initDb } from '../backend/src/db/connection.js';
import { runMigrations } from '../backend/src/db/migrate.js';
import { runSeed } from '../backend/src/db/seed.js';

let isInitialized = false;
let initPromise: Promise<void> | null = null;

async function ensureDb() {
  if (isInitialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        console.log('[Vercel Serverless] Initializing database...');
        await initDb();
        await runMigrations();
        await runSeed().catch(() => {});
        isInitialized = true;
        console.log('[Vercel Serverless] Database ready.');
      } catch (err) {
        console.error('[Vercel Serverless] Database initialization failure:', err);
      }
    })();
  }
  await initPromise;
}

export default async function handler(req: Request, res: Response) {
  await ensureDb();
  return app(req, res);
}
