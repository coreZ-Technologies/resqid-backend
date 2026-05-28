// =============================================================================
// orchestrator/notifications/channel/email.js — RESQID
// Email notification channel.
// =============================================================================

import { getEmail } from '#infrastructure/email/email.index.js';
import { logger } from '#config/logger.js';
import { stripHtml } from '#shared/security/escapeHtml.js';

export const sendEmailNotification = async ({ to, subject, html, text, meta = {} }) => {
  if (!to || !subject || !html) {
    logger.warn({ meta }, '[email] Missing fields — skipping');
    return { success: false, error: 'Missing required fields' };
  }

  const start = Date.now();
  try {
    const email = getEmail();
    const plainText = text || stripHtml(html);

    const result = await email.send({ to, subject, html, text: plainText });

    logger.info(
      { to, subject, latencyMs: Date.now() - start, providerRef: result?.id, ...meta },
      '[email] Sent'
    );
    return { success: true, providerRef: result?.id };
  } catch (err) {
    logger.error(
      { err: err.message, to, subject, latencyMs: Date.now() - start, ...meta },
      '[email] Failed'
    );
    return { success: false, error: err.message };
  }
};
