// src/modules/scan/scan.routes.js
import { Router } from 'express';
import { authenticate } from '#middleware/auth/authenticate.middleware.js';
import { authorizeMin, ROLES } from '#middleware/auth/authorize.middleware.js';
import { validate } from '#middleware/validate.middleware.js';
import { sanitizeDeep } from '#middleware/sanitize.middleware.js';
import { ownSchoolOnly } from '#middleware/restrictionOwnSchool.middleware.js';
import { 
  checkIpBlockedRedis, 
  publicScanLimiter, 
  perTokenScanLimit,
  serveEmergencyHtml,
  logScanRequest,
  detectSuspiciousActivity,
  validateScanCodeFormat,
  addScanSecurityHeaders,
} from '#middleware/security/scan.middleware.js';
import {
  handleScan,
  listScanLogs,
  getTodayStats,
  getScanLogById,
  exportScanLogs,
  getScanSummary,
  getDailyScanStats,
  getResultDistribution,
  getPeakScanHours,
  getRecentScans,
  validateScanCode,
} from './scan.controller.js';
import {
  scanCodeParamsSchema,
  listScanLogsQuerySchema,
  exportScanLogsQuerySchema,
  getScanLogParamsSchema,
  scanSummaryQuerySchema,
  dailyScanStatsQuerySchema,
  peakHoursQuerySchema,
  recentScansQuerySchema,
  validateScanCodeQuerySchema,
} from './scan.validation.js';
import {
  callContact,
  whatsappContact,
  callSchool,
  callDoctor,
  checkTokenStatus,
  getEmergencyContacts,
} from './scan.redirect.controller.js';
<<<<<<< HEAD
import { validate } from '#middleware/validate.middleware.js';
import { perTokenScanLimit } from '#middleware/security/rateLimit.middleware.js';
import {
  scanCodeParamsSchema,
  contactRedirectParamsSchema,
  tokenOnlyParamsSchema,
} from './scan.validation.js';

const router = Router();

// =============================================================================
// REDIRECT ROUTES — BEFORE /:code wildcard
// These handle "Call Contact" and "WhatsApp" links from emergency profile page
// =============================================================================

/**
 * GET /s/call/:contactId/:token
 * Opens phone dialer to call an emergency contact.
 */
router.get('/call/:contactId/:token', validate(contactRedirectParamsSchema), callContact);

/**
 * GET /s/wa/:contactId/:token
 * Opens WhatsApp chat with emergency contact.
 */
router.get('/wa/:contactId/:token', validate(contactRedirectParamsSchema), whatsappContact);

/**
 * GET /s/school-call/:token
 * Opens phone dialer to call the school.
 */
router.get('/school-call/:token', validate(tokenOnlyParamsSchema), callSchool);

/**
 * GET /s/doctor-call/:token
 * Opens phone dialer to call student's doctor.
 */
router.get('/doctor-call/:token', validate(tokenOnlyParamsSchema), callDoctor);

// =============================================================================
// MAIN QR SCAN — AFTER redirect routes (/:code wildcard must be LAST)
// =============================================================================

/**
 * GET /s/:code
 * Main QR code scan endpoint.
 * Decrypts code, fetches emergency profile, returns to responder.
 */
router.get('/:code', validate(scanCodeParamsSchema), perTokenScanLimit, scanQr);
=======

const router = Router();

// ===========================================================================
// PUBLIC SCAN ENDPOINTS (No Authentication Required)
// ===========================================================================

/**
 * GET /s/:code
 * Main QR code scan endpoint - serves HTML for browsers, JSON for API
 */
router.get(
  '/s/:code',
  addScanSecurityHeaders,
  serveEmergencyHtml,
  validateScanCodeFormat,
  checkIpBlockedRedis,
  detectSuspiciousActivity,
  publicScanLimiter,
  perTokenScanLimit,
  logScanRequest,
  validate(scanCodeParamsSchema, 'params'),
  handleScan
);

// ===========================================================================
// PUBLIC EMERGENCY REDIRECT ENDPOINTS (No Authentication Required)
// ===========================================================================

/**
 * GET /s/call/:contactId/:token
 * Initiate phone call to emergency contact
 */
router.get(
  '/s/call/:contactId/:token',
  checkIpBlockedRedis,
  publicScanLimiter,
  callContact
);

/**
 * GET /s/whatsapp/:contactId/:token
 * Open WhatsApp chat with emergency contact
 */
router.get(
  '/s/whatsapp/:contactId/:token',
  checkIpBlockedRedis,
  publicScanLimiter,
  whatsappContact
);

/**
 * GET /s/call/school/:token
 * Initiate phone call to school
 */
router.get(
  '/s/call/school/:token',
  checkIpBlockedRedis,
  publicScanLimiter,
  callSchool
);
>>>>>>> 8077b3074a48cb1da7a7cf9128d6f67564a49aa0

/**
 * GET /s/call/doctor/:token
 * Initiate phone call to student's doctor
 */
router.get(
  '/s/call/doctor/:token',
  checkIpBlockedRedis,
  publicScanLimiter,
  callDoctor
);

/**
 * GET /s/status/:token
 * Check token validity (for frontend)
 */
router.get(
  '/s/status/:token',
  checkIpBlockedRedis,
  publicScanLimiter,
  checkTokenStatus
);

/**
 * GET /s/contacts/:token
 * Get all emergency contacts for a token
 */
router.get(
  '/s/contacts/:token',
  checkIpBlockedRedis,
  publicScanLimiter,
  getEmergencyContacts
);

/**
 * GET /s/validate
 * Validate scan code without creating a scan log
 */
router.get(
  '/s/validate',
  validate(validateScanCodeQuerySchema, 'query'),
  validateScanCode
);

// ===========================================================================
// PROTECTED SCAN LOGS ENDPOINTS (School Admin Only)
// ===========================================================================

// Apply authentication and authorization to all routes below
router.use(authenticate);
router.use(authorizeMin(ROLES.SCHOOL_ADMIN));
router.use(ownSchoolOnly);
router.use(sanitizeDeep);

/**
 * GET /api/scan/logs
 * List scan logs with filters and pagination
 */
router.get(
  '/logs',
  validate(listScanLogsQuerySchema, 'query'),
  listScanLogs
);

/**
 * GET /api/scan/logs/stats/today
 * Get today's scan statistics
 */
router.get(
  '/logs/stats/today',
  getTodayStats
);

/**
 * GET /api/scan/logs/export
 * Export scan logs in various formats
 */
router.get(
  '/logs/export',
  validate(exportScanLogsQuerySchema, 'query'),
  exportScanLogs
);

/**
 * GET /api/scan/logs/:id
 * Get single scan log details
 */
router.get(
  '/logs/:id',
  validate(getScanLogParamsSchema, 'params'),
  getScanLogById
);

// ===========================================================================
// STATISTICS ENDPOINTS (School Admin Only)
// ===========================================================================

/**
 * GET /api/scan/stats/summary
 * Get comprehensive scan statistics for dashboard
 */
router.get(
  '/stats/summary',
  validate(scanSummaryQuerySchema, 'query'),
  getScanSummary
);

/**
 * GET /api/scan/stats/daily
 * Get daily scan statistics for charts
 */
router.get(
  '/stats/daily',
  validate(dailyScanStatsQuerySchema, 'query'),
  getDailyScanStats
);

/**
 * GET /api/scan/stats/distribution
 * Get scan result distribution for pie chart
 */
router.get(
  '/stats/distribution',
  getResultDistribution
);

/**
 * GET /api/scan/stats/peak-hours
 * Get peak scan hours analysis
 */
router.get(
  '/stats/peak-hours',
  validate(peakHoursQuerySchema, 'query'),
  getPeakScanHours
);

/**
 * GET /api/scan/stats/recent
 * Get recent scans for activity feed
 */
router.get(
  '/stats/recent',
  validate(recentScansQuerySchema, 'query'),
  getRecentScans
);

export default router;