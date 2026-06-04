<<<<<<< HEAD
<<<<<<< HEAD
import crypto from 'crypto';
=======
=======
>>>>>>> e1eb068325d908062de8f8336fd7958f7fb3ca37
// infrastructure/storage/storage.index.js — RESQID
//
// Storage singleton — S3-compatible adapter.
// Works with: AWS S3, Cloudflare R2, MinIO, DigitalOcean Spaces.

<<<<<<< HEAD
>>>>>>> 989f84374cc56136e3a7e027fd44e5110bf99e81
=======
>>>>>>> e1eb068325d908062de8f8336fd7958f7fb3ca37
import { S3Adapter } from './s3.adapter.js';
import { StorageProvider } from './storage.provider.js';
import { logger } from '#config/logger.js';

export { StoragePath, resolveAssetUrl } from './storage.paths.js';

let storageInstance = null;

/**
 * Initialize the storage adapter.
 * Called once at startup from infrastructure.index.js.
 */
export function initializeStorage(config = {}) {
  if (!storageInstance) {
    storageInstance = new S3Adapter(config);
    logger.info('[Storage] Storage adapter initialized');
  }
  return storageInstance;
}

/**
 * Get the storage adapter instance.
 * Throws if not initialized — call initializeStorage() first.
 */
export function getStorage() {
  if (!storageInstance) {
    throw new Error('[Storage] Not initialized. Call initializeStorage() first.');
  }
  return storageInstance;
}

<<<<<<< HEAD
<<<<<<< HEAD
export { StorageProvider, S3Adapter };
=======
=======
>>>>>>> e1eb068325d908062de8f8336fd7958f7fb3ca37
/**
 * Check if storage is initialized.
 */
export function isStorageInitialized() {
  return storageInstance !== null;
}

/**
 * Reset storage instance (useful for testing).
 */
export function resetStorage() {
  storageInstance = null;
  logger.info('[Storage] Storage adapter reset');
}

/**
 * Shutdown storage adapter.
 */
export async function shutdownStorage() {
  if (storageInstance) {
    storageInstance = null;
    logger.info('[Storage] Storage adapter shut down');
  }
}

export { StorageProvider, S3Adapter };
<<<<<<< HEAD
>>>>>>> 989f84374cc56136e3a7e027fd44e5110bf99e81
=======
>>>>>>> e1eb068325d908062de8f8336fd7958f7fb3ca37
