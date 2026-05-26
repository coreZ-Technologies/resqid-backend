// =============================================================================
// csrfToken.js — RESQID
// CSRF token generation and verification utilities
// Used by csrf.middleware.js — double-submit cookie pattern
// Stateless — no Redis/DB needed
// =============================================================================

import crypto from 'crypto';
import { ENV } from '#config/env.js';

const TOKEN_BYTES = 32;
const SEPARATOR = '.'; // safe separator — hex strings never contain '.'
const COOKIE_NAME = '__Host-csrf';
const HEADER_NAME = 'x-csrf-token';
const TTL_SECONDS = 24 * 60 * 60; // 24 hours
const TTL_MS = TTL_SECONDS * 1000; // Express maxAge expects ms

// ─── Generate ─────────────────────────────────────────────────────────────────

/**
 * generateCsrfToken()
 *
 * Creates a signed token with an expiry baked in.
 * Cookie stores: "token.expiry.signature"
 * Header sends:  "token"
 *
 * Baking expiry into the signed payload means a stolen cookie
 * is only valid until its embedded expiry — not forever.
 *
 * @returns {{ token: string, cookieValue: string }}
 */
export function generateCsrfToken() {
  const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  const expiry = (Date.now() + TTL_MS).toString(16); // hex timestamp
  const payload = `${token}${SEPARATOR}${expiry}`;
  const sig = signCsrfPayload(payload);

  return {
    token, // sent as header value
    cookieValue: `${payload}${SEPARATOR}${sig}`, // stored in cookie
  };
}

// ─── Sign / Verify ────────────────────────────────────────────────────────────

/**
 * Signs any string payload with HMAC-SHA256
 */
export function signCsrfPayload(payload) {
  if (!ENV.CSRF_SECRET) throw new Error('CSRF_SECRET is not set in environment');
  return crypto.createHmac('sha256', ENV.CSRF_SECRET).update(payload).digest('hex');
}

/**
 * verifyCsrfPair(headerToken, cookieValue)
 *
 * Returns true only if ALL of:
 *   1. Cookie format is valid      → token.expiry.signature
 *   2. Header token matches cookie token
 *   3. Token has not expired       → expiry baked into payload
 *   4. Signature is valid          → proves server issued this cookie
 */
export function verifyCsrfPair(headerToken, cookieValue) {
  if (!headerToken || !cookieValue) return false;

  const parts = cookieValue.split(SEPARATOR);

  // Expect exactly 3 parts: token . expiry . signature
  if (parts.length !== 3) return false;

  const [cookieToken, expiry, cookieSignature] = parts;

  // 1. Header token must match cookie token
  if (cookieToken !== headerToken) return false;

  // 2. Check expiry — parseInt hex timestamp
  const expiryMs = parseInt(expiry, 16);
  if (isNaN(expiryMs) || Date.now() > expiryMs) return false;

  // 3. Verify HMAC signature over token.expiry payload
  const payload = `${cookieToken}${SEPARATOR}${expiry}`;
  const expectedSignature = signCsrfPayload(payload);

  try {
    return crypto.timingSafeEqual(
      Buffer.from(cookieSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

// ─── Cookie Helpers ───────────────────────────────────────────────────────────

/**
 * __Host- prefix requires:
 *   - secure: true       (ALWAYS — even in dev, __Host- won't set without it)
 *   - path: '/'          (exact match required)
 *   - no domain attr     (browser enforces host binding)
 *
 * NOTE: In local dev over HTTP, use __csrf (no prefix) instead.
 * Set COOKIE_NAME conditionally if needed, or run dev over HTTPS (recommended).
 */
export function setCsrfCookie(res, cookieValue) {
  res.cookie(COOKIE_NAME, cookieValue, {
    httpOnly: false, // MUST be false — frontend JS reads this to send as header
    secure: true, // MUST always be true — __Host- prefix requires it
    sameSite: 'strict',
    maxAge: TTL_MS,
    path: '/',
    // domain intentionally omitted — required by __Host- prefix spec
  });
}

export function clearCsrfCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: false,
    secure: true,
    sameSite: 'strict',
    path: '/',
  });
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export { COOKIE_NAME as CSRF_COOKIE_NAME, HEADER_NAME as CSRF_HEADER_NAME, TTL_MS as CSRF_TTL_MS };
