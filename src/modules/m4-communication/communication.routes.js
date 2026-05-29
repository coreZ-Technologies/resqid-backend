// =============================================================================
// modules/m4-communication/communication.routes.js — RESQID
// Mounted at /api/communication
// =============================================================================

import { Router } from 'express';
import { validate, validateAll } from '#middleware/validate.middleware.js';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/rbac.middleware.js';
import { ROLES } from '#shared/constants/roles.js';
import * as controller from './communication.controller.js';
import {
  createAnnouncementSchema,
  listAnnouncementsSchema,
  getAnnouncementSchema,
  sendMessageSchema,
  listMessagesSchema,
} from './communication.validation.js';

const router = Router();

const STAFF = [ROLES.TEACHER, ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN];
const PARENT = [ROLES.PARENT];

// ═══════════════════════════════════════════════════════════════════════════════
// ANNOUNCEMENTS — Teacher/Admin only
// ═══════════════════════════════════════════════════════════════════════════════

router.post(
  '/announcements',
  authenticate,
  authorize(STAFF),
  validate(createAnnouncementSchema),
  controller.createAnnouncement
);

router.get('/announcements', authenticate, authorize(STAFF), controller.listAnnouncements);

router.get(
  '/announcements/:id',
  authenticate,
  authorize(STAFF),
  validateAll(getAnnouncementSchema),
  controller.getAnnouncement
);

// ═══════════════════════════════════════════════════════════════════════════════
// DIRECT MESSAGES — Teacher/Admin sends, Parent reads
// ═══════════════════════════════════════════════════════════════════════════════

router.post(
  '/messages',
  authenticate,
  authorize(STAFF),
  validate(sendMessageSchema),
  controller.sendMessage
);

router.get('/messages', authenticate, authorize(PARENT), controller.listMessages);

router.patch('/messages/:id/read', authenticate, authorize(PARENT), controller.markRead);

export default router;
