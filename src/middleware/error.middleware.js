// =============================================================================
// error.middleware.js — RESQID
// Centralized error handling for Express v5
//
// Handles:
//   - ApiError instances (known operational errors)
//   - ZodError (validation failures that slipped through)
//   - Prisma errors (database constraints)
//   - JWT errors (token expiration/invalid)
//   - Unexpected errors (logged to Sentry)
//
// Express v5 note: async errors are automatically caught and passed to next()
// =============================================================================

import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';

/**
 * Error response structure (consistent across all endpoints)
 * @param {number} status - HTTP status code
 * @param {string} message - Human-readable error message
 * @param {Array} errors - Detailed field-level errors (validation)
 * @param {string} requestId - Correlation ID for tracing
 * @param {string} code - Machine-readable error code
 */
const errorResponse = ({ status, message, errors = [], requestId, code }) => ({
  success: false,
  status,
  message,
  code,
  requestId,
  ...(errors.length > 0 && { errors }),
  ...(process.env.NODE_ENV === 'development' && { stack: undefined }), // Don't leak stack traces
});

/**
 * Map Prisma error codes to HTTP status and user-friendly messages
 */
const handlePrismaError = (error) => {
  // Unique constraint violation
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return {
          status: 409,
          message: 'Duplicate entry',
          code: 'DUPLICATE_ENTRY',
          errors: error.meta?.target
            ? [{ field: error.meta.target, message: 'This value already exists' }]
            : [],
        };
      case 'P2025':
        return {
          status: 404,
          message: 'Record not found',
          code: 'NOT_FOUND',
        };
      case 'P2003':
        return {
          status: 400,
          message: 'Invalid reference',
          code: 'FOREIGN_KEY_ERROR',
        };
      case 'P2014':
        return {
          status: 400,
          message: 'Invalid relation',
          code: 'RELATION_ERROR',
        };
      default:
        return {
          status: 500,
          message: 'Database error',
          code: 'DATABASE_ERROR',
        };
    }
  }

  // Prisma validation error
  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      status: 400,
      message: 'Invalid data provided',
      code: 'VALIDATION_ERROR',
    };
  }

  // Prisma connection error
  if (error instanceof Prisma.PrismaClientInitializationError) {
    logger.fatal({ err: error }, 'Database connection failed');
    return {
      status: 503,
      message: 'Service temporarily unavailable',
      code: 'DATABASE_UNAVAILABLE',
    };
  }

  return null;
};

/**
 * Handle JWT specific errors
 */
const handleJWTError = (error) => {
  if (error instanceof TokenExpiredError) {
    return {
      status: 401,
      message: 'Token has expired',
      code: 'TOKEN_EXPIRED',
    };
  }

  if (error instanceof JsonWebTokenError) {
    return {
      status: 401,
      message: 'Invalid token',
      code: 'INVALID_TOKEN',
    };
  }

  return null;
};

/**
 * Handle Multer file upload errors
 */
const handleMulterError = (error) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return {
      status: 413,
      message: 'File too large',
      code: 'FILE_TOO_LARGE',
    };
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return {
      status: 400,
      message: 'Unexpected file field',
      code: 'INVALID_FILE_FIELD',
    };
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    return {
      status: 400,
      message: 'Too many files',
      code: 'TOO_MANY_FILES',
    };
  }

  return null;
};

/**
 * Central error handler middleware
 * Express v5 automatically catches async errors
 */
export const errorHandler = (err, req, res, next) => {
  // If headers already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  const requestId = req.requestId || 'unknown';

  // Default error response
  let errorData = {
    status: 500,
    message: 'Internal server error',
    code: 'INTERNAL_ERROR',
    requestId,
    errors: [],
  };

  // ── Known Operational Errors ────────────────────────────────────────────────

  // ApiError (our custom errors)
  if (err instanceof ApiError) {
    errorData = {
      status: err.statusCode,
      message: err.message,
      code: err.errorCode || 'OPERATIONAL_ERROR',
      requestId,
      errors: err.errors || [],
    };
  }

  // Zod validation errors (shouldn't happen with our middleware, but catch anyway)
  if (err instanceof ZodError) {
    errorData = {
      status: 422,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      requestId,
      errors: err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      })),
    };
  }

  // Prisma errors
  const prismaError = handlePrismaError(err);
  if (prismaError) {
    errorData = { ...prismaError, requestId };
  }

  // JWT errors
  const jwtError = handleJWTError(err);
  if (jwtError) {
    errorData = { ...jwtError, requestId };
  }

  // Multer errors
  const multerError = handleMulterError(err);
  if (multerError) {
    errorData = { ...multerError, requestId };
  }

  // ── Logging ─────────────────────────────────────────────────────────────────

  // Log all 5xx errors as errors
  if (errorData.status >= 500) {
    logger.error(
      {
        err,
        requestId,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userId: req.user?.id,
        schoolId: req.school?.id,
      },
      `Server error: ${err.message}`
    );
  }
  // Log 4xx errors as warnings (expected errors)
  else if (errorData.status >= 400) {
    logger.warn(
      {
        requestId,
        method: req.method,
        url: req.originalUrl,
        status: errorData.status,
        code: errorData.code,
      },
      `Client error: ${err.message}`
    );
  }

  // ── Sentry Integration ──────────────────────────────────────────────────────

  // Capture unexpected errors in Sentry
  if (errorData.status >= 500) {
    const Sentry = global.Sentry; // Sentry is initialized elsewhere
    if (Sentry) {
      Sentry.captureException(err, {
        user: req.user ? { id: req.user.id, email: req.user.email } : null,
        tags: {
          requestId,
          schoolId: req.school?.id,
          errorCode: errorData.code,
        },
      });
    }
  }

  // ── Response ────────────────────────────────────────────────────────────────

  const response = errorResponse(errorData);

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.originalError = err.message;
  }

  return res.status(errorData.status).json(response);
};

/**
 * 404 handler - for routes that don't exist
 */
export const notFoundHandler = (req, res, next) => {
  const error = ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`);
  next(error);
};

/**
 * Unhandled rejection handler (should be registered in server.js)
 */
export const unhandledRejectionHandler = (reason, promise) => {
  logger.fatal({ err: reason }, 'Unhandled Promise Rejection');

  const Sentry = global.Sentry;
  if (Sentry) {
    Sentry.captureException(reason);
  }

  // In production, you might want to gracefully shutdown
  if (process.env.NODE_ENV === 'production') {
    // Graceful shutdown logic here
    process.exit(1);
  }
};

/**
 * Uncaught exception handler
 */
export const uncaughtExceptionHandler = (error) => {
  logger.fatal({ err: error }, 'Uncaught Exception');

  const Sentry = global.Sentry;
  if (Sentry) {
    Sentry.captureException(error);
  }

  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
};
