<<<<<<< HEAD
// =============================================================================
// infrastructure.index.js — RESQID
=======
// infrastructure/infrastructure.index.js — RESQID
>>>>>>> 989f84374cc56136e3a7e027fd44e5110bf99e81
//
// Master infrastructure orchestrator.
// Initializes all service adapters: Cache, Email, Push, SMS, Storage.
//
// Usage in server.js:
//   import { initializeInfrastructure } from '#infrastructure/infrastructure.index.js';
//   await initializeInfrastructure({ cache: {}, email: {}, sms: {}, storage: {} });

import { logger } from '#config/logger.js';
import { initializeCache, getCache, shutdownCache, TTL, CacheKey } from './cache/cache.index.js';
import { initializeEmail, getEmail } from './email/email.index.js';
import { initializePush, getPush } from './push/push.index.js';
import { initializeSms, getSms } from './sms/sms.index.js';
import { initializeStorage, getStorage, StoragePath } from './storage/storage.index.js';
import { closeAllConnections as closeSseConnections } from './sse/sse.service.js';

<<<<<<< HEAD
// ─── Infrastructure Class ────────────────────────────────────────────────────
=======
// INFRASTRUCTURE CLASS
>>>>>>> 989f84374cc56136e3a7e027fd44e5110bf99e81

export class Infrastructure {
  constructor(config = {}) {
    this.config = config;
    this.initialized = false;
<<<<<<< HEAD
=======
    this.cache = null;
    this.email = null;
    this.push = null;
    this.sms = null;
    this.storage = null;
>>>>>>> 989f84374cc56136e3a7e027fd44e5110bf99e81
  }

  /**
   * Initialize all infrastructure modules.
   * Called once at startup from server.js.
   */
  async initialize() {
    if (this.initialized) {
      logger.warn('[Infrastructure] Already initialized');
      return this;
    }

    try {
      logger.info('[Infrastructure] Initializing modules...');

      // Cache (needs async init for Redis connection)
      const cache = await initializeCache(this.config.cache || {});

      // Email (sync init)
      const email = initializeEmail(this.config.email || {});

      // Push (sync init)
      const push = initializePush();

      // SMS (sync init)
      const sms = initializeSms(this.config.sms || {});

      // Storage (sync init)
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

  /**
   * Get cache adapter.
   */
  getCache() {
    this._assertReady();
<<<<<<< HEAD
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
=======
    return this.cache || getCache();
>>>>>>> 989f84374cc56136e3a7e027fd44e5110bf99e81
  }

  /**
   * Get email adapter.
   */
  getEmail() {
    this._assertReady();
    return this.email || getEmail();
  }

  /**
   * Get push notification adapter.
   */
  getPush() {
    this._assertReady();
    return this.push || getPush();
  }

  /**
   * Get SMS adapter.
   */
  getSms() {
    this._assertReady();
    return this.sms || getSms();
  }

  /**
   * Get storage adapter.
   */
  getStorage() {
    this._assertReady();
    return this.storage || getStorage();
  }

  /**
   * Get commonly used constants.
   */
  getConstants() {
    return { TTL, CacheKey, StoragePath };
  }

<<<<<<< HEAD
  async shutdown() {
    if (this.cache) await shutdownCache();
    closeSseConnections();
    this.initialized = false;
    logger.info('[Infrastructure] Shutdown complete');
=======
  /**
   * Check if a specific module is initialized.
   */
  isModuleReady(moduleName) {
    const modules = {
      cache: this.cache,
      email: this.email,
      push: this.push,
      sms: this.sms,
      storage: this.storage,
    };
    return !!modules[moduleName];
>>>>>>> 989f84374cc56136e3a7e027fd44e5110bf99e81
  }

  /**
   * Get health status of all modules.
   */
  async healthCheck() {
    const status = {
      cache: this.cache ? 'initialized' : 'not initialized',
      email: this.email ? 'initialized' : 'not initialized',
      push: this.push ? 'initialized' : 'not initialized',
      sms: this.sms ? 'initialized' : 'not initialized',
      storage: this.storage ? 'initialized' : 'not initialized',
    };

    // Run health checks if available
    if (this.email?.healthCheck) {
      try {
        status.email = await this.email.healthCheck();
      } catch {
        status.email = { status: 'error' };
      }
    }

    if (this.sms?.healthCheck) {
      try {
        status.sms = await this.sms.healthCheck();
      } catch {
        status.sms = { status: 'error' };
      }
    }

    return status;
  }

  /**
   * Gracefully shutdown all infrastructure modules.
   */
  async shutdown() {
    logger.info('[Infrastructure] Shutting down...');

    // Close SSE connections first
    closeSseConnections();

    // Shutdown cache
    if (this.cache) {
      try {
        await shutdownCache();
      } catch (err) {
        logger.error({ err: err.message }, '[Infrastructure] Cache shutdown error');
      }
    }

    this.initialized = false;
    this.cache = null;
    this.email = null;
    this.push = null;
    this.sms = null;
    this.storage = null;

    logger.info('[Infrastructure] Shutdown complete');
  }

  /**
   * Assert that infrastructure is initialized.
   */
  _assertReady() {
    if (!this.initialized) {
      throw new Error('[Infrastructure] Not initialized. Call initialize() first.');
    }
  }
}

<<<<<<< HEAD
// ─── Singleton ───────────────────────────────────────────────────────────────
=======
// SINGLETON
>>>>>>> 989f84374cc56136e3a7e027fd44e5110bf99e81

let infrastructureInstance = null;

/**
 * Initialize the infrastructure singleton.
 * Called once at startup from server.js.
 */
export async function initializeInfrastructure(config = {}) {
  if (!infrastructureInstance) {
    infrastructureInstance = new Infrastructure(config);
    await infrastructureInstance.initialize();
  }
  return infrastructureInstance;
}

/**
 * Get the infrastructure singleton.
 * Throws if not initialized.
 */
export function getInfrastructure() {
  if (!infrastructureInstance) {
    throw new Error('[Infrastructure] Not initialized. Call initializeInfrastructure() first.');
  }
  return infrastructureInstance;
}

<<<<<<< HEAD
=======
/**
 * Check if infrastructure is initialized.
 */
export function isInfrastructureInitialized() {
  return infrastructureInstance !== null && infrastructureInstance.initialized;
}

/**
 * Gracefully shutdown infrastructure.
 */
>>>>>>> 989f84374cc56136e3a7e027fd44e5110bf99e81
export async function shutdownInfrastructure() {
  if (infrastructureInstance) {
    await infrastructureInstance.shutdown();
    infrastructureInstance = null;
  }
}

<<<<<<< HEAD
export { TTL, CacheKey, StoragePath };
=======
// EXPORTS

export { TTL, CacheKey, StoragePath };
>>>>>>> 989f84374cc56136e3a7e027fd44e5110bf99e81
