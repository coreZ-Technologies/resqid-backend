// =============================================================================
// csrfToken.js — RESQID
// CSRF token generation and verification utilities
// Used by csrf.middleware.js — double-submit cookie pattern
// Stateless — no Redis/DB needed
// =============================================================================

import crypto from 'crypto';
import { ENV } from '#config/env.js';

const TOKEN_BYTES = 32;
const SEPARATOR = '.';
const COOKIE_NAME = ENV.CSRF_COOKIE_NAME || '__Host-csrf';
const HEADER_NAME = ENV.CSRF_HEADER_NAME || 'x-csrf-token';
const TTL_SECONDS = 24 * 60 * 60; // 24 hours
const TTL_MS = TTL_SECONDS * 1000;

// ─── Generate ─────────────────────────────────────────────────────────────────

/**
 * Generate a CSRF token pair.
 *
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
  const expiry = (Date.now() + TTL_MS).toString(16);
  const payload = `${token}${SEPARATOR}${expiry}`;
  const sig = signCsrfPayload(payload);

  return {
    token,
    cookieValue: `${payload}${SEPARATOR}${sig}`,
    expiresAt: new Date(Date.now() + TTL_MS),
  };
}

/**
 * Generate a CSRF token bound to a specific session.
 * Adds sessionId to payload for additional binding (optional enhancement).
 */
export function generateCsrfTokenForSession(sessionId) {
  const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  const expiry = (Date.now() + TTL_MS).toString(16);
  const sessionHash = crypto.createHash('sha256').update(sessionId).digest('hex').slice(0, 8);
  const payload = `${token}${SEPARATOR}${expiry}${SEPARATOR}${sessionHash}`;
  const sig = signCsrfPayload(payload);

  return {
    token,
    cookieValue: `${payload}${SEPARATOR}${sig}`,
    expiresAt: new Date(Date.now() + TTL_MS),
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
 * Verify a CSRF token pair (header + cookie).
 *
 * Returns true only if ALL:
 *   1. Cookie format is valid (token.expiry.signature or token.expiry.session.signature)
 *   2. Header token matches cookie token
 *   3. Token has not expired
 *   4. Signature is valid
 */
export function verifyCsrfPair(headerToken, cookieValue) {
  if (!headerToken || !cookieValue) return false;

  const parts = cookieValue.split(SEPARATOR);

  // Expect 3 parts (token.expiry.signature) or 4 (token.expiry.session.signature)
  if (parts.length !== 3 && parts.length !== 4) return false;

  const cookieToken = parts[0];
  const expiry = parts[1];
  const cookieSignature = parts[parts.length - 1];

  // 1. Header token must match cookie token
  if (cookieToken !== headerToken) return false;

  // 2. Check expiry
  const expiryMs = parseInt(expiry, 16);
  if (isNaN(expiryMs) || Date.now() > expiryMs) return false;

  // 3. Rebuild payload and verify HMAC
  const payloadParts = parts.slice(0, -1); // All parts except signature
  const payload = payloadParts.join(SEPARATOR);
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
 * Set CSRF cookie on response.
 *
 * __Host- prefix requires:
 *   - secure: true       (ALWAYS — even in dev)
 *   - path: '/'          (exact match required)
 *   - no domain attr     (browser enforces host binding)
 */
export function setCsrfCookie(res, cookieValue) {
  res.cookie(COOKIE_NAME, cookieValue, {
    httpOnly: false, // Frontend JS must read this
    secure: true, // Required by __Host- prefix
    sameSite: 'strict',
    maxAge: TTL_MS,
    path: '/',
  });
}

/**
 * Clear CSRF cookie
 */
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
