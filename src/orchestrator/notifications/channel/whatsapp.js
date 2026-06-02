// orchestrator/notifications/channel/whatsapp.js — RESQID
// WhatsApp notification channel.
//
// STATUS: Not yet implemented — requires WhatsApp Business API approval.
// Currently disabled via FEATURE_WHATSAPP_ENABLED=false in .env
//
// Future providers:
//   - MSG91 WhatsApp API (same auth key as SMS)
//   - Twilio WhatsApp API
//   - WhatsApp Cloud API (Meta)

import { logger } from '#config/logger.js';
import { ENV } from '#config/env.js';

/**
 * Send WhatsApp notification.
 * Currently disabled — returns immediately.
 *
 * @param {Object} params
 * @param {string} params.to - Recipient phone number
 * @param {string} params.body - Message body
 * @param {string} [params.templateId] - WhatsApp template ID
 * @param {Object} [params.meta] - Metadata for logging
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendWhatsAppNotification = async ({ to, body, templateId, meta = {} }) => {
  // Feature flag check
  if (!ENV.FEATURE_WHATSAPP_ENABLED && !ENV.NOTIFICATION_WHATSAPP_ENABLED) {
    return { success: false, error: 'WhatsApp notifications are not enabled' };
  }

  if (!to || !body) {
    logger.warn({ meta }, '[whatsapp] Missing fields — skipping');
    return { success: false, error: 'Missing required fields: to, body' };
  }

  logger.info(
    { to: to.slice(0, 6) + '…', meta },
    '[whatsapp] WhatsApp notification requested (not implemented)'
  );

  // TODO: Implement when WhatsApp API is approved
  // const sms = getSms();
  // const result = await sms.send(to, body, { templateId, channel: 'whatsapp' });

  return { success: false, error: 'WhatsApp channel not yet implemented' };
};
