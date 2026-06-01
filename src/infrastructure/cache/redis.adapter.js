<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
// TODO: Add implementation
import { createClient } from 'redis';
import { CacheProvider } from './cache.provider.js';
=======
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
// =============================================================================
// redis.adapter.js — RESQID
//
// Redis implementation of CacheProvider.
// Creates its own Redis connection (separate from the 3 main clients).
// =============================================================================

import { createClient } from 'redis';
import { CacheProvider } from './cache.provider.js';
import { logger } from '#config/logger.js';
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd

export class RedisAdapter extends CacheProvider {
  constructor(config = {}) {
    super();
    this.client = null;
    this.config = {
<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
      url: config.REDIS_URL || process.env.REDIS_URL || 'redis://localhost:6379',
      password: config.REDIS_PASSWORD || process.env.REDIS_PASSWORD,
      db: config.REDIS_DB ?? parseInt(process.env.REDIS_DB, 10) ?? 0,
      socket: {
        reconnectStrategy: retries => Math.min(retries * 50, 2000),
=======
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
      url: config.url || process.env.REDIS_URL || 'redis://localhost:6379',
      password: config.password || process.env.REDIS_PASSWORD,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
        connectTimeout: 10000,
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
      },
      ...config,
    };
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = createClient(this.config);

<<<<<<< HEAD
      this.client.on('error', (err) => {
        logger.error({ err: err.message }, '[RedisAdapter] Client error');
=======
<<<<<<< HEAD
<<<<<<< HEAD
      this.client.on('error', err => {
        console.error('[Redis] Client error:', err.message);
=======
      this.client.on('error', (err) => {
        logger.error({ err: err.message }, '[RedisAdapter] Client error');
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
      this.client.on('error', (err) => {
        logger.error({ err: err.message }, '[RedisAdapter] Client error');
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
        this.isConnected = false;
      });

      this.client.on('connect', () => {
<<<<<<< HEAD
        logger.info('[RedisAdapter] Connected');
=======
<<<<<<< HEAD
<<<<<<< HEAD
        console.info('[Redis] Connection established.');
=======
        logger.info('[RedisAdapter] Connected');
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
        logger.info('[RedisAdapter] Connected');
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
        console.warn('[Redis] Attempting to reconnect...');
      });

      this.client.on('end', () => {
        console.warn('[Redis] Connection closed.');
=======
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
        logger.warn('[RedisAdapter] Reconnecting...');
      });

      this.client.on('end', () => {
        logger.warn('[RedisAdapter] Connection closed');
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
        this.isConnected = false;
      });

      await this.client.connect();
      return this;
    } catch (err) {
<<<<<<< HEAD
      logger.error({ err: err.message }, '[RedisAdapter] Failed to connect');
=======
<<<<<<< HEAD
<<<<<<< HEAD
      console.error('[Redis] Failed to connect:', err.message);
=======
      logger.error({ err: err.message }, '[RedisAdapter] Failed to connect');
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
      logger.error({ err: err.message }, '[RedisAdapter] Failed to connect');
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
      throw err;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
      console.info('[Redis] Connection gracefully closed.');
    }
  }

=======
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
      logger.info('[RedisAdapter] Disconnected');
    }
  }

  // ─── Core Operations ──────────────────────────────────────────────────────

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
  async get(key) {
    try {
      const value = await this.client.get(key);
      if (value === null) return null;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (err) {
<<<<<<< HEAD
      logger.warn({ key, err: err.message }, '[RedisAdapter] GET failed');
=======
<<<<<<< HEAD
<<<<<<< HEAD
      console.warn(`[Redis] GET failed for key "${key}":`, err.message);
=======
      logger.warn({ key, err: err.message }, '[RedisAdapter] GET failed');
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
      logger.warn({ key, err: err.message }, '[RedisAdapter] GET failed');
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
      return null;
    }
  }

  async set(key, value, ttl = null) {
    try {
      const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
      if (ttl) {
        await this.client.setEx(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (err) {
<<<<<<< HEAD
      logger.warn({ key, err: err.message }, '[RedisAdapter] SET failed');
=======
<<<<<<< HEAD
<<<<<<< HEAD
      console.warn(`[Redis] SET failed for key "${key}":`, err.message);
=======
      logger.warn({ key, err: err.message }, '[RedisAdapter] SET failed');
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
      logger.warn({ key, err: err.message }, '[RedisAdapter] SET failed');
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
      return false;
    }
  }

  async del(...keys) {
    if (!keys.length) return 0;
    try {
      return await this.client.del(keys);
    } catch (err) {
<<<<<<< HEAD
      logger.warn({ keys, err: err.message }, '[RedisAdapter] DEL failed');
=======
<<<<<<< HEAD
<<<<<<< HEAD
      console.warn(`[Redis] DEL failed for keys [${keys.join(', ')}]:`, err.message);
=======
      logger.warn({ keys, err: err.message }, '[RedisAdapter] DEL failed');
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
      logger.warn({ keys, err: err.message }, '[RedisAdapter] DEL failed');
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
      return 0;
    }
  }

  async delPattern(pattern) {
    try {
      let cursor = 0;
      let deleted = 0;
      do {
<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
        // FIX: node-redis v4 scan() takes an options object, not positional args
=======
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
        const reply = await this.client.scan(cursor, { MATCH: pattern, COUNT: 100 });
        cursor = reply.cursor;
        if (reply.keys.length) {
          await this.client.del(reply.keys);
          deleted += reply.keys.length;
        }
      } while (cursor !== 0);
      return deleted;
    } catch (err) {
<<<<<<< HEAD
      logger.warn({ pattern, err: err.message }, '[RedisAdapter] DEL pattern failed');
=======
<<<<<<< HEAD
<<<<<<< HEAD
      console.warn(`[Redis] DEL pattern "${pattern}" failed:`, err.message);
=======
      logger.warn({ pattern, err: err.message }, '[RedisAdapter] DEL pattern failed');
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
      logger.warn({ pattern, err: err.message }, '[RedisAdapter] DEL pattern failed');
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
      return 0;
    }
  }

  async exists(key) {
    try {
      return (await this.client.exists(key)) === 1;
    } catch (err) {
<<<<<<< HEAD
      logger.warn({ key, err: err.message }, '[RedisAdapter] EXISTS failed');
=======
<<<<<<< HEAD
<<<<<<< HEAD
      console.warn(`[Redis] EXISTS failed for key "${key}":`, err.message);
=======
      logger.warn({ key, err: err.message }, '[RedisAdapter] EXISTS failed');
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
      logger.warn({ key, err: err.message }, '[RedisAdapter] EXISTS failed');
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
      return false;
    }
  }

<<<<<<< HEAD
  // ─── Batch Operations ─────────────────────────────────────────────────────

=======
<<<<<<< HEAD
<<<<<<< HEAD
=======
  // ─── Batch Operations ─────────────────────────────────────────────────────

>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
  // ─── Batch Operations ─────────────────────────────────────────────────────

>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
  async mget(keys) {
    try {
      const values = await this.client.mGet(keys);
      return keys.reduce((acc, key, i) => {
        const raw = values[i];
        if (raw !== null && raw !== undefined) {
          try {
            acc[key] = JSON.parse(raw);
          } catch {
            acc[key] = raw;
          }
        }
        return acc;
      }, {});
    } catch (err) {
<<<<<<< HEAD
      logger.warn({ keys, err: err.message }, '[RedisAdapter] MGET failed');
=======
<<<<<<< HEAD
<<<<<<< HEAD
      console.warn(`[Redis] MGET failed for keys [${keys.join(', ')}]:`, err.message);
=======
      logger.warn({ keys, err: err.message }, '[RedisAdapter] MGET failed');
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
      logger.warn({ keys, err: err.message }, '[RedisAdapter] MGET failed');
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
      return {};
    }
  }

  async mset(entries, ttl = null) {
    try {
      const pipeline = this.client.multi();
      for (const [key, value] of Object.entries(entries)) {
        const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
        if (ttl) {
          pipeline.setEx(key, ttl, serialized);
        } else {
          pipeline.set(key, serialized);
        }
      }
      await pipeline.exec();
    } catch (err) {
<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
      console.warn('[Redis] MSET failed:', err.message);
    }
  }

  async incr(key, by = 1, ttl = null) {
    try {
      const val = await this.client.incrBy(key, by);
      // Set TTL only when the key is first created (val === by)
=======
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
      logger.warn({ err: err.message }, '[RedisAdapter] MSET failed');
    }
  }

  // ─── Atomic Operations ────────────────────────────────────────────────────

  async incr(key, by = 1, ttl = null) {
    try {
      const val = await this.client.incrBy(key, by);
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
      if (val === by && ttl) {
        await this.client.expire(key, ttl);
      }
      return val;
    } catch (err) {
<<<<<<< HEAD
      logger.warn({ key, err: err.message }, '[RedisAdapter] INCR failed');
=======
<<<<<<< HEAD
<<<<<<< HEAD
      console.warn(`[Redis] INCR failed for key "${key}":`, err.message);
=======
      logger.warn({ key, err: err.message }, '[RedisAdapter] INCR failed');
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
      logger.warn({ key, err: err.message }, '[RedisAdapter] INCR failed');
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
      return 0;
    }
  }

  async ttl(key) {
    try {
      return await this.client.ttl(key);
    } catch {
      return -2;
    }
  }

  async clear() {
    try {
      await this.client.flushDb();
<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
      console.info('[Redis] Database flushed successfully.');
    } catch (err) {
      console.error('[Redis] FLUSHDB failed:', err.message);
      throw err;
    }
  }
=======
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
      logger.warn('[RedisAdapter] Database flushed');
    } catch (err) {
      logger.error({ err: err.message }, '[RedisAdapter] FLUSHDB failed');
      throw err;
    }
  }

  // ─── Locking ──────────────────────────────────────────────────────────────

  async lock(key, ttl = 30) {
    const result = await this.client.set(key, '1', { NX: true, EX: ttl });
    return result === 'OK';
  }

  async unlock(key) {
    await this.del(key);
  }
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
}

export default RedisAdapter;
