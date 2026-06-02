// infrastructure/sms/sms.adapter.js — RESQID
//
// Universal SMS adapter — switch provider via SMS_PROVIDER env variable.
// Supports: MSG91, 2Factor
// One file, one interface, env-controlled switching.

import axios from 'axios';
import { logger } from '#config/logger.js';
import { ENV } from '#config/env.js';
import { normalizePhone } from '#shared/utils/phoneNormalize.js';

// PROVIDER CONFIGURATIONS

const PROVIDERS = {
  msg91: {
    baseUrl: 'https://api.msg91.com/api/v5',
    otpUrl: 'https://control.msg91.com/api/v5/otp',
    verifyUrl: 'https://control.msg91.com/api/v5/otp/verify',
    buildHeaders: (authKey) => ({
      authkey: authKey,
      'Content-Type': 'application/json',
    }),
    buildSendPayload: ({ senderId, phone, message, templateId, country, route }) => {
      const payload = {
        sender: senderId,
        mobiles: phone,
        country: country || '91',
        route: route || '4',
      };
      if (templateId) {
        payload.template_id = templateId;
        payload.var = message;
      } else {
        payload.message = message;
      }
      return payload;
    },
    buildOtpPayload: ({ phone, otp, otpTemplateId, authKey }) => ({
      template_id: otpTemplateId,
      mobile: phone,
      authkey: authKey,
      otp,
    }),
    buildVerifyPayload: ({ phone, otp, authKey }) => ({
      mobile: phone,
      otp,
      authkey: authKey,
    }),
    extractMessageId: (data) => data?.message_id || data?.request_id,
    checkOtpSuccess: (data) => data?.type === 'success',
  },

  twofactor: {
    baseUrl: 'https://2factor.in/API/V1',
    otpUrl: 'https://2factor.in/API/V1',
    verifyUrl: 'https://2factor.in/API/V1',
    buildHeaders: () => ({ 'Content-Type': 'application/json' }),
    // 2Factor uses GET requests with URL params, not POST with body
    sendViaGet: true,
    buildOtpPayload: null,
    buildVerifyPayload: null,
    extractMessageId: (data) => data?.Details,
    checkOtpSuccess: (data) => data?.Status === 'Success',
  },
};

// =============================================================================
// UNIVERSAL SMS ADAPTER

export class SmsAdapter {
  constructor(config = {}) {
    this.provider = config.provider || ENV.SMS_PROVIDER || 'msg91';
    this.authKey = config.authKey || ENV.MSG91_AUTH_KEY;
    this.senderId = config.senderId || ENV.MSG91_SENDER_ID || 'RESQID';
    this.otpTemplateId = config.otpTemplateId || ENV.MSG91_OTP_TEMPLATE_ID;
    this.country = config.country || '91';
    this.route = config.route || '4';
    this.config = PROVIDERS[this.provider];

    if (!this.config) {
      throw new Error(`[SMS] Unknown provider: ${this.provider}. Supported: msg91, twofactor`);
    }

    logger.info({ provider: this.provider }, '[SMS] Adapter initialized');
  }

  _normalizePhone(phoneNumber) {
    return normalizePhone(phoneNumber, this.country);
  }

  // Send SMS
  async send(phoneNumber, message, options = {}) {
    const phone = this._normalizePhone(phoneNumber);
    const { templateId } = options;

    if (this.provider === 'twofactor') {
      return this._sendVia2Factor(phone, message);
    }

    return this._sendViaAPI(phone, message, templateId);
  }

  async _sendViaAPI(phone, message, templateId) {
    const payload = this.config.buildSendPayload({
      senderId: this.senderId,
      phone,
      message,
      templateId,
      country: this.country,
      route: this.route,
    });

    try {
      const response = await axios.post(`${this.config.baseUrl}/flow/`, payload, {
        headers: this.config.buildHeaders(this.authKey),
      });

      const messageId = this.config.extractMessageId(response.data);
      logger.info(
        { provider: this.provider, phone: phone.slice(0, 6) + '…', messageId },
        '[SMS] Sent'
      );
      return { success: true, messageId, provider: this.provider };
    } catch (err) {
      logger.error(
        { provider: this.provider, phone: phone.slice(0, 6) + '…', error: err.message },
        '[SMS] Send failed'
      );
      return { success: false, error: err.message, provider: this.provider };
    }
  }

  async _sendVia2Factor(phone, message) {
    try {
      const url = `${this.config.baseUrl}/${this.authKey}/SMS/${phone}/${encodeURIComponent(message)}`;
      const response = await axios.get(url);
      logger.info({ provider: 'twofactor', phone: phone.slice(0, 6) + '…' }, '[SMS] Sent');
      return { success: true, messageId: response.data?.Details, provider: 'twofactor' };
    } catch (err) {
      logger.error({ provider: 'twofactor', error: err.message }, '[SMS] Send failed');
      return { success: false, error: err.message, provider: 'twofactor' };
    }
  }

  // Bulk Send

  async sendBulk(messages) {
    const results = await Promise.allSettled(
      messages.map(({ phone, message, templateId }) => this.send(phone, message, { templateId }))
    );
    return results.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : { success: false, error: r.reason?.message, phone: messages[i]?.phone }
    );
  }

  // OTP

  async sendOtp(phoneNumber, otp) {
    const phone = this._normalizePhone(phoneNumber);

    if (this.provider === 'twofactor') {
      return this._sendOtpVia2Factor(phone);
    }

    return this._sendOtpViaAPI(phone, otp);
  }

  async _sendOtpViaAPI(phone, otp) {
    const payload = this.config.buildOtpPayload({
      phone,
      otp,
      otpTemplateId: this.otpTemplateId,
      authKey: this.authKey,
    });

    try {
      const response = await axios.post(this.config.otpUrl, payload, {
        headers: this.config.buildHeaders(this.authKey),
      });
      logger.info({ provider: this.provider, phone: phone.slice(0, 6) + '…' }, '[SMS] OTP sent');
      return { success: true, requestId: response.data?.request_id, provider: this.provider };
    } catch (err) {
      logger.error({ provider: this.provider, error: err.message }, '[SMS] OTP send failed');
      return { success: false, error: err.message, provider: this.provider };
    }
  }

  async _sendOtpVia2Factor(phone) {
    try {
      const url = `${this.config.baseUrl}/${this.authKey}/SMS/${phone}/AUTOGEN`;
      const response = await axios.get(url);
      logger.info({ provider: 'twofactor', phone: phone.slice(0, 6) + '…' }, '[SMS] OTP sent');
      return { success: true, sessionId: response.data?.Details, provider: 'twofactor' };
    } catch (err) {
      logger.error({ provider: 'twofactor', error: err.message }, '[SMS] OTP send failed');
      return { success: false, error: err.message, provider: 'twofactor' };
    }
  }

  async verifyOtp(phoneNumber, otp, sessionId = null) {
    const phone = this._normalizePhone(phoneNumber);

    if (this.provider === 'twofactor') {
      return this._verifyOtpVia2Factor(otp, sessionId);
    }

    return this._verifyOtpViaAPI(phone, otp);
  }

  async _verifyOtpViaAPI(phone, otp) {
    const payload = this.config.buildVerifyPayload({ phone, otp, authKey: this.authKey });

    try {
      const response = await axios.post(this.config.verifyUrl, payload, {
        headers: this.config.buildHeaders(this.authKey),
      });
      return { success: this.config.checkOtpSuccess(response.data), provider: this.provider };
    } catch (err) {
      return { success: false, error: err.message, provider: this.provider };
    }
  }

  async _verifyOtpVia2Factor(otp, sessionId) {
    try {
      const url = `${this.config.baseUrl}/${this.authKey}/SMS/VERIFY/${sessionId}/${otp}`;
      const response = await axios.get(url);
      return { success: response.data?.Status === 'Success', provider: 'twofactor' };
    } catch (err) {
      return { success: false, error: err.message, provider: 'twofactor' };
    }
  }

  // Health Check

  async healthCheck() {
    if (!this.authKey) return { status: 'error', error: 'Auth key not configured' };
    return { status: 'ok', provider: this.provider };
  }
}

export default SmsAdapter;
