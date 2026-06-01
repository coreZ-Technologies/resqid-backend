// src/modules/scan/scan.routes.js
import { Router } from 'express';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorizeMin, ROLES } from '#middleware/auth/authorize.middleware.js';
import { validate } from '#middleware/validate.middleware.js';
import { sanitizeDeep } from '#middleware/sanitize.middleware.js';
import { ownSchoolOnly } from '#middleware/restrictionOwnSchool.middleware.js';
import { checkIpBlockedRedis, publicScanLimiter, perTokenScanLimit } from '#middleware/security/scan.middleware.js';
import {
  handleScan,
  listScanLogs,
  getTodayStats,
  getScanLogById,
  exportScanLogs,
} from './scan.controller.js';
import {
  scanCodeParamsSchema,
  listScanLogsQuerySchema,
  exportScanLogsQuerySchema,
  getScanLogParamsSchema,
} from './scan.validation.js';

const router = Router();

// ─── Public scan endpoint (no auth required) ─────────────────────────────────
router.get(
  '/s/:code',
  checkIpBlockedRedis,
  publicScanLimiter,
  perTokenScanLimit,
  validate(scanCodeParamsSchema, 'params'),
  handleScan
);

// ─── Protected scan logs endpoints (School Admin only) ───────────────────────
router.use(authenticate);
router.use(authorizeMin(ROLES.SCHOOL_ADMIN));
router.use(ownSchoolOnly);
router.use(sanitizeDeep);

router.get('/logs', validate(listScanLogsQuerySchema, 'query'), listScanLogs);
router.get('/logs/stats/today', getTodayStats);
router.get('/logs/export', validate(exportScanLogsQuerySchema, 'query'), exportScanLogs);
router.get('/logs/:id', validate(getScanLogParamsSchema, 'params'), getScanLogById);

export default router;