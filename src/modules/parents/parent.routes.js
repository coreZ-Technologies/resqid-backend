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
import * as controller from './parent.controller.js';

const router = Router();

<<<<<<< HEAD
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
=======
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
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
// =============================================================================

router.patch(
  '/me/notifications',
  validate(updateNotificationsSchema),
  controller.updateNotifications
);

// =============================================================================
// CHILD MANAGEMENT
// =============================================================================

<<<<<<< HEAD
// Update card visibility for a child
=======
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
router.patch(
  '/me/students/:studentId/visibility',
  validate(updateVisibilitySchema),
  controller.updateVisibility
);

<<<<<<< HEAD
// Lock child's card (emergency)
router.post('/me/students/:studentId/lock', controller.lockCard);

// Link a child via RFID card number
router.post('/me/children', validate(linkCardSchema), controller.linkCard);

// Set active child (for dashboard default)
=======
router.post('/me/students/:studentId/lock', controller.lockCard);

router.post('/me/children', validate(linkCardSchema), controller.linkCard);

>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
router.patch('/me/active-child', validate(setActiveStudentSchema), controller.setActiveStudent);

// =============================================================================
// SCAN HISTORY
// =============================================================================

router.get('/me/students/:studentId/scans', controller.getScanHistory);

// =============================================================================
<<<<<<< HEAD
// DEVICE REGISTRATION (Push Notifications)
=======
// DEVICE
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
// =============================================================================

router.post('/me/device', validate(registerDeviceTokenSchema), controller.registerDeviceToken);

// =============================================================================
<<<<<<< HEAD
// PHOTO UPLOAD (Student Photos)
// =============================================================================

// Generate presigned upload URL
=======
// PHOTO UPLOAD
// =============================================================================

>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
router.post(
  '/me/students/:studentId/photo/upload-url',
  validate(generateUploadUrlSchema),
  controller.generatePhotoUploadUrl
);

<<<<<<< HEAD
// Confirm photo upload after S3 upload completes
=======
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
router.post(
  '/me/students/:studentId/photo/confirm',
  validate(confirmUploadSchema),
  controller.confirmPhotoUpload
);

export default router;