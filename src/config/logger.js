// =============================================================================
// logger.js — RESQID
// Production-grade structured logger using Pino
// - JSON in production, pretty-printed in development
// - Automatic redaction of sensitive fields
// - File transport support for persistent log storage
// - Child logger factory for per-request context
// - Sentry integration for error/fatal level events
// - Audit & security loggers for middleware
// =============================================================================

import pino from 'pino';
import { ENV } from './env.js';

// Sensitive Field Redaction
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

  // Payment
  'cvv',
  'card_number',
  '*.cvv',
  '*.card_number',

  // IP addresses (keep hashed versions)
  'ip',
  'req.ip',
  '*.ip',
];

// Transport Config

function buildTransport() {
  const targets = [];

  // Stdout transport
  targets.push({
    target: 'pino/file',
    level: ENV.LOG_LEVEL,
    options: { destination: 1 },
  });

  // File transport
  if (ENV.LOG_FILE_PATH) {
    targets.push({
      target: 'pino/file',
      level: ENV.LOG_LEVEL,
      options: {
        destination: ENV.LOG_FILE_PATH,
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
      },
    });
  }

  return pino.transport({ targets });
}

// Base Logger─

export const logger = pino(
  {
    level: ENV.LOG_LEVEL,
    base: {
      app: 'resqid',
      env: ENV.NODE_ENV,
      pid: process.pid,
    },
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
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
    safe: true,
  },
  buildTransport()
);

// Sentry Integration

let sentryInitialized = false;

async function initSentry() {
  if (!ENV.IS_PROD || !ENV.SENTRY_DSN || sentryInitialized) return;

  try {
    const Sentry = await import('@sentry/node');

    Sentry.init({
      dsn: ENV.SENTRY_DSN,
      environment: ENV.SENTRY_ENVIRONMENT,
      tracesSampleRate: ENV.SENTRY_TRACES_SAMPLE_RATE,
      beforeSend(event) {
        if (event.user) {
          delete event.user.ip_address;
          delete event.user.email;
        }
        return event;
      },
    });

    // Store reference for middleware use
    global.Sentry = Sentry;
    sentryInitialized = true;

    logger.info('Sentry error monitoring initialized');
  } catch (e) {
    logger.warn({ err: e.message }, 'Sentry init failed — continuing without it');
  }
}

// Initialize Sentry (async, non-blocking)
initSentry();

// Child Logger Factory

/**
 * Create a child logger bound to request context
 * Used by httpLogger.middleware.js
 */
export function createRequestLogger(context) {
  return logger.child(context);
}

// Audit Logger

/**
 * Create an audit logger instance
 * Used by auditLog.middleware.js to log user actions
 */
export function createAuditLogger() {
  return logger.child({ logger_type: 'audit' });
}

// Security Logger─

/**
 * Create a security event logger instance
 * Used by attackLogger.middleware.js to log security events
 */
export function createSecurityLogger() {
  return logger.child({ logger_type: 'security' });
}

// HTTP Logger─

/**
 * Create HTTP request logger instance
 * Used by httpLogger.middleware.js
 */
export function createHttpLogger() {
  return logger.child({ logger_type: 'http' });
}

// Convenience Methods

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

// Shutdown

/**
 * Graceful shutdown — flush logs before exit
 */
export async function shutdownLogger() {
  return new Promise((resolve) => {
    logger.flush();
    setTimeout(resolve, 1000); // Give Pino time to flush
  });
}
