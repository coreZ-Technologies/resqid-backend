<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
// TODO: Add implementation
import { logger } from '#config/logger.js';
import { initializeCache, getCache, TTL, CacheKey } from './cache/cache.index.js';
=======
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
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
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
import { initializeEmail, getEmail } from './email/email.index.js';
import { initializePush, getPush } from './push/push.index.js';
import { initializeSms, getSms } from './sms/sms.index.js';
import { initializeStorage, getStorage, StoragePath } from './storage/storage.index.js';
<<<<<<< HEAD
import { closeAllConnections as closeSseConnections } from './sse/sse.service.js';

// ─── Infrastructure Class ────────────────────────────────────────────────────
=======
<<<<<<< HEAD
<<<<<<< HEAD
=======
import { closeAllConnections as closeSseConnections } from './sse/sse.service.js';

// ─── Infrastructure Class ────────────────────────────────────────────────────
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
import { closeAllConnections as closeSseConnections } from './sse/sse.service.js';

// ─── Infrastructure Class ────────────────────────────────────────────────────
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd

export class Infrastructure {
  constructor(config = {}) {
    this.config = config;
    this.initialized = false;
<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
    this.modules = {};
=======
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
  }

  async initialize() {
    if (this.initialized) {
<<<<<<< HEAD
=======
<<<<<<< HEAD
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
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
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
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
    } catch (err) {
      logger.error({ err: err.message }, '[Infrastructure] Initialization failed');
      throw err;
    }
  }

  getCache() {
    this._assertReady();
<<<<<<< HEAD
=======
<<<<<<< HEAD
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
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
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
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
  }

  getConstants() {
    return { TTL, CacheKey, StoragePath };
  }

  async shutdown() {
<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
    if (typeof this.modules.cache?.disconnect === 'function') {
      await this.modules.cache.disconnect();
    }
    this.initialized = false;
    logger.info('[Infrastructure] Shutdown complete.');
=======
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
    if (this.cache) await shutdownCache();
    closeSseConnections();
    this.initialized = false;
    logger.info('[Infrastructure] Shutdown complete');
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
  }

  _assertReady() {
    if (!this.initialized) {
      throw new Error('[Infrastructure] Not initialized. Call initialize() first.');
    }
  }
}

<<<<<<< HEAD
// ─── Singleton ───────────────────────────────────────────────────────────────

=======
<<<<<<< HEAD
<<<<<<< HEAD
=======
// ─── Singleton ───────────────────────────────────────────────────────────────

>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
// ─── Singleton ───────────────────────────────────────────────────────────────

>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
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
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
export async function shutdownInfrastructure() {
  if (infrastructureInstance) {
    await infrastructureInstance.shutdown();
    infrastructureInstance = null;
  }
}

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
export { TTL, CacheKey, StoragePath };
