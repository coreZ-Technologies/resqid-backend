// school-admin/scanAnomaly/scanAnomaly.routes.js
import { Router } from 'express';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize, ROLES } from '#middleware/auth/authorize.middleware.js';
import { validate } from '#middleware/validate.middleware.js';
import { rateLimit } from 'express-rate-limit';
import {
  listAnomaliesQuerySchema,
  updateAnomalyStatusSchema,
  exportAnomaliesQuerySchema,
} from './scanAnomaly.validation.js';
import * as controller from './scanAnomaly.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.SCHOOL_ADMIN));

const exportLimiter = rateLimit({ windowMs: 60 * 1000, max: 5 });

router.get('/', validate(listAnomaliesQuerySchema, 'query'), controller.listAnomalies);
router.get('/stats', controller.getStats);
router.get('/:id', controller.getAnomalyDetails);
router.patch('/:id/status', validate(updateAnomalyStatusSchema), controller.updateAnomalyStatus);
router.get('/export', exportLimiter, validate(exportAnomaliesQuerySchema, 'query'), controller.exportAnomalies);

export default router;