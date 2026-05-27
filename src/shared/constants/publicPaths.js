// =============================================================================
// RESQID Public Path Registry — Routes that bypass JWT authentication
//
// THREE types of public paths:
//   EXACT  → path must match exactly
//   PREFIX → path or anything under it is public
//   REGEX  → dynamic segments (e.g. /s/:code)
//
// Rule: if in doubt, keep it protected.
// Fewer public paths = smaller attack surface.
//
// NOTE: Some paths here still require alternative authentication:
//   - Device endpoints → API key or device fingerprint
//   - Webhook endpoints → signature verification
//   - QR scan endpoints → rate limited + device fingerprinted
// =============================================================================

// ─── Exact Matches ───────────────────────────────────────────────────────────
// Path must match character-for-character

const EXACT_PUBLIC_PATHS = new Set([
  // Health & Monitoring
  '/health',
  '/health/detailed',
  '/api/health',
  '/api/version',

  // Authentication — Login
  '/api/auth/super-admin', // Super admin login
  '/api/auth/school', // School user login (admin/teacher)
  '/api/auth/send-otp', // Parent OTP request
  '/api/auth/verify-otp', // Parent OTP verification
  '/api/auth/register/init', // Parent registration step 1
  '/api/auth/register/verify', // Parent registration step 2
  '/api/auth/refresh', // Token refresh (no auth header needed)
  '/api/auth/forgot-password', // Password reset request
  '/api/auth/reset-password', // Password reset with token

  // RFID Attendance Device Endpoints
  // These use device API key authentication, not JWT
  '/api/attendance/tap', // RFID card tap
  '/api/attendance/device/heartbeat', // Device health check
  '/api/attendance/device/register', // Device registration
  '/api/attendance/device/sync-time', // Time synchronization

  // Webhooks (use signature verification)
  '/api/webhook/razorpay', // Payment gateway
  '/api/webhook/email', // Email delivery status
  '/api/webhook/sms', // SMS delivery status
  '/api/webhook/push', // Push notification status
]);

// ─── Prefix Matches ──────────────────────────────────────────────────────────
// Path OR anything nested under it is public
// Keep this list as short as possible

const PREFIX_PUBLIC_PATHS = [
  // Static assets (if served by Express)
  '/assets',
  '/public',

  // API documentation (if enabled)
  '/api/docs',

  // BullMQ dashboard — handled by separate auth middleware
  // DO NOT add here — uses basic auth from bull-board
];

// ─── Regex Matches — Dynamic Segments ────────────────────────────────────────
// Tightly scoped regex — won't accidentally match other routes

const REGEX_PUBLIC_PATHS = [
  // QR/NFC Scan Redirect — public (scanned by anyone)
  // /s/:scanCode — the short link that anyone scanning a QR code hits
  /^\/s\/[a-zA-Z0-9_-]+$/,

  // Emergency Profile Public View — after QR scan redirect
  // /api/emergency/profile/:studentId — view emergency info
  /^\/api\/emergency\/profile\/[a-zA-Z0-9_-]+$/,

  // Emergency Contact Notification — trigger from public scan
  // /api/emergency/notify/:studentId — send emergency alert
  /^\/api\/emergency\/notify\/[a-zA-Z0-9_-]+$/,

  // Card Status Lookup — check if card is valid (public)
  // /api/card/status/:cardCode
  /^\/api\/card\/status\/[a-zA-Z0-9_-]+$/,

  // File download with signed URLs — temporary access
  // /api/files/download/:fileId/:token
  /^\/api\/files\/download\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/,
];

// ─── Protected Paths That Look Public But Are NOT ────────────────────────────
// Documenting these here to prevent accidentally adding them
//
// DO NOT ADD:
// - /api/admin/queues          → Super admin only (BullMQ dashboard)
// - /api/admin/*                → All admin routes require auth
// - /api/school/*               → School-scoped routes require auth
// - /api/student/*              → Student data requires auth
// - /api/timetable/*            → Timetable requires auth
// - /api/communication/*        → Communication requires auth

// ─── Device-Authenticated Paths (NOT Fully Public) ───────────────────────────
// These paths bypass JWT but require device authentication:
// - /api/attendance/tap           → X-API-Key header
// - /api/attendance/device/*      → X-Device-Id + X-Device-Signature
//
// The authenticate middleware checks these paths and applies
// device authentication instead of JWT when detected.

export const DEVICE_AUTH_PATHS = new Set([
  '/api/attendance/tap',
  '/api/attendance/device/heartbeat',
  '/api/attendance/device/register',
  '/api/attendance/device/sync-time',
]);

// ─── Webhook Paths (Signature-Verified) ──────────────────────────────────────
// These paths require webhook signature verification, not JWT

export const WEBHOOK_PATHS = new Set([
  '/api/webhook/razorpay',
  '/api/webhook/email',
  '/api/webhook/sms',
  '/api/webhook/push',
]);

// ─── Rate-Limited Public Paths ───────────────────────────────────────────────
// These public paths have stricter rate limits to prevent abuse

export const HIGH_RATE_LIMIT_PATHS = new Set([
  '/api/auth/send-otp', // Prevent SMS bombing
  '/api/auth/verify-otp', // Prevent brute force
  '/api/auth/super-admin', // Prevent credential stuffing
  '/api/auth/school', // Prevent credential stuffing
  '/api/emergency/notify', // Prevent spam notifications
]);

// ─── Core Checker ────────────────────────────────────────────────────────────

/**
 * isPublicPath(path)
 *
 * Returns true if the path should bypass JWT authentication.
 * Checks exact → prefix → regex in order (fastest first).
 *
 * @param {string} path — req.path (no query string)
 * @returns {boolean}
 */
export const isPublicPath = (path) => {
  if (!path) return false;

  // 1. Exact match — O(1) Set lookup
  if (EXACT_PUBLIC_PATHS.has(path)) return true;

  // 2. Prefix match
  for (const prefix of PREFIX_PUBLIC_PATHS) {
    if (path === prefix || path.startsWith(prefix + '/')) return true;
  }

  // 3. Regex match — dynamic segments
  for (const pattern of REGEX_PUBLIC_PATHS) {
    if (pattern.test(path)) return true;
  }

  return false;
};

// ─── Device Auth Checker ─────────────────────────────────────────────────────

/**
 * isDeviceAuthPath(path)
 *
 * Returns true if the path requires device authentication instead of JWT.
 * Used by authenticate middleware to switch auth strategy.
 *
 * @param {string} path
 * @returns {boolean}
 */
export const isDeviceAuthPath = (path) => {
  return DEVICE_AUTH_PATHS.has(path);
};

// ─── Webhook Path Checker ────────────────────────────────────────────────────

/**
 * isWebhookPath(path)
 *
 * Returns true if the path is a webhook endpoint.
 * Used by authenticate middleware to apply signature verification.
 *
 * @param {string} path
 * @returns {boolean}
 */
export const isWebhookPath = (path) => {
  return WEBHOOK_PATHS.has(path);
};

// ─── Rate Limit Checker ──────────────────────────────────────────────────────

/**
 * isHighRateLimitPath(path)
 *
 * Returns true if the path should have stricter rate limiting.
 *
 * @param {string} path
 * @returns {boolean}
 */
export const isHighRateLimitPath = (path) => {
  return HIGH_RATE_LIMIT_PATHS.has(path);
};

// ─── Auth Strategy Detection ─────────────────────────────────────────────────

/**
 * getAuthStrategy(path)
 *
 * Returns the authentication strategy required for a path.
 * Used by authenticate middleware to determine auth flow.
 *
 * @param {string} path
 * @returns {'JWT' | 'DEVICE' | 'WEBHOOK' | 'NONE'}
 */
export const getAuthStrategy = (path) => {
  if (isDeviceAuthPath(path)) return 'DEVICE';
  if (isWebhookPath(path)) return 'WEBHOOK';
  if (isPublicPath(path)) return 'NONE';
  return 'JWT';
};

// ─── Exports ─────────────────────────────────────────────────────────────────
// Export sets/arrays so middleware can inspect them if needed

export const PUBLIC_PATHS = {
  exact: EXACT_PUBLIC_PATHS,
  prefix: PREFIX_PUBLIC_PATHS,
  regex: REGEX_PUBLIC_PATHS,
};
