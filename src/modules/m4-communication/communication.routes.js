// src/modules/m4-communication/communication.routes.js
import { Router } from 'express';
import { validate } from '#middleware/validate.middleware.js';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/authorize.middleware.js';
import { ROLES } from '#shared/constants/roles.js';
import * as controller from './communication.controller.js';
import {
  createAnnouncementSchema,
  sendMessageSchema,
  createTemplateSchema,
  createCampaignSchema,
} from './communication.validation.js';
import * as controller from './communication.controller.js';

const router = Router();

const STAFF = [ROLES.TEACHER, ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN];
const ADMIN = [ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN];
const PARENT = [ROLES.PARENT];

// =============================================================================
// ANNOUNCEMENTS — Teacher/Admin
// =============================================================================

router.post(
  '/announcements',
  authenticate,
  authorize(...STAFF),
  validate(createAnnouncementSchema),
  controller.createAnnouncement
);

router.get('/announcements', authenticate, authorize(...STAFF), controller.listAnnouncements);

router.get('/announcements/:id', authenticate, authorize(...STAFF), controller.getAnnouncement);

router.delete(
  '/announcements/:id',
  authenticate,
  authorize(...ADMIN),
  controller.deleteAnnouncement
);

// =============================================================================
// DIRECT MESSAGES — Teacher/Admin sends, Parent reads
// =============================================================================

router.post(
  '/messages',
  authenticate,
  authorize(...STAFF),
  validate(sendMessageSchema),
  controller.sendMessage
);

router.get('/messages', authenticate, authorize(...PARENT), controller.listMessages);

router.get(
  '/messages/thread/:threadId',
  authenticate,
  authorize(...PARENT, ...STAFF),
  controller.getThread
);

router.patch('/messages/:id/read', authenticate, authorize(...PARENT), controller.markRead);

// =============================================================================
// MESSAGE TEMPLATES — School Admin only
// =============================================================================

router.post(
  '/templates',
  authenticate,
  authorize(...ADMIN),
  validate(createTemplateSchema),
  controller.createTemplate
);

router.get('/templates', authenticate, authorize(...STAFF), controller.listTemplates);

router.delete('/templates/:id', authenticate, authorize(...ADMIN), controller.deleteTemplate);

// =============================================================================
// CAMPAIGNS — School Admin only
// =============================================================================

router.post(
  '/campaigns',
  authenticate,
  authorize(...ADMIN),
  validate(createCampaignSchema),
  controller.createCampaign
);

router.get('/campaigns', authenticate, authorize(...STAFF), controller.listCampaigns);

router.get('/campaigns/:id', authenticate, authorize(...STAFF), controller.getCampaign);

export default router;
