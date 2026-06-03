// orchestrator/notifications/channel/email.js — RESQID
// Email notification channel.
// Uses universal EmailAdapter (Resend/Brevo/SES via env).

import { getEmail } from '#infrastructure/email/email.index.js';
import { logger } from '#config/logger.js';

/**
 * Send an email notification.
 * @param {Object} params
 * @param {string|string[]} params.to - Recipient email(s)
 * @param {string} params.subject - Email subject
 * @param {string} params.html - HTML body (React-rendered or raw)
 * @param {string} [params.text] - Plain text fallback (auto-generated if not provided)
 * @param {string} [params.from] - Sender override
 * @param {string} [params.replyTo] - Reply-to address
 * @param {Object} [params.meta] - Metadata for logging
 * @returns {Promise<{success: boolean, providerRef?: string, error?: string}>}
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
  if (!to || !subject || !html) {
    logger.warn({ meta }, '[email] Missing required fields — skipping');
    return { success: false, error: 'Missing required fields: to, subject, html' };
  }

  const start = Date.now();

  try {
    const email = getEmail();
    const result = await email.send({ to, subject, html, text, from, replyTo });

    logger.info(
      {
        to: Array.isArray(to) ? `${to.length} recipients` : to,
        subject,
        latencyMs: Date.now() - start,
        providerRef: result?.id,
        provider: result?.provider,
        ...meta,
      },
      '[email] Sent successfully'
    );

    return { success: true, providerRef: result?.id, provider: result?.provider };
  } catch (err) {
    logger.error(
      {
        err: err.message,
        to: Array.isArray(to) ? `${to.length} recipients` : to,
        subject,
        latencyMs: Date.now() - start,
        ...meta,
      },
      '[email] Send failed'
    );
    return { success: false, error: err.message };
  }
};

/**
 * Send an email using a React template.
 * @param {React.Component} Component - React email component
 * @param {Object} props - Props for the component
 * @param {Object} options - { to, subject, from, replyTo, meta }
 */
export const sendEmailWithTemplate = async (Component, props = {}, options = {}) => {
  const { to, subject, from, replyTo, meta = {} } = options;

  if (!to || !subject) {
    logger.warn({ meta }, '[email] Missing fields for template email');
    return { success: false, error: 'Missing required fields: to, subject' };
  }

  const start = Date.now();

  try {
    const email = getEmail();
    const result = await email.sendReactTemplate(Component, props, { to, subject, from, replyTo });

    logger.info(
      {
        to: Array.isArray(to) ? `${to.length} recipients` : to,
        subject,
        template: Component.name || 'Unknown',
        latencyMs: Date.now() - start,
        providerRef: result?.id,
        ...meta,
      },
      '[email] Template sent'
    );

    return { success: true, providerRef: result?.id };
  } catch (err) {
    logger.error(
      { err: err.message, to, subject, latencyMs: Date.now() - start, ...meta },
      '[email] Template send failed'
    );
    return { success: false, error: err.message };
  }
};
