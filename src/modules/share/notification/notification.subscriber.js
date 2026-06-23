// src/modules/share/notification/notification.subscriber.js
import { eventBus } from './notification.eventBus.js';
import { NotificationEvents } from './notification.events.js';
import { logger } from '#config/logger.js';

// Example subscribers – extend as needed
export function initSubscribers() {
  eventBus.on(NotificationEvents.NOTIFICATION_SENT, ({ notificationId, payload }) => {
    logger.info({ notificationId }, 'Notification sent successfully');
  });

  eventBus.on(NotificationEvents.NOTIFICATION_FAILED, ({ notificationId, error }) => {
    logger.error({ notificationId, error }, 'Notification failed');
  });

  eventBus.on(NotificationEvents.NOTIFICATION_RETRY, ({ notificationId, attempt }) => {
    logger.warn({ notificationId, attempt }, 'Notification retry scheduled');
  });

  logger.info('Notification event subscribers initialized');
}