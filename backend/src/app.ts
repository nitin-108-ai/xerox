import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes.js';
import shopRoutes from './routes/shop.routes.js';
import orderRoutes from './routes/order.routes.js';
import adminRoutes from './routes/admin.routes.js';
import printerRoutes from './routes/printer.routes.js';
import { config } from './config/index.js';

export const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Customized per preview stream endpoint
}));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin) return callback(null, true);
    // Allow local frontend dev servers or production frontend URL
    if (
      origin === config.frontendUrl ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }
    return callback(null, true); // Dev flexible
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-order-token'],
}));

// Body parsing
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'smart-xerox-api',
    version: '1.0.0'
  });
});

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mount modular API routers
app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/printers', printerRoutes);
// Static serving for public shop uploads (logos, gallery images)
const publicUploadsDir = path.resolve(process.cwd(), 'public_uploads');
if (!fs.existsSync(publicUploadsDir)) {
  fs.mkdirSync(publicUploadsDir, { recursive: true });
}
app.use('/api/uploads', express.static(publicUploadsDir));

// 404 handler for unknown API routes
app.all('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'The requested API endpoint was not found.' });
});

// Statically serve frontend production bundle if built
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Centralized error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Error Handler]:', err.message || err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'An unexpected internal error occurred.';

  res.status(statusCode).json({
    error: message,
    statusCode
  });
});
