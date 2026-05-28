// =============================================================================
// cache.js — RESQID Shared Cache Utility
//
// Promise-based cache layer. Every module uses this instead of talking
// directly to Redis. Supports both HTTP-path and middleware Redis clients.
//
// Uses REDIS_KEY_PREFIX from env.js (already set in redis.js config).
// Values are auto-serialized to/from JSON.
// =============================================================================

import { redis, middlewareRedis } from '#config/redis.js';
import { logger } from '#config/logger.js';

const DEFAULT_TTL = 300; // 5 minutes

// ─── Basic Operations (HTTP-path Redis) ─────────────────────────────────────

/**
 * Get a cached value, auto-parsed from JSON.
 * Uses HTTP-path Redis client.
 */
export async function get(key) {
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    logger.error({ err: err.message, key }, 'Cache GET failed');
    return null;
  }
}

/**
 * Set a value with optional TTL (seconds).
 * Uses HTTP-path Redis client.
 */
export async function set(key, value, ttl = DEFAULT_TTL) {
  try {
    const serialized = JSON.stringify(value);
    if (ttl > 0) {
      await redis.set(key, serialized, 'EX', ttl);
    } else {
      await redis.set(key, serialized);
    }
  } catch (err) {
    logger.error({ err: err.message, key }, 'Cache SET failed');
  }
}

/**
 * Delete one or more keys.
 * Uses HTTP-path Redis client.
 */
export async function del(...keys) {
  if (keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch (err) {
    logger.error({ err: err.message, keys }, 'Cache DEL failed');
  }
}

/**
 * Check if a key exists.
 */
export async function exists(key) {
  try {
    return (await redis.exists(key)) === 1;
  } catch (err) {
    logger.error({ err: err.message, key }, 'Cache EXISTS failed');
    return false;
  }
}

/**
 * Get TTL of a key in seconds.
 * Returns -2 if key doesn't exist, -1 if no expiry.
 */
export async function ttl(key) {
  try {
    return await redis.ttl(key);
  } catch (err) {
    logger.error({ err: err.message, key }, 'Cache TTL failed');
    return -2;
  }
}

/**
 * Set a key only if it doesn't already exist (atomic).
 * Returns true if set, false if key already exists.
 */
export async function setNX(key, value, ttl = DEFAULT_TTL) {
  try {
    const serialized = JSON.stringify(value);
    const result = await redis.set(key, serialized, 'EX', ttl, 'NX');
    return result === 'OK';
  } catch (err) {
    logger.error({ err: err.message, key }, 'Cache SETNX failed');
    return false;
  }
}

// ─── Middleware-Specific Operations (middlewareRedis) ────────────────────────

/**
 * Increment a counter atomically.
 * Used by rateLimit.middleware.js, ipReputation.middleware.js
 * Returns the new value after increment.
 */
export async function increment(key, amount = 1, ttl = null) {
  try {
    const result = await middlewareRedis.incrby(key, amount);
    if (ttl) {
      await middlewareRedis.expire(key, ttl);
    }
    return result;
  } catch (err) {
    logger.error({ err: err.message, key }, 'Cache INCR failed');
    return 0;
  }
}

/**
 * Decrement a counter atomically.
 * Used by ipReputation.middleware.js (penalty scoring)
 */
export async function decrement(key, amount = 1) {
  try {
    return await middlewareRedis.decrby(key, amount);
  } catch (err) {
    logger.error({ err: err.message, key }, 'Cache DECR failed');
    return 0;
  }
}

/**
 * Atomic increment with automatic TTL set.
 * Uses pipeline for atomicity — both commands execute together.
 * Used by rate limiting middleware.
 *
 * @param {string} key - Redis key
 * @param {number} windowMs - TTL in milliseconds
 * @returns {Promise<number>} New count after increment
 */
export async function incrementWithTTL(key, windowMs) {
  try {
    const pipeline = middlewareRedis.pipeline();
    pipeline.incr(key);
    pipeline.pexpire(key, windowMs);
    const results = await pipeline.exec();
    return results?.[0]?.[1] || 0;
  } catch (err) {
    logger.error({ err: err.message, key }, 'Cache INCR+TTL failed');
    return 0;
  }
}

/**
 * Get current value of a counter.
 * Used by rate limiting to check remaining quota.
 */
export async function getCounter(key) {
  try {
    const value = await middlewareRedis.get(key);
    return value ? parseInt(value, 10) : 0;
  } catch (err) {
    logger.error({ err: err.message, key }, 'Cache GET_COUNTER failed');
    return 0;
  }
}

/**
 * Set a key with expiry (middleware Redis).
 * Used by CSRF token storage, device fingerprint cache.
 */
export async function middlewareSet(key, value, ttl = DEFAULT_TTL) {
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttl > 0) {
      await middlewareRedis.set(key, serialized, 'EX', ttl);
    } else {
      await middlewareRedis.set(key, serialized);
    }
  } catch (err) {
    logger.error({ err: err.message, key }, 'Middleware Cache SET failed');
  }
}

/**
 * Get a value from middleware Redis.
 */
export async function middlewareGet(key) {
  try {
    const raw = await middlewareRedis.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw; // Return as string if not JSON
    }
  } catch (err) {
    logger.error({ err: err.message, key }, 'Middleware Cache GET failed');
    return null;
  }
}

/**
 * Delete key(s) from middleware Redis.
 */
export async function middlewareDel(...keys) {
  if (keys.length === 0) return;
  try {
    await middlewareRedis.del(...keys);
  } catch (err) {
    logger.error({ err: err.message, keys }, 'Middleware Cache DEL failed');
  }
}

/**
 * Check if key exists in middleware Redis.
 */
export async function middlewareExists(key) {
  try {
    return (await middlewareRedis.exists(key)) === 1;
  } catch (err) {
    logger.error({ err: err.message, key }, 'Middleware Cache EXISTS failed');
    return false;
  }
}

// ─── Batch Operations ───────────────────────────────────────────────────────

/**
 * Get multiple keys at once.
 * Used by behavioral security for pattern analysis.
 */
export async function mget(...keys) {
  try {
    const values = await middlewareRedis.mget(...keys);
    return values.map((v) => {
      if (!v) return null;
      try {
        return JSON.parse(v);
      } catch {
        return v;
      }
    });
  } catch (err) {
    logger.error({ err: err.message, keys }, 'Cache MGET failed');
    return keys.map(() => null);
  }
}

/**
 * Set multiple keys at once with same TTL.
 */
export async function mset(keyValuePairs, ttl = DEFAULT_TTL) {
  try {
    const pipeline = middlewareRedis.pipeline();
    for (const [key, value] of Object.entries(keyValuePairs)) {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      pipeline.set(key, serialized, 'EX', ttl);
    }
    await pipeline.exec();
  } catch (err) {
    logger.error({ err: err.message }, 'Cache MSET failed');
  }
}

// ─── Utility Operations ─────────────────────────────────────────────────────

/**
 * Get or set cache (read-through pattern).
 * If key exists, returns cached value. If not, calls factory function,
 * caches the result, and returns it.
 */
export async function getOrSet(key, factory, ttl = DEFAULT_TTL) {
  try {
    const cached = await get(key);
    if (cached !== null) return cached;

    const value = await factory();
    await set(key, value, ttl);
    return value;
  } catch (err) {
    logger.error({ err: err.message, key }, 'Cache GET_OR_SET failed');
    return factory(); // Fallback to factory without caching
  }
}

/**
 * Invalidate cache by pattern (use with caution in production).
 */
export async function invalidatePattern(pattern) {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info({ pattern, count: keys.length }, 'Cache pattern invalidated');
    }
    return keys.length;
  } catch (err) {
    logger.error({ err: err.message, pattern }, 'Cache INVALIDATE failed');
    return 0;
  }
}

/**
 * Acquire a distributed lock (simple implementation).
 * Returns true if lock acquired, false otherwise.
 * Used by idempotency service, worker coordination.
 */
export async function acquireLock(key, ttl = 30) {
  try {
    const result = await middlewareRedis.set(key, '1', 'EX', ttl, 'NX');
    return result === 'OK';
  } catch (err) {
    logger.error({ err: err.message, key }, 'Lock acquire failed');
    return false;
  }
}

/**
 * Release a distributed lock.
 */
export async function releaseLock(key) {
  try {
    await middlewareRedis.del(key);
  } catch (err) {
    logger.error({ err: err.message, key }, 'Lock release failed');
  }
}
