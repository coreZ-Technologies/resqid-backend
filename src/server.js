// TODO: Add implementation
/**
 * server.js
 *
 * Starts the HTTP server and manages graceful shutdown.
 * This is the file you run with `node src/server.js` or
 * `pm2 start ecosystem.config.cjs`.
 */

import http from 'http';

// ---- Load environment first (before anything else) ----
import './config/env.js';          // validates & loads .env

// ---- Application ----
import app from './app.js';

// ---- Utilities ----
import { logger } from './config/logger.js';
import { prisma } from './config/prisma.js';     // DB connection
import { redis } from './config/redis.js';        // Redis connection
import { cacheProvider } from './infrastructure/cache/cache.provider.js'; // optional

// ---- Instrumentation (tracing/metrics) ----
// This file might be loaded separately via --require, but we can also call it here
try {
  // If you use OpenTelemetry, the instrument.js exports an init function
  const { initInstrumentation } = await import('../instrument.js');
  await initInstrumentation();
} catch {
  // Instrumentation is optional; fail silently
  logger.info('No instrumentation loaded (instrument.js not found or skipped)');
}

// =====================================================
// START SERVER
// =====================================================
const PORT = process.env.PORT || 3000;
let server;

async function startServer() {
  try {
    // Validate connections before accepting traffic
    await prisma.$connect();
    logger.info('Database connected');

    await redis.ping();
    logger.info('Redis connected');

    // Create the HTTP server
    server = http.createServer(app);

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
    });

  } catch (err) {
    logger.fatal('Failed to start server', err);
    process.exit(1);
  }
}

// =====================================================
// GRACEFUL SHUTDOWN
// =====================================================
async function gracefulShutdown(signal) {
  logger.warn(`Received ${signal}. Shutting down gracefully...`);

  // 1. Stop accepting new connections
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }

  // 2. Wait for ongoing requests to finish (with timeout)
  //    (Express handles this; server.close() only stops new connections)

  // 3. Disconnect from databases and caches
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  } catch (err) {
    logger.error('Error disconnecting database', err);
  }

  try {
    await redis.quit();
    logger.info('Redis disconnected');
  } catch (err) {
    logger.error('Error disconnecting Redis', err);
  }

  // 4. (Optional) Shutdown any other services (BullMQ workers, etc.)
  //    e.g., import { queueManager } from './orchestrator/queues/queue.manager.js';
  //    await queueManager.shutdown();

  // 5. Exit process
  setTimeout(() => {
    logger.info('Exiting process');
    process.exit(0);
  }, 2000).unref(); // Force exit after 2 seconds if hanging
}

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

// Handle uncaught errors that crash the process
process.on('uncaughtException', (err) => {
  logger.fatal('Uncaught exception', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal('Unhandled rejection', { reason, promise });
  // Don't shutdown immediately, but you could.
});

// =====================================================
// START THE SERVER
// =====================================================
startServer();