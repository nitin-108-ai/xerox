import { app } from './app.js';
import { config } from './config/index.js';
import { initDb } from './db/connection.js';
import { runMigrations } from './db/migrate.js';
import { retentionWorker } from './services/retention.worker.js';

async function bootstrap() {
  try {
    console.log('--- Initializing Smart Xerox Backend Service ---');
    await initDb();
    await runMigrations();

    // Start background file expiration worker
    retentionWorker.start();

    const server = app.listen(config.port, () => {
      console.log(`Smart Xerox API Server listening on port ${config.port} [${config.env}]`);
      console.log(`Frontend URL: ${config.frontendUrl}`);
    });

    const shutdown = async () => {
      console.log('\nShutting down Smart Xerox server gracefully...');
      retentionWorker.stop();
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err: any) {
    console.error('Fatal startup error:', err);
    process.exit(1);
  }
}

bootstrap();
