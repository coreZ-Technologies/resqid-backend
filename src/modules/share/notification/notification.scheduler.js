// src/modules/share/notification/notification.scheduler.js
import cron from 'node-cron';
import { NotificationService } from './notification.service.js';
import { logger } from '#config/logger.js';

// Schedule daily digest notifications (example)
export function startScheduler() {
  // Send daily summary every day at 9 AM
  cron.schedule('0 9 * * *', async () => {
    logger.info('Running daily notification digest job');
    try {
      // Fetch users who opted for digest and send summary
      // Implementation depends on your business logic
      logger.info('Daily digest completed');
    } catch (error) {
      logger.error({ err: error }, 'Daily digest failed');
    }
  });

  // Clean up old logs every Sunday at 2 AM
  cron.schedule('0 2 * * 0', async () => {
    logger.info('Cleaning up old notification logs');
    // Add cleanup logic (e.g., delete logs older than 90 days)
  });

  logger.info('Notification scheduler started');
}