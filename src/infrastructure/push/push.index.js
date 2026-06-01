<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
// TODO: Add implementation
=======
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
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
