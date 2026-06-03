// src/modules/m5-parents/parent.routes.js
import { Router } from 'express';
<<<<<<< HEAD
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize, ROLES } from '#middleware/auth/authorize.middleware.js';
import { validate } from '#middleware/validate.middleware.js';
import { rateLimit } from 'express-rate-limit';
import {
  createParentSchema,
  updateParentSchema,
  listParentsQuerySchema,
  linkChildrenSchema,
  exportParentsQuerySchema,
  sendMessageSchema,
=======
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
>>>>>>> f769c34b07b38ef93f84fb7ec946cdc6fdb91efd
} from './parent.validation.js';
import * as controller from './parent.controller.js';

const router = Router();

// All routes require authentication and school admin role
router.use(authenticate);
router.use(authorize(ROLES.SCHOOL_ADMIN));

<<<<<<< HEAD
// Rate limiting for creation/export
const createLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });
const exportLimiter = rateLimit({ windowMs: 60 * 1000, max: 5 });

// ─── Parent CRUD ────────────────────────────────────────────────
router.get('/', validate(listParentsQuerySchema, 'query'), controller.listParents);
router.get('/stats', controller.getStats);
router.get('/available-students', controller.getAvailableStudents);
router.post('/', createLimiter, validate(createParentSchema), controller.createParent);
router.get('/:id', controller.getParent);
router.put('/:id', validate(updateParentSchema), controller.updateParent);
router.delete('/:id', controller.deleteParent);

// ─── Manage Children ────────────────────────────────────────────
router.post('/:id/children', validate(linkChildrenSchema), controller.linkChildren);
router.delete('/:parentId/children/:studentId', controller.unlinkChild);

// ─── Export ─────────────────────────────────────────────────────
router.get('/export', exportLimiter, validate(exportParentsQuerySchema, 'query'), controller.exportParents);

// ─── Send Message to Parent ─────────────────────────────────────
router.post('/:id/message', validate(sendMessageSchema), controller.sendMessageToParent);

export default router;
=======
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
>>>>>>> f769c34b07b38ef93f84fb7ec946cdc6fdb91efd
