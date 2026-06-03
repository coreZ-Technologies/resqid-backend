// orchestrator/notifications/channel/push.js — RESQID
// Thin channel wrapper over ExpoAdapter.
// Handles chunking, logging, latency. Never throws.

import { getPush } from '#infrastructure/push/push.index.js';
import { logger } from '#config/logger.js';

/**
 * Send push notification to one or more devices.
 * @param {Object} params
 * @param {string|string[]} params.tokens - Expo push token(s)
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body
 * @param {Object} [params.data] - Additional data payload
 * @param {string} [params.priority] - 'default' | 'normal' | 'high'
 * @param {string} [params.sound] - Sound name or 'default'
 * @param {number} [params.badge] - Badge count
 * @param {string} [params.categoryId] - iOS notification category
 * @param {Object} [params.meta] - Metadata for logging
 * @returns {Promise<{success: boolean, successCount?: number, failureCount?: number, error?: string}>}
 */
export const sendPushNotificationChannel = async ({
  tokens,
  title,
  body,
  data = {},
  priority = 'high',
  sound = 'default',
  badge,
  categoryId,
  meta = {},
}) => {
  // Validate required fields
  if (!tokens || !title || !body) {
    logger.warn({ meta }, '[push] Missing required fields — skipping');
    return { success: false, error: 'Missing required fields: tokens, title, body' };
  }

  const tokenList = Array.isArray(tokens) ? tokens : [tokens];

  // Filter out empty/invalid tokens
  const validTokens = tokenList.filter(Boolean);

  if (validTokens.length === 0) {
    logger.warn({ meta }, '[push] No valid tokens provided');
    return { success: false, error: 'No valid Expo push tokens' };
  }

  const start = Date.now();

  try {
    let push;
    try {
      push = getPush();
    } catch (err) {
      logger.error({ err: err.message, ...meta }, '[push] Provider init failed');
      return { success: false, error: 'Push provider not available' };
    }

    // ExpoAdapter handles chunking internally (100 per batch)
    const result = await push.sendToDevices(validTokens, {
      title,
      body,
      data,
      priority,
      sound,
      ...(badge !== undefined && { badge }),
      ...(categoryId && { categoryId }),
    });

    const successCount = result?.successCount ?? 0;
    const failureCount = result?.failureCount ?? 0;
    const deadTokens = result?.deadTokens;

    logger.info(
      {
        tokenCount: validTokens.length,
        successCount,
        failureCount,
        deadTokenCount: deadTokens?.length || 0,
        latencyMs: Date.now() - start,
        ...meta,
      },
      '[push] Push sent'
    );

    return {
      success: successCount > 0,
      successCount,
      failureCount,
      deadTokens: deadTokens?.length > 0 ? deadTokens : undefined,
    };
  } catch (err) {
    logger.error(
      { err: err.message, tokenCount: validTokens.length, latencyMs: Date.now() - start, ...meta },
      '[push] Push failed'
    );
    return { success: false, error: err.message };
  }
};

/**
 * Send push notification to a single device.
 * @param {Object} params
 * @param {string} params.token - Single Expo push token
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body
 * @param {Object} [params.data] - Additional data payload
 * @param {Object} [params.meta] - Metadata for logging
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendPushToDevice = async ({ token, title, body, data = {}, meta = {} }) => {
  if (!token) {
    return { success: false, error: 'No token provided' };
  }

  const result = await sendPushNotificationChannel({
    tokens: [token],
    title,
    body,
    data,
    meta,
  });

  return {
    success: result.success,
    error: result.error,
  };
};
