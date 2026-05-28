<<<<<<< HEAD
// TODO: Add implementation
=======
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
/**
 * Email Provider Interface
 * Defines the contract for all email adapter implementations.
 */
export class EmailProvider {
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
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
