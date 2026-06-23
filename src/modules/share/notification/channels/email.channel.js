// src/modules/share/notification/channels/email.channel.js
import { getEmailProvider } from '#infrastructure/email/email.index.js';
import { logger } from '#config/logger.js';

/**
 * Send email notification via configured email provider
 * @param {Object} payload - { to, subject, html, from?, replyTo?, attachments? }
 * @returns {Promise<Object>} - provider response
 */
export async function sendEmail(payload) {
  const { to, subject, html, from, replyTo, attachments } = payload;

  if (!to || !subject || !html) {
    throw new Error('Missing required email fields: to, subject, html');
  }

  try {
    const emailProvider = getEmailProvider();
    const result = await emailProvider.send({
      to,
      subject,
      html,
      from,
      replyTo,
      attachments,
    });
    logger.info({ to, subject, messageId: result?.messageId }, 'Email sent');
    return result;
  } catch (error) {
    logger.error({ err: error, to, subject }, 'Failed to send email');
    throw error;
  }
}

/**
 * Send bulk emails
 * @param {Array} emails - array of { to, subject, html, from?, replyTo? }
 */
export async function sendBulkEmails(emails) {
  if (!emails.length) return;

  try {
    const emailProvider = getEmailProvider();
    const result = await emailProvider.sendBulk(emails);
    logger.info({ count: emails.length }, 'Bulk emails sent');
    return result;
  } catch (error) {
    logger.error({ err: error, count: emails.length }, 'Failed to send bulk emails');
    throw error;
  }
}