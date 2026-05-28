<<<<<<< HEAD
// TODO: Add implementation
=======
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
/**
 * Push Notification Provider Interface
 * Defines the contract for all push adapter implementations.
 */
export class PushProvider {
<<<<<<< HEAD
    async sendToDevice(deviceToken, notification) {
      throw new Error('PushProvider.sendToDevice() is not implemented.');
    }
  
    async sendToDevices(deviceTokens, notification) {
      throw new Error('PushProvider.sendToDevices() is not implemented.');
    }
  }
  
  export default PushProvider;
  
=======
  async sendToDevice(deviceToken, notification) {
    throw new Error('PushProvider.sendToDevice() is not implemented.');
  }

  async sendToDevices(deviceTokens, notification) {
    throw new Error('PushProvider.sendToDevices() is not implemented.');
  }
}

export default PushProvider;
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
