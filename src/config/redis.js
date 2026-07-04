// =============================================================================
// redis.js — RESQID
// Shared Redis client (single connection for Upstash free tier)
// =============================================================================

import Redis, { Cluster } from 'ioredis';
import { ENV } from './env.js';
import { logger } from './logger.js';

// Base Options

function buildBaseOptions() {
  return {
    retryStrategy(times) {
      if (times > 20) {
        logger.fatal(
          { type: 'redis_reconnect_failed', attempts: times },
          'Redis: gave up reconnecting after 20 attempts'
        );
        return null;
      }
      const delay = Math.min(100 * Math.pow(2, times), 30_000);
      logger.warn(
        { type: 'redis_reconnecting', attempt: times, nextRetryMs: delay },
        `Redis: reconnecting in ${delay}ms (attempt ${times})`
      );
      return delay;
    },

    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ECONNREFUSED'];
      if (targetErrors.some((e) => err.message.includes(e))) {
        return 2;
      }
      return false;
    },

    connectTimeout: ENV.REDIS_CONNECT_TIMEOUT ?? 10_000,
    keepAlive: ENV.REDIS_KEEP_ALIVE ?? 30_000,
    lazyConnect: false,
    enableReadyCheck: true,
    autoResubscribe: true,
    keyPrefix: ENV.REDIS_KEY_PREFIX || 'resqid:',

    ...(ENV.REDIS_PASSWORD && ENV.REDIS_PASSWORD !== '' && { password: ENV.REDIS_PASSWORD }),
    ...(ENV.REDIS_TLS && {
      tls: { rejectUnauthorized: ENV.IS_PROD },
    }),
  };
}

// Shared Options (middleware profile — most compatible)

function buildSharedOptions() {
  return {
    ...buildBaseOptions(),
    commandTimeout: 5_000,
    enableOfflineQueue: true,
    autoResendUnfulfilledCommands: true,
    maxRetriesPerRequest: 3,
  };
}

// Client Factory

function createRedisClient(name, options) {
  let client;

  if (ENV.REDIS_SENTINEL === true && ENV.REDIS_SENTINEL_NODES) {
    client = new Redis({
      sentinels: ENV.REDIS_SENTINEL_NODES,
      name: ENV.REDIS_SENTINEL_NAME || 'mymaster',
      ...options,
    });
    logger.info({ type: 'redis_sentinel', client: name }, `Redis [${name}]: using Sentinel mode`);
  } else if (ENV.REDIS_CLUSTER === true && ENV.REDIS_CLUSTER_NODES) {
    client = new Cluster(ENV.REDIS_CLUSTER_NODES, {
      redisOptions: options,
      clusterRetryStrategy: (times) => {
        if (times > 10) return null;
        return Math.min(100 * Math.pow(2, times), 30_000);
      },
      scaleReads: 'slave',
      maxRedirections: 16,
    });
    logger.info({ type: 'redis_cluster', client: name }, `Redis [${name}]: using Cluster mode`);
  } else {
    client = new Redis(ENV.REDIS_URL, options);
    logger.info({ type: 'redis_single', client: name }, `Redis [${name}]: using single node mode`);
  }

  // Event Handlers
  client.on('connect', () =>
    logger.info({ type: 'redis_connect', client: name }, `Redis [${name}]: connected`)
  );
  client.on('ready', () =>
    logger.info({ type: 'redis_ready', client: name }, `Redis [${name}]: ready`)
  );
  client.on('error', (err) =>
    logger.error(
      { type: 'redis_error', client: name, err: err.message },
      `Redis [${name}]: error — ${err.message}`
    )
  );
  client.on('close', () =>
    logger.warn({ type: 'redis_close', client: name }, `Redis [${name}]: connection closed`)
  );
  client.on('reconnecting', (delay) =>
    logger.warn(
      { type: 'redis_reconnecting', client: name, delay },
      `Redis [${name}]: reconnecting in ${delay}ms`
    )
  );
  client.on('end', () =>
    logger.warn(
      { type: 'redis_end', client: name },
      `Redis [${name}]: connection permanently closed`
    )
  );

  return client;
}

// ─── SHARED CLIENT (single connection for Upstash free tier) ───────────────

const sharedClient = createRedisClient('shared', buildSharedOptions());

export const redis = sharedClient;
export const middlewareRedis = sharedClient;
export const workerRedis = sharedClient;

// Pub/Sub Client Factory

export function createPubSubClient(name = 'pubsub') {
  return createRedisClient(name, buildSharedOptions());
}

export function createWorkerRedisClient(name = 'worker') {
  return createRedisClient(name, buildSharedOptions());
}

// Health Check

export async function checkRedisHealth() {
  const start = Date.now();
  try {
    const result = await Promise.race([
      middlewareRedis.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000)),
    ]);
    if (result !== 'PONG') {
      return { status: 'error', error: 'Unexpected PING response' };
    }
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch (err) {
    logger.error({ err: err.message, type: 'redis_health_check' }, 'Redis health check failed');
    return { status: 'error', error: err.message };
  }
}

// Connection Pool Stats

export async function getRedisStats() {
  try {
    const info = await redis.info('stats');
    const extractValue = (str, key) => {
      const match = str.match(new RegExp(`${key}:(\\S+)`));
      return match ? match[1] : null;
    };
    return {
      status: redis.status,
      connected: redis.status === 'ready',
      mode: ENV.REDIS_SENTINEL ? 'sentinel' : ENV.REDIS_CLUSTER ? 'cluster' : 'single',
      total_commands_processed: extractValue(info, 'total_commands_processed'),
      connected_clients: extractValue(info, 'connected_clients'),
      rejected_connections: extractValue(info, 'rejected_connections'),
      used_memory: extractValue(info, 'used_memory_human'),
      uptime_seconds: extractValue(info, 'uptime_in_seconds'),
    };
  } catch (err) {
    return { error: err.message };
  }
}

// Graceful Disconnect

export async function disconnectRedis() {
  try {
    await sharedClient.quit();
    logger.info('Redis client disconnected gracefully');
  } catch (err) {
    sharedClient.disconnect();
    logger.error({ err: err.message }, 'Redis disconnect error — forced');
  }
}

// Middleware-Specific Helpers

export async function incrementRateLimit(key, windowMs) {
  const pipeline = middlewareRedis.pipeline();
  pipeline.incr(key);
  pipeline.pexpire(key, windowMs);
  const results = await pipeline.exec();
  return results[0][1];
}

export async function isIpBlocked(ip) {
  const key = `ipblock:${ip}`;
  const result = await middlewareRedis.get(key);
  return result !== null;
}

export async function blockIp(ip, durationSeconds, reason = 'Security block') {
  const key = `ipblock:${ip}`;
  await middlewareRedis.setex(key, durationSeconds, reason);
  logger.warn({ type: 'ip_blocked', ip, durationSeconds, reason }, `IP blocked: ${ip}`);
}

export async function getIpReputation(ip) {
  const key = `iprep:${ip}`;
  const score = await middlewareRedis.get(key);
  return score ? parseInt(score) : 0;
}

export async function decreaseIpReputation(ip, penalty = 10) {
  const key = `iprep:${ip}`;
  await middlewareRedis.decrby(key, penalty);
  await middlewareRedis.expire(key, ENV.IP_REPUTATION_THRESHOLD ? 7 * 24 * 60 * 60 : 86400);
}
