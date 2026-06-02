// src/modules/m5-parents/parent.routes.js
import { Router } from 'express';
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
} from './parent.validation.js';
import * as controller from './parent.controller.js';

const router = Router();

// All routes require authentication and school admin role
router.use(authenticate);
router.use(authorize(ROLES.SCHOOL_ADMIN));

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