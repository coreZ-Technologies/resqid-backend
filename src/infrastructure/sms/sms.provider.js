<<<<<<< HEAD
=======
<<<<<<< HEAD
import { TwoFactorAdapter } from './twofactor.adapter.js';
import { MSG91Adapter } from './msg91.adapter.js';
import { SmsProvider } from './sms.provider.js';

const ACTIVE_PROVIDER = process.env.SMS_PROVIDER ?? 'twofactor';
const ADAPTERS = {
  twofactor: TwoFactorAdapter,
  msg91: MSG91Adapter,
};

let smsInstance = null;

export function initializeSms(config = {}) {
  if (!smsInstance) {
    const ActiveAdapter = ADAPTERS[ACTIVE_PROVIDER];
    if (!ActiveAdapter) throw new Error(`[SMS] Unknown provider: ${ACTIVE_PROVIDER}`);
    smsInstance = new ActiveAdapter(config);
  }
  return smsInstance;
}

export function getSms() {
  if (!smsInstance) {
    throw new Error('[SMS] Not initialized. Call initializeSms() before use.');
  }
  return smsInstance;
}

export { SmsProvider, TwoFactorAdapter, MSG91Adapter };
=======
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
/**
 * SMS Provider Interface
 * Defines the contract for all SMS adapter implementations.
 */
export class SmsProvider {
  async send(phoneNumber, message, options) {
    throw new Error('SmsProvider.send() is not implemented.');
  }

  async sendOtp(phoneNumber, otp) {
    throw new Error('SmsProvider.sendOtp() is not implemented.');
  }

  async verifyOtp(identifier, otp) {
    throw new Error('SmsProvider.verifyOtp() is not implemented.');
  }

  async sendBulk(messages) {
    throw new Error('SmsProvider.sendBulk() is not implemented.');
  }

  async getStatus(messageId) {
    throw new Error('SmsProvider.getStatus() is not implemented.');
  }
}

export default SmsProvider;
<<<<<<< HEAD
=======
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
