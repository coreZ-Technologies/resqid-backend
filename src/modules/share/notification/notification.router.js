// =============================================================================
// notification.router.js — RESQID
// Mounted at /api/notifications
// =============================================================================

import { Router } from 'express';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/rbac.middleware.js';
import { ROLES } from '#shared/constants/roles.js';
import * as controller from './notification.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

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

export default router;