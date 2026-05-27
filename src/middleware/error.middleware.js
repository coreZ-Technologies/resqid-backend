<<<<<<< HEAD
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
=======
// TODO: Add implementation
// =============================================================================
// error.middleware.js — RESQID
// Global error handler — last line of defence
// Single responsibility: catch everything, leak nothing, log everything
//
// Rules:
//   - NEVER expose stack traces in production
//   - NEVER expose DB/internal error messages in production
//   - NEVER expose which table/field caused a Prisma error
//   - ALWAYS return consistent ApiError shape
//   - ALWAYS log full error internally with requestId
//   - Operational errors (ApiError) → specific status + message
//   - Programming errors (unexpected) → 500 + generic message
// =============================================================================

import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { logger } from '../config/logger.js';
import { ENV } from '../config/env.js';

const IS_PROD = ENV.NODE_ENV === 'production';

// ─── Error Response Shape ─────────────────────────────────────────────────────
// ALL errors from this API look exactly like this — no exceptions

function errorResponse(res, { statusCode, message, errors = null, requestId }) {
  const body = {
    success: false,
    message,
    requestId,
    timestamp: new Date().toISOString(),
    ...(errors && { errors }),
    // Stack trace ONLY in development — never in production
    ...(!IS_PROD && res.locals._stack && { stack: res.locals._stack }),
  };
  return res.status(statusCode).json(body);
}

// ─── Global Error Handler ─────────────────────────────────────────────────────

// Must have 4 arguments — Express identifies error middleware by arity
// eslint-disable-next-line no-unused-vars
export function globalErrorHandler(err, req, res, next) {
  const requestId = req.id ?? req.requestId ?? 'unknown';
  const log = req.log ?? logger;

  // Store stack for dev response (never sent in prod)
  if (!IS_PROD) res.locals._stack = err.stack;

  // ── 1. Operational Error — ApiError thrown intentionally ──────────────────
  if (err.isOperational) {
    // Warn level — these are expected (bad input, auth failures, etc.)
    log.warn(
      {
        type: 'operational_error',
        statusCode: err.statusCode,
        message: err.message,
        errors: err.errors,
        path: req.path,
        method: req.method,
        userId: req.userId,
      },
      `Operational error: ${err.message}`
    );

    return errorResponse(res, {
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors,
      requestId,
    });
  }

  // ── 2. Zod Validation Error — schema parse failed ─────────────────────────
  if (err instanceof ZodError) {
    const errors =
      err.errors?.map(e => ({
        field: e.path?.join('.') || 'unknown',
        message: e.message,
        code: e.code,
      })) || [];

    log.warn({ type: 'validation_error', errors, path: req.path }, 'Zod validation error');

    return errorResponse(res, {
      statusCode: 422,
      message: 'Validation failed',
      errors,
      requestId,
    });
  }

  // ── 3. Prisma Errors — DB-level failures ──────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaKnownError(err, req, res, requestId, log);
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    log.error(
      { type: 'prisma_validation', path: req.path, userId: req.userId },
      'Prisma validation error — schema mismatch in query'
    );

    return errorResponse(res, {
      statusCode: 400,
      message: 'Invalid data provided',
      requestId,
    });
  }

  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError
  ) {
    log.fatal({ type: 'prisma_init_error', err }, 'Prisma init/panic — database unavailable');

    return errorResponse(res, {
      statusCode: 503,
      message: 'Database temporarily unavailable. Please try again shortly.',
      requestId,
    });
  }

  // ── 4. JWT Errors — should be caught by auth middleware, but safety net ───
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    log.warn({ type: 'jwt_error', name: err.name }, 'JWT error reached error handler');
    return errorResponse(res, {
      statusCode: 401,
      message: 'Authentication failed',
      requestId,
    });
  }

  // ── 5. Multer / File Upload Errors ────────────────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    return errorResponse(res, {
      statusCode: 413,
      message: 'File size exceeds the allowed limit',
      requestId,
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return errorResponse(res, {
      statusCode: 400,
      message: 'Unexpected file field in upload',
      requestId,
    });
  }

  // ── 6. SyntaxError — malformed JSON body ──────────────────────────────────
  if (err instanceof SyntaxError && 'body' in err) {
    return errorResponse(res, {
      statusCode: 400,
      message: 'Request body contains invalid JSON',
      requestId,
    });
  }

  // ── 7. Programming Error / Unknown — never expose internals ───────────────
  // Full error logged internally, safe message sent to client
  log.error(
    {
      type: 'unexpected_error',
      err: {
        message: err.message,
        name: err.name,
        code: err.code,
        stack: err.stack,
      },
      path: req.path,
      method: req.method,
      userId: req.userId,
      schoolId: req.schoolId,
      requestId,
    },
    `Unexpected error: ${err.message}`
  );

  return errorResponse(res, {
    statusCode: 500,
    message: err.message, // Show real message in dev only
    requestId,
  });
}

// ─── 404 Handler — must be registered BEFORE globalErrorHandler ───────────────

export function notFoundHandler(req, res) {
  const requestId = req.id ?? 'unknown';
  const log = req.log ?? logger;

  log.warn(
    {
      type: 'not_found',
      method: req.method,
      url: req.originalUrl,
      userId: req.userId,
    },
    `404: ${req.method} ${req.path}`
  );

  return res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    requestId,
    timestamp: new Date().toISOString(),
  });
}

// ─── Prisma Known Error Handler ───────────────────────────────────────────────

function handlePrismaKnownError(err, req, res, requestId, log) {
  log.warn(
    {
      type: 'prisma_error',
      code: err.code,
      // NEVER log err.meta in production — contains table/field names
      ...(IS_PROD ? {} : { meta: err.meta }),
      path: req.path,
      userId: req.userId,
    },
    `Prisma error P${err.code}`
  );

  switch (err.code) {
    // Unique constraint violation
    case 'P2002': {
      const field = IS_PROD ? 'field' : (err.meta?.target?.[0] ?? 'field');
      return errorResponse(res, {
        statusCode: 409,
        message: `A record with this ${field} already exists`,
        requestId,
      });
    }

    // Record not found
    case 'P2025':
      return errorResponse(res, {
        statusCode: 404,
        message: 'The requested record was not found',
        requestId,
      });

    // Foreign key constraint failed
    case 'P2003':
      return errorResponse(res, {
        statusCode: 400,
        message: 'Referenced record does not exist',
        requestId,
      });

    // Required field null violation
    case 'P2011':
      return errorResponse(res, {
        statusCode: 400,
        message: 'A required field is missing',
        requestId,
      });

    // Value too long
    case 'P2000':
      return errorResponse(res, {
        statusCode: 400,
        message: 'A field value exceeds the maximum allowed length',
        requestId,
      });

    // Transaction conflict
    case 'P2034':
      return errorResponse(res, {
        statusCode: 409,
        message: 'Write conflict, please retry',
        requestId,
      });

    // Default — unknown Prisma known error
    default:
      return errorResponse(res, {
        statusCode: 500,
        message: IS_PROD ? 'A database error occurred' : `Prisma error ${err.code}`,
        requestId,
      });
  }
}

// ─── Unhandled Rejection / Exception Catchers ────────────────────────────────
// Register these ONCE in server.js — not here
// Exported so server.js can use them

export function setupProcessErrorHandlers(server) {
  // Unhandled promise rejections — log and exit gracefully
  process.on('unhandledRejection', (reason, promise) => {
    logger.fatal(
      { type: 'unhandled_rejection', reason, promise },
      'Unhandled promise rejection — shutting down'
    );
    gracefulShutdown(server, 1);
  });

  // Uncaught exceptions — ALWAYS exit — process state is undefined
  process.on('uncaughtException', err => {
    logger.fatal(
      { type: 'uncaught_exception', err },
      'Uncaught exception — shutting down immediately'
    );
    gracefulShutdown(server, 1);
  });

  // Graceful shutdown signals
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received — shutting down gracefully');
    gracefulShutdown(server, 0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received — shutting down gracefully');
    gracefulShutdown(server, 0);
  });
}

function gracefulShutdown(server, code) {
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(code);
  });

  // Force kill after 10 seconds if graceful close fails
  setTimeout(() => {
    logger.error('Forced shutdown — server did not close in time');
    process.exit(code);
  }, 10_000).unref();
}
>>>>>>> f01dd80bcb1f2add13589bcb4344c76fc3ed4e8b
