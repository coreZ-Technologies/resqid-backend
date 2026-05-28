<<<<<<< HEAD
// TODO: Add implementation
import { logger } from '#config/logger.js';
import { initializeCache, getCache, TTL, CacheKey } from './cache/cache.index.js';
=======
// =============================================================================
// infrastructure.index.js — RESQID
//
// Master infrastructure orchestrator.
// Initializes all service adapters: Cache, Email, Push, SMS, Storage.
//
// Usage in server.js:
//   import { initializeInfrastructure } from '#infrastructure/infrastructure.index.js';
//   await initializeInfrastructure({ cache: {}, email: {}, sms: {}, storage: {} });
// =============================================================================

import { logger } from '#config/logger.js';
import { initializeCache, getCache, shutdownCache, TTL, CacheKey } from './cache/cache.index.js';
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
import { initializeEmail, getEmail } from './email/email.index.js';
import { initializePush, getPush } from './push/push.index.js';
import { initializeSms, getSms } from './sms/sms.index.js';
import { initializeStorage, getStorage, StoragePath } from './storage/storage.index.js';
<<<<<<< HEAD
=======
import { closeAllConnections as closeSseConnections } from './sse/sse.service.js';

// ─── Infrastructure Class ────────────────────────────────────────────────────
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67

export class Infrastructure {
  constructor(config = {}) {
    this.config = config;
    this.initialized = false;
<<<<<<< HEAD
    this.modules = {};
=======
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
  }

  async initialize() {
    if (this.initialized) {
<<<<<<< HEAD
      logger.warn('[Infrastructure] Already initialized — skipping.');
      return this.modules;
    }

    try {
      const cache = await initializeCache(this.config.cache);
      const email = initializeEmail(this.config.email);
      const push = initializePush(this.config.push);
      const sms = initializeSms(this.config.sms);
      const storage = initializeStorage(this.config.storage);

      this.modules = { cache, email, push, sms, storage };
      this.initialized = true;
      logger.info('[Infrastructure] All modules initialized successfully.');
      return this.modules;
=======
      logger.warn('[Infrastructure] Already initialized');
      return this;
    }

    try {
      // Initialize in parallel where possible
      const cache = await initializeCache(this.config.cache || {});
      const email = initializeEmail(this.config.email || {});
      const push = initializePush();
      const sms = initializeSms(this.config.sms || {});
      const storage = initializeStorage(this.config.storage || {});

      this.cache = cache;
      this.email = email;
      this.push = push;
      this.sms = sms;
      this.storage = storage;
      this.initialized = true;

      logger.info('[Infrastructure] All modules initialized');
      return this;
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
    } catch (err) {
      logger.error({ err: err.message }, '[Infrastructure] Initialization failed');
      throw err;
    }
  }

  getCache() {
    this._assertReady();
<<<<<<< HEAD
    return getCache();
  }
  getEmail() {
    this._assertReady();
    return getEmail();
  }
  getPush() {
    this._assertReady();
    return getPush();
  }
  getSms() {
    this._assertReady();
    return getSms();
  }
  getStorage() {
    this._assertReady();
    return getStorage();
=======
    return this.cache;
  }
  getEmail() {
    this._assertReady();
    return this.email;
  }
  getPush() {
    this._assertReady();
    return this.push;
  }
  getSms() {
    this._assertReady();
    return this.sms;
  }
  getStorage() {
    this._assertReady();
    return this.storage;
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
  }

  getConstants() {
    return { TTL, CacheKey, StoragePath };
  }

  async shutdown() {
<<<<<<< HEAD
    if (typeof this.modules.cache?.disconnect === 'function') {
      await this.modules.cache.disconnect();
    }
    this.initialized = false;
    logger.info('[Infrastructure] Shutdown complete.');
=======
    if (this.cache) await shutdownCache();
    closeSseConnections();
    this.initialized = false;
    logger.info('[Infrastructure] Shutdown complete');
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
  }

  _assertReady() {
    if (!this.initialized) {
      throw new Error('[Infrastructure] Not initialized. Call initialize() first.');
    }
  }
}

<<<<<<< HEAD
=======
// ─── Singleton ───────────────────────────────────────────────────────────────

>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
let infrastructureInstance = null;

export async function initializeInfrastructure(config = {}) {
  if (!infrastructureInstance) {
    infrastructureInstance = new Infrastructure(config);
    await infrastructureInstance.initialize();
  }
  return infrastructureInstance;
}

export function getInfrastructure() {
  if (!infrastructureInstance) {
    throw new Error('[Infrastructure] Not initialized. Call initializeInfrastructure() first.');
  }
  return infrastructureInstance;
}

<<<<<<< HEAD
=======
export async function shutdownInfrastructure() {
  if (infrastructureInstance) {
    await infrastructureInstance.shutdown();
    infrastructureInstance = null;
  }
}

>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
export { TTL, CacheKey, StoragePath };
