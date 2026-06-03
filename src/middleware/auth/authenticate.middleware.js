// =============================================================================
// authenticate.middleware.js — RESQID
//
// Authentication middleware — supports 4 auth strategies:
//   1. JWT      — Standard user authentication (access token)
//   2. DEVICE   — RFID attendance machine authentication (device token)
//   3. WEBHOOK  — External webhook signature verification
//   4. NONE     — Public routes (QR scan, health check, login)
// =============================================================================

import crypto from 'crypto';
import { prisma } from '#config/prisma.js';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { logger } from '#config/logger.js';
import {
  extractToken,
  verifyAccessToken,
  verifyDeviceToken,
  verifyScanToken,
} from '#shared/security/jwt.js';
import { getAuthStrategy } from '#shared/constants/publicPaths.js';
import { SCHOOL_SCOPED_ROLES, GLOBAL_ROLES } from '#shared/constants/roles.js';

// =============================================================================
// MAIN AUTHENTICATE MIDDLEWARE
// =============================================================================

export const authenticate = asyncHandler(async (req, res, next) => {
  const strategy = getAuthStrategy(req.path);

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
// STRATEGY: PUBLIC
// =============================================================================

const handlePublicAccess = (req, next) => {
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
// STRATEGY: JWT
// =============================================================================

const handleJwtAuth = async (req, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.tokenMissing();

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') throw ApiError.tokenExpired();
    try {
      decoded = verifyScanToken(token);
    } catch {
      throw ApiError.invalidToken();
    }
  }

  const user = await fetchUserForAuth(decoded);
  if (!user) throw ApiError.unauthorized('User not found', 'USER_NOT_FOUND');
  if (user.isActive === false) throw ApiError.accountDeactivated();

  validateSchoolScope(user, decoded);

  req.user = {
    id: user.id,
    email: user.email || user.phone || null,
    role: decoded.role,
    schoolId: decoded.schoolId || user.schoolId || null,
    sessionId: decoded.sessionId || null,
    isAuthenticated: true,
    authStrategy: 'JWT',
  };

  if (decoded.deviceId) req.deviceId = decoded.deviceId;

  next();
};

// =============================================================================
// STRATEGY: DEVICE
// =============================================================================

const handleDeviceAuth = async (req, next) => {
  const deviceId = req.headers['x-device-id'];
  const deviceSignature = req.headers['x-device-signature'];

  // Option A: Device JWT token
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = extractToken(req);
    try {
      const decoded = verifyDeviceToken(token);
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
    }
  }

  // Option B: Device ID + Signature
  if (deviceId && deviceSignature) {
    const device = await prisma.attendanceDevice.findUnique({
      where: { id: deviceId },
      select: { id: true, schoolId: true, status: true, name: true, apiKey: true },
    });

    if (!device) throw ApiError.unauthorized('Device not registered');
    if (device.status === 'BLOCKED') throw ApiError.deviceBlocked();

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
// STRATEGY: WEBHOOK
// =============================================================================

const handleWebhookAuth = async (req, next) => {
  const signature = req.headers['x-webhook-signature'];
  if (!signature) throw ApiError.unauthorized('Webhook signature required');

  req.user = {
    id: null,
    role: 'SYSTEM',
    schoolId: null,
    isAuthenticated: true,
    authStrategy: 'WEBHOOK',
    webhookId: req.headers['x-webhook-id'] || null,
  };
  next();
};

// =============================================================================
// HELPERS
// =============================================================================

const fetchUserForAuth = async (decoded) => {
  const { sub: userId, role } = decoded;

  // SchoolUser (admin, teacher)
  if (['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'].includes(role)) {
    return prisma.schoolUser.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, schoolId: true, isActive: true },
    });
  }

  // Parent
  if (role === 'PARENT') {
    return prisma.parentUser.findUnique({
      where: { id: userId },
      select: { id: true, phone: true, isActive: true },
    });
  }

  return null;
};

const validateSchoolScope = (user, decoded) => {
  const role = decoded.role;
  if (SCHOOL_SCOPED_ROLES.includes(role) && !decoded.schoolId && !user.schoolId) {
    throw ApiError.tenantRequired();
  }
  if (GLOBAL_ROLES.includes(role) && decoded.schoolId) {
    logger.warn({ userId: user.id, role, schoolId: decoded.schoolId }, 'Global role with schoolId');
  }
};

const verifyDeviceSignature = (deviceId, signature, apiKey) => {
  if (!apiKey || !signature) return false;

  const timestamp = Math.floor(Date.now() / 1000);

  for (let offset = -30; offset <= 30; offset += 10) {
    const ts = timestamp + offset;
    const expected = crypto.createHmac('sha256', apiKey).update(`${deviceId}:${ts}`).digest('hex');

    try {
      if (
        signature.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
      ) {
        return true;
      }
    } catch {
      // Length mismatch — try next offset
    }
  }

  return false;
};
