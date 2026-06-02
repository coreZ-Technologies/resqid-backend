// src/modules/share/notification/notification.retry.js
import { retryQueue } from './notification.queue.js';
import { logger } from '#config/logger.js';

export const RetryHandler = {
  async scheduleRetry(notificationId, payload, delayMs = 30000, attempt = 1) {
    const job = await retryQueue.add(
      { notificationId, payload, attempt },
      { delay: delayMs, attempts: 1 }
    );
    logger.info({ notificationId, attempt, jobId: job.id }, 'Retry scheduled');
    return job;
  },

  async cancelRetries(notificationId) {
    const jobs = await retryQueue.getJobs(['waiting', 'delayed']);
    for (const job of jobs) {
      if (job.data.notificationId === notificationId) {
        await job.remove();
      }
    }
  },
};