// school-admin/subjects/subjects.routes.js
import { Router } from 'express';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize, ROLES } from '#middleware/auth/authorize.middleware.js';
import { validate } from '#middleware/validate.middleware.js';
import { rateLimit } from 'express-rate-limit';
import {
  createSubjectSchema,
  updateSubjectSchema,
  listSubjectsQuerySchema,
  bulkUpdateSubjectsSchema,
} from './subjects.validation.js';
import * as controller from './subjects.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.SCHOOL_ADMIN));

const createLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });
const bulkLimiter = rateLimit({ windowMs: 60 * 1000, max: 5 });

router.get('/', validate(listSubjectsQuerySchema, 'query'), controller.listSubjects);
router.get('/stats', controller.getStats);
router.post('/', createLimiter, validate(createSubjectSchema), controller.createSubject);
router.get('/:id', controller.getSubject);
router.put('/:id', validate(updateSubjectSchema), controller.updateSubject);
router.delete('/:id', controller.deleteSubject);

router.post('/bulk-update', bulkLimiter, validate(bulkUpdateSubjectsSchema), controller.bulkUpdateSubjects);

export default router;