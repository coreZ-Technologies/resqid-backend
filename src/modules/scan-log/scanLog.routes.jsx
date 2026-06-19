// src/modules/scan-log/scanLog.routes.js
import { Router } from 'express';
<<<<<<< HEAD
=======
import { rateLimit } from 'express-rate-limit';
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
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

<<<<<<< HEAD
=======
// Rate limiter for export endpoint
const exportLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,              // 5 requests per minute
  message: 'Too many export requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
// All routes require authentication and school admin role
router.use(authenticate);
router.use(authorizeMin(ROLES.SCHOOL_ADMIN));
router.use(ownSchoolOnly);
router.use(sanitizeDeep);

// Routes
router.get('/', validate(listScanLogsQuerySchema, 'query'), listScanLogs);
router.get('/stats/today', getTodayStats);
<<<<<<< HEAD
router.get('/export', validate(exportScanLogsQuerySchema, 'query'), exportScanLogs);
=======
router.get('/export', exportLimiter, validate(exportScanLogsQuerySchema, 'query'), exportScanLogs);
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
router.get('/:id', validate(getScanLogParamsSchema, 'params'), getScanLogById);

export default router;