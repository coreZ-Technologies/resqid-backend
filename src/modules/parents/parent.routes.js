// src/modules/m5-parents/parent.routes.js
import { Router } from 'express';
import { validate } from '#middleware/validate.middleware.js';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/authorize.middleware.js';
import { ROLES } from '#shared/constants/roles.js';
import * as controller from './parent.controller.js';              // ✅ Fixed duplicate import
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

const router = Router();

// ─── Authentication ─────────────────────────────────────────────────────────
// All parent routes require authentication
router.use(authenticate);

// ─── Role authorization ─────────────────────────────────────────────────────
// Parent endpoints can be accessed by PARENT (self) or SCHOOL_ADMIN (for management)
router.use(authorize(ROLES.PARENT, ROLES.SCHOOL_ADMIN));

// =============================================================================
// DASHBOARD & PROFILE (Parent Self-Service)
// =============================================================================

// Get parent dashboard data
router.get('/me', controller.getMe);

// Update own profile (PARENT only; SCHOOL_ADMIN may also use for support)
router.patch('/me', validate(parentProfileSchema), controller.updateParentProfile);

// =============================================================================
// NOTIFICATION PREFERENCES
// =============================================================================

router.patch(
  '/me/notifications',
  validate(updateNotificationsSchema),
  controller.updateNotifications
);

// =============================================================================
// CHILD MANAGEMENT
// =============================================================================

// Update card visibility for a child
router.patch(
  '/me/students/:studentId/visibility',
  validate(updateVisibilitySchema),
  controller.updateVisibility
);

// Lock child's card (emergency)
router.post('/me/students/:studentId/lock', controller.lockCard);

// Link a child via RFID card number
router.post('/me/children', validate(linkCardSchema), controller.linkCard);

// Set active child (for dashboard default)
router.patch('/me/active-child', validate(setActiveStudentSchema), controller.setActiveStudent);

// =============================================================================
// SCAN HISTORY
// =============================================================================

router.get('/me/students/:studentId/scans', controller.getScanHistory);

// =============================================================================
// DEVICE REGISTRATION (Push Notifications)
// =============================================================================

router.post('/me/device', validate(registerDeviceTokenSchema), controller.registerDeviceToken);

// =============================================================================
// PHOTO UPLOAD (Student Photos)
// =============================================================================

// Generate presigned upload URL
router.post(
  '/me/students/:studentId/photo/upload-url',
  validate(generateUploadUrlSchema),
  controller.generatePhotoUploadUrl
);

// Confirm photo upload after S3 upload completes
router.post(
  '/me/students/:studentId/photo/confirm',
  validate(confirmUploadSchema),
  controller.confirmPhotoUpload
);

export default router;