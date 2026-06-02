<<<<<<< HEAD
import { TwoFactorAdapter } from './twofactor.adapter.js';
import { MSG91Adapter } from './msg91.adapter.js';
import { SmsProvider } from './sms.provider.js';
=======
// infrastructure/sms/sms.index.js — RESQID
//
// SMS singleton — switch provider via SMS_PROVIDER env variable.
// Uses universal SmsAdapter that supports MSG91 and 2Factor.
>>>>>>> 57ee725b18733cc851da4976956f89ab529f09da

import { SmsAdapter } from './sms.adapter.js';
import { SmsProvider } from './sms.provider.js';
import { logger } from '#config/logger.js';

let smsInstance = null;

/**
 * Initialize the SMS adapter.
 * Called once at startup from infrastructure.index.js.
 */
export function initializeSms(config = {}) {
  if (!smsInstance) {
    smsInstance = new SmsAdapter(config);
    logger.info('[SMS] SMS adapter initialized');
  }
  return smsInstance;
}

/**
 * Get the SMS adapter instance.
 * Throws if not initialized — call initializeSms() first.
 */
export function getSms() {
  if (!smsInstance) {
    throw new Error('[SMS] Not initialized. Call initializeSms() first.');
  }
  return smsInstance;
}

<<<<<<< HEAD
export { SmsProvider, TwoFactorAdapter, MSG91Adapter };
=======
/**
 * Check if SMS is initialized.
 */
export function isSmsInitialized() {
  return smsInstance !== null;
}

/**
 * Reset SMS instance (useful for testing).
 */
export function resetSms() {
  smsInstance = null;
  logger.info('[SMS] SMS adapter reset');
}

/**
 * Shutdown SMS adapter.
 */
export async function shutdownSms() {
  if (smsInstance) {
    smsInstance = null;
    logger.info('[SMS] SMS adapter shut down');
  }
}

export { SmsProvider, SmsAdapter };
>>>>>>> 57ee725b18733cc851da4976956f89ab529f09da
