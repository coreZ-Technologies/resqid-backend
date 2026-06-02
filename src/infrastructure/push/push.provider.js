// infrastructure/push/push.provider.js — RESQID
//
// Abstract push notification provider interface.
// All push adapters implement this contract.

export class PushProvider {
  /**
   * Send push notification to a single device.
   * @param {string} deviceToken - Device push token
   * @param {Object} notification - { title, body, data, sound, priority }
   * @returns {Promise<{success: boolean, successCount: number, failureCount: number, error?: string, deadTokens?: string[]}>}
   */
  async sendToDevice(deviceToken, notification) {
    throw new Error('PushProvider.sendToDevice() not implemented');
  }

  /**
   * Send push notification to multiple devices.
   * @param {string[]} deviceTokens - Array of device push tokens
   * @param {Object} notification - { title, body, data, sound, priority }
   * @returns {Promise<{success: boolean, successCount: number, failureCount: number, error?: string, deadTokens?: string[]}>}
   */
  async sendToDevices(deviceTokens, notification) {
    throw new Error('PushProvider.sendToDevices() not implemented');
  }

  /**
   * Validate a push token format.
   * @param {string} token
   * @returns {boolean}
   */
  isValidToken(token) {
    throw new Error('PushProvider.isValidToken() not implemented');
  }
}

export default PushProvider;
Z;
