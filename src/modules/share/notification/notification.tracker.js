// src/modules/share/notification/notification.tracker.js
import { redis } from '#config/redis.js';
import { logger } from '#config/logger.js';

const TRACKING_PREFIX = 'notif_track:';

export class NotificationTracker {
  static async trackDelivery(notificationId, channel, status) {
    const key = `${TRACKING_PREFIX}${notificationId}`;
    await redis.hset(key, {
      channel,
      status,
      timestamp: Date.now(),
    });
    await redis.expire(key, 86400); // 24 hours
  }

  static async getTracking(notificationId) {
    const key = `${TRACKING_PREFIX}${notificationId}`;
    return redis.hgetall(key);
  }

  static async incrementMetric(metric, increment = 1) {
    const key = `notif_metrics:${metric}:${new Date().toISOString().slice(0, 10)}`;
    await redis.incrby(key, increment);
    await redis.expire(key, 2592000); // 30 days
  }

  static async getMetrics(metric, date) {
    const key = `notif_metrics:${metric}:${date}`;
    return redis.get(key) || 0;
  }
}