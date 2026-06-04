<<<<<<< HEAD
<<<<<<< HEAD
/**
 * Push Notification Provider Interface
 * Defines the contract for all push adapter implementations.
 */
export class PushProvider {
=======
=======
>>>>>>> e1eb068325d908062de8f8336fd7958f7fb3ca37
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
<<<<<<< HEAD
>>>>>>> 989f84374cc56136e3a7e027fd44e5110bf99e81
=======
>>>>>>> e1eb068325d908062de8f8336fd7958f7fb3ca37
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

<<<<<<< HEAD
<<<<<<< HEAD
export default PushProvider;
=======
export default PushProvider;
Z;
>>>>>>> 989f84374cc56136e3a7e027fd44e5110bf99e81
=======
export default PushProvider;
Z;
>>>>>>> e1eb068325d908062de8f8336fd7958f7fb3ca37
