// =============================================================================
// modules/scan/scan.routes.js — RESQID
// Scan Routes — API endpoints for scan logs and analytics
// =============================================================================

import { Router } from 'express';
import scanController from './scan.controller.js';

// Middleware imports
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/authorize.middleware.js';
import { tenantScope } from '#middleware/auth/tenantScope.middleware.js';
import { validate } from '#middleware/validate.middleware.js';
import { auditLog } from '#middleware/logging/auditLog.middleware.js';
import { requireModule } from '#middleware/requireModule.middleware.js';
import { rateLimit } from '#middleware/security/rateLimit.middleware.js';

// Validation schemas
import { scanValidation } from './scan.validation.js';

// ─── Router Setup ─────────────────────────────────────────────────────────────

const router = Router();

// All routes require authentication (except scan creation)
router.use(authenticate);

// All routes require tenant (school) context
router.use(tenantScope);

// All routes require 'scans' module to be enabled
router.use(requireModule('scans'));

// ─── PUBLIC ROUTE (Scan creation - rate limited) ─────────────────────────────

/**
 * POST /api/scans
 * Create a scan log - can be called by scanning devices
 * Rate limited to prevent abuse
 */
const publicRouter = Router();
publicRouter.post(
    '/',
    rateLimit({ windowMs: 60 * 1000, max: 100 }), // 100 scans per minute
    validate(scanValidation.createScanLog),
    scanController.create
);

// ─── SCAN LOG ROUTES ──────────────────────────────────────────────────────────

/**
 * GET /api/scans
 * List scan logs with filtering
 * Access: Super Admin, School Admin
 */
router.get(
    '/',
    authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
    validate(scanValidation.queryScans, 'query'),
    scanController.list
);

/**
 * GET /api/scans/stats
 * Get scan statistics
 * Access: Super Admin, School Admin
 */
router.get(
    '/stats',
    authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
    validate(scanValidation.scanStats, 'query'),
    scanController.stats
);

/**
 * GET /api/scans/dashboard
 * Get dashboard summary
 * Access: Super Admin, School Admin
 */
router.get(
    '/dashboard',
    authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
    scanController.dashboard
);

/**
 * GET /api/scans/anomalies
 * Detect scan anomalies
 * Access: Super Admin, School Admin
 */
router.get(
    '/anomalies',
    authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
    scanController.anomalies
);

/**
 * GET /api/scans/export
 * Export scan logs as CSV
 * Access: Super Admin, School Admin
 */
router.get(
    '/export',
    authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
    scanController.exportScans
);

/**
 * GET /api/scans/token/:tokenId
 * Get scans by token ID
 * Access: Super Admin, School Admin, Teacher
 */
router.get(
    '/token/:tokenId',
    authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER']),
    scanController.getByToken
);

/**
 * GET /api/scans/student/:studentId
 * Get scans by student ID
 * Access: Super Admin, School Admin, Teacher, Parent
 */
router.get(
    '/student/:studentId',
    authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT']),
    scanController.getByStudent
);

/**
 * GET /api/scans/:scanId
 * Get scan log by ID
 * Access: Super Admin, School Admin
 */
router.get(
    '/:scanId',
    authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
    scanController.getById
);

/**
 * DELETE /api/scans/:scanId
 * Delete a scan log
 * Access: Super Admin, School Admin
 */
router.delete(
    '/:scanId',
    authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
    auditLog('scan.delete'),
    scanController.deleteScan
);

/**
 * POST /api/scans/bulk-delete
 * Bulk delete scan logs
 * Access: Super Admin, School Admin
 */
router.post(
    '/bulk-delete',
    authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
    validate(scanValidation.bulkDelete),
    auditLog('scan.bulkDelete'),
    scanController.bulkDelete
);

/**
 * POST /api/scans/cleanup
 * Cleanup old scan logs
 * Access: Super Admin only
 */
router.post(
    '/cleanup',
    authorize(['SUPER_ADMIN']),
    auditLog('scan.cleanup'),
    scanController.cleanup
);

// ─── Export Routes ────────────────────────────────────────────────────────────

const scanRoutes = Router();
scanRoutes.use('/scans', publicRouter);
scanRoutes.use('/scans', router);

export default scanRoutes;