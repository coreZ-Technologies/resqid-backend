// school-admin/sessions/sessions.routes.js
import { Router } from 'express';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize, ROLES } from '#middleware/auth/authorize.middleware.js';
import { validate } from '#middleware/validate.middleware.js';
import { rateLimit } from 'express-rate-limit';
import {
  createSessionSchema,
  updateSessionSchema,
  listSessionsQuerySchema,
} from './sessions.validation.js';
import * as controller from './sessions.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.SCHOOL_ADMIN));

const createLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });

router.get('/', validate(listSessionsQuerySchema, 'query'), controller.listSessions);
router.get('/stats', controller.getStats);
router.post('/', createLimiter, validate(createSessionSchema), controller.createSession);
router.get('/:id', controller.getSession);
router.put('/:id', validate(updateSessionSchema), controller.updateSession);
router.delete('/:id', controller.deleteSession);
router.patch('/:id/set-current', controller.setCurrentSession);

export default router;