// src/modules/parents/parent.routes.js
import { Router } from 'express';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorizeMin, ROLES } from '#middleware/auth/authorize.middleware.js';
import { validate } from '#middleware/validate.middleware.js';
import { sanitizeDeep } from '#middleware/sanitize.middleware.js';
import { ownSchoolOnly } from '#middleware/restrictionOwnSchool.middleware.js';
import {
  createParent,
  getParent,
  listParents,
  updateParent,
  deleteParent,
  getParentStats,
  exportParents,
} from './parent.controller.js';
import {
  createParentSchema,
  updateParentSchema,
  listParentsQuerySchema,
  exportParentsQuerySchema,
} from './parent.validation.js';

const router = Router();

// All routes require authentication and at least SCHOOL_ADMIN role
router.use(authenticate);
router.use(authorizeMin(ROLES.SCHOOL_ADMIN));
router.use(ownSchoolOnly);
router.use(sanitizeDeep);

// ─── CRUD ─────────────────────────────────────────────────────────────────
router.post('/', validate(createParentSchema), createParent);
router.get('/', validate(listParentsQuerySchema, 'query'), listParents);
router.get('/stats', getParentStats);
router.get('/export', validate(exportParentsQuerySchema, 'query'), exportParents);
router.get('/:id', getParent);
router.put('/:id', validate(updateParentSchema), updateParent);
router.delete('/:id', deleteParent);

export default router;