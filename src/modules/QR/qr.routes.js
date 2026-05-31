// =============================================================================
// modules/qr/qr.routes.js — RESQID
// QR Routes — API endpoints for QR code and token management
// =============================================================================

import { Router } from 'express';
import qrController from './qr.controller.js';

// Middleware imports
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorize } from '#middleware/auth/authorize.middleware.js';
import { tenantScope } from '#middleware/auth/tenantScope.middleware.js';
import { validate } from '#middleware/validate.middleware.js';
import { auditLog } from '#middleware/logging/auditLog.middleware.js';
import { requireModule } from '#middleware/requireModule.middleware.js';

// Validation schemas
import { qrValidation } from './qr.validation.js';

// ─── Router Setup ─────────────────────────────────────────────────────────────

const router = Router();

// All routes require authentication
router.use(authenticate);

// All routes require tenant (school) context
router.use(tenantScope);

// All routes require 'qr' or 'tokens' module to be enabled
router.use(requireModule('qr'));

// ─── PUBLIC ROUTE (QR Scan - no auth required) ────────────────────────────────

/**
 * GET /api/qr/scan/:scanCodeHash
 * Scan a QR code - public endpoint for emergency access
 */
const publicRouter = Router();
publicRouter.get(
  '/scan/:scanCodeHash',
  qrController.getToken // This would be a dedicated scan handler
);

// ─── TOKEN MANAGEMENT ROUTES ──────────────────────────────────────────────────

/**
 * GET /api/qr/tokens
 * List all tokens with filtering
 * Access: Super Admin, School Admin
 */
router.get(
  '/tokens',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  validate(qrValidation.queryTokens, 'query'),
  qrController.listTokens
);

/**
 * GET /api/qr/tokens/:tokenId
 * Get token by ID
 * Access: Super Admin, School Admin, Teacher
 */
router.get(
  '/tokens/:tokenId',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER']),
  qrController.getToken
);

/**
 * POST /api/qr/tokens
 * Create new token
 * Access: Super Admin, School Admin
 */
router.post(
  '/tokens',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  validate(qrValidation.assignToken),
  auditLog('token.create'),
  qrController.createToken
);

/**
 * POST /api/qr/tokens/bulk
 * Bulk create tokens
 * Access: Super Admin, School Admin
 */
router.post(
  '/tokens/bulk',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  auditLog('token.bulkCreate'),
  qrController.bulkCreateTokens
);

/**
 * POST /api/qr/tokens/:tokenId/assign
 * Assign token to student
 * Access: Super Admin, School Admin
 */
router.post(
  '/tokens/:tokenId/assign',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  auditLog('token.assign'),
  qrController.assignToken
);

/**
 * PATCH /api/qr/tokens/:tokenId/status
 * Update token status
 * Access: Super Admin, School Admin
 */
router.patch(
  '/tokens/:tokenId/status',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  validate(qrValidation.updateTokenStatus),
  auditLog('token.statusUpdate'),
  qrController.updateTokenStatus
);

// ─── QR GENERATION ROUTES ─────────────────────────────────────────────────────

/**
 * POST /api/qr/tokens/:tokenId/generate
 * Generate QR code for a token
 * Access: Super Admin, School Admin
 */
router.post(
  '/tokens/:tokenId/generate',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  validate(qrValidation.generateQr),
  auditLog('qr.generate'),
  qrController.generateQr
);

/**
 * POST /api/qr/tokens/:tokenId/regenerate
 * Regenerate QR code
 * Access: Super Admin, School Admin
 */
router.post(
  '/tokens/:tokenId/regenerate',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  validate(qrValidation.regenerateQr),
  auditLog('qr.regenerate'),
  qrController.regenerateQr
);

/**
 * POST /api/qr/bulk-generate
 * Bulk generate QR codes
 * Access: Super Admin, School Admin
 */
router.post(
  '/bulk-generate',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  validate(qrValidation.bulkGenerateQr),
  auditLog('qr.bulkGenerate'),
  qrController.bulkGenerateQr
);

/**
 * GET /api/qr/tokens/:tokenId/download
 * Download QR code
 * Access: Super Admin, School Admin, Teacher
 */
router.get(
  '/tokens/:tokenId/download',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER']),
  qrController.downloadQr
);

/**
 * GET /api/qr/tokens/:tokenId/preview
 * Preview QR code
 * Access: Super Admin, School Admin, Teacher
 */
router.get(
  '/tokens/:tokenId/preview',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER']),
  qrController.previewQr
);

// ─── SCAN LOGS ROUTES ─────────────────────────────────────────────────────────

/**
 * GET /api/qr/tokens/:tokenId/scans
 * Get scan logs for a token
 * Access: Super Admin, School Admin
 */
router.get(
  '/tokens/:tokenId/scans',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  qrController.getScanLogs
);

// ─── STATISTICS ROUTES ────────────────────────────────────────────────────────

/**
 * GET /api/qr/stats
 * Get token statistics
 * Access: Super Admin, School Admin
 */
router.get('/stats', authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']), qrController.getStats);

/**
 * GET /api/qr/recent-scans
 * Get recent scans
 * Access: Super Admin, School Admin
 */
router.get(
  '/recent-scans',
  authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  qrController.getRecentScans
);

// ─── Export Routes ────────────────────────────────────────────────────────────

const qrRoutes = Router();
qrRoutes.use('/qr', publicRouter);
qrRoutes.use('/qr', router);

export default qrRoutes;
