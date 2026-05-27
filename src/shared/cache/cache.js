// TODO: Add implementation
/**
 * cache.js
 * 
 * Generic, promise‑based cache utility.
 * Every module uses this instead of talking directly to Redis.
 * All keys are automatically prefixed with the app namespace and
 * values are serialised to/from JSON.
 */

import { redis } from '../../config/redis.js';      // ioredis or redis client
import { logger } from '../../config/logger.js';

const PREFIX = 'resqid';   // change to your app name
const DEFAULT_TTL = 300;   // 5 minutes

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

/**
 * Get a cached value, automatically parsed from JSON.
 * @param {string} key
 * @returns {Promise<any|null>}
 */
export async function get(key) {
  try {
    const raw = await redis.get(`${PREFIX}:${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    logger.error(`Cache GET failed for key: ${key}`, err);
    return null;   // fail‑safe: return nothing rather than crash
  }
}

/**
 * Set a value with optional TTL (seconds).
 * @param {string} key
 * @param {any} value
 * @param {number} [ttl=DEFAULT_TTL]
 */
export async function set(key, value, ttl = DEFAULT_TTL) {
  try {
    const serialised = JSON.stringify(value);
    if (ttl > 0) {
      await redis.set(`${PREFIX}:${key}`, serialised, 'EX', ttl);
    } else {
      await redis.set(`${PREFIX}:${key}`, serialised);
    }
  } catch (err) {
    logger.error(`Cache SET failed for key: ${key}`, err);
  }
}

/**
 * Delete one or more keys.
 * @param {...string} keys
 */
export async function del(...keys) {
  if (keys.length === 0) return;
  try {
    const fullKeys = keys.map(k => `${PREFIX}:${k}`);
    await redis.del(...fullKeys);
  } catch (err) {
    logger.error(`Cache DEL failed for keys: ${keys.join(', ')}`, err);
  }
}

/**
 * Check if a key exists.
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export async function exists(key) {
  try {
    return (await redis.exists(`${PREFIX}:${key}`)) === 1;
  } catch (err) {
    logger.error(`Cache EXISTS failed for key: ${key}`, err);
    return false;
  }
}

/**
 * Get TTL of a key in seconds.
 * @param {string} key
 * @returns {Promise<number>} -2 if key doesn't exist, -1 if no expiry
 */
export async function ttl(key) {
  try {
    return await redis.ttl(`${PREFIX}:${key}`);
  } catch (err) {
    logger.error(`Cache TTL failed for key: ${key}`, err);
    return -2;
  }
}