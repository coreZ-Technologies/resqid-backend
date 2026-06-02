// infrastructure/sms/sms.provider.js — RESQID
//
// Abstract SMS provider interface.
// All SMS adapters implement this contract.

export class SmsProvider {
  /**
   * Send an SMS message.
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} message - SMS content
   * @param {Object} [options] - Additional options (templateId, etc.)
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async send(phoneNumber, message, options) {
    throw new Error('SmsProvider.send() not implemented');
  }

  /**
   * Send OTP to a phone number.
   * @param {string} phoneNumber
   * @param {string} otp
   * @returns {Promise<{success: boolean, requestId?: string, error?: string}>}
   */
  async sendOtp(phoneNumber, otp) {
    throw new Error('SmsProvider.sendOtp() not implemented');
  }

  /**
   * Verify OTP submitted by user.
   * @param {string} identifier - Phone number or session ID
   * @param {string} otp
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async verifyOtp(identifier, otp) {
    throw new Error('SmsProvider.verifyOtp() not implemented');
  }

  /**
   * Send bulk SMS messages.
   * @param {Array<{phone: string, message: string}>} messages
   * @returns {Promise<Array<{success: boolean, messageId?: string, error?: string}>>}
   */
  async sendBulk(messages) {
    throw new Error('SmsProvider.sendBulk() not implemented');
  }

  /**
   * Check delivery status of a sent message.
   * @param {string} messageId
   * @returns {Promise<Object|null>}
   */
  async getStatus(messageId) {
    throw new Error('SmsProvider.getStatus() not implemented');
  }

  /**
   * Health check for the SMS provider.
   * @returns {Promise<{status: string, error?: string}>}
   */
  async healthCheck() {
    throw new Error('SmsProvider.healthCheck() not implemented');
  }
}

export default SmsProvider;
