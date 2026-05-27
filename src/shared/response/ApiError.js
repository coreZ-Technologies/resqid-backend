// =============================================================================
// ApiError.js — RESQID Unified Error Class
//
// All operational errors in the system use this class.
// Machine-readable error codes enable frontend to handle errors gracefully.
//
// Usage:
//   throw ApiError.notFound('User not found');
//   throw ApiError.unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
//   throw ApiError.validation([{ field: 'email', message: 'Required' }]);
// =============================================================================

import { ERROR_CODES } from '#shared/constants/errors.js';

export class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Human-readable error message
   * @param {Array} errors - Field-level error details (validation errors)
   * @param {string} errorCode - Machine-readable error code for frontend
   */
  constructor(statusCode, message, errors = [], errorCode = '') {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    this.errors = errors;
    this.data = null;
    this.errorCode = errorCode || this._getDefaultCode(statusCode);
    this.timestamp = new Date().toISOString();

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get default error code based on HTTP status
   * @private
   */
  _getDefaultCode(statusCode) {
    const codes = {
      400: ERROR_CODES.VALIDATION_ERROR || 'BAD_REQUEST',
      401: ERROR_CODES.UNAUTHORIZED || 'UNAUTHORIZED',
      403: ERROR_CODES.FORBIDDEN || 'FORBIDDEN',
      404: ERROR_CODES.SCHOOL_NOT_FOUND || 'NOT_FOUND',
      409: ERROR_CODES.DUPLICATE_ENTRY || 'CONFLICT',
      422: ERROR_CODES.VALIDATION_ERROR,
      429: ERROR_CODES.RATE_LIMITED,
      500: ERROR_CODES.INTERNAL_ERROR,
      503: ERROR_CODES.SERVICE_UNAVAILABLE,
    };
    return codes[statusCode] || 'ERROR';
  }

  /**
   * Check if error is operational (4xx) vs programmer error (5xx)
   */
  get isOperational() {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  /**
   * Check if error is a server error
   */
  get isServerError() {
    return this.statusCode >= 500;
  }

  // ─── 4xx Client Errors ───────────────────────────────────────────────────

  static badRequest(message = 'Bad request', errors = [], errorCode = '') {
    return new ApiError(400, message, errors, errorCode);
  }

  static unauthorized(message = 'Unauthorized', errorCode = '') {
    return new ApiError(401, message, [], errorCode);
  }

  static forbidden(message = 'Forbidden', errorCode = '') {
    return new ApiError(403, message, [], errorCode);
  }

  static notFound(message = 'Resource not found', errorCode = '') {
    return new ApiError(404, message, [], errorCode);
  }

  static conflict(message = 'Conflict', errorCode = '') {
    return new ApiError(409, message, [], errorCode);
  }

  static unprocessable(message = 'Unprocessable entity', errors = []) {
    return new ApiError(422, message, errors, ERROR_CODES.VALIDATION_ERROR);
  }

  static tooManyRequests(message = 'Too many requests', errorCode = '') {
    return new ApiError(429, message, [], errorCode || ERROR_CODES.RATE_LIMITED);
  }

  // ─── 5xx Server Errors ───────────────────────────────────────────────────

  static internal(message = 'Internal server error', errorCode = '') {
    return new ApiError(500, message, [], errorCode);
  }

  static serviceUnavailable(message = 'Service unavailable', errorCode = '') {
    return new ApiError(503, message, [], errorCode);
  }

  // ─── Auth Errors ─────────────────────────────────────────────────────────

  static invalidToken() {
    return new ApiError(401, 'Invalid token', [], ERROR_CODES.INVALID_TOKEN);
  }

  static tokenExpired() {
    return new ApiError(401, 'Token has expired', [], ERROR_CODES.TOKEN_EXPIRED);
  }

  static tokenMissing() {
    return new ApiError(401, 'Authentication token is required', [], ERROR_CODES.TOKEN_MISSING);
  }

  static invalidCredentials() {
    return new ApiError(401, 'Invalid email or password', [], ERROR_CODES.INVALID_CREDENTIALS);
  }

  static invalidOtp() {
    return new ApiError(401, 'Invalid or expired OTP', [], ERROR_CODES.INVALID_OTP);
  }

  static otpExpired() {
    return new ApiError(401, 'OTP has expired', [], ERROR_CODES.OTP_EXPIRED);
  }

  static otpMaxAttempts() {
    return new ApiError(429, 'Too many OTP attempts', [], ERROR_CODES.OTP_MAX_ATTEMPTS);
  }

  static accountLocked(reason = 'Account has been locked') {
    return new ApiError(423, reason, [], ERROR_CODES.ACCOUNT_LOCKED);
  }

  static accountDeactivated() {
    return new ApiError(403, 'Account has been deactivated', [], ERROR_CODES.ACCOUNT_DEACTIVATED);
  }

  // ─── Authorization Errors ─────────────────────────────────────────────────

  static permissionDenied(message = 'You do not have permission') {
    return new ApiError(403, message, [], ERROR_CODES.PERMISSION_DENIED);
  }

  static roleRequired(role) {
    return new ApiError(403, `Role '${role}' is required`, [], ERROR_CODES.ROLE_REQUIRED);
  }

  // ─── Module & Plan Errors ─────────────────────────────────────────────────

  static noSubscription() {
    return new ApiError(403, 'No active subscription', [], ERROR_CODES.NO_SUBSCRIPTION);
  }

  static subscriptionExpired() {
    return new ApiError(403, 'Subscription has expired', [], ERROR_CODES.SUBSCRIPTION_EXPIRED);
  }

  static subscriptionLimitReached(limit) {
    return new ApiError(
      403,
      `Subscription limit reached (${limit})`,
      [],
      ERROR_CODES.SUBSCRIPTION_LIMIT_REACHED
    );
  }

  static moduleNotAllowed(module) {
    return new ApiError(
      403,
      `Module '${module}' not included in your plan`,
      [],
      ERROR_CODES.MODULE_NOT_ALLOWED
    );
  }

  static moduleAccessDenied(module) {
    return new ApiError(
      403,
      `Access denied to module: ${module}`,
      [],
      ERROR_CODES.MODULE_ACCESS_DENIED
    );
  }

  static planUpgradeRequired(feature) {
    return new ApiError(
      403,
      `Plan upgrade required to access: ${feature}`,
      [],
      ERROR_CODES.PLAN_UPGRADE_REQUIRED
    );
  }

  // ─── School & Tenant Errors ───────────────────────────────────────────────

  static schoolNotFound() {
    return new ApiError(404, 'School not found', [], ERROR_CODES.SCHOOL_NOT_FOUND);
  }

  static schoolInactive() {
    return new ApiError(403, 'School is not active', [], ERROR_CODES.SCHOOL_INACTIVE);
  }

  static schoolAccessDenied() {
    return new ApiError(
      403,
      'Access restricted to your school',
      [],
      ERROR_CODES.SCHOOL_ACCESS_DENIED
    );
  }

  static tenantRequired() {
    return new ApiError(400, 'School context is required', [], ERROR_CODES.TENANT_REQUIRED);
  }

  // ─── Student Errors ───────────────────────────────────────────────────────

  static studentNotFound() {
    return new ApiError(404, 'Student not found', [], ERROR_CODES.STUDENT_NOT_FOUND);
  }

  static studentAlreadyExists() {
    return new ApiError(409, 'Student already exists', [], ERROR_CODES.STUDENT_ALREADY_EXISTS);
  }

  static studentLimitReached(limit) {
    return new ApiError(
      403,
      `Student limit reached (${limit})`,
      [],
      ERROR_CODES.STUDENT_LIMIT_REACHED
    );
  }

  // ─── Card / Token / QR Errors ─────────────────────────────────────────────

  static cardNotFound() {
    return new ApiError(404, 'Card not found', [], ERROR_CODES.CARD_NOT_FOUND);
  }

  static cardInactive() {
    return new ApiError(400, 'Card is not active', [], ERROR_CODES.CARD_INACTIVE);
  }

  static cardRevoked() {
    return new ApiError(400, 'Card has been revoked', [], ERROR_CODES.CARD_REVOKED);
  }

  static cardExpired() {
    return new ApiError(400, 'Card has expired', [], ERROR_CODES.CARD_EXPIRED);
  }

  static qrInvalid() {
    return new ApiError(400, 'Invalid QR code', [], ERROR_CODES.QR_INVALID);
  }

  static qrExpired() {
    return new ApiError(400, 'QR code has expired', [], ERROR_CODES.QR_EXPIRED);
  }

  // ─── Device Errors ────────────────────────────────────────────────────────

  static deviceNotRecognized() {
    return new ApiError(401, 'Device not recognized', [], ERROR_CODES.DEVICE_NOT_RECOGNIZED);
  }

  static deviceBlocked() {
    return new ApiError(403, 'Device has been blocked', [], ERROR_CODES.DEVICE_BLOCKED);
  }

  static deviceLimitExceeded() {
    return new ApiError(403, 'Device limit exceeded', [], ERROR_CODES.DEVICE_LIMIT_EXCEEDED);
  }

  static fingerprintMismatch() {
    return new ApiError(401, 'Device fingerprint mismatch', [], ERROR_CODES.FINGERPRINT_MISMATCH);
  }

  // ─── Rate Limiting Errors ─────────────────────────────────────────────────

  static rateLimited(retryAfter = 60) {
    const err = new ApiError(429, 'Too many requests', [], ERROR_CODES.RATE_LIMITED);
    err.retryAfter = retryAfter;
    return err;
  }

  static scanLimitExceeded() {
    return new ApiError(429, 'Scan limit exceeded', [], ERROR_CODES.SCAN_LIMIT_EXCEEDED);
  }

  static loginLimitExceeded() {
    return new ApiError(429, 'Too many login attempts', [], ERROR_CODES.LOGIN_LIMIT_EXCEEDED);
  }

  static slowDown(waitTime = 1) {
    const err = new ApiError(429, 'Slow down', [], ERROR_CODES.SLOW_DOWN);
    err.retryAfter = waitTime;
    return err;
  }

  // ─── IP & Geo Errors ──────────────────────────────────────────────────────

  static ipBlocked(reason = 'Access denied from your location') {
    return new ApiError(403, reason, [], ERROR_CODES.IP_BLOCKED);
  }

  static geoBlocked() {
    return new ApiError(403, 'Access not available in your region', [], ERROR_CODES.GEO_BLOCKED);
  }

  // ─── CSRF Errors ──────────────────────────────────────────────────────────

  static csrfInvalid() {
    return new ApiError(403, 'Invalid CSRF token', [], ERROR_CODES.CSRF_INVALID);
  }

  static csrfTokenMissing() {
    return new ApiError(403, 'CSRF token is required', [], ERROR_CODES.CSRF_TOKEN_MISSING);
  }

  // ─── Validation & Input Errors ────────────────────────────────────────────

  static validation(errors = []) {
    return new ApiError(422, 'Validation failed', errors, ERROR_CODES.VALIDATION_ERROR);
  }

  static invalidPhone() {
    return new ApiError(400, 'Invalid phone number', [], ERROR_CODES.INVALID_PHONE);
  }

  static fileTooLarge(maxSize) {
    return new ApiError(
      413,
      `File too large. Maximum size: ${maxSize}`,
      [],
      ERROR_CODES.FILE_TOO_LARGE
    );
  }

  static invalidFileType(allowedTypes) {
    return new ApiError(
      400,
      `Invalid file type. Allowed: ${allowedTypes}`,
      [],
      ERROR_CODES.INVALID_FILE_TYPE
    );
  }

  static contentTypeInvalid() {
    return new ApiError(415, 'Invalid content type', [], ERROR_CODES.CONTENT_TYPE_INVALID);
  }

  // ─── Security Errors ──────────────────────────────────────────────────────

  static xssDetected() {
    return new ApiError(400, 'Invalid input detected', [], ERROR_CODES.XSS_DETECTED);
  }

  static sqlInjectionDetected() {
    return new ApiError(400, 'Invalid input detected', [], ERROR_CODES.SQL_INJECTION_DETECTED);
  }

  static attackDetected() {
    return new ApiError(403, 'Access denied', [], ERROR_CODES.ATTACK_PATTERN_DETECTED);
  }

  // ─── System Errors ────────────────────────────────────────────────────────

  static maintenanceMode(eta = null) {
    const message = eta
      ? `System maintenance in progress. Expected completion: ${eta}`
      : 'System under maintenance. Please try later.';
    return new ApiError(503, message, [], ERROR_CODES.MAINTENANCE_MODE);
  }

  static versionDeprecated() {
    return new ApiError(410, 'API version deprecated', [], ERROR_CODES.VERSION_DEPRECATED);
  }

  // ─── Utility Methods ──────────────────────────────────────────────────────

  /**
   * Convert any error to ApiError instance
   */
  static from(error) {
    if (error instanceof ApiError) return error;

    const message = error.message || 'Internal server error';
    const statusCode = error.statusCode || error.status || 500;

    return new ApiError(statusCode, message, [], ERROR_CODES.INTERNAL_ERROR);
  }

  /**
   * Serialize error for logging (removes sensitive data)
   */
  toJSON() {
    const json = {
      success: this.success,
      statusCode: this.statusCode,
      message: this.message,
      errorCode: this.errorCode,
      errors: this.errors,
      timestamp: this.timestamp,
      isOperational: this.isOperational,
    };

    // Include retry-after if rate limited
    if (this.retryAfter) {
      json.retryAfter = this.retryAfter;
    }

    // Include stack trace only in development
    if (process.env.NODE_ENV === 'development') {
      json.stack = this.stack;
    }

    return json;
  }
}
