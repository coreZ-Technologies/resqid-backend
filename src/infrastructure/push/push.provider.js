<<<<<<< HEAD
<<<<<<< HEAD
// TODO: Add implementation
=======
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
/**
 * Push Notification Provider Interface
 * Defines the contract for all push adapter implementations.
 */
export class PushProvider {
<<<<<<< HEAD
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
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
  async sendToDevice(deviceToken, notification) {
    throw new Error('PushProvider.sendToDevice() is not implemented.');
  }

  async sendToDevices(deviceTokens, notification) {
    throw new Error('PushProvider.sendToDevices() is not implemented.');
  }
}

export default PushProvider;
<<<<<<< HEAD
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
