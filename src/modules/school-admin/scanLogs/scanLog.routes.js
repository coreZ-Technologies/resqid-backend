// school-admin/scanLogs/scanLog.routes.js
import { Router } from 'express';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize, ROLES } from '#middleware/auth/authorize.middleware.js';
import { validate } from '#middleware/validate.middleware.js';
import { listScanLogsQuerySchema } from './scanLog.validation.js';
import * as controller from './scanLog.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.SCHOOL_ADMIN));

router.get('/', validate(listScanLogsQuerySchema, 'query'), controller.listScanLogs);
router.get('/stats', controller.getTodayStats);

export default router;