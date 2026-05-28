// =============================================================================
// modules/parents/parent.routes.js — RESQID
// Mounted at /api/parents
// =============================================================================

import { Router } from 'express';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/rbac.middleware.js';
import { ROLES } from '#shared/constants/roles.js';
import { validate, validateAll } from '#middleware/validate.middleware.js';

// ─── Validation ──────────────────────────────────────────────────────────────
import {
  updateProfileSchema,
  updateVisibilitySchema,
  updateNotificationsSchema,
  lockCardSchema,
  registerDeviceTokenSchema,
  linkCardSchema,
  setActiveStudentSchema,
  scanHistorySchema,
  parentProfileSchema,
  generateUploadUrlSchema,
  confirmUploadSchema,
} from './parent.validation.js';

// ─── Controllers ─────────────────────────────────────────────────────────────
import {
  getMe,
  updateProfile,
  updateVisibility,
  updateNotifications,
  lockCard,
  registerDeviceToken,
  linkCard,
  setActiveStudent,
  getScanHistory,
  updateParentProfile,
  generatePhotoUploadUrl,
  confirmPhotoUpload,
} from './parent.controller.js';

const router = Router();

// All routes require authentication + PARENT role
router.use(authenticate, authorize(ROLES.PARENT));

// ═══════════════════════════════════════════════════════════════════════════════
// CORE ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// Dashboard home
router.get('/me', getMe);

// Update child's emergency profile
router.patch('/me/students/:studentId/emergency', validate(updateProfileSchema), updateProfile);

// Update card visibility
router.patch(
  '/me/students/:studentId/visibility',
  validate(updateVisibilitySchema),
  updateVisibility
);

// Update notification preferences
router.patch('/me/notifications', validate(updateNotificationsSchema), updateNotifications);

// Lock card (emergency)
router.post('/me/students/:studentId/lock', validate(lockCardSchema), lockCard);

// Register device for push notifications
router.post('/me/device', validate(registerDeviceTokenSchema), registerDeviceToken);

// Link a new child's card
router.post('/me/children', validate(linkCardSchema), linkCard);

// Set active child
router.patch('/me/active-child', validate(setActiveStudentSchema), setActiveStudent);

// Scan history
router.get('/me/students/:studentId/scans', validateAll(scanHistorySchema), getScanHistory);

// Update own profile
router.patch('/me', validate(parentProfileSchema), updateParentProfile);

// Photo upload
router.post(
  '/me/students/:studentId/photo/upload-url',
  validate(generateUploadUrlSchema),
  generatePhotoUploadUrl
);
router.post(
  '/me/students/:studentId/photo/confirm',
  validate(confirmUploadSchema),
  confirmPhotoUpload
);

export default router;
