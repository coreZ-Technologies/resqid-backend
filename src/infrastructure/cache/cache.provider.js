
// =============================================================================
// cache.provider.js — RESQID
//
// Abstract cache provider interface.
// All cache adapters (Redis, in-memory, etc.) implement this contract.
// =============================================================================

export class CacheProvider {
  async get(key) {
    throw new Error('CacheProvider.get() not implemented');
  }

  async set(key, value, ttl = null) {
    throw new Error('CacheProvider.set() not implemented');
  }

  async del(...keys) {
    throw new Error('CacheProvider.del() not implemented');
  }

  async delPattern(pattern) {
    throw new Error('CacheProvider.delPattern() not implemented');
  }

  async exists(key) {
    throw new Error('CacheProvider.exists() not implemented');
  }

  async mget(keys) {
    throw new Error('CacheProvider.mget() not implemented');
  }

  async mset(entries, ttl = null) {
    throw new Error('CacheProvider.mset() not implemented');
  }

  async incr(key, by = 1, ttl = null) {
    throw new Error('CacheProvider.incr() not implemented');
  }

  async ttl(key) {
    throw new Error('CacheProvider.ttl() not implemented');
  }

  async clear() {
    throw new Error('CacheProvider.clear() not implemented');
  }

  async disconnect() {
    throw new Error('CacheProvider.disconnect() not implemented');
  }

  /**
   * Cache-aside (read-through) pattern.
   * Returns cached value if present; otherwise fetches, caches, and returns.
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
   * Get or set with factory — returns cached value or sets and returns new.
   */
  async getOrSet(key, ttl, factoryFn) {
    return this.aside(key, ttl, factoryFn);
  }
}

export default CacheProvider;
<<<<<<< HEAD
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
