// orchestrator/notifications/channel/sms.js — RESQID
// Thin channel wrapper over universal SmsAdapter (MSG91/2Factor).
// Supports DLT templates with variables.

import { getSms } from '#infrastructure/sms/sms.index.js';
import { logger } from '#config/logger.js';

/**
 * Send an SMS notification.
 * @param {Object} params
 * @param {string} params.to - Recipient phone number
 * @param {string} [params.body] - SMS body (plain text or template variable)
 * @param {string} [params.templateId] - DLT template ID
 * @param {Object} [params.variables] - Named variables for DLT template
 * @param {Object} [params.meta] - Metadata for logging
 * @returns {Promise<{success: boolean, providerRef?: string, error?: string}>}
 */
export const sendSmsNotification = async ({
  to,
  body,
  templateId = null,
  variables = null,
  meta = {},
}) => {
  // Validate phone number
  if (!to) {
    logger.warn({ meta }, '[sms] Missing phone number — skipping');
    return { success: false, error: 'Missing required field: to' };
  }

  // For DLT templates, either body or variables is required
  if (templateId && !body && !variables) {
    logger.warn({ meta }, '[sms] Template requires body or variables — skipping');
    return { success: false, error: 'Missing template content: body or variables required' };
  }

  // For plain SMS, body is required
  if (!templateId && !body) {
    logger.warn({ meta }, '[sms] Missing message body — skipping');
    return { success: false, error: 'Missing required field: body' };
  }

  const start = Date.now();

  try {
    let sms;
    try {
      sms = getSms();
    } catch (err) {
      logger.error({ err: err.message, ...meta }, '[sms] Provider init failed');
      return { success: false, error: 'SMS provider not available' };
    }

    const result = await sms.send(to, body, { templateId, variables });

    logger.info(
      {
        to: to.slice(0, 6) + '…',
        templateId,
        hasVariables: !!variables,
        latencyMs: Date.now() - start,
        providerRef: result?.messageId,
        provider: result?.provider,
        ...meta,
      },
      '[sms] SMS sent'
    );

    return {
      success: true,
      providerRef: result?.messageId,
      provider: result?.provider,
    };
  } catch (err) {
    logger.error(
      {
        err: err.message,
        to: to.slice(0, 6) + '…',
        latencyMs: Date.now() - start,
        ...meta,
      },
      '[sms] SMS failed'
    );
    return { success: false, error: err.message };
  }
};

/**
 * Send OTP via SMS.
 * @param {string} phone - Phone number
 * @param {string} otp - OTP code
 * @param {Object} [meta] - Metadata for logging
 * @returns {Promise<{success: boolean, requestId?: string, error?: string}>}
 */
export const sendOtpSms = async (phone, otp, meta = {}) => {
  if (!phone || !otp) {
    return { success: false, error: 'Phone and OTP required' };
  }

  const start = Date.now();

  try {
    const sms = getSms();
    const result = await sms.sendOtp(phone, otp);

    logger.info(
      {
        to: phone.slice(0, 6) + '…',
        latencyMs: Date.now() - start,
        requestId: result?.requestId,
        provider: result?.provider,
        ...meta,
      },
      '[sms] OTP sent'
    );

    return { success: true, requestId: result?.requestId, provider: result?.provider };
  } catch (err) {
    logger.error(
      { err: err.message, to: phone.slice(0, 6) + '…', latencyMs: Date.now() - start, ...meta },
      '[sms] OTP send failed'
    );
    return { success: false, error: err.message };
  }
};

/**
 * Verify OTP submitted by user.
 * @param {string} phone - Phone number
 * @param {string} otp - OTP code
 * @param {string} [sessionId] - Session ID (for 2Factor)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const verifyOtpSms = async (phone, otp, sessionId = null) => {
  if (!phone || !otp) {
    return { success: false, error: 'Phone and OTP required' };
  }

  try {
    const sms = getSms();
    const result = await sms.verifyOtp(phone, otp, sessionId);
    return { success: result?.success, error: result?.error };
  } catch (err) {
    logger.error({ err: err.message, to: phone.slice(0, 6) + '…' }, '[sms] OTP verify failed');
    return { success: false, error: err.message };
  }
};

/**
 * Send SMS to multiple recipients.
 * @param {Array<{to: string, body: string, templateId?: string, variables?: Object}>} messages
 * @param {Object} [meta] - Metadata for logging
 * @returns {Promise<Array<{success: boolean, providerRef?: string, error?: string}>>}
 */
export const sendBulkSms = async (messages, meta = {}) => {
  if (!messages?.length) {
    return [];
  }

  const start = Date.now();
  const results = await Promise.allSettled(
    messages.map((msg) => sendSmsNotification({ ...msg, meta }))
  );

  const outcome = results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { success: false, error: r.reason?.message, to: messages[i]?.to }
  );

  const successCount = outcome.filter((r) => r.success).length;

  logger.info(
    {
      total: messages.length,
      successCount,
      failureCount: messages.length - successCount,
      latencyMs: Date.now() - start,
      ...meta,
    },
    '[sms] Bulk SMS complete'
  );

  return outcome;
};
