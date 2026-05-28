// =============================================================================
// jwt.js — RESQID
//
// JWT signing, verification, and decoding for all auth flows.
//
// Token Types:
//   ACCESS   — Short-lived (15 min), for API authentication
//   REFRESH  — Long-lived (7 days), for token rotation
//   DEVICE   — Device-specific (30 days), for RFID attendance machines
//   SCAN     — Temporary (5 min), for QR emergency scan sessions
//
// Used by:
//   - auth.service.js            → login → issue tokens
//   - authenticate.middleware.js  → verify every request
//   - token.service.js            → rotate / refresh tokens
//   - deviceFingerprint.middleware → device auth
// =============================================================================

import jwt from 'jsonwebtoken';
import { ENV } from '#config/env.js';
import { ROLES } from '#shared/constants/roles.js';

// ─── Configuration ───────────────────────────────────────────────────────────

const JWT_CONFIG = {
  ACCESS: {
    secret: ENV.JWT_ACCESS_SECRET,
    expiresIn: ENV.JWT_ACCESS_EXPIRY || '15m',
  },
  REFRESH: {
    secret: ENV.JWT_REFRESH_SECRET,
    expiresIn: ENV.JWT_REFRESH_EXPIRY || '7d',
  },
  DEVICE: {
    secret: ENV.JWT_DEVICE_SECRET || ENV.JWT_ACCESS_SECRET,
    expiresIn: ENV.JWT_DEVICE_EXPIRY || '30d',
  },
  SCAN: {
    secret: ENV.JWT_SCAN_SECRET || ENV.JWT_ACCESS_SECRET,
    expiresIn: ENV.JWT_SCAN_EXPIRY || '5m',
  },
};

// Validate secrets at load time
if (!JWT_CONFIG.ACCESS.secret || !JWT_CONFIG.REFRESH.secret) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required');
}

// ─── Token Types ─────────────────────────────────────────────────────────────

export const TOKEN_TYPE = Object.freeze({
  ACCESS: 'access',
  REFRESH: 'refresh',
  DEVICE: 'device',
  SCAN: 'scan',
});

// ─── Signing ─────────────────────────────────────────────────────────────────

/**
 * Sign an access token for authenticated users.
 *
 * @param {Object} params
 * @param {string} params.userId - User ID
 * @param {string} params.email - User email
 * @param {string} params.role - User role (from ROLES)
 * @param {string} [params.schoolId] - School ID (school-scoped roles)
 * @param {string} [params.sessionId] - Session ID for tracking
 * @returns {string} Signed JWT access token
 */
export function signAccessToken({ userId, email, role, schoolId, sessionId }) {
  const payload = {
    sub: userId,
    email,
    role,
    type: TOKEN_TYPE.ACCESS,
    iat: Math.floor(Date.now() / 1000),
  };

  if (schoolId) payload.schoolId = schoolId;
  if (sessionId) payload.sessionId = sessionId;

  return jwt.sign(payload, JWT_CONFIG.ACCESS.secret, {
    expiresIn: JWT_CONFIG.ACCESS.expiresIn,
    issuer: 'resqid',
    subject: userId,
  });
}

/**
 * Sign a refresh token.
 *
 * @param {Object} params
 * @param {string} params.userId - User ID
 * @param {string} params.sessionId - Session ID
 * @returns {string} Signed JWT refresh token
 */
export function signRefreshToken({ userId, sessionId }) {
  return jwt.sign(
    {
      sub: userId,
      sessionId,
      type: TOKEN_TYPE.REFRESH,
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_CONFIG.REFRESH.secret,
    {
      expiresIn: JWT_CONFIG.REFRESH.expiresIn,
      issuer: 'resqid',
      subject: userId,
    }
  );
}

/**
 * Sign a device token for RFID attendance machines.
 *
 * @param {Object} params
 * @param {string} params.deviceId - Device unique ID
 * @param {string} params.schoolId - School the device belongs to
 * @param {string} [params.deviceName] - Human-readable device name
 * @returns {string} Signed JWT device token
 */
export function signDeviceToken({ deviceId, schoolId, deviceName }) {
  return jwt.sign(
    {
      sub: deviceId,
      schoolId,
      role: ROLES.ATTENDANCE_DEVICE,
      type: TOKEN_TYPE.DEVICE,
      deviceName: deviceName || 'RFID Device',
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_CONFIG.DEVICE.secret,
    {
      expiresIn: JWT_CONFIG.DEVICE.expiresIn,
      issuer: 'resqid',
      subject: deviceId,
    }
  );
}

/**
 * Sign a temporary scan token for QR emergency responders.
 *
 * @param {Object} params
 * @param {string} params.studentId - Student being viewed
 * @param {string} params.scannerIp - IP of person scanning
 * @param {string} [params.deviceId] - Device fingerprint of scanner
 * @returns {string} Signed JWT scan token (5 min expiry)
 */
export function signScanToken({ studentId, scannerIp, deviceId }) {
  return jwt.sign(
    {
      sub: studentId,
      scannerIp,
      deviceId,
      role: ROLES.EMERGENCY_RESPONDER,
      type: TOKEN_TYPE.SCAN,
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_CONFIG.SCAN.secret,
    {
      expiresIn: JWT_CONFIG.SCAN.expiresIn,
      issuer: 'resqid',
      subject: studentId,
    }
  );
}

// ─── Verification ────────────────────────────────────────────────────────────

/**
 * Verify an access token.
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_CONFIG.ACCESS.secret, { issuer: 'resqid' });
}

/**
 * Verify a refresh token.
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_CONFIG.REFRESH.secret, { issuer: 'resqid' });
}

/**
 * Verify a device token.
 */
export function verifyDeviceToken(token) {
  return jwt.verify(token, JWT_CONFIG.DEVICE.secret, { issuer: 'resqid' });
}

/**
 * Verify a scan token.
 */
export function verifyScanToken(token) {
  return jwt.verify(token, JWT_CONFIG.SCAN.secret, { issuer: 'resqid' });
}

/**
 * Auto-detect token type and verify with correct secret.
 * Used by authenticate.middleware.js when token type is unknown.
 *
 * @param {string} token
 * @returns {{ payload: object, type: string }} Decoded payload + token type
 */
export function verifyTokenByType(token) {
  // Try each secret in order of likelihood
  const attempts = [
    { verify: verifyAccessToken, type: TOKEN_TYPE.ACCESS },
    { verify: verifyDeviceToken, type: TOKEN_TYPE.DEVICE },
    { verify: verifyScanToken, type: TOKEN_TYPE.SCAN },
  ];

  for (const { verify, type } of attempts) {
    try {
      const payload = verify(token);
      return { payload, type };
    } catch {
      // Try next
    }
  }

  throw new Error('Invalid token');
}

// ─── Decoding ────────────────────────────────────────────────────────────────

/**
 * Decode a token without verifying signature or expiration.
 * Useful for extracting data when the token is already known to be valid.
 *
 * @param {string} token
 * @returns {object|null} Decoded payload, or null if malformed
 */
export function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
}

// ─── Extraction ──────────────────────────────────────────────────────────────

/**
 * Extract token from Authorization header.
 * Supports "Bearer <token>" format.
 *
 * @param {string} authHeader - e.g., "Bearer eyJhbGciOi..."
 * @returns {string|null} The token or null
 */
export function extractTokenFromHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1];
}

/**
 * Extract token from cookie.
 *
 * @param {object} req - Express request
 * @param {string} cookieName - Cookie name
 * @returns {string|null}
 */
export function extractTokenFromCookie(req, cookieName = 'accessToken') {
  return req.cookies?.[cookieName] || null;
}

/**
 * Extract token from request (tries Authorization header first, then cookie).
 *
 * @param {object} req - Express request
 * @returns {string|null}
 */
export function extractToken(req) {
  const authHeader = req.headers?.authorization;
  if (authHeader) return extractTokenFromHeader(authHeader);

  return extractTokenFromCookie(req);
}

// ─── Token Info ──────────────────────────────────────────────────────────────

/**
 * Get token expiry timestamp in seconds.
 *
 * @param {string} token
 * @returns {number|null} Expiry timestamp or null
 */
export function getTokenExpiry(token) {
  const decoded = decodeToken(token);
  return decoded?.exp || null;
}

/**
 * Check if token is expired.
 *
 * @param {string} token
 * @returns {boolean}
 */
export function isTokenExpired(token) {
  const exp = getTokenExpiry(token);
  if (!exp) return true;
  return Date.now() / 1000 > exp;
}
