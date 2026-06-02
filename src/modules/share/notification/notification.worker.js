// src/modules/share/notification/notification.worker.js
import { notificationQueue, retryQueue } from './notification.queue.js';
import { NotificationDispatcher } from './notification.dispatcher.js';
import { logger } from '#config/logger.js';

export async function startWorkers() {
  // Main queue worker
  notificationQueue.process(async (job) => {
    const { notificationId, payload } = job.data;
    logger.info({ notificationId, jobId: job.id }, 'Processing notification job');
    const result = await NotificationDispatcher.dispatch(notificationId, payload);
    return result;
  });

  // Retry queue worker
  retryQueue.process(async (job) => {
    const { notificationId, payload, attempt } = job.data;
    logger.warn({ notificationId, attempt }, 'Retrying notification');
    const result = await NotificationDispatcher.dispatch(notificationId, payload);
    return result;
  });

  logger.info('Notification workers started');
}