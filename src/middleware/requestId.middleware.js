// =============================================================================
// requestId.middleware.js — RESQID
//
// Unique request ID for every incoming request.
// Used in logs, error responses, audit trails, and distributed tracing.
//
// If client sends X-Request-ID (valid format) → use it (idempotency support)
// Otherwise → generate UUID v4
// Always echoes ID back in X-Request-ID response header
// =============================================================================

import crypto from 'crypto';

const HEADER = 'x-request-id';
const ID_REGEX = /^[a-zA-Z0-9_-]{8,64}$/;

export function requestId(req, res, next) {
  const clientId = req.headers[HEADER];

  // Accept client-provided ID if valid format
  const id = clientId && ID_REGEX.test(clientId) ? clientId : crypto.randomUUID();

  // Attach to request (both names for compatibility)
  req.id = id;
  req.requestId = id;

  // Echo back in response for client correlation
  res.setHeader('X-Request-ID', id);

  next();
}
