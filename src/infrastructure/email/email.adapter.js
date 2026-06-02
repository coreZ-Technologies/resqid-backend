// infrastructure/email/email.adapter.js — RESQID
// Universal email adapter — switch provider via EMAIL_PROVIDER env variable.
// Supports: Resend, Brevo, AWS SES
// One file, one interface, env-controlled switching.

import axios from 'axios';
import React from 'react';
import { render } from '@react-email/components';
import { logger } from '#config/logger.js';
import { ENV } from '#config/env.js';

// PROVIDER CONFIGURATIONS

const PROVIDERS = {
  resend: {
    baseUrl: 'https://api.resend.com/emails',
    headerName: 'Authorization',
    headerValue: (apiKey) => `Bearer ${apiKey}`,
    buildPayload: ({ sender, recipients, subject, html, text, replyTo }) => ({
      from: `${sender.name} <${sender.email}>`,
      to: recipients.map((email) => email),
      subject,
      html,
      ...(text && { text }),
      ...(replyTo && { reply_to: replyTo }),
    }),
    extractMessageId: (data) => data?.id,
  },

  brevo: {
    baseUrl: 'https://api.brevo.com/v3/smtp/email',
    headerName: 'api-key',
    headerValue: (apiKey) => apiKey,
    buildPayload: ({ sender, recipients, subject, html, text, replyTo }) => ({
      sender: { name: sender.name, email: sender.email },
      to: recipients.map((email) => ({ email })),
      subject,
      htmlContent: html,
      ...(text && { textContent: text }),
      ...(replyTo && { replyTo: { email: replyTo } }),
    }),
    extractMessageId: (data) => data?.messageId,
  },

  ses: {
    // SES uses AWS SDK — handled separately
    baseUrl: null,
    headerName: null,
    headerValue: null,
    buildPayload: null,
    extractMessageId: (data) => data?.MessageId,
  },
};

// SENDER PARSER

function parseSender(from) {
  const match = from?.match(/^(.+?)\s*<(.+)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { name: 'RESQID', email: from?.trim() || 'noreply@getresqid.in' };
}

// UNIVERSAL EMAIL ADAPTER

export class EmailAdapter {
  constructor(config = {}) {
    this.provider = config.provider || ENV.EMAIL_PROVIDER || 'resend';
    this.apiKey = config.apiKey || ENV.RESEND_API_KEY || ENV.BREVO_API_KEY;
    this.defaultFrom = config.from || ENV.RESEND_FROM_EMAIL || 'RESQID <noreply@getresqid.in>';
    this.config = PROVIDERS[this.provider];

    if (!this.config) {
      throw new Error(`[Email] Unknown provider: ${this.provider}. Supported: resend, brevo, ses`);
    }

    logger.info({ provider: this.provider }, '[Email] Adapter initialized');
  }

  //  Single Send ─

  async send({ to, subject, html, text, from, replyTo }) {
    const sender = parseSender(from || this.defaultFrom);
    const recipients = Array.isArray(to) ? to : [to];

    // AWS SES uses SDK
    if (this.provider === 'ses') {
      return this.sendViaSES({ sender, recipients, subject, html, text, replyTo });
    }

    return this.sendViaAPI({ sender, recipients, subject, html, text, replyTo });
  }

  async sendViaAPI({ sender, recipients, subject, html, text, replyTo }) {
    const payload = this.config.buildPayload({
      sender,
      recipients,
      subject,
      html,
      text,
      replyTo,
    });

    try {
      const response = await axios.post(this.config.baseUrl, payload, {
        headers: {
          [this.config.headerName]: this.config.headerValue(this.apiKey),
          'Content-Type': 'application/json',
        },
      });

      const messageId = this.config.extractMessageId(response.data);

      logger.info(
        { provider: this.provider, to: recipients, messageId },
        '[Email] Sent successfully'
      );

      return { success: true, id: messageId, provider: this.provider };
    } catch (err) {
      const errorData = err.response?.data || err.message;
      logger.error(
        { provider: this.provider, to: recipients, error: errorData },
        '[Email] Send failed'
      );
      return { success: false, error: err.message, provider: this.provider };
    }
  }

  async sendViaSES({ sender, recipients, subject, html, text, replyTo }) {
    try {
      const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');

      const client = new SESClient({
        region: ENV.AWS_REGION || 'ap-south-1',
        credentials: {
          accessKeyId: ENV.AWS_ACCESS_KEY_ID,
          secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY,
        },
      });

      const command = new SendEmailCommand({
        Source: `${sender.name} <${sender.email}>`,
        Destination: { ToAddresses: recipients },
        Message: {
          Subject: { Data: subject },
          Body: {
            Html: { Data: html },
            ...(text && { Text: { Data: text } }),
          },
        },
        ...(replyTo && { ReplyToAddresses: [replyTo] }),
      });

      const response = await client.send(command);

      logger.info(
        { provider: 'ses', to: recipients, messageId: response.MessageId },
        '[Email] Sent via SES'
      );

      return { success: true, id: response.MessageId, provider: 'ses' };
    } catch (err) {
      logger.error(
        { provider: 'ses', to: recipients, error: err.message },
        '[Email] SES send failed'
      );
      return { success: false, error: err.message, provider: 'ses' };
    }
  }

  //  React Template Send ─

  async sendReactTemplate(Component, props = {}, { to, subject, from, replyTo } = {}) {
    try {
      const element = React.createElement(Component, props);
      const html = await render(element);
      const text = await render(element, { plainText: true });
      return this.send({ to, subject, html, text, from, replyTo });
    } catch (err) {
      logger.error(
        { error: err.message, to },
        `[Email] Template render/send failed via ${this.provider}`
      );
      return { success: false, error: err.message, provider: this.provider };
    }
  }

  //  Bulk Send

  async sendBulk(emails) {
    const results = await Promise.allSettled(emails.map((e) => this.send(e)));
    return results.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : { success: false, error: r.reason?.message, to: emails[i]?.to }
    );
  }

  //  Health Check

  async healthCheck() {
    try {
      // Simple test: check if API key is configured
      if (!this.apiKey) {
        return { status: 'error', error: 'API key not configured' };
      }
      return { status: 'ok', provider: this.provider };
    } catch (err) {
      return { status: 'error', error: err.message };
    }
  }
}

export default EmailAdapter;
