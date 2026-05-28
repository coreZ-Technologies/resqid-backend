// =============================================================================
// authenticate.middleware.js — RESQID
//
// Authentication middleware — supports 4 auth strategies:
//   1. JWT      — Standard user authentication (access token)
//   2. DEVICE   — RFID attendance machine authentication (device token)
//   3. WEBHOOK  — External webhook signature verification
//   4. NONE     — Public routes (QR scan, health check, login)
//
// Strategy is auto-detected based on path and headers.
// Attaches req.user with role-specific data for downstream middleware.
// =============================================================================

import { prisma } from '#config/prisma.js';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { logger } from '#config/logger.js';
import {
  extractToken,
  verifyAccessToken,
  verifyDeviceToken,
  verifyScanToken,
  decodeToken,
} from '#shared/security/jwt.js';
import { isPublicPath, getAuthStrategy, isDeviceAuthPath, isWebhookPath } from '#shared/constants/publicPaths.js';
import { DEVICE_SCOPED_ROLES, SCHOOL_SCOPED_ROLES, GLOBAL_ROLES } from '#shared/constants/roles.js';
import { TOKEN_STATUS } from '#shared/constants/status.js';

// =============================================================================
// MAIN AUTHENTICATE MIDDLEWARE
// =============================================================================

export const authenticate = asyncHandler(async (req, res, next) => {
  const path = req.path;
  const strategy = getAuthStrategy(path);

  switch (strategy) {
    case 'NONE':
      return handlePublicAccess(req, next);

    case 'DEVICE':
      return handleDeviceAuth(req, next);

    case 'WEBHOOK':
      return handleWebhookAuth(req, next);

    case 'JWT':
    default:
      return handleJwtAuth(req, next);
  }
});

// =============================================================================
// STRATEGY: PUBLIC (No Auth Required)
// =============================================================================

/**
 * Public routes — no authentication needed.
 * Attaches a minimal EMERGENCY_RESPONDER context for scan routes.
 */
const handlePublicAccess = (req, next) => {
  // For QR scan routes, attach responder context
  if (req.path.startsWith('/s/') || req.path.includes('/emergency/profile/')) {
    req.user = {
      id: null,
      role: 'EMERGENCY_RESPONDER',
      schoolId: null,
      isAuthenticated: false,
      authStrategy: 'NONE',
    };
  }

  next();
};

// =============================================================================
// STRATEGY: JWT (Standard User Auth)
// =============================================================================

/**
 * JWT authentication for admin, teacher, parent users.
 * Supports both Authorization header and cookie-based tokens.
 */
const handleJwtAuth = async (req, next) => {
  // 1. Extract token from header or cookie
  const token = extractToken(req);

  if (!token) {
    throw ApiError.tokenMissing();
  }

  // 2. Verify token (auto-detects access/scan tokens)
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.tokenExpired();
    }
    // Try scan token (for QR responder access)
    try {
      decoded = verifyScanToken(token);
    } catch {
      throw ApiError.invalidToken();
    }
  }

  // 3. Validate user exists and is active
  const user = await fetchUserForAuth(decoded);

  if (!user) {
    throw ApiError.unauthorized('User not found', 'USER_NOT_FOUND');
  }

  if (user.isActive === false) {
    throw ApiError.accountDeactivated();
  }

  // 4. Validate school scope
  validateSchoolScope(user, decoded);

  // 5. Attach user to request
  req.user = {
    id: user.id,
    email: user.email,
    role: decoded.role,
    schoolId: decoded.schoolId || user.schoolId || null,
    sessionId: decoded.sessionId || null,
    isAuthenticated: true,
    authStrategy: 'JWT',
  };

  // 6. Attach device fingerprint if available
  if (decoded.deviceId) {
    req.deviceId = decoded.deviceId;
  }

  next();
};

// =============================================================================
// STRATEGY: DEVICE (RFID Attendance Machine)
// =============================================================================

/**
 * Device authentication for RFID attendance machines.
 * Uses X-Device-ID header + device token or API key.
 */
const handleDeviceAuth = async (req, next) => {
  const deviceId = req.headers['x-device-id'];
  const deviceSignature = req.headers['x-device-signature'];
  const apiKey = req.headers['x-api-key'];

  // Option A: Device JWT token
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = extractToken(req);
    try {
      const decoded = verifyDeviceToken(token);

      // Verify device exists and is active
      const device = await prisma.attendanceDevice.findUnique({
        where: { id: decoded.sub },
        select: { id: true, schoolId: true, status: true, name: true },
      });

      if (!device) throw ApiError.unauthorized('Device not found');
      if (device.status === 'BLOCKED') throw ApiError.deviceBlocked();

      req.user = {
        id: device.id,
        role: 'ATTENDANCE_DEVICE',
        schoolId: device.schoolId,
        deviceName: device.name,
        isAuthenticated: true,
        authStrategy: 'DEVICE',
      };

      return next();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      // Fall through to API key auth
    }
  }

  // Option B: Device ID + Signature (for IoT devices without JWT)
  if (deviceId && deviceSignature) {
    const device = await prisma.attendanceDevice.findUnique({
      where: { id: deviceId },
      select: { id: true, schoolId: true, status: true, name: true, apiKey: true },
    });

    if (!device) throw ApiError.unauthorized('Device not registered');
    if (device.status === 'BLOCKED') throw ApiError.deviceBlocked();
    if (device.status === 'OFFLINE') {
      logger.warn({ deviceId }, 'Device is offline — allowing retry');
    }

    // Verify signature (HMAC of deviceId + timestamp)
    const isValid = verifyDeviceSignature(deviceId, deviceSignature, device.apiKey);
    if (!isValid) throw ApiError.unauthorized('Invalid device signature');

    req.user = {
      id: device.id,
      role: 'ATTENDANCE_DEVICE',
      schoolId: device.schoolId,
      deviceName: device.name,
      isAuthenticated: true,
      authStrategy: 'DEVICE',
    };

    return next();
  }

  throw ApiError.unauthorized('Device authentication required');
};

// =============================================================================
// STRATEGY: WEBHOOK (External Service)
// =============================================================================

/**
 * Webhook authentication — verifies signature from external services.
 * Used for Razorpay payment webhooks, email/SMS delivery status.
 */
const handleWebhookAuth = async (req, next) => {
  const signature = req.headers['x-webhook-signature'];
  const webhookId = req.headers['x-webhook-id'];

  if (!signature) {
    throw ApiError.unauthorized('Webhook signature required');
  }

  // Webhook verification is handled by individual webhook handlers
  // This just attaches basic context
  req.user = {
    id: null,
    role: 'SYSTEM',
    schoolId: null,
    isAuthenticated: true,
    authStrategy: 'WEBHOOK',
    webhookId,
  };

  next();
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Fetch user by decoded JWT payload.
 * Queries different tables based on role.
 */
const fetchUserForAuth = async (decoded) => {
  const { sub: userId, role } = decoded;

  // Super admin and school admin — from User table
  if ([ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.TEACHER].includes(role)) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, schoolId: true, isActive: true },
    });
  }

  // Parent — from Parent table
  if (role === ROLES.PARENT) {
    return prisma.parent.findUnique({
      where: { id: userId },
      select: { id: true, phone: true, isActive: true },
    });
  }

  return null;
};

/**
 * Validate that the user's school scope matches the token.
 * School-scoped roles must have a schoolId.
 */
const validateSchoolScope = (user, decoded) => {
  const role = decoded.role;

  // School-scoped roles MUST have a schoolId
  if (SCHOOL_SCOPED_ROLES.includes(role) && !decoded.schoolId && !user.schoolId) {
    throw ApiError.tenantRequired();
  }

  // Global roles should NOT have a schoolId
  if (GLOBAL_ROLES.includes(role) && decoded.schoolId) {
    logger.warn({ userId: user.id, role, schoolId: decoded.schoolId }, 'Global role with schoolId — ignoring');
  }
};

/**
 * Verify device signature for IoT device authentication.
 * Simple HMAC-based: HMAC(deviceId + timestamp, apiKey)
 */
const verifyDeviceSignature = (deviceId, signature, apiKey) => {
  if (!apiKey) return false;

  const crypto = await import('crypto');
  const timestamp = Math.floor(Date.now() / 1000);

  // Try current timestamp and +/- 30 seconds (clock skew tolerance)
  for (let offset = -30; offset <= 30; offset += 10) {
    const ts = timestamp + offset;
    const expected = crypto
      .createHmac('sha256', apiKey)
      .update(`${deviceId}:${ts}`)
      .digest('hex');

    if (crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    )) {
      return true;
    }
  }

  return false;
};

// Wait — crypto import needs to be at top
import crypto from 'crypto';

// Fixed version of verifyDeviceSignature:
const _verifyDeviceSignature = (deviceId, signature, apiKey) => {
  if (!apiKey) return false;

  const timestamp = Math.floor(Date.now() / 1000);

  // Try current timestamp and +/- 30 seconds (clock skew tolerance)
  for (let offset = -30; offset <= 30; offset += 10) {
    const ts = timestamp + offset;
    const expected = crypto
      .createHmac('sha256', apiKey)
      .update(`${deviceId}:${ts}`)
      .digest('hex');

    try {
      if (crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expected, 'hex')
      )) {
        return true;
      }
    } catch {
      // Length mismatch — try next offset
    }
  }

  return false;
};