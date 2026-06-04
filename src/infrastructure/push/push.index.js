<<<<<<< HEAD
<<<<<<< HEAD
// =============================================================================
=======
>>>>>>> 989f84374cc56136e3a7e027fd44e5110bf99e81
=======
>>>>>>> e1eb068325d908062de8f8336fd7958f7fb3ca37
// infrastructure/push/push.index.js — RESQID
// Expo push only. No Firebase. No FCM.

import { ExpoAdapter } from './expo.adapter.js';
import { PushProvider } from './push.provider.js';
import { logger } from '#config/logger.js';

let pushInstance = null;

/**
 * Initialize the push notification adapter.
 * Called once at startup from infrastructure.index.js.
 */
export function initializePush() {
  if (!pushInstance) {
    pushInstance = new ExpoAdapter();
    logger.info('[Push] Expo push adapter initialized');
  }
  return pushInstance;
}

/**
 * Get the push adapter instance.
 * Throws if not initialized — call initializePush() first.
 */
export function getPush() {
  if (!pushInstance) {
    throw new Error('[Push] Not initialized. Call initializePush() before use.');
  }
  return pushInstance;
}

/**
 * Check if push is initialized.
 */
export function isPushInitialized() {
  return pushInstance !== null;
}

/**
 * Reset push instance (useful for testing).
 */
export function resetPush() {
  pushInstance = null;
  logger.info('[Push] Push adapter reset');
}

/**
 * Shutdown push adapter.
 */
export async function shutdownPush() {
  if (pushInstance) {
    pushInstance = null;
    logger.info('[Push] Push adapter shut down');
  }
}

export { PushProvider, ExpoAdapter };