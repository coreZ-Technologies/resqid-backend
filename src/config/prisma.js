// src/config/prisma.js
import { PrismaClient } from '@prisma/client';
import { ENV } from './env.js';
import { logger } from './logger.js';

const SLOW_QUERY_MS = 1000;

// Log Config
const LOG_CONFIG = ENV.IS_DEV
  ? [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'info' },
      { emit: 'event', level: 'warn' },
      { emit: 'event', level: 'error' },
    ]
  : [
      { emit: 'event', level: 'warn' },
      { emit: 'event', level: 'error' },
    ];

// Client Factory
function createPrismaClient() {
  const client = new PrismaClient({
    log: LOG_CONFIG,
    errorFormat: ENV.IS_PROD ? 'minimal' : 'pretty',
  });

  //  Query logging
  if (ENV.IS_DEV) {
    client.$on('query', (e) => {
      const duration = e.duration;

      if (duration >= SLOW_QUERY_MS) {
        logger.warn(
          {
            type: 'slow_query',
            query: e.query,
            durationMs: duration,
            target: e.target,
          },
          `Slow query: ${duration}ms`
        );
      } else {
        logger.debug(
          { type: 'db_query', query: e.query, durationMs: duration },
          `DB query: ${duration}ms`
        );
      }
    });

    client.$on('info', (e) => {
      logger.info({ type: 'prisma_info', message: e.message }, 'Prisma info');
    });
  }

  //  Warn + error all environments
  client.$on('warn', (e) => {
    logger.warn({ type: 'prisma_warn', message: e.message }, 'Prisma warning');
  });

  client.$on('error', (e) => {
    logger.error({ type: 'prisma_error', message: e.message }, 'Prisma error');
  });

  return client;
}

// Singleton
const PRISMA_GLOBAL_KEY = Symbol.for('resqid.prisma');

export const prisma =
  globalThis[PRISMA_GLOBAL_KEY] ?? (globalThis[PRISMA_GLOBAL_KEY] = createPrismaClient());

// Health Check
export async function checkPrismaHealth() {
  const start = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    const latencyMs = Date.now() - start;

    if (latencyMs > SLOW_QUERY_MS) {
      logger.warn({ type: 'db_health_slow', latencyMs }, `DB health check slow: ${latencyMs}ms`);
    }

    return { status: 'ok', latencyMs };
  } catch (err) {
    const latencyMs = Date.now() - start;

    logger.error(
      { type: 'db_health_failed', error: err.message, latencyMs },
      'DB health check failed'
    );

    return { status: 'error', error: err.message, latencyMs };
  }
}

// Graceful Disconnect
export async function disconnectPrisma() {
  try {
    await prisma.$disconnect();
    logger.info('Prisma disconnected gracefully');
  } catch (err) {
    logger.error({ err: err.message }, 'Prisma disconnect error');
  }
}

// Startup Connection Check
export async function connectPrisma(retries = 3, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const result = await checkPrismaHealth();

    if (result.status === 'ok') {
      logger.info({ latencyMs: result.latencyMs }, `DB connected (attempt ${attempt})`);
      return;
    }

    if (attempt < retries) {
      logger.warn({ attempt, retries, delayMs }, `DB not ready retrying in ${delayMs}ms`);
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }

  logger.fatal('DB connection failed after all retries shutting down');
  process.exit(1);
}
