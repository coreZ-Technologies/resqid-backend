<<<<<<< HEAD
=======
<<<<<<< HEAD
// TODO: Add implementation
=======
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
import crypto from 'crypto';
import { S3Adapter } from './s3.adapter.js';
import { StorageProvider } from './storage.provider.js';
export { StoragePath, resolveAssetUrl } from './storage.paths.js';

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------
let storageInstance = null;

export function initializeStorage(config = {}) {
  if (!storageInstance) {
    storageInstance = new S3Adapter(config);
  }
  return storageInstance;
}

export function getStorage() {
  if (!storageInstance) {
    throw new Error('[Storage] Not initialized. Call initializeStorage() before use.');
  }
  return storageInstance;
}

export { StorageProvider, S3Adapter };
