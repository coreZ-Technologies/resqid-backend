// src/utils/apiError.js

export class ApiError extends Error {
  constructor(statusCode, message, errors = [], stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    this.errors = errors; // field-level or extra detail errors
    this.data = null;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // 4xx — Client errors
  static badRequest(message = 'Bad request', errors = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }

  static tooManyRequests(message = 'Too many requests') {
    return new ApiError(429, message);
  }

  // 5xx — Server errors
  static internal(message = 'Internal server error') {
    return new ApiError(500, message);
  }

  static serviceUnavailable(message = 'Service unavailable') {
    return new ApiError(503, message);
  }

  // RESQID specific
  static noSubscription() {
    return new ApiError(403, 'No active subscription', [], 'NO_SUBSCRIPTION');
  }

  static subscriptionExpired() {
    return new ApiError(403, 'Subscription expired', [], 'SUBSCRIPTION_EXPIRED');
  }

  static moduleNotAllowed(module) {
    return new ApiError(
      403,
      `Module '${module}' not included in your plan`,
      [],
      'MODULE_NOT_ALLOWED'
    );
  }

  static invalidOtp() {
    return new ApiError(401, 'Invalid or expired OTP');
  }

  static schoolNotFound() {
    return new ApiError(404, 'School not found');
  }

  static studentNotFound() {
    return new ApiError(404, 'Student not found');
  }
}
