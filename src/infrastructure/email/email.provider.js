<<<<<<< HEAD
<<<<<<< HEAD
/**
 * Email Provider Interface
 * Defines the contract for all email adapter implementations.
 */
export class EmailProvider {
=======
=======
>>>>>>> e1eb068325d908062de8f8336fd7958f7fb3ca37
// infrastructure/email/email.provider.js — RESQID
//
// Abstract email provider interface.
// All email adapters implement this contract.

export class EmailProvider {
  /**
   * Send a single email.
   * @param {Object} options
   * @param {string|string[]} options.to - Recipient email(s)
   * @param {string} options.subject - Email subject
   * @param {string} options.html - HTML body
   * @param {string} [options.text] - Plain text body (optional)
   * @param {string} [options.from] - Sender (optional, uses default)
   * @param {string} [options.replyTo] - Reply-to address (optional)
   * @returns {Promise<{success: boolean, id?: string, error?: string}>}
   */
<<<<<<< HEAD
>>>>>>> 989f84374cc56136e3a7e027fd44e5110bf99e81
=======
>>>>>>> e1eb068325d908062de8f8336fd7958f7fb3ca37
  async send(options) {
    throw new Error('EmailProvider.send() not implemented');
  }

  /**
   * Send bulk emails.
   * @param {Array<Object>} emails - Array of send options
   * @returns {Promise<Array<{success: boolean, id?: string, error?: string}>>}
   */
  async sendBulk(emails) {
    throw new Error('EmailProvider.sendBulk() not implemented');
  }

  /**
   * Send an email using a React template.
   * @param {React.Component} Component - React email component
   * @param {Object} props - Props for the component
   * @param {Object} options - Send options (to, subject, from, replyTo)
   * @returns {Promise<{success: boolean, id?: string, error?: string}>}
   */
  async sendReactTemplate(Component, props, options) {
    throw new Error('EmailProvider.sendReactTemplate() not implemented');
  }

  /**
   * Health check for the email provider.
   * @returns {Promise<{status: string, error?: string}>}
   */
  async healthCheck() {
    throw new Error('EmailProvider.healthCheck() not implemented');
  }
}

<<<<<<< HEAD
<<<<<<< HEAD
export default EmailProvider;
=======
export default EmailProvider;
>>>>>>> 989f84374cc56136e3a7e027fd44e5110bf99e81
=======
export default EmailProvider;
>>>>>>> e1eb068325d908062de8f8336fd7958f7fb3ca37
