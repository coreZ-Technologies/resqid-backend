// infrastructure/email/brevo.adapter.js
// infrastructure/email/brevo.adapter.js
import axios from 'axios';
import React from 'react';
import { EmailProvider } from './email.provider.js';
import { logger } from '#config/logger.js';
import { render } from '@react-email/components';

function parseSender(from) {
  const match = from.match(/^(.+?)\s*<(.+)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { name: 'RESQID', email: from.trim() };
}

export class BrevoAdapter extends EmailProvider {
  constructor(config = {}) {
    super();
    this.apiKey = config.BREVO_API_KEY ?? process.env.BREVO_API_KEY;
    this.defaultFrom =
      config.FROM_EMAIL ?? process.env.BREVO_FROM_EMAIL ?? 'RESQID <noreply@getresqid.in>';
    this.baseUrl = 'https://api.brevo.com/v3';
  }

  async send({ to, subject, html, text, from, replyTo }) {
    const sender = parseSender(from ?? this.defaultFrom);
    const recipients = Array.isArray(to) ? to : [to];

    try {
      const response = await axios.post(
        `${this.baseUrl}/smtp/email`,
        {
          sender,
<<<<<<< HEAD
          to: recipients.map((email) => ({ email })),
=======
<<<<<<< HEAD
<<<<<<< HEAD
          to: recipients.map(email => ({ email })),
=======
          to: recipients.map((email) => ({ email })),
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
          to: recipients.map((email) => ({ email })),
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
          subject,
          htmlContent: html,
          ...(text && { textContent: text }),
          ...(replyTo && { replyTo: { email: replyTo } }),
        },
        {
          headers: {
            'api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info(
        { to: recipients, messageId: response.data?.messageId },
        '[Email] Sent via Brevo'
      );
      return { success: true, id: response.data?.messageId };
    } catch (err) {
      logger.error(
        { to: recipients, error: err.response?.data || err.message },
        '[Email] Brevo send failed'
      );
      return { success: false, error: err.message };
    }
  }

  async sendReactTemplate(Component, props = {}, { to, subject, from, replyTo } = {}) {
    try {
      const element = React.createElement(Component, props);
      const html = await render(element);
      const text = await render(element, { plainText: true });
      return this.send({ to, subject, html, text, from, replyTo });
    } catch (err) {
      logger.error({ error: err.message, to }, '[Email] Brevo template render/send failed');
      return { success: false, error: err.message };
    }
  }

  async sendBulk(emails) {
<<<<<<< HEAD
    const results = await Promise.allSettled(emails.map((e) => this.send(e)));
=======
<<<<<<< HEAD
<<<<<<< HEAD
    const results = await Promise.allSettled(emails.map(e => this.send(e)));
=======
    const results = await Promise.allSettled(emails.map((e) => this.send(e)));
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
    const results = await Promise.allSettled(emails.map((e) => this.send(e)));
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
    return results.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : { success: false, error: r.reason?.message, to: emails[i]?.to }
    );
  }
}

export default BrevoAdapter;
