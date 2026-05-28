// =============================================================================
// modules/parents/parent.routes.js — RESQID
// Mounted at /api/parents
// =============================================================================

import { Router } from 'express';
import { validate, validateAll } from '#middleware/validate.middleware.js';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/rbac.middleware.js';
import { ROLES } from '#shared/constants/roles.js';
import * as controller from './parent.controller.js';
import {
  parentProfileSchema,
  updateVisibilitySchema,
  updateNotificationsSchema,
  lockCardSchema,
  registerDeviceTokenSchema,
  linkCardSchema,
  setActiveStudentSchema,
  scanHistorySchema,
  generateUploadUrlSchema,
  confirmUploadSchema,
} from './parent.validation.js';

const router = Router();

// All routes require PARENT role
router.use(authenticate, authorize(ROLES.PARENT));

// Dashboard
router.get('/me', controller.getMe);

// Profile
router.patch('/me', validate(parentProfileSchema), controller.updateParentProfile);

// Card visibility per child
router.patch(
  '/me/students/:studentId/visibility',
  validateAll(updateVisibilitySchema),
  controller.updateVisibility
);

// Notification preferences
router.patch(
  '/me/notifications',
  validate(updateNotificationsSchema),
  controller.updateNotifications
);

// Lock card (emergency)
router.post('/me/students/:studentId/lock', validateAll(lockCardSchema), controller.lockCard);

// Device token for push
router.post('/me/device', validate(registerDeviceTokenSchema), controller.registerDeviceToken);

// Add child
router.post('/me/children', validate(linkCardSchema), controller.linkCard);

// Switch active child
router.patch('/me/active-child', validate(setActiveStudentSchema), controller.setActiveStudent);

// Scan history per child
router.get(
  '/me/students/:studentId/scans',
  validateAll(scanHistorySchema),
  controller.getScanHistory
);

// Photo upload
router.post(
  '/me/students/:studentId/photo/upload-url',
  validate(generateUploadUrlSchema),
  controller.generatePhotoUploadUrl
);
router.post(
  '/me/students/:studentId/photo/confirm',
  validate(confirmUploadSchema),
  controller.confirmPhotoUpload
);

export default router;
