// =============================================================================
// server.js — RESQID
// HTTP server startup with graceful shutdown.
// Run: node src/server.js
// =============================================================================

import app from './app.js';
import { ENV } from '#config/env.js';
import { logger } from '#config/logger.js';
import { connectPrisma, disconnectPrisma } from '#config/prisma.js';
import {
  initializeInfrastructure,
  shutdownInfrastructure,
} from '#infrastructure/infrastructure.index.js';
import { validateRuntimeConfig, printStartupBanner } from '#config/validation.js';
import { initQueues, closeAllQueues } from '#orchestrator/queues/queue.manager.js';
import { closeQueueConnection } from '#orchestrator/queues/queue.connection.js';

const PORT = ENV.PORT || 3000;

// ─── Shutdown Handler ─────────────────────────────────────────────────────────

let server = null;

const gracefulShutdown = async (signal) => {
  logger.info({ signal }, 'Shutdown signal received');

  if (!server) {
    process.exit(0);
  }

  // Set a forced exit timeout
  const forceExit = setTimeout(() => {
    logger.error('Forced shutdown after 15s timeout');
    process.exit(1);
  }, 15000);
  forceExit.unref();

  try {
    // 1. Stop accepting new requests
    server.close();

    // 2. Close BullMQ queues + workers
    await closeAllQueues();
    await closeQueueConnection();

    // 3. Shutdown infrastructure
    await shutdownInfrastructure();

    // 4. Disconnect database
    await disconnectPrisma();

    clearTimeout(forceExit);
    logger.info('Server closed gracefully');
    process.exit(0);
  } catch (err) {
    clearTimeout(forceExit);
    logger.error({ err: err.message }, 'Error during shutdown');
    process.exit(1);
  }
};

// ─── Start Server ─────────────────────────────────────────────────────────────

const start = async () => {
  try {
    // 1. Validate runtime config (Redis, DB, secrets)
    const configCheck = await validateRuntimeConfig();
    if (!configCheck.valid) {
      logger.error('Runtime config validation failed — exiting');
      process.exit(1);
    }

    // 2. Connect to database (with retry logic)
    await connectPrisma(3, 2000);

    // 3. Initialize infrastructure (cache, email, sms, storage)
    await initializeInfrastructure();
    logger.info('Infrastructure initialized');

    // 4. Initialize BullMQ queues
    initQueues();
    logger.info('Queues initialized');

    // 5. Start HTTP server
    server = app.listen(PORT, () => {
      printStartupBanner();
      logger.info({ port: PORT, env: ENV.NODE_ENV }, `Server running on port ${PORT}`);
    });

    // 6. Register shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // 7. Unhandled errors
    process.on('uncaughtException', (err) => {
      logger.error({ err }, 'Uncaught exception');
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
      logger.error({ reason }, 'Unhandled rejection');
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
};

start();
