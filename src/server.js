// =============================================================================
// server.js — RESQID
// HTTP server startup with graceful shutdown.
// Run: node src/server.js
// =============================================================================

import app from './app.js';
import { ENV } from '#config/env.js';
import { logger } from '#config/logger.js';
import { prisma } from '#config/prisma.js';
import {
  initializeInfrastructure,
  shutdownInfrastructure,
} from '#infrastructure/infrastructure.index.js';
import {
  validateRuntimeConfig,
  printStartupBanner,
  enhancedGracefulShutdown,
} from '#config/validation.js';
import { initQueues } from '#orchestrator/queues/queue.manager.js';

const PORT = ENV.PORT || 3000;

// ─── Start Server ─────────────────────────────────────────────────────────────

const start = async () => {
  try {
    // 1. Validate runtime config (Redis, DB, secrets)
    const configCheck = await validateRuntimeConfig();
    if (!configCheck.valid) {
      logger.error('Runtime config validation failed — exiting');
      process.exit(1);
    }

    // 2. Connect to database
    await prisma.$connect();
    logger.info('Database connected');

    // 3. Initialize infrastructure (cache, email, sms, storage)
    await initializeInfrastructure();
    logger.info('Infrastructure initialized');

    // 4. Initialize BullMQ queues
    initQueues();
    logger.info('Queues initialized');

    // 5. Start HTTP server
    const server = app.listen(PORT, () => {
      printStartupBanner();
      logger.info({ port: PORT, env: ENV.NODE_ENV }, `Server running on port ${PORT}`);
    });

    // 6. Graceful shutdown
    const shutdown = async (signal) => {
      logger.info({ signal }, 'Shutdown signal received');

      server.close(async () => {
        try {
          await shutdownInfrastructure();
          await prisma.$disconnect();
          logger.info('Server closed gracefully');
          process.exit(0);
        } catch (err) {
          logger.error({ err: err.message }, 'Error during shutdown');
          process.exit(1);
        }
      });

      // Force exit after 15 seconds if graceful shutdown hangs
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 15000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // 7. Unhandled errors
    process.on('uncaughtException', (err) => {
      logger.error({ err }, 'Uncaught exception');
      shutdown('uncaughtException');
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
