// src/modules/scan-log/scanLog.routes.js
import { Router } from 'express';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorizeMin, ROLES } from '#middleware/auth/authorize.middleware.js';
import { validate } from '#middleware/validate.middleware.js';
import { sanitizeDeep } from '#middleware/sanitize.middleware.js';
import { ownSchoolOnly } from '#middleware/restrictionOwnSchool.middleware.js';
import {
  listScanLogs,
  getTodayStats,
  getScanLogById,
  exportScanLogs,
} from './scanLog.controller.js';
import {
  listScanLogsQuerySchema,
  exportScanLogsQuerySchema,
  getScanLogParamsSchema,
} from './scanLog.validation.js';

const router = Router();

// All routes require authentication and school admin role
router.use(authenticate);
router.use(authorizeMin(ROLES.SCHOOL_ADMIN));
router.use(ownSchoolOnly);
router.use(sanitizeDeep);

// Routes
router.get('/', validate(listScanLogsQuerySchema, 'query'), listScanLogs);
router.get('/stats/today', getTodayStats);
router.get('/export', validate(exportScanLogsQuerySchema, 'query'), exportScanLogs);
router.get('/:id', validate(getScanLogParamsSchema, 'params'), getScanLogById);

export default router;