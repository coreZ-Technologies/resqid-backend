<<<<<<< HEAD
// src/modules/share/notification/notification.router.js
import { Router } from 'express';
import { NotificationController } from './notification.controller.js';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/authorize.middleware.js';
=======
// =============================================================================
// notification.router.js — RESQID
// Mounted at /api/notifications
// =============================================================================

import { Router } from 'express';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/rbac.middleware.js';
import { ROLES } from '#shared/constants/roles.js';
import * as controller from './notification.controller.js';
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e

const router = Router();

// All routes require authentication
router.use(authenticate);

<<<<<<< HEAD
// User routes (self)
router.post('/send', authorize('USER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), NotificationController.send);
router.post('/send-bulk', authorize('SCHOOL_ADMIN', 'SUPER_ADMIN'), NotificationController.sendBulk);
router.get('/logs', authorize('USER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), NotificationController.getLogs);
router.get('/logs/:id', authorize('USER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), NotificationController.getLog);
router.get('/preferences', NotificationController.getPreferences);
router.put('/preferences', NotificationController.updatePreferences);
router.get('/inapp', NotificationController.getInApp);
router.put('/inapp/:notificationId/read', NotificationController.markInAppRead);

// Template management (admin only)
router.get('/templates/:name', authorize('SUPER_ADMIN'), NotificationController.getTemplate);
router.put('/templates/:name', authorize('SUPER_ADMIN'), NotificationController.saveTemplate);
=======
// ─── Parent routes ──────────────────────────────────────────────────────────
router.get('/inbox', authorize([ROLES.PARENT]), controller.getInbox);
router.get('/unread-count', authorize([ROLES.PARENT]), controller.getUnreadCount);
router.patch('/:id/read', authorize([ROLES.PARENT]), controller.markAsRead);
router.patch('/read-all', authorize([ROLES.PARENT]), controller.markAllAsRead);

// Preferences
router.get('/preferences', authorize([ROLES.PARENT]), controller.getPreferences);
router.patch('/preferences', authorize([ROLES.PARENT]), controller.updatePreferences);

// School admin view (all notifications within school)
router.get('/school', authorize([ROLES.SCHOOL_ADMIN, ROLES.TEACHER]), controller.getSchoolNotifications);

// Webhook (no role, but should be secured with secret in production)
router.post('/webhook/failure', controller.webhookDeliveryFailure);
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e

export default router;