// src/modules/m4-communication/communication.routes.js
import { Router } from 'express';
<<<<<<< HEAD
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize, ROLES } from '#middleware/auth/authorize.middleware.js';
import { validate } from '#middleware/validate.middleware.js';
import { rateLimit } from 'express-rate-limit';
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  listAnnouncementsQuerySchema,
  sendMessageSchema,
  listMessagesQuerySchema,
  deliveryLogQuerySchema,
  retryDeliverySchema,
  markThreadReadSchema,        // changed from markReadSchema
=======
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
>>>>>>> f769c34b07b38ef93f84fb7ec946cdc6fdb91efd
} from './communication.validation.js';
import * as controller from './communication.controller.js';

const router = Router();

<<<<<<< HEAD
// All routes require authentication and school admin role
router.use(authenticate);
router.use(authorize(ROLES.SCHOOL_ADMIN));

// Rate limiting for sending (prevent spam)
const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Announcements ────────────────────────────────────────────────
router.get('/announcements', validate(listAnnouncementsQuerySchema, 'query'), controller.listAnnouncements);
router.get('/announcements/stats', controller.getAnnouncementStats);
router.post('/announcements', sendLimiter, validate(createAnnouncementSchema), controller.createAnnouncement);
router.put('/announcements/:id', validate(updateAnnouncementSchema), controller.updateAnnouncement);
router.delete('/announcements/:id', controller.deleteAnnouncement);

// ─── Delivery Logs ────────────────────────────────────────────────
router.get('/delivery-logs', validate(deliveryLogQuerySchema, 'query'), controller.getDeliveryLogs);
router.get('/delivery-logs/stats', controller.getDeliveryStats);          // NEW
router.post('/delivery-logs/:deliveryId/retry', validate(retryDeliverySchema, 'params'), controller.retryDelivery);

// ─── Messages ─────────────────────────────────────────────────────
router.get('/messages/threads', validate(listMessagesQuerySchema, 'query'), controller.getThreads);
router.get('/messages', validate(listMessagesQuerySchema, 'query'), controller.getMessages);
router.post('/messages', sendLimiter, validate(sendMessageSchema), controller.sendMessage);
router.patch('/messages/threads/:parentId/read', validate(markThreadReadSchema, 'params'), controller.markThreadRead);  // changed

export default router;
=======
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
>>>>>>> f769c34b07b38ef93f84fb7ec946cdc6fdb91efd
