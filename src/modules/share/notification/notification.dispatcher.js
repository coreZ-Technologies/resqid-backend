// src/modules/share/notification/notification.dispatcher.js
import { sendEmail } from './channels/email.channel.js';
import { sendPush } from './channels/push.channel.js';
import { sendSms } from './channels/sms.channel.js';
import { sendInApp } from './channels/inapp.channel.js';
import { NotificationRepository } from './notification.repository.js';
import { RetryHandler } from './notification.retry.js';
import { channelRateLimits } from './notification.rateLimit.js';
import { logger } from '#config/logger.js';

const channelHandlers = {
  email: sendEmail,
  push: sendPush,
  sms: sendSms,
  inapp: sendInApp,
};

export const NotificationDispatcher = {
  async dispatch(notificationId, payload) {
    const { userId, channel, title, body, data, priority } = payload;
    const startTime = Date.now();

    // Update log status to processing
    await NotificationRepository.updateLog(notificationId, {
      status: 'processing',
      startedAt: new Date(),
    });

    // Rate limit check
    const rateLimiter = channelRateLimits[channel];
    if (rateLimiter) {
      const { allowed, retryAfter } = await rateLimiter.check(userId);
      if (!allowed) {
        const error = `Rate limit exceeded for ${channel}. Retry after ${retryAfter}s`;
        await NotificationRepository.updateLog(notificationId, {
          status: 'failed',
          error,
          completedAt: new Date(),
        });
        throw new Error(error);
      }
    }

    try {
      const handler = channelHandlers[channel];
      if (!handler) throw new Error(`Unsupported channel: ${channel}`);

      const channelPayload = {
        to: userId, // channel will resolve actual contact (email/phone/token)
        title,
        body,
        data,
      };
      // Channel-specific mapping
      if (channel === 'email') channelPayload.to = payload.email || userId;
      if (channel === 'sms') channelPayload.phoneNumber = payload.phone || userId;
      if (channel === 'push') channelPayload.deviceToken = payload.deviceToken;

      const result = await handler(channelPayload);

      await NotificationRepository.updateLog(notificationId, {
        status: 'sent',
        response: result,
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
      });
      return result;
    } catch (error) {
      logger.error({ err: error, notificationId }, 'Dispatch failed');
      await NotificationRepository.updateLog(notificationId, {
        status: 'failed',
        error: error.message,
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
      });

      // Schedule retry if priority is high or critical
      if (priority === 'high' || priority === 'critical') {
        const attempt = (payload.retryCount || 0) + 1;
        if (attempt <= 3) {
          await RetryHandler.scheduleRetry(notificationId, { ...payload, retryCount: attempt }, 30000, attempt);
        }
      }
      throw error;
    }
  },
};