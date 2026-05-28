// =============================================================================
// contentType.middleware.js — RESQID
//
// Enforces Content-Type: application/json on mutating requests.
// Rejects BEFORE body parsing — prevents bypass of sanitize + XSS middleware.
//
// Without this: attackers can send text/plain and bypass JSON body parsing,
// meaning sanitize middleware sees empty req.body and passes through silently.
//
// Exceptions:
//   - GET, HEAD, OPTIONS — no body expected
//   - Multipart routes — file uploads use form-data
//   - Webhook routes — external providers may send different types
//   - Emergency routes — public GET endpoint
// =============================================================================

import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';

// ─── Configuration ────────────────────────────────────────────────────────────

const REQUIRES_JSON = new Set(['POST', 'PUT', 'PATCH']);
const OPTIONAL_JSON = new Set(['DELETE']);

// Routes exempt from content-type check
const EXEMPT_PREFIXES = [
  '/api/emergency', // Public GET — no body
  '/api/attendance/tap', // RFID device may send different format
  '/api/webhooks', // External providers — raw body needed
  '/health',
  '/api/health',
];

// Routes accepting multipart/form-data (file uploads)
const MULTIPART_PREFIXES = [
  '/api/school-admin/students/photo',
  '/api/school-admin/template/logo',
  '/api/super-admin/schools/logo',
  '/api/parents/me/photo',
  '/api/parents/me/students/photo',
  '/api/upload',
];

// ─── Core Middleware ──────────────────────────────────────────────────────────

export const enforceContentType = asyncHandler(async (req, _res, next) => {
  // Skip methods that don't send a body
  if (!REQUIRES_JSON.has(req.method) && !OPTIONAL_JSON.has(req.method)) {
    return next();
  }

  // Skip exempt routes
  if (EXEMPT_PREFIXES.some((p) => req.path.startsWith(p))) {
    return next();
  }

  // Skip multipart routes
  if (MULTIPART_PREFIXES.some((p) => req.path.startsWith(p))) {
    return next();
  }

  // DELETE with no body is fine
  if (OPTIONAL_JSON.has(req.method)) {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const hasBody = contentLength > 0 || !!req.headers['transfer-encoding'];
    if (!hasBody) return next();
  }

  const contentType = (req.headers['content-type'] || '').toLowerCase();

<<<<<<< HEAD
=======
<<<<<<< HEAD
  // Must include application/json (may have charset suffix e.g. '; charset=utf-8')
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new ApiError(
      400,
      `Content-Type must be application/json — received: '${contentType || 'none'}'`
=======
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
  // Must include application/json
  if (!contentType.includes('application/json')) {
    throw ApiError.badRequest(
      `Content-Type must be application/json. Received: '${contentType || 'none'}'`,
      [],
      'CONTENT_TYPE_INVALID'
<<<<<<< HEAD
=======
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
    );
  }

  next();
});
