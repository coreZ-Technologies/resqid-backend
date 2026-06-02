// TODO: Add implementation
// school-admin/qr/qr.routes.js
import { Router } from 'express';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize, ROLES } from '#middleware/auth/authorize.middleware.js';
import { validate } from '#middleware/validate.middleware.js';
import { rateLimit } from 'express-rate-limit';
import {
  generateQrSchema,
  assignTokenSchema,
  listTokensQuerySchema,
} from './qr.validation.js';
import * as controller from './qr.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.SCHOOL_ADMIN));

const generateLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });

router.get('/', validate(listTokensQuerySchema, 'query'), controller.listTokens);
router.get('/stats', controller.getStats);
router.get('/:id', controller.getTokenDetails);
router.post('/:id/generate-qr', generateLimiter, validate(generateQrSchema), controller.generateQr);
router.post('/:id/regenerate-qr', generateLimiter, validate(generateQrSchema), controller.regenerateQr);
router.post('/:id/assign', validate(assignTokenSchema), controller.assignToken);

export default router;