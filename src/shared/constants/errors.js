// =============================================================================
// RESQID Error Code Registry — Machine-readable codes for API error responses
//
// Format: DOMAIN_PROBLEM (SCREAMING_SNAKE_CASE)
// Frontend uses these to show specific messages and handle errors gracefully.
//
// Used by:
//   - ApiError.js          → static factory methods
//   - error.middleware.js  → map known errors to codes
//   - Frontend             → error handling logic
// =============================================================================

export const ERROR_CODES = Object.freeze({
  // ─── Authentication ────────────────────────────────────────────────────────
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_MISSING: 'TOKEN_MISSING',
  INVALID_OTP: 'INVALID_OTP',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_MAX_ATTEMPTS: 'OTP_MAX_ATTEMPTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_DEACTIVATED: 'ACCOUNT_DEACTIVATED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_REVOKED: 'SESSION_REVOKED',
  REFRESH_TOKEN_INVALID: 'REFRESH_TOKEN_INVALID',
  REFRESH_TOKEN_EXPIRED: 'REFRESH_TOKEN_EXPIRED',

  // ─── Authorization ─────────────────────────────────────────────────────────
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  ROLE_REQUIRED: 'ROLE_REQUIRED',
  TENANT_REQUIRED: 'TENANT_REQUIRED',

  // ─── Module & Plan Access ─────────────────────────────────────────────────
  MODULE_NOT_ALLOWED: 'MODULE_NOT_ALLOWED',
  MODULE_ACCESS_DENIED: 'MODULE_ACCESS_DENIED',
  NO_SUBSCRIPTION: 'NO_SUBSCRIPTION',
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
  SUBSCRIPTION_LIMIT_REACHED: 'SUBSCRIPTION_LIMIT_REACHED',
  PLAN_UPGRADE_REQUIRED: 'PLAN_UPGRADE_REQUIRED',

  // ─── School & Tenant ──────────────────────────────────────────────────────
  SCHOOL_NOT_FOUND: 'SCHOOL_NOT_FOUND',
  SCHOOL_INACTIVE: 'SCHOOL_INACTIVE',
  SCHOOL_ACCESS_DENIED: 'SCHOOL_ACCESS_DENIED',
  SCHOOL_LIMIT_REACHED: 'SCHOOL_LIMIT_REACHED',

  // ─── Student ──────────────────────────────────────────────────────────────
  STUDENT_NOT_FOUND: 'STUDENT_NOT_FOUND',
  STUDENT_ALREADY_EXISTS: 'STUDENT_ALREADY_EXISTS',
  STUDENT_LIMIT_REACHED: 'STUDENT_LIMIT_REACHED',

  // ─── Card / Token / QR ────────────────────────────────────────────────────
  CARD_NOT_FOUND: 'CARD_NOT_FOUND',
  CARD_INACTIVE: 'CARD_INACTIVE',
  CARD_REVOKED: 'CARD_REVOKED',
  CARD_UNREGISTERED: 'CARD_UNREGISTERED',
  CARD_INVALID: 'CARD_INVALID',
  CARD_EXPIRED: 'CARD_EXPIRED',
  QR_INVALID: 'QR_INVALID',
  QR_EXPIRED: 'QR_EXPIRED',
  QR_TAMPERED: 'QR_TAMPERED',

  // ─── Device ───────────────────────────────────────────────────────────────
  DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
  DEVICE_MISMATCH: 'DEVICE_MISMATCH',
  DEVICE_NOT_RECOGNIZED: 'DEVICE_NOT_RECOGNIZED',
  DEVICE_BLOCKED: 'DEVICE_BLOCKED',
  DEVICE_LIMIT_EXCEEDED: 'DEVICE_LIMIT_EXCEEDED',
  DEVICE_OFFLINE: 'DEVICE_OFFLINE',
  DEVICE_UNREGISTERED: 'DEVICE_UNREGISTERED',
  FINGERPRINT_MISMATCH: 'FINGERPRINT_MISMATCH',
  FINGERPRINT_CHANGED: 'FINGERPRINT_CHANGED',

  // ─── Rate Limiting ────────────────────────────────────────────────────────
  RATE_LIMITED: 'RATE_LIMITED',
  GLOBAL_RATE_LIMITED: 'GLOBAL_RATE_LIMITED',
  SCAN_LIMIT_EXCEEDED: 'SCAN_LIMIT_EXCEEDED',
  ATTENDANCE_LIMIT_EXCEEDED: 'ATTENDANCE_LIMIT_EXCEEDED',
  LOGIN_LIMIT_EXCEEDED: 'LOGIN_LIMIT_EXCEEDED',
  API_LIMIT_EXCEEDED: 'API_LIMIT_EXCEEDED',
  SLOW_DOWN: 'SLOW_DOWN',

  // ─── IP Security ──────────────────────────────────────────────────────────
  IP_BLOCKED: 'IP_BLOCKED',
  IP_REPUTATION_BLOCKED: 'IP_REPUTATION_BLOCKED',
  IP_WHITELIST_REQUIRED: 'IP_WHITELIST_REQUIRED',
  VPN_DETECTED: 'VPN_DETECTED',
  PROXY_DETECTED: 'PROXY_DETECTED',
  TOR_DETECTED: 'TOR_DETECTED',

  // ─── Geo Blocking ─────────────────────────────────────────────────────────
  GEO_BLOCKED: 'GEO_BLOCKED',
  GEO_RESTRICTED: 'GEO_RESTRICTED',
  UNSUPPORTED_REGION: 'UNSUPPORTED_REGION',

  // ─── CSRF Protection ──────────────────────────────────────────────────────
  CSRF_INVALID: 'CSRF_INVALID',
  CSRF_TOKEN_MISSING: 'CSRF_TOKEN_MISSING',
  CSRF_TOKEN_INVALID: 'CSRF_TOKEN_INVALID',
  CSRF_TOKEN_EXPIRED: 'CSRF_TOKEN_EXPIRED',

  // ─── Input Validation & Sanitization ──────────────────────────────────────
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_PHONE: 'INVALID_PHONE',
  INVALID_EMAIL: 'INVALID_EMAIL',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  CONTENT_TYPE_INVALID: 'CONTENT_TYPE_INVALID',
  REQUEST_TOO_LARGE: 'REQUEST_TOO_LARGE',
  HPP_DETECTED: 'HPP_DETECTED',
  XSS_DETECTED: 'XSS_DETECTED',
  SQL_INJECTION_DETECTED: 'SQL_INJECTION_DETECTED',
  NOSQL_INJECTION_DETECTED: 'NOSQL_INJECTION_DETECTED',
  INVALID_INPUT_FORMAT: 'INVALID_INPUT_FORMAT',

  // ─── File Upload ──────────────────────────────────────────────────────────
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',

  // ─── Attack Detection ─────────────────────────────────────────────────────
  ATTACK_PATTERN_DETECTED: 'ATTACK_PATTERN_DETECTED',
  BRUTE_FORCE_DETECTED: 'BRUTE_FORCE_DETECTED',
  CREDENTIAL_STUFFING: 'CREDENTIAL_STUFFING',
  SCANNING_DETECTED: 'SCANNING_DETECTED',

  // ─── Behavioral Security ──────────────────────────────────────────────────
  BEHAVIOR_ANOMALY: 'BEHAVIOR_ANOMALY',
  RAPID_SCANS: 'RAPID_SCANS',
  UNUSUAL_LOCATION: 'UNUSUAL_LOCATION',
  IMPOSSIBLE_TRAVEL: 'IMPOSSIBLE_TRAVEL',
  ATTENDANCE_ANOMALY: 'ATTENDANCE_ANOMALY',
  UNUSUAL_ACTIVITY: 'UNUSUAL_ACTIVITY',

  // ─── System & Maintenance ─────────────────────────────────────────────────
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CACHE_ERROR: 'CACHE_ERROR',
  MAINTENANCE_MODE: 'MAINTENANCE_MODE',
  VERSION_DEPRECATED: 'VERSION_DEPRECATED',
  INVALID_API_VERSION: 'INVALID_API_VERSION',
  WORKER_ERROR: 'WORKER_ERROR',

  // ─── Webhook & Integration ────────────────────────────────────────────────
  WEBHOOK_INVALID: 'WEBHOOK_INVALID',
  WEBHOOK_SIGNATURE_MISMATCH: 'WEBHOOK_SIGNATURE_MISMATCH',
  INTEGRATION_FAILED: 'INTEGRATION_FAILED',

  // ─── Order & Payment ──────────────────────────────────────────────────────
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_INVALID_STATE: 'ORDER_INVALID_STATE',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
});

// ─── Error Code Categories ───────────────────────────────────────────────────
// Group error codes for easier handling in middleware

export const ERROR_CATEGORIES = Object.freeze({
  AUTH: [
    ERROR_CODES.INVALID_TOKEN,
    ERROR_CODES.TOKEN_EXPIRED,
    ERROR_CODES.TOKEN_MISSING,
    ERROR_CODES.INVALID_CREDENTIALS,
    ERROR_CODES.SESSION_EXPIRED,
  ],
  RATE_LIMIT: [
    ERROR_CODES.RATE_LIMITED,
    ERROR_CODES.GLOBAL_RATE_LIMITED,
    ERROR_CODES.SCAN_LIMIT_EXCEEDED,
    ERROR_CODES.ATTENDANCE_LIMIT_EXCEEDED,
    ERROR_CODES.LOGIN_LIMIT_EXCEEDED,
    ERROR_CODES.SLOW_DOWN,
  ],
  SECURITY: [
    ERROR_CODES.IP_BLOCKED,
    ERROR_CODES.GEO_BLOCKED,
    ERROR_CODES.DEVICE_BLOCKED,
    ERROR_CODES.CSRF_INVALID,
    ERROR_CODES.XSS_DETECTED,
    ERROR_CODES.SQL_INJECTION_DETECTED,
    ERROR_CODES.ATTACK_PATTERN_DETECTED,
    ERROR_CODES.BRUTE_FORCE_DETECTED,
  ],
  BEHAVIORAL: [
    ERROR_CODES.BEHAVIOR_ANOMALY,
    ERROR_CODES.RAPID_SCANS,
    ERROR_CODES.UNUSUAL_LOCATION,
    ERROR_CODES.IMPOSSIBLE_TRAVEL,
  ],
  DEVICE: [
    ERROR_CODES.DEVICE_NOT_RECOGNIZED,
    ERROR_CODES.DEVICE_BLOCKED,
    ERROR_CODES.DEVICE_MISMATCH,
    ERROR_CODES.FINGERPRINT_MISMATCH,
  ],
  VALIDATION: [
    ERROR_CODES.VALIDATION_ERROR,
    ERROR_CODES.INVALID_INPUT_FORMAT,
    ERROR_CODES.CONTENT_TYPE_INVALID,
    ERROR_CODES.REQUEST_TOO_LARGE,
  ],
  SYSTEM: [
    ERROR_CODES.INTERNAL_ERROR,
    ERROR_CODES.SERVICE_UNAVAILABLE,
    ERROR_CODES.DATABASE_ERROR,
    ERROR_CODES.MAINTENANCE_MODE,
  ],
});

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Check if an error code belongs to a specific category
 */
export const isErrorCategory = (errorCode, category) => {
  const categoryCodes = ERROR_CATEGORIES[category];
  return categoryCodes ? categoryCodes.includes(errorCode) : false;
};

/**
 * Get the category of an error code
 */
export const getErrorCategory = (errorCode) => {
  for (const [category, codes] of Object.entries(ERROR_CATEGORIES)) {
    if (codes.includes(errorCode)) return category;
  }
  return 'UNKNOWN';
};

/**
 * Get HTTP status code for an error code (defaults based on category)
 */
export const getStatusCodeForError = (errorCode) => {
  const category = getErrorCategory(errorCode);
  const statusMap = {
    AUTH: 401,
    RATE_LIMIT: 429,
    SECURITY: 403,
    BEHAVIORAL: 403,
    DEVICE: 401,
    VALIDATION: 422,
    SYSTEM: 500,
  };
  return statusMap[category] || 500;
};
