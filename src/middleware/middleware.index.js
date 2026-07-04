// =============================================================================
// middleware.index.js — RESQID
//
// Central middleware composer — builds the complete middleware chain.
// Import this single file in app.js and apply in order.
//
// Three pipeline builders:
//   buildGlobalPipeline()     → Applied to ALL routes
//   buildAuthPipeline()       → Applied to protected routes
//   buildPublicScanPipeline() → Applied to QR emergency scan routes
// =============================================================================

// ─── Core ────────────────────────────────────────────────────────────────────
export { requestId } from '#middleware/requestId.middleware.js';
export { globalErrorHandler, notFoundHandler } from '#middleware/error.middleware.js';
export { apiVersion } from '#middleware/apiVersion.middleware.js';
export { maintenanceMode } from '#middleware/maintenanceMode.middleware.js';
export { enforceContentType } from '#middleware/contentType.middleware.js';
export { validate, validateAll } from '#middleware/validate.middleware.js';
export { accessLogger } from '#middleware/morgan.middleware.js';
export {
  requireModule,
  requireAnyModule,
  requireAllModules,
} from '#middleware/requireModule.middleware.js';

// ─── Auth ────────────────────────────────────────────────────────────────────
export { authenticate } from '#middleware/auth/authenticate.middleware.js';
export {
  authorize,
  authorizeMin,
  authorizeSchool,
  authorizeParent,
} from '#middleware/auth/authorize.middleware.js';
export {
  can,
  canAny,
  canAll,
  requireSuperAdmin,
  requireSchoolStaff,
  requireAuth,
  requireModule as rbacRequireModule,
} from '#middleware/auth/rbac.middleware.js';
export { tenantScope } from '#middleware/auth/tenantScope.middleware.js';
export {
  ownSchoolOnly,
  ownChildrenOnly,
  ownProfileOnly,
  ownTokenOnly,
  ownStudentOnly,
} from '#middleware/restrictionOwnSchool.middleware.js';

// ─── Security ────────────────────────────────────────────────────────────────
export {
  helmetMiddleware,
  dashboardHelmet,
  publicHelmet,
  apiHelmet,
} from '#middleware/security/helmet.middleware.js';
export {
  corsMiddleware,
  dashboardCors,
  mobileCors,
  publicCors,
  handleCorsError,
} from '#middleware/security/cors.middleware.js';
export { cloudflareOnly } from '#middleware/security/cloudflare.middleware.js';
export {
  verifyCsrf,
  issueCsrfToken,
  clearCsrfToken,
} from '#middleware/security/csrf.middleware.js';
export { hppProtection } from '#middleware/security/hpp.middleware.js';
export { sanitizeXss } from '#middleware/security/xss.middleware.js';
// export { sanitizeNoSql, sanitizeDeep } from '#middleware/security/sanitize.middleware.js';
export {
  publicEmergencyLimiter,
  authLimiter,
  otpLimiter,
  apiLimiter,
  uploadLimiter,
  dashboardLimiter,
  tokenGenerationLimiter,
  registerLimiter,
  perTokenScanLimit,
  checkIpBlocked,
} from '#middleware/security/rateLimit.middleware.js';
export {
  publicEmergencySlowDown,
  authSlowDown,
  apiSlowDown,
  scanTokenSlowDown,
  ipSlowDown,
} from '#middleware/security/slowDown.middleware.js';
export { enforceRequestSize } from '#middleware/security/requestSize.middleware.js';
export { checkIpReputation } from '#middleware/security/ipReputation.middleware.js';
export { ipBlockMiddleware } from '#middleware/security/ipBlock.middleware.js';
export { geoBlock } from '#middleware/security/geoBlock.middleware.js';
export { checkIpBlockedRedis, publicScanLimiter } from '#middleware/security/scan.middleware.js';
export {
  behavioralSecurity,
  recordFailedAuth,
  recordSuccessfulAuth,
} from '#middleware/security/behavioralSecurity.middleware.js';
export { verifyDevice } from '#middleware/deviceFingerprint.middleware.js';

// ─── Logging ─────────────────────────────────────────────────────────────────
export { httpLogger } from '#middleware/logging/httpLogger.middleware.js';
export { auditLog } from '#middleware/logging/auditLog.middleware.js';
export { attackLogger } from '#middleware/logging/attackLogger.middleware.js';

import { maintenanceMode } from '#middleware/maintenanceMode.middleware.js';
import { cloudflareOnly } from '#middleware/security/cloudflare.middleware.js';
import { helmetMiddleware } from '#middleware/security/helmet.middleware.js';
import { corsMiddleware } from '#middleware/security/cors.middleware.js';
import { requestId } from '#middleware/requestId.middleware.js';
import { httpLogger } from '#middleware/logging/httpLogger.middleware.js';
import { enforceRequestSize } from '#middleware/security/requestSize.middleware.js';
import { enforceContentType } from '#middleware/contentType.middleware.js';
import { hppProtection } from '#middleware/security/hpp.middleware.js';
import { sanitizeXss } from '#middleware/security/xss.middleware.js';
import { ipBlockMiddleware } from '#middleware/security/ipBlock.middleware.js';
import { checkIpReputation } from '#middleware/security/ipReputation.middleware.js';
import { geoBlock } from '#middleware/security/geoBlock.middleware.js';
import { attackLogger } from '#middleware/logging/attackLogger.middleware.js';
// =============================================================================
// PIPELINE BUILDERS
// =============================================================================

/**
 * buildGlobalPipeline()
 *
 * Applied to ALL routes — security foundation that runs before anything else.
 *
 * Order matters:
 *   1. Maintenance mode — block everything if enabled
 *   2. Cloudflare — verify CF proxy, set real IP
 *   3. Helmet — security headers
 *   4. CORS — cross-origin
 *   5. Request ID — correlation
 *   6. HTTP Logger — request/response logging
 *   7. Request size — reject oversized bodies
 *   8. Content-Type — enforce JSON
 *   9. HPP — parameter pollution
 *  10. XSS — strip HTML/script tags
 *  11. Sanitize NoSQL — strip $ operators
 *  12. Sanitize Deep — clean nested objects
 *  13. IP Block — check Redis blocklist
 *  14. IP Reputation — datacenter/Tor check
 *  15. Geo Block — India-only dashboard
 *  16. Attack Logger — detect attack patterns
 *
 * @returns {Array} Array of middleware functions
 */
export function buildGlobalPipeline() {
  return [
    maintenanceMode,
    cloudflareOnly,
    helmetMiddleware,
    corsMiddleware,
    requestId,
    httpLogger,
    enforceRequestSize,
    enforceContentType,
    hppProtection,
    sanitizeXss,
    // sanitizeNoSql,
    // sanitizeDeep,
    ipBlockMiddleware,
    checkIpReputation,
    geoBlock,
    attackLogger,
  ];
}

/**
 * buildAuthPipeline()
 *
 * Applied to ALL protected routes (after global pipeline).
 *
 * Order:
 *   1. API Version — resolve version
 *   2. Authenticate — JWT / Device / Webhook
 *   3. Device Verify — fingerprint check
 *   4. Tenant Scope — school isolation
 *   5. Rate Limit — API limiter
 *   6. Slow Down — progressive delay
 *   7. Behavioral Security — anomaly detection
 *   8. CSRF — double-submit cookie
 *   9. Audit Log — record mutations
 *
 * @returns {Array} Array of middleware functions
 */
export function buildAuthPipeline() {
  return [
    apiVersion,
    authenticate,
    verifyDevice,
    tenantScope,
    apiLimiter,
    apiSlowDown,
    behavioralSecurity,
    verifyCsrf,
    auditLog,
  ];
}

/**
 * buildPublicScanPipeline()
 *
 * Applied to QR emergency scan routes (/s/:code, /api/emergency/profile/:id).
 * No authentication required — heavy rate limiting instead.
 *
 * Order:
 *   1. IP Block — Redis check
 *   2. IP Reputation — datacenter/Tor check
 *   3. Public Scan Limiter — 30/min per IP
 *   4. Per-Token Limiter — 20/hour per QR code
 *   5. Public Slow Down — progressive delay
 *   6. Device Verify (tracking only, not enforced)
 *
 * @returns {Array} Array of middleware functions
 */
export function buildPublicScanPipeline() {
  return [
    checkIpBlockedRedis,
    checkIpReputation,
    publicScanLimiter,
    perTokenScanLimit,
    publicEmergencySlowDown,
    verifyDevice, // tracking only for emergency responders
  ];
}

/**
 * buildDashboardPipeline()
 *
 * Applied to super admin and school admin dashboard routes.
 * Extra strict — geo-blocked, CSRF enforced, dashboard rate limits.
 *
 * @returns {Array} Array of middleware functions
 */
export function buildDashboardPipeline() {
  return [
    apiVersion,
    authenticate,
    verifyDevice,
    tenantScope,
    dashboardLimiter,
    apiSlowDown,
    behavioralSecurity,
    verifyCsrf,
    auditLog,
  ];
}

/**
 * buildAuthRoutesPipeline()
 *
 * Applied to login, OTP, register routes.
 * Pre-authentication — strict auth rate limiting, no JWT required.
 *
 * @returns {Array} Array of middleware functions
 */
export function buildAuthRoutesPipeline() {
  return [authLimiter, authSlowDown, otpLimiter, registerLimiter];
}

// =============================================================================
// USAGE IN app.js
// =============================================================================
//
// import {
//   buildGlobalPipeline,
//   buildAuthPipeline,
//   buildPublicScanPipeline,
//   buildDashboardPipeline,
//   buildAuthRoutesPipeline,
//   errorHandler,
//   notFoundHandler,
//   handleCorsError,
// } from '#middleware/middleware.index.js';
//
// // 1. Global pipeline — ALL routes
// app.use(buildGlobalPipeline());
//
// // 2. CORS error handler
// app.use(handleCorsError);
//
// // 3. Public scan routes — no auth
// app.use('/s', buildPublicScanPipeline(), scanRoutes);
// app.use('/api/emergency', buildPublicScanPipeline(), emergencyRoutes);
//
// // 4. Auth routes — pre-authentication
// app.use('/api/auth', buildAuthRoutesPipeline(), authRoutes);
//
// // 5. Dashboard routes — with auth
// app.use('/api/super-admin', buildDashboardPipeline(), superAdminRoutes);
// app.use('/api/school-admin', buildDashboardPipeline(), schoolAdminRoutes);
//
// // 6. Protected API routes — with auth
// app.use('/api', buildAuthPipeline(), apiRoutes);
//
// // 7. Error handling (LAST)
// app.use(notFoundHandler);
// app.use(globalErrorHandler);
