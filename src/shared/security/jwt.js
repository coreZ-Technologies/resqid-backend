// TODO: Add implementation
/**
 * jwt.js
 *
 * JSON Web Token utilities.
 * Handles signing of access & refresh tokens, verification,
 * and decoding without verification.
 *
 * Tokens are signed with HS256 (or RS256 if you configure
 * private/public keys). Secrets come from environment variables.
 *
 * Used by:
 *   - auth.service.js            (login → issue tokens)
 *   - authenticate.middleware.js  (verify every request)
 *   - token.service.js            (rotate / refresh tokens)
 */

import jwt from 'jsonwebtoken';

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------
const ACCESS_TOKEN_SECRET  = process.env.JWT_ACCESS_SECRET;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRY  = process.env.JWT_ACCESS_EXPIRY  || '15m';   // 15 minutes
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';    // 7 days

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  throw new Error('Missing JWT secrets in environment');
}

// ------------------------------------------------------------------
// PUBLIC API
// ------------------------------------------------------------------

/**
 * Create a short-lived access token.
 * Payload should contain at least: { userId, role, schoolId? }
 *
 * @param {object} payload
 * @returns {string} signed JWT
 */
export function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Create a long-lived refresh token.
 * Usually contains only userId (and maybe tokenVersion for revocation).
 *
 * @param {object} payload
 * @returns {string} signed JWT
 */
export function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

/**
 * Verify an access token and return its decoded payload.
 * Throws an error if token is invalid or expired.
 *
 * @param {string} token
 * @returns {object} decoded payload
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
}

/**
 * Verify a refresh token and return its decoded payload.
 *
 * @param {string} token
 * @returns {object} decoded payload
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
}

/**
 * Decode a token without verifying signature or expiration.
 * Useful for extracting data when the token is already known to be valid.
 *
 * @param {string} token
 * @returns {object|null} decoded payload, or null if token is malformed
 */
export function decodeToken(token) {
  return jwt.decode(token);
}

/**
 * Extract the token from an Authorization header.
 * Supports "Bearer <token>" format.
 *
 * @param {string} authHeader - e.g., "Bearer eyJhbGciOi..."
 * @returns {string|null} the token or null
 */
export function extractTokenFromHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1];
}