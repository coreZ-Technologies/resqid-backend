// orchestrator/notifications/channel/email.js — RESQID
//
// Email notification channel.
// Uses universal EmailAdapter (Resend/Brevo/SES via env).
// Retry logic handled by BullMQ worker, not here.

import { getEmail } from '#infrastructure/email/email.index.js';
import { logger } from '#config/logger.js';

/**
 * Send a plain HTML email.
 */
export const sendEmailNotification = async ({
  to,
  subject,
  html,
  text,
  from,
  replyTo,
  meta = {},
}) => {
  // Validate
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to];
  if (recipients.length === 0 || !subject || !html) {
    logger.warn({ meta }, '[email] Missing required fields — skipping');
    return { success: false, error: 'Missing required fields: to, subject, html' };
  }

  const start = Date.now();

  try {
    const email = getEmail();
    const result = await email.send({
      to: recipients.length === 1 ? recipients[0] : recipients,
      subject,
      html,
      text: text || stripHtml(html),
      from,
      replyTo,
    });

    logger.info(
      {
        recipients: recipients.length,
        subject,
        latencyMs: Date.now() - start,
        providerRef: result?.id,
        provider: result?.provider,
        ...meta,
      },
      '[email] ✅ Sent'
    );

    return { success: true, providerRef: result?.id, provider: result?.provider };
  } catch (err) {
    logger.error(
      {
        err: err.message,
        recipients: recipients.length,
        subject,
        latencyMs: Date.now() - start,
        ...meta,
      },
      '[email] ❌ Failed'
    );
    return { success: false, error: err.message };
  }
};

/**
 * Send email using a React Email template.
 */
export const sendEmailWithTemplate = async (Component, props = {}, options = {}) => {
  const { to, subject, from, replyTo, meta = {} } = options;

  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to];
  if (recipients.length === 0 || !subject) {
    logger.warn({ meta }, '[email] Missing fields for template');
    return { success: false, error: 'Missing required fields: to, subject' };
  }

  const start = Date.now();
  const templateName = Component?.displayName || Component?.name || 'EmailTemplate';

  try {
    const email = getEmail();
    const result = await email.sendReactTemplate(Component, props, {
      to: recipients.length === 1 ? recipients[0] : recipients,
      subject,
      from,
      replyTo,
    });

    logger.info(
      {
        recipients: recipients.length,
        subject,
        template: templateName,
        latencyMs: Date.now() - start,
        providerRef: result?.id,
        ...meta,
      },
      '[email] ✅ Template sent'
    );

    return { success: true, providerRef: result?.id };
  } catch (err) {
    logger.error(
      {
        err: err.message,
        recipients: recipients.length,
        subject,
        template: templateName,
        latencyMs: Date.now() - start,
        ...meta,
      },
      '[email] ❌ Template failed'
    );
    return { success: false, error: err.message };
  }
};

/**
 * Strip HTML tags for plain text fallback.
 */
function stripHtml(html) {
  return (
    html
      ?.replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim() || ''
  );
}
