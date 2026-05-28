<<<<<<< HEAD
=======
<<<<<<< HEAD
// TODO: Add implementation
=======
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
// =============================================================================
// infrastructure/push/push.index.js — RESQID
// Expo push only. No Firebase. No FCM.
// =============================================================================

import { ExpoAdapter } from './expo.adapter.js';
import { PushProvider } from './push.provider.js';

let pushInstance = null;

export function initializePush() {
  if (!pushInstance) {
    pushInstance = new ExpoAdapter();
  }
  return pushInstance;
}

export function getPush() {
  if (!pushInstance) {
    throw new Error('[Push] Not initialized. Call initializePush() before use.');
  }
  return pushInstance;
}

export function resetPush() {
  pushInstance = null;
}

export { PushProvider, ExpoAdapter };
