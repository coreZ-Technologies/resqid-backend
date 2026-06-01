// src/modules/communication/communication.routes.js
import { Router } from 'express';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorizeMin, ROLES } from '#middleware/auth/authorize.middleware.js';
import { validate } from '#middleware/validate.middleware.js';
import { sanitizeDeep } from '#middleware/sanitize.middleware.js';
import { ownSchoolOnly } from '#middleware/restrictionOwnSchool.middleware.js';
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  getAnnouncementStats,
  incrementAnnouncementViews,
  scheduleAnnouncement,
  listDeliveryLogs,
  getDeliveryStats,
  retryDelivery,
  createThread,
  sendMessage,
  listThreads,
  getThreadDetails,
  getUnreadCount,
} from './communication.controller.js';
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  listAnnouncementsQuerySchema,
  scheduleAnnouncementSchema,
  listDeliveryLogsQuerySchema,
  createThreadSchema,
  sendMessageSchema,
  listThreadsQuerySchema,
} from './communication.validation.js';

const router = Router();

// All routes require authentication and school admin role
router.use(authenticate);
router.use(authorizeMin(ROLES.SCHOOL_ADMIN));
router.use(ownSchoolOnly);
router.use(sanitizeDeep);

// ─── Announcements ─────────────────────────────────────────
router.post('/announcements', validate(createAnnouncementSchema), createAnnouncement);
router.get('/announcements', validate(listAnnouncementsQuerySchema, 'query'), listAnnouncements);
router.get('/announcements/stats', getAnnouncementStats);
router.get('/announcements/:id', getAnnouncementStats); // placeholder, implement proper get
router.put('/announcements/:id', validate(updateAnnouncementSchema), updateAnnouncement);
router.delete('/announcements/:id', deleteAnnouncement);
router.post('/announcements/:id/views', incrementAnnouncementViews);
router.post('/announcements/:id/schedule', validate(scheduleAnnouncementSchema), scheduleAnnouncement);

// ─── Delivery Logs ─────────────────────────────────────────
router.get('/delivery-logs', validate(listDeliveryLogsQuerySchema, 'query'), listDeliveryLogs);
router.get('/delivery-logs/stats', getDeliveryStats);
router.post('/delivery-logs/:id/retry', retryDelivery);

// ─── Messages & Threads ────────────────────────────────────
router.post('/threads', validate(createThreadSchema), createThread);
router.get('/threads', validate(listThreadsQuerySchema, 'query'), listThreads);
router.get('/threads/unread-count', getUnreadCount);
router.get('/threads/:id', getThreadDetails);
router.post('/threads/:id/messages', validate(sendMessageSchema), sendMessage);
// Alternative route for sending without threadId (will auto-create)
router.post('/messages', validate(sendMessageSchema), sendMessage);

export default router;