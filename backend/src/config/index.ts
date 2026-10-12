import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'smart-xerox-super-secret-production-grade-jwt-key-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  storagePath: process.env.STORAGE_PATH || path.join(process.cwd(), 'private_storage'),
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10),
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
  ],
  retentionCheckIntervalMs: parseInt(process.env.RETENTION_INTERVAL_MS || '60000', 10), // 1 minute
  defaultRetentionHours: parseInt(process.env.DEFAULT_RETENTION_HOURS || '24', 10),
};
