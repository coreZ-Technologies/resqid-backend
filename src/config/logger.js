<<<<<<< HEAD
// TODO: Add implementation
=======
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
// =============================================================================
// logger.js — RESQID
// Production-grade structured logger using Pino
// - JSON in production, pretty-printed in development
<<<<<<< HEAD
// - Automatic redaction of sensitive fields in any log object
// - File transport support for persistent log storage
// - Child logger factory for per-request context
// - Sentry integration for error/fatal level events
=======
// - Automatic redaction of sensitive fields
// - File transport support for persistent log storage
// - Child logger factory for per-request context
// - Sentry integration for error/fatal level events
// - Audit & security loggers for middleware
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
// =============================================================================

import pino from 'pino';
import { ENV } from './env.js';

// ─── Sensitive Field Redaction ────────────────────────────────────────────────
<<<<<<< HEAD
// Pino redacts these fields before writing — even if accidentally logged
// Uses dot-notation and wildcard paths
// Add any new sensitive field names here as the codebase grows
=======
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67

const REDACT_PATHS = [
  // Auth secrets
  'password',
  'password_hash',
  '*.password',
  '*.password_hash',

  // Tokens
  'token',
  'token_hash',
  'refresh_token',
  'access_token',
  '*.token',
  '*.token_hash',
  '*.refresh_token',

  // OTP
  'otp',
  'otp_hash',
  '*.otp',
  '*.otp_hash',

  // PII — encrypted fields
  'dob_encrypted',
  'phone_encrypted',
  'doctor_phone_encrypted',
  '*.dob_encrypted',
  '*.phone_encrypted',
  '*.doctor_phone_encrypted',

  // Crypto secrets
  'secret',
  'private_key',
<<<<<<< HEAD
  '*.secret',
  '*.private_key',

  // HTTP headers — in case headers object is logged
  'req.headers["authorization"]',
  'req.headers["cookie"]',
  'req.headers["x-csrf-token"]',
  'req.headers["x-api-key"]',
=======
  'encryption_key',
  '*.secret',
  '*.private_key',
  '*.encryption_key',

  // HTTP headers
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-csrf-token"]',
  'req.headers["x-api-key"]',
  'req.headers["x-device-signature"]',
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67

  // Payment
  'cvv',
  'card_number',
  '*.cvv',
  '*.card_number',
<<<<<<< HEAD
=======

  // IP addresses (keep hashed versions)
  'ip',
  'req.ip',
  '*.ip',
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
];

// ─── Transport Config ─────────────────────────────────────────────────────────

function buildTransport() {
  const targets = [];

<<<<<<< HEAD
  // Always write JSON to stdout.
  // In dev: the npm script pipes through external pino-pretty (| pino-pretty).
  // In prod: JSON stdout is picked up by log aggregators (Datadog, CloudWatch).
  // Never use internal pino-pretty transport — when only 1 target, pino.transport
  // is not called and a plain object is returned, causing stream.write crash.
  targets.push({
    target: 'pino/file',
    level: ENV.LOG_LEVEL,
    options: { destination: 1 }, // 1 = stdout
  });

  // File transport — write to disk if LOG_FILE_PATH is set
=======
  // Stdout transport
  targets.push({
    target: 'pino/file',
    level: ENV.LOG_LEVEL,
    options: { destination: 1 },
  });

  // File transport
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
  if (ENV.LOG_FILE_PATH) {
    targets.push({
      target: 'pino/file',
      level: ENV.LOG_LEVEL,
      options: {
        destination: ENV.LOG_FILE_PATH,
<<<<<<< HEAD
        mkdir: true, // create directory if it doesn't exist
=======
        mkdir: true,
      },
    });
  }

  // Error file transport (separate file for errors)
  if (ENV.LOG_FILE_PATH) {
    targets.push({
      target: 'pino/file',
      level: 'error',
      options: {
        destination: ENV.LOG_FILE_PATH.replace('.log', '-error.log'),
        mkdir: true,
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
      },
    });
  }

<<<<<<< HEAD
  // Always wrap in pino.transport() — never return a plain object.
  // pino() requires a writable stream as its second argument.
=======
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
  return pino.transport({ targets });
}

// ─── Base Logger ──────────────────────────────────────────────────────────────

export const logger = pino(
  {
    level: ENV.LOG_LEVEL,
<<<<<<< HEAD

    // Application context — on every log line
=======
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
    base: {
      app: 'resqid',
      env: ENV.NODE_ENV,
      pid: process.pid,
    },
<<<<<<< HEAD

    // Timestamp — ISO 8601 in production, readable in dev
    timestamp: pino.stdTimeFunctions.isoTime,

    // Redact sensitive fields before writing
=======
    timestamp: pino.stdTimeFunctions.isoTime,
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
    redact: {
      paths: REDACT_PATHS,
      censor: '[REDACTED]',
    },
<<<<<<< HEAD

    // Serialize Error objects properly
=======
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
<<<<<<< HEAD

    // Map Pino levels to standard severity names (useful for log aggregators)
=======
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
    formatters: {
      level(label) {
        return { level: label.toUpperCase() };
      },
      bindings(bindings) {
        return {
          app: bindings.app,
          env: bindings.env,
          pid: bindings.pid,
        };
      },
    },
<<<<<<< HEAD

    // Prevent crashes from circular references in logged objects
=======
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
    safe: true,
  },
  buildTransport()
);

// ─── Sentry Integration ───────────────────────────────────────────────────────
<<<<<<< HEAD
// Forward error + fatal logs to Sentry for alerting
// Only active in production when SENTRY_DSN is set

if (ENV.IS_PROD && ENV.SENTRY_DSN) {
=======

let sentryInitialized = false;

async function initSentry() {
  if (!ENV.IS_PROD || !ENV.SENTRY_DSN || sentryInitialized) return;

>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
  try {
    const Sentry = await import('@sentry/node');

    Sentry.init({
      dsn: ENV.SENTRY_DSN,
      environment: ENV.SENTRY_ENVIRONMENT,
      tracesSampleRate: ENV.SENTRY_TRACES_SAMPLE_RATE,
<<<<<<< HEAD
      // Don't send PII to Sentry — scrub user data
      beforeSend(event) {
        // Strip user IP from Sentry events
=======
      beforeSend(event) {
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
        if (event.user) {
          delete event.user.ip_address;
          delete event.user.email;
        }
        return event;
      },
    });

<<<<<<< HEAD
    // Patch logger to forward error/fatal to Sentry
    const originalError = logger.error.bind(logger);
    const originalFatal = logger.fatal.bind(logger);

    logger.error = (obj, msg, ...args) => {
      originalError(obj, msg, ...args);
      if (obj?.err || obj instanceof Error) {
        Sentry.captureException(obj?.err ?? obj, {
          extra: typeof obj === 'object' ? obj : { message: obj },
        });
      }
    };

    logger.fatal = (obj, msg, ...args) => {
      originalFatal(obj, msg, ...args);
      Sentry.captureException(obj?.err ?? obj, {
        level: 'fatal',
        extra: typeof obj === 'object' ? obj : { message: obj },
      });
    };
=======
    // Store reference for middleware use
    global.Sentry = Sentry;
    sentryInitialized = true;
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67

    logger.info('Sentry error monitoring initialized');
  } catch (e) {
    logger.warn({ err: e.message }, 'Sentry init failed — continuing without it');
  }
}

<<<<<<< HEAD
// ─── Child Logger Factory ─────────────────────────────────────────────────────

/**
 * createRequestLogger
 * Creates a child logger bound to a specific request context
 * Used in httpLogger.middleware.js
=======
// Initialize Sentry (async, non-blocking)
initSentry();

// ─── Child Logger Factory ─────────────────────────────────────────────────────

/**
 * Create a child logger bound to request context
 * Used by httpLogger.middleware.js
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
 */
export function createRequestLogger(context) {
  return logger.child(context);
}
<<<<<<< HEAD
=======

// ─── Audit Logger ─────────────────────────────────────────────────────────────

/**
 * Create an audit logger instance
 * Used by auditLog.middleware.js to log user actions
 */
export function createAuditLogger() {
  return logger.child({ logger_type: 'audit' });
}

// ─── Security Logger ──────────────────────────────────────────────────────────

/**
 * Create a security event logger instance
 * Used by attackLogger.middleware.js to log security events
 */
export function createSecurityLogger() {
  return logger.child({ logger_type: 'security' });
}

// ─── HTTP Logger ──────────────────────────────────────────────────────────────

/**
 * Create HTTP request logger instance
 * Used by httpLogger.middleware.js
 */
export function createHttpLogger() {
  return logger.child({ logger_type: 'http' });
}

// ─── Convenience Methods ──────────────────────────────────────────────────────

/**
 * Log audit event
 */
export const auditLog = (action, context = {}) => {
  const auditLogger = createAuditLogger();
  auditLogger.info({ action, ...context }, `AUDIT: ${action}`);
};

/**
 * Log security event
 */
export const securityLog = (event, severity = 'WARNING', context = {}) => {
  const secLogger = createSecurityLogger();
  const method = severity === 'CRITICAL' ? 'error' : 'warn';
  secLogger[method]({ event, severity, ...context }, `SECURITY: ${event}`);
};

/**
 * Log attack event (always error level)
 */
export const attackLog = (attackType, context = {}) => {
  const secLogger = createSecurityLogger();
  secLogger.error({ attackType, ...context }, `ATTACK: ${attackType}`);
};

// ─── Shutdown ─────────────────────────────────────────────────────────────────

/**
 * Graceful shutdown — flush logs before exit
 */
export async function shutdownLogger() {
  return new Promise((resolve) => {
    logger.flush();
    setTimeout(resolve, 1000); // Give Pino time to flush
  });
}
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
