// =============================================================================
// modules/m2-emergency/emergency.notification.js — RESQID
// Orchestrator integration for emergency notifications.
// Queues jobs to BullMQ for SMS, Email, and Push notifications.
// =============================================================================

import { queueManager } from '#orchestrator/queues/queue.manager.js';
import { QUEUE_NAMES } from '#orchestrator/queues/queue.names.js';
import { logger } from '#config/logger.js';

/**
 * Send an emergency notification via multiple channels (SMS, Email, Push).
 * Queues a job to the notification worker.
 *
 * @param {Object} params
 * @param {Object} params.contact - Contact object (name, phone, email, relation)
 * @param {string} params.studentName - Full name of the student
 * @param {string} params.message - Emergency message
 * @param {string} params.schoolId - School ID for context
 * @param {string} [params.priority] - Job priority (default: 5 = highest)
 * @returns {Promise<boolean>} - True if queued successfully
 */
export const sendEmergencyNotification = async ({
  contact,
  studentName,
  message,
  schoolId,
  priority = 5,
}) => {
  try {
    // Build notification payload
    const payload = {
      type: 'EMERGENCY',
      channels: [],
      recipients: {},
      template: 'emergency_alert',
      data: {
        studentName,
        message,
        schoolId,
        contactName: contact.name,
        relation: contact.relation,
        timestamp: new Date().toISOString(),
      },
    };

    // Determine which channels to use based on contact preferences
    if (contact.phone && contact.smsEnabled !== false) {
      payload.channels.push('sms');
      payload.recipients.sms = { phone: contact.phone };
    }

    if (contact.email && contact.emailEnabled !== false) {
      payload.channels.push('email');
      payload.recipients.email = { email: contact.email };
    }

    // Push notifications require an Expo push token (mobile apps)
    // If you have a push token stored in the contact or user device, add it here
    // For now, we skip push unless explicitly requested
    if (contact.pushToken) {
      payload.channels.push('push');
      payload.recipients.push = { token: contact.pushToken };
    }

    // If no channels available, log and return false
    if (payload.channels.length === 0) {
      logger.warn(
        { contactName: contact.name, studentName },
        'No communication channels enabled for emergency contact'
      );
      return false;
    }

    // Queue the job with BullMQ
    await queueManager.addJob(
      QUEUE_NAMES.NOTIFICATION,
      'send_emergency_alert',
      payload,
      {
        priority,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );

    logger.info(
      {
        contactName: contact.name,
        studentName,
        channels: payload.channels,
      },
      'Emergency notification queued successfully'
    );

    return true;
  } catch (error) {
    logger.error(
      {
        error: error.message,
        contactName: contact?.name,
        studentName,
      },
      'Failed to queue emergency notification'
    );
    return false;
  }
};

/**
 * Send an emergency SMS to a specific phone number.
 * Simpler than the full notification — directly queues an SMS job.
 *
 * @param {Object} params
 * @param {string} params.phone - Recipient phone number
 * @param {string} params.message - SMS message
 * @param {string} params.contactName - Name of the contact (for logging)
 * @param {string} [params.priority] - Job priority (default: 5)
 * @returns {Promise<boolean>} - True if queued successfully
 */
export const sendEmergencySMS = async ({
  phone,
  message,
  contactName = 'Unknown',
  priority = 5,
}) => {
  try {
    if (!phone) {
      logger.warn('No phone number provided for emergency SMS');
      return false;
    }

    await queueManager.addJob(
      QUEUE_NAMES.NOTIFICATION,
      'send_sms',
      {
        channel: 'sms',
        recipient: { phone },
        template: 'emergency_sms',
        data: {
          message,
          contactName,
          timestamp: new Date().toISOString(),
        },
      },
      {
        priority,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );

    logger.info(
      {
        phone: phone.slice(0, -4) + '****', // Mask phone for privacy
        contactName,
      },
      'Emergency SMS queued successfully'
    );

    return true;
  } catch (error) {
    logger.error(
      {
        error: error.message,
        phone: phone?.slice(0, -4) + '****',
        contactName,
      },
      'Failed to queue emergency SMS'
    );
    return false;
  }
};

/**
 * Send emergency email to a specific address.
 *
 * @param {Object} params
 * @param {string} params.email - Recipient email
 * @param {string} params.subject - Email subject
 * @param {string} params.message - Email body
 * @param {string} params.contactName - Name of the contact
 * @param {string} [params.priority] - Job priority (default: 5)
 * @returns {Promise<boolean>} - True if queued successfully
 */
export const sendEmergencyEmail = async ({
  email,
  subject,
  message,
  contactName = 'Unknown',
  priority = 5,
}) => {
  try {
    if (!email) {
      logger.warn('No email provided for emergency email');
      return false;
    }

    await queueManager.addJob(
      QUEUE_NAMES.NOTIFICATION,
      'send_email',
      {
        channel: 'email',
        recipient: { email },
        template: 'emergency_email',
        data: {
          subject: subject || '🚨 Emergency Alert',
          message,
          contactName,
          timestamp: new Date().toISOString(),
        },
      },
      {
        priority,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );

    logger.info(
      {
        email,
        contactName,
      },
      'Emergency email queued successfully'
    );

    return true;
  } catch (error) {
    logger.error(
      {
        error: error.message,
        email,
        contactName,
      },
      'Failed to queue emergency email'
    );
    return false;
  }
};