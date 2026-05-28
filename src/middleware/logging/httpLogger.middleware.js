// =============================================================================
// httpLogger.middleware.js — RESQID
//
// Structured HTTP request/response logging via Pino.
// Production: JSON structured logs
// Development: Pretty-printed with optional OTP display
//
// Every request gets:
//   - Unique requestId
//   - Timing (duration in ms)
//   - Sanitized headers/body (sensitive fields redacted)
//   - Auth context (userId, role, schoolId)
// =============================================================================

import { logger, createRequestLogger } from '#config/logger.js';
import { extractIp } from '#shared/network/extractIp.js';
import { ENV } from '#config/env.js';

// ─── Sensitive Field Redaction ────────────────────────────────────────────────

const REDACTED = '[REDACTED]';

const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'x-csrf-token',
  'x-api-key',
  'x-device-signature',
  'proxy-authorization',
]);

const SENSITIVE_BODY_KEYS = new Set([
  'password',
  'password_hash',
  'otp',
  'otp_hash',
  'token',
  'token_hash',
  'refresh_token',
  'secret',
  'private_key',
  'credit_card',
  'cvv',
  'dob_encrypted',
  'phone_encrypted',
  'doctor_phone_encrypted',
]);

// ─── Dev-only: Pretty terminal logging ────────────────────────────────────────

const DEV_LOG_ENABLED = !ENV.IS_PROD;

const getMethodIcon = (method) => {
  const icons = { GET: '📥', POST: '📤', PUT: '🔄', PATCH: '⚡', DELETE: '🗑️' };
  return icons[method] || '📡';
};

const getStatusColor = (code) => {
  if (code >= 500) return '\x1b[31m'; // Red
  if (code >= 400) return '\x1b[33m'; // Yellow
  if (code >= 300) return '\x1b[36m'; // Cyan
  return '\x1b[32m'; // Green
};

const formatDuration = (ms) => {
  if (ms < 1) return `${Math.round(ms * 1000)}μs`;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

// ─── Core Middleware ──────────────────────────────────────────────────────────

export function httpLogger(req, res, next) {
  const startAt = process.hrtime.bigint();
  const requestId = req.requestId || 'unknown';
  const ip = extractIp(req);

  // Attach child logger to request for downstream use
  req.log = createRequestLogger({ requestId, ip });

  // Dev-only: Pretty console output
  if (DEV_LOG_ENABLED) {
    const icon = getMethodIcon(req.method);
    const userInfo = req.user?.id
      ? ` [${req.user.role || '?'}:${req.user.id.slice(0, 8)}]`
      : ' [anonymous]';
    console.log(`${icon} ${req.method} ${req.path}${userInfo} → ${ip}`);
  }

  // Structured log: Incoming request
  req.log.info({
    type: 'request_in',
    method: req.method,
    url: sanitizeUrl(req.originalUrl),
    headers: sanitizeHeaders(req.headers),
    ...(shouldLogBody(req) && { body: sanitizeBody(req.body) }),
  });

  // ─── Response hook ──────────────────────────────────────────────────────

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startAt) / 1_000_000;
    const statusCode = res.statusCode;
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    // Dev-only: Pretty output
    if (DEV_LOG_ENABLED) {
      const color = getStatusColor(statusCode);
      const durationBar = '█'.repeat(Math.min(Math.floor(durationMs / 10), 30));
      console.log(
        `${color}${statusCode}\x1b[0m ${req.method} ${req.path} ${durationBar} ${formatDuration(durationMs)}`
      );
    }

    // Structured log: Response
    req.log[level]({
      type: 'response_out',
      method: req.method,
      url: sanitizeUrl(req.originalUrl),
      statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      contentLength: res.getHeader('content-length') || 0,
      userId: req.user?.id,
      role: req.user?.role,
      schoolId: req.schoolId || req.user?.schoolId,
    });
  });

  next();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeHeaders(headers) {
  const safe = {};
  for (const [key, value] of Object.entries(headers || {})) {
    safe[key] = SENSITIVE_HEADERS.has(key.toLowerCase()) ? REDACTED : value;
  }
  return safe;
}

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;

  if (Array.isArray(body)) return body.map(sanitizeBody);

  const safe = {};
  for (const [key, value] of Object.entries(body)) {
    if (SENSITIVE_BODY_KEYS.has(key.toLowerCase())) {
      safe[key] = REDACTED;
    } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      safe[key] = sanitizeBody(value);
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

function sanitizeUrl(url) {
  try {
    const u = new URL(url, 'http://localhost');
    for (const key of ['token', 'key', 'secret', 'password', 'code']) {
      if (u.searchParams.has(key)) u.searchParams.set(key, REDACTED);
    }
    return u.pathname + (u.search || '');
  } catch {
    return url;
  }
}

function shouldLogBody(req) {
  // Don't log body for GET requests
  if (req.method === 'GET') return false;
  // Don't log large bodies
  const contentLen = parseInt(req.headers['content-length'] || '0', 10);
  return contentLen > 0 && contentLen < 10_000;
}

// ─── OTP Logger (Dev Only) ────────────────────────────────────────────────────

/**
 * Log OTP to console in development (NEVER in production).
 * Call from auth service after generating OTP.
 */
export function devLogOtp(phone, otp, purpose = 'LOGIN') {
  if (ENV.IS_PROD) return;

  const border = '═'.repeat(60);
  console.log(`\n\x1b[36m╔${border}╗\x1b[0m`);
  console.log(`\x1b[36m║\x1b[0m  \x1b[33m🔐 OTP: ${otp}\x1b[0m`);
  console.log(`\x1b[36m║\x1b[0m  Phone: ${phone}  |  Purpose: ${purpose}`);
  console.log(`\x1b[36m║\x1b[0m  Expires in: 10 minutes`);
  console.log(`\x1b[36m╚${border}╝\x1b[0m\n`);
}
