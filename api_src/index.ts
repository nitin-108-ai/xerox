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

  // Normalize req.url for Express router
  const queryPath = (req as any).query?.path;
  if (queryPath) {
    const subpath = Array.isArray(queryPath) ? queryPath.join('/') : queryPath;
    const cleanSubpath = subpath.replace(/^\/+/, '');
    const qIndex = req.url.indexOf('?');
    const existingParams = new URLSearchParams(qIndex !== -1 ? req.url.slice(qIndex) : '');
    existingParams.delete('path');
    const qs = existingParams.toString();
    req.url = `/api/${cleanSubpath}${qs ? '?' + qs : ''}`;
  } else if ((req as any).headers?.['x-matched-path'] && (req as any).headers['x-matched-path'] !== '/api' && (req as any).headers['x-matched-path'] !== '/api/') {
    req.url = (req as any).headers['x-matched-path'];
  } else if (!req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? req.url : '/' + req.url}`;
  }

  // Handle CORS preflight explicitly
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-order-token, idempotency-key');
    return res.status(204).end();
  }

  return app(req, res);
}

