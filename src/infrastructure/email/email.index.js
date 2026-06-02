// infrastructure/email/email.index.js — RESQID
//
// Email singleton — switch provider via EMAIL_PROVIDER env variable.
// Uses universal EmailAdapter that supports Resend, Brevo, and SES

import { EmailAdapter } from './email.adapter.js';
import { logger } from '#config/logger.js';

let emailInstance = null;

/**
 * Initialize the email adapter.
 * Called once at startup from infrastructure.index.js.
 */
export function initializeEmail(config = {}) {
  if (!emailInstance) {
    emailInstance = new EmailAdapter(config);
    logger.info('[Email] Email adapter initialized');
  }
  return emailInstance;
}

/**
 * Get the email adapter instance.
 * Throws if not initialized — call initializeEmail() first.
 */
export function getEmail() {
  if (!emailInstance) {
    throw new Error('[Email] Not initialized. Call initializeEmail() first.');
  }
  return emailInstance;
}

/**
 * Check if email is initialized.
 */
export function isEmailInitialized() {
  return emailInstance !== null;
}

/**
 * Shutdown email adapter.
 */
export async function shutdownEmail() {
  if (emailInstance) {
    emailInstance = null;
    logger.info('[Email] Email adapter shut down');
  }
}

export { EmailAdapter };
