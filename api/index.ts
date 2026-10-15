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

  // If invoked via catch-all [...path], reconstruct original URL
  if ((req as any).query?.path) {
    const rawPath = (req as any).query.path;
    const subpath = Array.isArray(rawPath) ? rawPath.join('/') : rawPath;
    req.url = `/api/${subpath}`;
  } else if ((req as any).headers?.['x-matched-path']) {
    req.url = (req as any).headers['x-matched-path'];
  }

  // Handle CORS preflight explicitly
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-order-token');
    return res.status(204).end();
  }

  return app(req, res);
}

