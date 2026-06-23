// src/modules/share/notification/channels/push.channel.js
import { getPushProvider } from '#infrastructure/push/push.index.js';
import { logger } from '#config/logger.js';

/**
 * Send push notification to a single device
 * @param {Object} payload - { deviceToken, title, body, data?, badge?, sound? }
 * @returns {Promise<Object>}
 */
export async function sendPush(payload) {
  const { deviceToken, title, body, data, badge, sound } = payload;

  if (!deviceToken || !title) {
    throw new Error('Missing required push fields: deviceToken, title');
  }

  try {
    const pushProvider = getPushProvider();
    const result = await pushProvider.sendToDevice(deviceToken, {
      title,
      body,
      data,
      badge,
      sound,
    });
    logger.info({ deviceToken: deviceToken.slice(-8), title }, 'Push sent');
    return result;
  } catch (error) {
    logger.error({ err: error, deviceToken: deviceToken?.slice(-8), title }, 'Failed to send push');
    throw error;
  }
}

/**
 * Send push notification to multiple devices
 * @param {Object} payload - { deviceTokens, title, body, data?, badge?, sound? }
 */
export async function sendPushToMany(payload) {
  const { deviceTokens, title, body, data, badge, sound } = payload;

  if (!deviceTokens?.length || !title) {
    throw new Error('Missing required push fields: deviceTokens, title');
  }

  try {
    const pushProvider = getPushProvider();
    const result = await pushProvider.sendToDevices(deviceTokens, {
      title,
      body,
      data,
      badge,
      sound,
    });
    logger.info({ count: deviceTokens.length, title }, 'Bulk push sent');
    return result;
  } catch (error) {
    logger.error({ err: error, count: deviceTokens?.length, title }, 'Failed to send bulk push');
    throw error;
  }
}