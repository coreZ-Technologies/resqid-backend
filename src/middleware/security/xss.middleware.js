// =============================================================================
// xss.middleware.js — RESQID
//
// XSS prevention — strips HTML/script tags from all string fields.
// Runs AFTER sanitize, BEFORE validate.
// =============================================================================

import xss from 'xss';
import { asyncHandler } from '#shared/response/asyncHandler.js';

// ─── XSS Config — strict, no HTML allowed ─────────────────────────────────────

const xssOptions = {
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style', 'iframe', 'form', 'object'],
};

// Fields exempt from XSS (encrypted binary data)
const ENCRYPTED_FIELDS = new Set([
  'dob_encrypted',
  'phone_encrypted',
  'doctor_phone_encrypted',
  'password_hash',
  'otp_hash',
  'token_hash',
]);

// ─── Middleware ───────────────────────────────────────────────────────────────

export const sanitizeXss = asyncHandler(async (req, _res, next) => {
  if (req.body) req.body = xssClean(req.body);
  if (req.query) Object.assign(req.query, xssClean(req.query));
  if (req.params) Object.assign(req.params, xssClean(req.params));
  next();
});

function xssClean(data, key = null) {
  if (typeof data === 'string') {
    if (ENCRYPTED_FIELDS.has(key)) return data;
    return xss(data, xssOptions);
  }

  if (Array.isArray(data)) {
    return data.map((item) => xssClean(item, key));
  }

  if (
    data !== null &&
    typeof data === 'object' &&
    !(data instanceof Date) &&
    !Buffer.isBuffer(data)
  ) {
    const clean = {};
    for (const [k, v] of Object.entries(data)) {
      clean[k] = xssClean(v, k);
    }
    return clean;
  }

  return data;
}
