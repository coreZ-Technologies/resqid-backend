// src/modules/share/notification/notification.queue.js
import Bull from 'bull';
import { redisConfig } from '#config/redis.js';
import { logger } from '#config/logger.js';

const NOTIFICATION_QUEUE_NAME = 'notification-queue';
const RETRY_QUEUE_NAME = 'notification-retry';

export const notificationQueue = new Bull(NOTIFICATION_QUEUE_NAME, {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const retryQueue = new Bull(RETRY_QUEUE_NAME, {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 30000 },
  },
});

// Graceful shutdown
export async function closeQueues() {
  await notificationQueue.close();
  await retryQueue.close();
  logger.info('Notification queues closed');
}