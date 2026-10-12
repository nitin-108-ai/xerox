import { defineConfig } from 'vitest/config';
import path from 'path';

const localModules = process.env.NODE_PATH || 'C:/Users/nitin/smart_xerox_build/backend/node_modules';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      'pg': path.join(localModules, 'pg'),
      '@electric-sql/pglite': path.join(localModules, '@electric-sql/pglite'),
      'pdf-lib': path.join(localModules, 'pdf-lib'),
      'supertest': path.join(localModules, 'supertest'),
      'bcryptjs': path.join(localModules, 'bcryptjs'),
      'uuid': path.join(localModules, 'uuid'),
      'qrcode': path.join(localModules, 'qrcode'),
      'zod': path.join(localModules, 'zod'),
      'jsonwebtoken': path.join(localModules, 'jsonwebtoken'),
      'express': path.join(localModules, 'express'),
      'cors': path.join(localModules, 'cors'),
      'helmet': path.join(localModules, 'helmet'),
      'multer': path.join(localModules, 'multer'),
      'dotenv': path.join(localModules, 'dotenv'),
    },
  },
});
