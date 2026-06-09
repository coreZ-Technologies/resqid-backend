// src/modules/m5-parents/parent.routes.js
import { Router } from 'express';
import { validate } from '#middleware/validate.middleware.js';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/authorize.middleware.js';
import { ROLES } from '#shared/constants/roles.js';
import * as controller from './parent.controller.js';
import {
  parentProfileSchema,
  updateVisibilitySchema,
  updateNotificationsSchema,
  registerDeviceTokenSchema,
  linkCardSchema,
  setActiveStudentSchema,
  generateUploadUrlSchema,
  confirmUploadSchema,
} from './parent.validation.js';
import * as controller from './parent.controller.js';

const router = Router();

// All routes require authentication and school admin role
router.use(authenticate);
router.use(authorize(ROLES.SCHOOL_ADMIN));

// =============================================================================
// DASHBOARD
// =============================================================================

router.get('/me', controller.getMe);

// =============================================================================
// PROFILE
// =============================================================================

router.patch('/me', validate(parentProfileSchema), controller.updateParentProfile);

// =============================================================================
// NOTIFICATIONS
// =============================================================================

router.patch(
  '/me/notifications',
  validate(updateNotificationsSchema),
  controller.updateNotifications
);

// =============================================================================
// CHILD MANAGEMENT
// =============================================================================

router.patch(
  '/me/students/:studentId/visibility',
  validate(updateVisibilitySchema),
  controller.updateVisibility
);

router.post('/me/students/:studentId/lock', controller.lockCard);

router.post('/me/children', validate(linkCardSchema), controller.linkCard);

router.patch('/me/active-child', validate(setActiveStudentSchema), controller.setActiveStudent);

// =============================================================================
// SCAN HISTORY
// =============================================================================

router.get('/me/students/:studentId/scans', controller.getScanHistory);

// =============================================================================
// DEVICE
// =============================================================================

router.post('/me/device', validate(registerDeviceTokenSchema), controller.registerDeviceToken);

// =============================================================================
// PHOTO UPLOAD
// =============================================================================

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
