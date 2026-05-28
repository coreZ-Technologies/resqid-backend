// =============================================================================
// csrf.middleware.js — RESQID
//
// Double-submit cookie pattern — stateless, Redis-free.
// Public emergency API is EXEMPT (read-only GET).
// Mobile app uses JWT only — CSRF not applicable (no cookies).
// =============================================================================

import crypto from 'crypto';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { ENV } from '#config/env.js';
import { ROLES } from '#shared/constants/roles.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const CSRF_COOKIE = ENV.CSRF_COOKIE_NAME || '__Host-csrf';
const CSRF_HEADER = ENV.CSRF_HEADER_NAME || 'x-csrf-token';
const TOKEN_BYTES = 32;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

const PROTECTED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const EXEMPT_PREFIXES = [
  '/api/emergency',
  '/api/auth/send-otp',
  '/api/auth/verify-otp',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/attendance/tap',
  '/api/webhooks',
  '/health',
];

// ─── Token Generation ─────────────────────────────────────────────────────────

function generateToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex');
}

function signToken(token) {
  return crypto.createHmac('sha256', ENV.CSRF_SECRET).update(token).digest('hex');
}

function verifyToken(token, signature) {
  const expected = signToken(token);
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ─── Issue / Clear ────────────────────────────────────────────────────────────

export function issueCsrfToken(res) {
  const token = generateToken();
  const signature = signToken(token);
  const payload = `${token}.${signature}`;

  res.cookie(CSRF_COOKIE, payload, {
    httpOnly: false,
    secure: ENV.IS_PROD,
    sameSite: 'strict',
    maxAge: TOKEN_TTL_MS,
    path: '/',
  });

  return token;
}

export function clearCsrfToken(res) {
  res.clearCookie(CSRF_COOKIE, {
    httpOnly: false,
    secure: ENV.IS_PROD,
    sameSite: 'strict',
    path: '/',
  });
}

// ─── Verification Middleware ──────────────────────────────────────────────────

export const verifyCsrf = asyncHandler(async (req, _res, next) => {
  // Skip safe methods
  if (!PROTECTED_METHODS.has(req.method)) return next();

  // Skip exempt routes
  if (EXEMPT_PREFIXES.some((p) => req.path.startsWith(p))) return next();

  // Mobile app — no CSRF needed
  const isMobileApp =
    req.headers['x-client-type'] === 'mobile' || req.headers['user-agent']?.includes('Resqid');

  if (req.user?.role === ROLES.PARENT && isMobileApp) return next();

  // Device auth — no CSRF needed
  if (req.user?.role === ROLES.ATTENDANCE_DEVICE) return next();

  const cookieValue = req.cookies?.[CSRF_COOKIE];
  const headerValue = req.headers[CSRF_HEADER];

  if (!cookieValue) throw ApiError.forbidden('CSRF cookie missing', 'CSRF_TOKEN_MISSING');
  if (!headerValue) throw ApiError.forbidden('CSRF token header missing', 'CSRF_TOKEN_MISSING');

  const [cookieToken, cookieSignature] = cookieValue.split('.');

  if (!cookieToken || !cookieSignature) {
    throw ApiError.forbidden('CSRF cookie malformed', 'CSRF_TOKEN_INVALID');
  }

  if (cookieToken !== headerValue) {
    throw ApiError.forbidden('CSRF token mismatch', 'CSRF_TOKEN_INVALID');
  }

  const valid = verifyToken(cookieToken, cookieSignature);
  if (!valid) {
    throw ApiError.forbidden('CSRF token signature invalid', 'CSRF_TOKEN_INVALID');
  }

  next();
});

export const verifyCsrfMobile = asyncHandler(async (req, _res, next) => {
  if (req.cookies?.[CSRF_COOKIE] && req.user?.role === ROLES.PARENT) {
    req.log?.warn({ userId: req.user?.id }, 'CSRF cookie present on mobile request');
  }
  next();
});
