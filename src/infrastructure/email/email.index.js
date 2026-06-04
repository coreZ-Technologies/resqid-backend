<<<<<<< HEAD
<<<<<<< HEAD
import { EmailProvider } from './email.provider.js';
import { BrevoAdapter } from './brevo.adapter.js';
import { ResendAdapter } from './resend.adapter.js';
import { SesAdapter } from './ses.adapter.js';
=======
=======
>>>>>>> e1eb068325d908062de8f8336fd7958f7fb3ca37
// infrastructure/email/email.index.js — RESQID
//
// Email singleton — switch provider via EMAIL_PROVIDER env variable.
// Uses universal EmailAdapter that supports Resend, Brevo, and SES
<<<<<<< HEAD
>>>>>>> 989f84374cc56136e3a7e027fd44e5110bf99e81
=======
>>>>>>> e1eb068325d908062de8f8336fd7958f7fb3ca37

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

<<<<<<< HEAD
<<<<<<< HEAD
export { EmailProvider };
=======
=======
>>>>>>> e1eb068325d908062de8f8336fd7958f7fb3ca37
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
<<<<<<< HEAD
>>>>>>> 989f84374cc56136e3a7e027fd44e5110bf99e81
=======
>>>>>>> e1eb068325d908062de8f8336fd7958f7fb3ca37
