// =============================================================================
// cache.js — RESQID Shared Cache Utility
//
// Promise-based cache layer. Every module uses this instead of talking
// directly to Redis. Supports both HTTP-path and middleware Redis clients.
// =============================================================================

import { redis, middlewareRedis } from '#config/redis.js';
import { logger } from '#config/logger.js';

const DEFAULT_TTL = 300; // 5 minutes

// ─── Basic Operations (HTTP-path Redis) ─────────────────────────────────────

export async function get(key) {
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    logger.error({ err: err.message, key }, 'Cache GET failed');
    return null;
  }
}

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

export async function del(...keys) {
  if (keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch (err) {
    logger.error({ err: err.message, keys }, 'Cache DEL failed');
  }
}

export async function exists(key) {
  try {
    return (await redis.exists(key)) === 1;
  } catch (err) {
    logger.error({ err: err.message, key }, 'Cache EXISTS failed');
    return false;
  }
}

export async function ttl(key) {
  try {
    return await redis.ttl(key);
  } catch (err) {
    logger.error({ err: err.message, key }, 'Cache TTL failed');
    return -2;
  }
}

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

// ─── Middleware-Specific Operations ──────────────────────────────────────────

export async function increment(key, amount = 1, ttl = null) {
  try {
    const result = await middlewareRedis.incrby(key, amount);
    if (ttl) await middlewareRedis.expire(key, ttl);
    return result;
  } catch (err) {
    logger.error({ err: err.message, key }, 'Cache INCR failed');
    return 0;
  }
}

export async function decrement(key, amount = 1) {
  try {
    return await middlewareRedis.decrby(key, amount);
  } catch (err) {
    logger.error({ err: err.message, key }, 'Cache DECR failed');
    return 0;
  }
}

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

export async function getCounter(key) {
  try {
    const value = await middlewareRedis.get(key);
    return value ? parseInt(value, 10) : 0;
  } catch (err) {
    logger.error({ err: err.message, key }, 'Cache GET_COUNTER failed');
    return 0;
  }
}

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

export async function middlewareGet(key) {
  try {
    const raw = await middlewareRedis.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  } catch (err) {
    logger.error({ err: err.message, key }, 'Middleware Cache GET failed');
    return null;
  }
}

export async function middlewareDel(...keys) {
  if (keys.length === 0) return;
  try {
    await middlewareRedis.del(...keys);
  } catch (err) {
    logger.error({ err: err.message, keys }, 'Middleware Cache DEL failed');
  }
}

export async function middlewareExists(key) {
  try {
    return (await middlewareRedis.exists(key)) === 1;
  } catch (err) {
    logger.error({ err: err.message, key }, 'Middleware Cache EXISTS failed');
    return false;
  }
}

// ─── Batch Operations ───────────────────────────────────────────────────────

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

export async function mset(keyValuePairs, ttl = DEFAULT_TTL) {
  try {
    const pipeline = middlewareRedis.pipeline();
    for (const [key, value] of Object.entries(keyValuePairs)) {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      if (ttl > 0) {
        pipeline.set(key, serialized, 'EX', ttl);
      } else {
        pipeline.set(key, serialized);
      }
    }
    await pipeline.exec();
  } catch (err) {
    logger.error({ err: err.message }, 'Cache MSET failed');
  }
}

// ─── Utility Operations ─────────────────────────────────────────────────────

export async function getOrSet(key, factory, ttl = DEFAULT_TTL) {
  try {
    const cached = await get(key);
    if (cached !== null) return cached;

    const value = await factory();
    await set(key, value, ttl);
    return value;
  } catch (err) {
    logger.error({ err: err.message, key }, 'Cache GET_OR_SET failed');
    return factory(); // Fallback without caching
  }
}

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

export async function acquireLock(key, ttl = 30) {
  try {
    const result = await middlewareRedis.set(key, '1', 'EX', ttl, 'NX');
    return result === 'OK';
  } catch (err) {
    logger.error({ err: err.message, key }, 'Lock acquire failed');
    return false;
  }
}

export async function releaseLock(key) {
  try {
    await middlewareRedis.del(key);
  } catch (err) {
    logger.error({ err: err.message, key }, 'Lock release failed');
  }
}

/**
 * Execute a function with a distributed lock.
 * Automatically releases lock after execution.
 */
export async function withLock(key, ttl, fn) {
  const acquired = await acquireLock(key, ttl);
  if (!acquired) return null;

  try {
    return await fn();
  } finally {
    await releaseLock(key);
  }
}

/**
 * Clear all keys with a prefix (safer than KEYS *).
 * Uses SCAN for production safety.
 */
export async function clearByPrefix(prefix) {
  try {
    let cursor = '0';
    let deleted = 0;

    do {
      const reply = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
      cursor = reply[0];
      const keys = reply[1];
      if (keys.length > 0) {
        await redis.del(...keys);
        deleted += keys.length;
      }
    } while (cursor !== '0');

    return deleted;
  } catch (err) {
    logger.error({ err: err.message, prefix }, 'Cache CLEAR_BY_PREFIX failed');
    return 0;
  }
}
