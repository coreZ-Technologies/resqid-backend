// src/modules/share/notification/channels/sms.channel.js
import { getSms } from '#infrastructure/sms/sms.index.js';
import { logger } from '#config/logger.js';

/**
 * Send SMS notification
 * @param {Object} payload - { phoneNumber, message, options? }
 * @returns {Promise<Object>}
 */
export async function sendSms(payload) {
  const { phoneNumber, message, options } = payload;

  if (!phoneNumber || !message) {
    throw new Error('Missing required SMS fields: phoneNumber, message');
  }

  try {
    const smsProvider = getSms();
    const result = await smsProvider.send(phoneNumber, message, options);
    logger.info({ phoneNumber: phoneNumber.slice(-6), messageLength: message.length }, 'SMS sent');
    return result;
  } catch (error) {
    logger.error({ err: error, phoneNumber: phoneNumber?.slice(-6) }, 'Failed to send SMS');
    throw error;
  }
}

/**
 * Send OTP via SMS (uses provider's OTP method)
 * @param {Object} payload - { phoneNumber, otp }
 */
export async function sendOtpSms(payload) {
  const { phoneNumber, otp } = payload;
  if (!phoneNumber || !otp) {
    throw new Error('Missing phoneNumber or otp');
  }
  try {
    const smsProvider = getSms();
    const result = await smsProvider.sendOtp(phoneNumber, otp);
    logger.info({ phoneNumber: phoneNumber.slice(-6) }, 'OTP SMS sent');
    return result;
  } catch (error) {
    logger.error({ err: error, phoneNumber: phoneNumber?.slice(-6) }, 'Failed to send OTP SMS');
    throw error;
  }
}