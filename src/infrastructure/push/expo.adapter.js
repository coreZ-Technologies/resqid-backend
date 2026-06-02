<<<<<<< HEAD
=======
// infrastructure/push/expo.adapter.js — RESQID
//
// Expo push notification adapter.
// Handles single and bulk push notifications via Expo Push API.

>>>>>>> 989f84374cc56136e3a7e027fd44e5110bf99e81
import { Expo } from 'expo-server-sdk';
import { PushProvider } from './push.provider.js';
import { logger } from '#config/logger.js';
import { ENV } from '#config/env.js';

export class ExpoAdapter extends PushProvider {
  constructor() {
    super();
    this.expo = new Expo({
      accessToken: ENV.EXPO_ACCESS_TOKEN || process.env.EXPO_ACCESS_TOKEN,
    });
  }

  /**
   * Send push notification to a single device.
   * @param {string} deviceToken - Expo push token
   * @param {Object} notification - { title, body, data }
   * @returns {Promise<Object>}
   */
  async sendToDevice(deviceToken, notification) {
    if (!Expo.isExpoPushToken(deviceToken)) {
      logger.warn({ deviceToken: deviceToken.slice(0, 10) + '…' }, '[Expo] Invalid token');
      return {
        success: false,
        error: 'Invalid Expo push token',
        successCount: 0,
        failureCount: 1,
      };
    }

    const message = {
      to: deviceToken,
      title: notification.title,
      body: notification.body,
      data: notification.data ?? {},
      sound: notification.sound || 'default',
      priority: notification.priority || 'high',
      ...(notification.badge !== undefined && { badge: notification.badge }),
      ...(notification.categoryId && { categoryId: notification.categoryId }),
    };

    try {
      const tickets = await this.expo.sendPushNotificationsAsync([message]);

      let successCount = 0;
      let failureCount = 0;
      const deadTokens = [];

      for (const ticket of tickets) {
        if (ticket.status === 'ok') {
          successCount++;
        } else {
          failureCount++;
          logger.warn(
            {
              ticketStatus: ticket.status,
              error: ticket.message,
              token: deviceToken.slice(0, 10) + '…',
            },
            '[Expo] Ticket error'
          );
          if (ticket.details?.error === 'DeviceNotRegistered') {
            deadTokens.push(deviceToken);
          }
        }
      }

      return {
        success: successCount > 0,
        successCount,
        failureCount,
        deadTokens: deadTokens.length > 0 ? deadTokens : undefined,
      };
    } catch (err) {
      logger.error({ err: err.message }, '[Expo] sendToDevice failed');
      return {
        success: false,
        error: err.message,
        successCount: 0,
        failureCount: 1,
      };
    }
  }

  /**
   * Send push notification to multiple devices.
   * Automatically chunks into batches of 100 (Expo limit).
   * @param {string[]} deviceTokens - Array of Expo push tokens
   * @param {Object} notification - { title, body, data }
   * @returns {Promise<Object>}
   */
  async sendToDevices(deviceTokens, notification) {
    const validTokens = deviceTokens.filter((t) => {
      const valid = Expo.isExpoPushToken(t);
      if (!valid) {
        logger.warn({ token: t.slice(0, 10) + '…' }, '[Expo] Invalid token filtered');
      }
      return valid;
    });

    if (validTokens.length === 0) {
      return {
        success: false,
        error: 'No valid Expo tokens',
        successCount: 0,
        failureCount: deviceTokens.length,
      };
    }

    const messages = validTokens.map((token) => ({
      to: token,
      title: notification.title,
      body: notification.body,
      data: notification.data ?? {},
      sound: notification.sound || 'default',
      priority: notification.priority || 'high',
      ...(notification.badge !== undefined && { badge: notification.badge }),
      ...(notification.categoryId && { categoryId: notification.categoryId }),
    }));

    try {
      // Expo limits: 100 messages per chunk
      const chunks = this.expo.chunkPushNotifications(messages);
      let successCount = 0;
      let failureCount = 0;
      const deadTokens = [];

      for (const chunk of chunks) {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i];
          const token = chunk[i].to;

          if (ticket.status === 'ok') {
            successCount++;
          } else {
            failureCount++;
            logger.warn(
              {
                ticketStatus: ticket.status,
                error: ticket.message,
                token: token.slice(0, 10) + '…',
              },
              '[Expo] Ticket error'
            );
            if (ticket.details?.error === 'DeviceNotRegistered') {
              deadTokens.push(token);
            }
          }
        }
      }

      logger.info(
        {
          successCount,
          failureCount,
          deadCount: deadTokens.length,
          total: validTokens.length,
        },
        '[Expo] Multicast complete'
      );

      return {
        success: successCount > 0,
        successCount,
        failureCount,
        deadTokens: deadTokens.length > 0 ? deadTokens : undefined,
      };
    } catch (err) {
      logger.error({ err: err.message }, '[Expo] sendToDevices failed');
      return {
        success: false,
        error: err.message,
        successCount: 0,
        failureCount: validTokens.length,
      };
    }
  }

  /**
   * Validate an Expo push token.
   * @param {string} token
   * @returns {boolean}
   */
  isValidToken(token) {
    return Expo.isExpoPushToken(token);
  }
}

export default ExpoAdapter;