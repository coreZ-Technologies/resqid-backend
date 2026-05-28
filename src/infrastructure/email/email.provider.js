<<<<<<< HEAD
=======
<<<<<<< HEAD
// TODO: Add implementation
=======
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
/**
 * Email Provider Interface
 * Defines the contract for all email adapter implementations.
 */
export class EmailProvider {
<<<<<<< HEAD
=======
<<<<<<< HEAD
    async send(options) {
      throw new Error('EmailProvider.send() is not implemented.');
    }
  
    async sendBulk(emails) {
      throw new Error('EmailProvider.sendBulk() is not implemented.');
    }
  
    async sendReactTemplate(Component, props, options) {
      throw new Error('EmailProvider.sendReactTemplate() is not implemented.');
    }
  }
  
  export default EmailProvider;
  
=======
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
  async send(options) {
    throw new Error('EmailProvider.send() is not implemented.');
  }

  async sendBulk(emails) {
    throw new Error('EmailProvider.sendBulk() is not implemented.');
  }

  async sendReactTemplate(Component, props, options) {
    throw new Error('EmailProvider.sendReactTemplate() is not implemented.');
  }
}

export default EmailProvider;
<<<<<<< HEAD
=======
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
