// src/modules/share/notification/notification.router.js
import { Router } from 'express';
import { NotificationController } from './notification.controller.js';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/authorize.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

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

export default router;