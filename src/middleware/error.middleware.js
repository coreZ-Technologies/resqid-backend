// =============================================================================
// error.middleware.js — RESQID
// Global error handler — last line of defence
// =============================================================================

import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { logger } from '#config/logger.js';
import { ENV } from '#config/env.js';
import { ApiError } from '#shared/response/ApiError.js';

const IS_PROD = ENV.IS_PROD;

// ─── Error Response Shape ─────────────────────────────────────────────────────

function errorResponse(res, { statusCode, message, errors = null, requestId, errorCode }) {
  const body = {
    success: false,
    statusCode,
    message,
    errorCode: errorCode || 'ERROR',
    requestId,
    timestamp: new Date().toISOString(),
    ...(errors && { errors }),
    ...(!IS_PROD && res.locals?._stack && { stack: res.locals._stack }),
  };
  return res.status(statusCode).json(body);
}

// ─── Global Error Handler ─────────────────────────────────────────────────────

export function globalErrorHandler(err, req, res, _next) {
  const requestId = req.requestId || 'unknown';
  const log = req.log || logger;

  // Store stack for dev
  if (!IS_PROD) res.locals = { ...res.locals, _stack: err.stack };

  // ── 1. ApiError (Operational) ────────────────────────────────────────────
  if (err instanceof ApiError) {
    log.warn(
      {
        type: 'operational_error',
        statusCode: err.statusCode,
        errorCode: err.errorCode,
        message: err.message,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
      },
      `Operational: ${err.message}`
    );

    return errorResponse(res, {
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors,
      errorCode: err.errorCode,
      requestId,
    });
  }

  // ── 2. Zod Validation Error ──────────────────────────────────────────────
  if (err instanceof ZodError) {
    const errors =
      err.issues?.map((e) => ({
        field: e.path?.join('.') || 'root',
        message: e.message,
        code: e.code,
      })) || [];

    log.warn({ type: 'validation_error', errors, path: req.path }, 'Zod validation error');

    return errorResponse(res, {
      statusCode: 422,
      message: 'Validation failed',
      errors,
      errorCode: 'VALIDATION_ERROR',
      requestId,
    });
  }

  // ── 3. Prisma Known Errors ───────────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaKnownError(err, req, res, requestId, log);
  }

  // Prisma validation error (schema mismatch)
  if (err instanceof Prisma.PrismaClientValidationError) {
    log.error({ type: 'prisma_validation', path: req.path }, 'Prisma validation error');
    return errorResponse(res, {
      statusCode: 400,
      message: IS_PROD ? 'Invalid request' : 'Prisma validation error',
      errorCode: 'VALIDATION_ERROR',
      requestId,
    });
  }

  // Prisma connection/panic
  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError
  ) {
    log.error({ type: 'prisma_fatal', err: err.message }, 'Database unavailable');
    return errorResponse(res, {
      statusCode: 503,
      message: 'Service temporarily unavailable',
      errorCode: 'DATABASE_ERROR',
      requestId,
    });
  }

  // ── 4. JWT Errors ────────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, {
      statusCode: 401,
      message: 'Invalid token',
      errorCode: 'INVALID_TOKEN',
      requestId,
    });
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, {
      statusCode: 401,
      message: 'Token has expired',
      errorCode: 'TOKEN_EXPIRED',
      requestId,
    });
  }

  // ── 5. Multer File Upload Errors ─────────────────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    return errorResponse(res, {
      statusCode: 413,
      message: 'File too large',
      errorCode: 'FILE_TOO_LARGE',
      requestId,
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return errorResponse(res, {
      statusCode: 400,
      message: 'Unexpected file field',
      errorCode: 'INVALID_FILE_TYPE',
      requestId,
    });
  }

  // ── 6. SyntaxError (malformed JSON) ──────────────────────────────────────
  if (err instanceof SyntaxError && 'body' in err) {
    return errorResponse(res, {
      statusCode: 400,
      message: 'Invalid JSON in request body',
      errorCode: 'VALIDATION_ERROR',
      requestId,
    });
  }

  // ── 7. Unknown / Programming Error ───────────────────────────────────────
  log.error(
    {
      type: 'unexpected_error',
      err: { message: err.message, name: err.name, stack: err.stack },
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      requestId,
    },
    `Unexpected: ${err.message}`
  );

  return errorResponse(res, {
    statusCode: 500,
    message: IS_PROD ? 'Internal server error' : err.message,
    errorCode: 'INTERNAL_ERROR',
    requestId,
  });
}

// ─── 404 Handler ──────────────────────────────────────────────────────────────

export function notFoundHandler(req, res) {
  const requestId = req.requestId || 'unknown';

  (req.log || logger).warn(
    {
      type: 'not_found',
      method: req.method,
      url: req.originalUrl,
    },
    `404: ${req.method} ${req.path}`
  );

  return res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Route ${req.method} ${req.path} not found`,
    errorCode: 'NOT_FOUND',
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
      ...(IS_PROD ? {} : { meta: err.meta }),
      path: req.path,
    },
    `Prisma P${err.code}`
  );

  const map = {
    P2002: [
      409,
      'DUPLICATE_ENTRY',
      `A record with this ${IS_PROD ? 'field' : err.meta?.target?.[0] || 'field'} already exists`,
    ],
    P2025: [404, 'NOT_FOUND', 'Record not found'],
    P2003: [400, 'FOREIGN_KEY_ERROR', 'Referenced record does not exist'],
    P2011: [400, 'VALIDATION_ERROR', 'Required field missing'],
    P2000: [400, 'VALIDATION_ERROR', 'Value exceeds maximum length'],
    P2034: [409, 'CONFLICT', 'Write conflict, please retry'],
  };

  const [statusCode, errorCode, message] = map[err.code] || [
    500,
    'DATABASE_ERROR',
    'Database error',
  ];

  return errorResponse(res, { statusCode, message, errorCode, requestId });
}
