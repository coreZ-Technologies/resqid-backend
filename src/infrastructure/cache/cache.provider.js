// =============================================================================
// cache.provider.js — RESQID
//
// Abstract cache provider interface.
// All cache adapters (Redis, in-memory, etc.) implement this contract.
// =============================================================================

export class CacheProvider {
  /**
   * Get a value by key.
   * @param {string} key
   * @returns {Promise<any>}
   */
  async get(key) {
    throw new Error('CacheProvider.get() not implemented');
  }

  /**
   * Set a value with optional TTL (seconds).
   * @param {string} key
   * @param {any} value
   * @param {number|null} ttl - Seconds
   * @returns {Promise<void>}
   */
  async set(key, value, ttl = null) {
    throw new Error('CacheProvider.set() not implemented');
  }

  /**
   * Delete one or more keys.
   * @param {...string} keys
   * @returns {Promise<number>} Number of keys deleted
   */
  async del(...keys) {
    throw new Error('CacheProvider.del() not implemented');
  }

  /**
   * Delete keys matching a pattern.
   * @param {string} pattern - e.g., "school:123:*"
   * @returns {Promise<number>} Number of keys deleted
   */
  async delPattern(pattern) {
    throw new Error('CacheProvider.delPattern() not implemented');
  }

  /**
   * Check if a key exists.
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    throw new Error('CacheProvider.exists() not implemented');
  }

  /**
   * Get multiple keys at once.
   * @param {string[]} keys
   * @returns {Promise<any[]>}
   */
  async mget(keys) {
    throw new Error('CacheProvider.mget() not implemented');
  }

  /**
   * Set multiple key-value pairs with optional TTL.
   * @param {Object} entries - { key1: value1, key2: value2 }
   * @param {number|null} ttl - Seconds
   * @returns {Promise<void>}
   */
  async mset(entries, ttl = null) {
    throw new Error('CacheProvider.mset() not implemented');
  }

  /**
   * Increment a counter.
   * @param {string} key
   * @param {number} by - Amount to increment
   * @param {number|null} ttl - Set expiry on first creation
   * @returns {Promise<number>} New value
   */
  async incr(key, by = 1, ttl = null) {
    throw new Error('CacheProvider.incr() not implemented');
  }

  /**
   * Get remaining TTL of a key.
   * @param {string} key
   * @returns {Promise<number>} Seconds remaining, -1 if no expiry, -2 if not found
   */
  async ttl(key) {
    throw new Error('CacheProvider.ttl() not implemented');
  }

  /**
   * Get all keys matching a pattern.
   * @param {string} pattern
   * @returns {Promise<string[]>}
   */
  async keys(pattern) {
    throw new Error('CacheProvider.keys() not implemented');
  }

  /**
   * Clear all cached data.
   * @returns {Promise<void>}
   */
  async clear() {
    throw new Error('CacheProvider.clear() not implemented');
  }

  /**
   * Disconnect from cache store.
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('CacheProvider.disconnect() not implemented');
  }

  /**
   * Cache-aside (read-through) pattern.
   * Returns cached value if present; otherwise fetches, caches, and returns.
   *
   * @param {string} key - Cache key
   * @param {number} ttl - Time-to-live in seconds
   * @param {Function} fetchFn - Async function called on cache miss
   * @returns {Promise<any>}
   */
  async aside(key, ttl, fetchFn) {
    const cached = await this.get(key);
    if (cached !== null && cached !== undefined) return cached;

    const fresh = await fetchFn();
    if (fresh !== null && fresh !== undefined) {
      await this.set(key, fresh, ttl);
    }
    return fresh;
  }

  /**
   * Get or set with factory — alias for aside().
   * @param {string} key
   * @param {number} ttl
   * @param {Function} factoryFn
   * @returns {Promise<any>}
   */
  async getOrSet(key, ttl, factoryFn) {
    return this.aside(key, ttl, factoryFn);
  }

  /**
   * Get value and delete it (atomic get-and-delete).
   * Useful for one-time tokens.
   *
   * @param {string} key
   * @returns {Promise<any>}
   */
  async pop(key) {
    const value = await this.get(key);
    if (value !== null && value !== undefined) {
      await this.del(key);
    }
    return value;
  }

  /**
   * Set if not exists (atomic).
   * Returns true if key was set, false if it already existed.
   *
   * @param {string} key
   * @param {any} value
   * @param {number|null} ttl
   * @returns {Promise<boolean>}
   */
  async setNX(key, value, ttl = null) {
    throw new Error('CacheProvider.setNX() not implemented');
  }
}

<<<<<<< HEAD
export default CacheProvider;
=======
export default CacheProvider;
>>>>>>> 989f84374cc56136e3a7e027fd44e5110bf99e81
