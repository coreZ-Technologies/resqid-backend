// school-admin/notification/notification.routes.js
import { Router } from 'express';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize, ROLES } from '#middleware/auth/authorize.middleware.js';
import { validate } from '#middleware/validate.middleware.js';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import {
  createNotificationSchema,
  listNotificationsQuerySchema,
} from './notification.validation.js';
import * as controller from './notification.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.SCHOOL_ADMIN));

const createLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });

// Optional: param validation for :id
const idParamSchema = z.object({
  id: z.string().min(1),
});

// ─── Routes ────────────────────────────────────────────────
router.get('/recipients/options', controller.getRecipientOptions); // ✅ NEW

router.post('/', createLimiter, validate(createNotificationSchema), controller.createNotification);
router.get('/', validate(listNotificationsQuerySchema, 'query'), controller.listNotifications);
router.get('/stats', controller.getNotificationStats);
router.get('/:id', validate(idParamSchema, 'params'), controller.getNotificationDetails);
router.post('/:id/resend', validate(idParamSchema, 'params'), controller.resendNotification);
router.delete('/:id', validate(idParamSchema, 'params'), controller.deleteNotification);

export default router;