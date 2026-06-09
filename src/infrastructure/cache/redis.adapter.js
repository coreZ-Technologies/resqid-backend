// =============================================================================
// redis.adapter.js — RESQID
//
// Redis implementation of CacheProvider.
// Creates its own Redis connection (separate from the 3 main clients).
// =============================================================================

import { createClient } from 'redis';
import { CacheProvider } from './cache.provider.js';
import { logger } from '#config/logger.js';

export class RedisAdapter extends CacheProvider {
  constructor(config = {}) {
    super();
    this.client = null;
    this.config = {
      url: config.url || process.env.REDIS_URL || 'redis://localhost:6379',
      password: config.password || process.env.REDIS_PASSWORD,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
        connectTimeout: 10000,
      },
      ...config,
    };
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = createClient(this.config);

      this.client.on('error', (err) => {
        logger.error({ err: err.message }, '[RedisAdapter] Client error');
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('[RedisAdapter] Connected');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        logger.warn('[RedisAdapter] Reconnecting...');
      });

      this.client.on('end', () => {
        logger.warn('[RedisAdapter] Connection closed');
        this.isConnected = false;
      });

      await this.client.connect();
      return this;
    } catch (err) {
      logger.error({ err: err.message }, '[RedisAdapter] Failed to connect');
      throw err;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('[RedisAdapter] Disconnected');
    }
  }

  // ─── Core Operations ──────────────────────────────────────────────────────

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
      logger.warn({ key, err: err.message }, '[RedisAdapter] GET failed');
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
      logger.warn({ key, err: err.message }, '[RedisAdapter] SET failed');
      return false;
    }
  }

  async del(...keys) {
    if (!keys.length) return 0;
    try {
      return await this.client.del(keys);
    } catch (err) {
      logger.warn({ keys, err: err.message }, '[RedisAdapter] DEL failed');
      return 0;
    }
  }

  async delPattern(pattern) {
    try {
      let cursor = 0;
      let deleted = 0;
      do {
        const reply = await this.client.scan(cursor, { MATCH: pattern, COUNT: 100 });
        cursor = reply.cursor;
        if (reply.keys.length) {
          await this.client.del(reply.keys);
          deleted += reply.keys.length;
        }
      } while (cursor !== 0);
      return deleted;
    } catch (err) {
      logger.warn({ pattern, err: err.message }, '[RedisAdapter] DEL pattern failed');
      return 0;
    }
  }

  async exists(key) {
    try {
      return (await this.client.exists(key)) === 1;
    } catch (err) {
      logger.warn({ key, err: err.message }, '[RedisAdapter] EXISTS failed');
      return false;
    }
  }

  // ─── Batch Operations ─────────────────────────────────────────────────────

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
      logger.warn({ keys, err: err.message }, '[RedisAdapter] MGET failed');
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
      logger.warn({ err: err.message }, '[RedisAdapter] MSET failed');
    }
  }

  // ─── Atomic Operations ────────────────────────────────────────────────────

  async incr(key, by = 1, ttl = null) {
    try {
      const val = await this.client.incrBy(key, by);
      if (val === by && ttl) {
        await this.client.expire(key, ttl);
      }
      return val;
    } catch (err) {
      logger.warn({ key, err: err.message }, '[RedisAdapter] INCR failed');
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
}

export default RedisAdapter;
