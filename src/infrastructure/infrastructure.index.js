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
import { initializeEmail, getEmail } from './email/email.index.js';
import { initializePush, getPush } from './push/push.index.js';
import { initializeSms, getSms } from './sms/sms.index.js';
import { initializeStorage, getStorage, StoragePath } from './storage/storage.index.js';
import { closeAllConnections as closeSseConnections } from './sse/sse.service.js';

// ─── Infrastructure Class ────────────────────────────────────────────────────

export class Infrastructure {
  constructor(config = {}) {
    this.config = config;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
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
    } catch (err) {
      logger.error({ err: err.message }, '[Infrastructure] Initialization failed');
      throw err;
    }
  }

  getCache() {
    this._assertReady();
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
  }

  getConstants() {
    return { TTL, CacheKey, StoragePath };
  }

  async shutdown() {
    if (this.cache) await shutdownCache();
    closeSseConnections();
    this.initialized = false;
    logger.info('[Infrastructure] Shutdown complete');
  }

  _assertReady() {
    if (!this.initialized) {
      throw new Error('[Infrastructure] Not initialized. Call initialize() first.');
    }
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

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

export async function shutdownInfrastructure() {
  if (infrastructureInstance) {
    await infrastructureInstance.shutdown();
    infrastructureInstance = null;
  }
}

export { TTL, CacheKey, StoragePath };