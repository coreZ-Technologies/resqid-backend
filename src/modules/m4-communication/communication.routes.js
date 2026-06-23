// src/modules/m4-communication/communication.routes.js
import { Router } from 'express';
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
  markThreadReadSchema, // changed from markReadSchema
} from './communication.validation.js';
import * as controller from './communication.controller.js';

const router = Router();

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
router.get(
  '/announcements',
  validate(listAnnouncementsQuerySchema, 'query'),
  controller.listAnnouncements
);
router.get('/announcements/stats', controller.getAnnouncementStats);
router.post(
  '/announcements',
  sendLimiter,
  validate(createAnnouncementSchema),
  controller.createAnnouncement
);
router.put('/announcements/:id', validate(updateAnnouncementSchema), controller.updateAnnouncement);
router.delete('/announcements/:id', controller.deleteAnnouncement);

// ─── Delivery Logs ────────────────────────────────────────────────
router.get('/delivery-logs', validate(deliveryLogQuerySchema, 'query'), controller.getDeliveryLogs);
router.get('/delivery-logs/stats', controller.getDeliveryStats); // NEW
router.post(
  '/delivery-logs/:deliveryId/retry',
  validate(retryDeliverySchema, 'params'),
  controller.retryDelivery
);

// ─── Messages ─────────────────────────────────────────────────────
router.get('/messages/threads', validate(listMessagesQuerySchema, 'query'), controller.getThreads);
router.get('/messages', validate(listMessagesQuerySchema, 'query'), controller.getMessages);
router.post('/messages', sendLimiter, validate(sendMessageSchema), controller.sendMessage);
router.patch(
  '/messages/threads/:parentId/read',
  validate(markThreadReadSchema, 'params'),
  controller.markThreadRead
); // changed

export default router;
