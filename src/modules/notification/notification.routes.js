// =============================================================================
// notification.routes.js — RESQID
// All notification-related routes for parent, school admin, and webhooks.
// =============================================================================

import { Router } from 'express';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/authorize.middleware.js';
import { tenantScope } from '#middleware/auth/tenantScope.middleware.js';
import { validate } from '#middleware/validate.middleware.js';

import {
  // Parent inbox
  getInboxHandler,
  getUnreadCountHandler,
  markAsReadHandler,
  markAllReadHandler,

  // School admin
  getSchoolNotificationsHandler,
  getNotificationByIdHandler,
  deleteNotificationHandler,
  sendNotificationHandler,
  bulkNotificationHandler,
  resendNotificationHandler,

  // Preferences
  getPreferencesHandler,
  updatePreferencesHandler,
  resetPreferencesHandler,

  // Devices
  registerDeviceHandler,
  unregisterDeviceHandler,

  // Templates
  getTemplatesHandler,
  createTemplateHandler,
  updateTemplateHandler,
  deleteTemplateHandler,

  // Stats & config
  getStatsHandler,
  getRateLimitStatusHandler,
  getRecipientTypesHandler,
  getChannelsHandler,

  // Webhooks
  webhookDeliveryHandler,
} from './notification.controller.js';

import {
  sendNotificationSchema,
  bulkNotificationSchema,
  updatePreferencesSchema,
  registerDeviceSchema,
  getNotificationsQuerySchema,
  createTemplateSchema,
  updateTemplateSchema,
} from './notification.validation.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// PARENT ROUTES (Authenticated Parents)
// ═══════════════════════════════════════════════════════════════════════════

// Inbox
router.get(
  '/inbox',
  authenticate,
  authorize('PARENT'),
  validate(getNotificationsQuerySchema, 'query'),
  getInboxHandler
);

// Unread count (badge)
router.get('/unread-count', authenticate, authorize('PARENT'), getUnreadCountHandler);

// Mark single as read
router.put('/:id/read', authenticate, authorize('PARENT'), markAsReadHandler);

// Mark all as read
router.put('/read-all', authenticate, authorize('PARENT'), markAllReadHandler);

// ═══════════════════════════════════════════════════════════════════════════
// PREFERENCES (Authenticated Parents)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/preferences', authenticate, authorize('PARENT'), getPreferencesHandler);

router.put(
  '/preferences',
  authenticate,
  authorize('PARENT'),
  validate(updatePreferencesSchema),
  updatePreferencesHandler
);

router.delete('/preferences', authenticate, authorize('PARENT'), resetPreferencesHandler);

// ═══════════════════════════════════════════════════════════════════════════
// DEVICE TOKENS (Authenticated — Parents & School Users)
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/devices',
  authenticate,
  authorize('PARENT', 'SCHOOL_ADMIN', 'TEACHER'),
  validate(registerDeviceSchema),
  registerDeviceHandler
);

router.delete(
  '/devices/:token',
  authenticate,
  authorize('PARENT', 'SCHOOL_ADMIN', 'TEACHER'),
  unregisterDeviceHandler
);

// ═══════════════════════════════════════════════════════════════════════════
// SCHOOL ADMIN ROUTES (Authenticated + School Scope)
// ═══════════════════════════════════════════════════════════════════════════

// List all school notifications
router.get(
  '/school',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  tenantScope,
  validate(getNotificationsQuerySchema, 'query'),
  getSchoolNotificationsHandler
);

// Get single notification by ID
router.get(
  '/:id',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  tenantScope,
  getNotificationByIdHandler
);

// Send notification
router.post(
  '/send',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  tenantScope,
  validate(sendNotificationSchema),
  sendNotificationHandler
);

// Bulk send notification
router.post(
  '/bulk',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  tenantScope,
  validate(bulkNotificationSchema),
  bulkNotificationHandler
);

// Resend failed notification
router.post(
  '/:id/resend',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  tenantScope,
  resendNotificationHandler
);

// Delete notification
router.delete(
  '/:id',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  tenantScope,
  deleteNotificationHandler
);

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATES (School Admin)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/templates', authenticate, authorize('SCHOOL_ADMIN'), tenantScope, getTemplatesHandler);

router.post(
  '/templates',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  tenantScope,
  validate(createTemplateSchema),
  createTemplateHandler
);

router.put(
  '/templates/:id',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  tenantScope,
  validate(updateTemplateSchema),
  updateTemplateHandler
);

router.delete(
  '/templates/:id',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  tenantScope,
  deleteTemplateHandler
);

// ═══════════════════════════════════════════════════════════════════════════
// STATS & CONFIG (School Admin)
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/stats/overview',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  tenantScope,
  getStatsHandler
);

router.get(
  '/stats/rate-limits',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  tenantScope,
  getRateLimitStatusHandler
);

router.get(
  '/config/recipient-types',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  tenantScope,
  getRecipientTypesHandler
);

router.get(
  '/config/channels',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  tenantScope,
  getChannelsHandler
);

// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOKS (External Providers — API Key Auth)
// ═══════════════════════════════════════════════════════════════════════════

// Provider delivery callbacks
router.post('/webhooks/delivery', webhookDeliveryHandler);

export default router;
