// =============================================================================
// requestSize.middleware.js — RESQID
//
// Per-route HTTP body size limits — rejects BEFORE body parsing.
// Prevents memory exhaustion from oversized payloads.
// =============================================================================

import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';

// ─── Size Helpers ─────────────────────────────────────────────────────────────

const KB = (n) => n * 1024;
const MB = (n) => n * 1024 * 1024;

// ─── Route Limits ─────────────────────────────────────────────────────────────

const ROUTE_LIMITS = [
  { prefix: '/api/auth/otp', limit: KB(2) },
  { prefix: '/api/auth/login', limit: KB(2) },
  { prefix: '/api/auth/refresh', limit: KB(1) },
  { prefix: '/api/auth', limit: KB(5) },
  { prefix: '/api/parents/emergency', limit: KB(10) },
  { prefix: '/api/parents/contacts', limit: KB(10) },
  { prefix: '/api/parents', limit: KB(50) },
  { prefix: '/api/emergency', limit: 0 },
  { prefix: '/api/attendance/tap', limit: KB(5) },
  { prefix: '/api/school-admin/students/bulk', limit: KB(500) },
  { prefix: '/api/school-admin', limit: KB(100) },
  { prefix: '/api/super-admin', limit: KB(200) },
  { prefix: '/api/webhooks', limit: KB(50) },
  { prefix: '/', limit: KB(20) },
];

// ─── Core Middleware ──────────────────────────────────────────────────────────

export const enforceRequestSize = asyncHandler(async (req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const contentLength = req.headers['content-length'];
  if (!contentLength) return next();

  const bodySize = parseInt(contentLength, 10);
  if (isNaN(bodySize)) return next();

  const limit = resolveLimit(req.path);

  if (limit === 0 && bodySize > 0) {
    throw ApiError.badRequest('Request body not allowed on this endpoint');
  }

  if (bodySize > limit) {
    throw ApiError.custom(
      413,
      `Request body too large — max ${formatBytes(limit)} allowed`,
      'REQUEST_TOO_LARGE'
    );
  }

  next();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveLimit(path) {
  for (const { prefix, limit } of ROUTE_LIMITS) {
    if (path.startsWith(prefix)) return limit;
  }
  return KB(20);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0B';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
