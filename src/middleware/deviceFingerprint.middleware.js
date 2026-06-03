// =============================================================================
// deviceFingerprint.middleware.js — RESQID
//
// Validates device fingerprint for authenticated requests.
// Prevents stolen-token replay attacks by binding sessions to devices.
// =============================================================================

import { prisma } from '#config/prisma.js';
import { middlewareRedis } from '#config/redis.js';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { logger } from '#config/logger.js';
import { getDeviceTrustLevel, recordDeviceSeen } from '#shared/security/deviceFingerprint.js';

// ─── Configuration ────────────────────────────────────────────────────────────

const DEVICE_HEADER = 'x-device-id';
const DEVICE_CACHE_TTL = 60;
const LAST_SEEN_THROTTLE = 60;

const DEVICE_BOUND_ROLES = new Set(['PARENT', 'ATTENDANCE_DEVICE']);
const DEVICE_TRACKED_ROLES = new Set(['EMERGENCY_RESPONDER']);

// ─── Core Middleware ──────────────────────────────────────────────────────────

export const verifyDevice = asyncHandler(async (req, _res, next) => {
  const role = req.user?.role;
  const userId = req.user?.id;

  if (!role || !userId) return next();

  const deviceFingerprint = req.headers[DEVICE_HEADER];

  // Enforced: Device-bound roles MUST have device fingerprint
  if (DEVICE_BOUND_ROLES.has(role)) {
    if (!deviceFingerprint) {
      throw ApiError.unauthorized(
        'Device identification required (X-Device-ID header missing)',
        'DEVICE_NOT_RECOGNIZED'
      );
    }
    await enforceDeviceBinding(req, userId, role, deviceFingerprint);
  }

  // Tracked: Optional device fingerprint
  if (DEVICE_TRACKED_ROLES.has(role) && deviceFingerprint) {
    recordDeviceSeen(deviceFingerprint, req.user?.id || 'anonymous').catch(() => {});
  }

  if (deviceFingerprint) {
    req.deviceId = deviceFingerprint;
    getDeviceTrustLevel(deviceFingerprint)
      .then((trust) => {
        req.deviceTrust = trust;
      })
      .catch(() => {
        req.deviceTrust = 'UNKNOWN';
      });
  }

  next();
});

// ─── Device Binding ──────────────────────────────────────────────────────────

async function enforceDeviceBinding(req, userId, role, deviceFingerprint) {
  if (role === 'PARENT') {
    await enforceParentDevice(req, userId, deviceFingerprint);
  } else if (role === 'ATTENDANCE_DEVICE') {
    await enforceAttendanceDevice(req, userId, deviceFingerprint);
  }
}

async function enforceParentDevice(req, parentId, deviceFingerprint) {
  const device = await getParentDevice(parentId, deviceFingerprint);

  if (!device) throw ApiError.deviceNotRecognized();

  // 🔧 Fixed: parentId is Prisma field name (camelCase)
  if (device.parentId !== parentId) {
    logger.error(
      { claimedUserId: parentId, deviceOwnerId: device.parentId },
      'Device fingerprint mismatch'
    );
    throw ApiError.deviceNotRecognized();
  }

  // 🔧 Fixed: isActive (camelCase)
  if (!device.isActive) {
    throw ApiError.unauthorized(
      'This device has been logged out. Please log in again.',
      'DEVICE_BLOCKED'
    );
  }

  // 🔧 Fixed: loggedOutAt (camelCase)
  if (device.loggedOutAt) {
    throw ApiError.unauthorized('Device session has ended. Please log in again.', 'DEVICE_BLOCKED');
  }

  req.deviceInfo = {
    id: device.id,
    platform: device.platform,
    isActive: device.isActive,
  };

  updateDeviceLastSeen(device.id).catch(() => {});
  recordDeviceSeen(deviceFingerprint, parentId).catch(() => {});
}

async function enforceAttendanceDevice(req, deviceId, deviceFingerprint) {
  const device = await getAttendanceDevice(deviceId);

  if (!device) throw ApiError.unauthorized('Device not registered', 'DEVICE_UNREGISTERED');
  if (device.status === 'BLOCKED') throw ApiError.deviceBlocked();

  req.deviceInfo = {
    id: device.id,
    name: device.name,
    schoolId: device.schoolId,
    status: device.status,
  };

  recordDeviceSeen(deviceFingerprint, deviceId).catch(() => {});
}

// ─── Device Lookups (with Redis Cache) ────────────────────────────────────────

async function getParentDevice(parentId, deviceFingerprint) {
  const cacheKey = `device:${parentId}:${deviceFingerprint}`;

  try {
    const cached = await middlewareRedis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    /* cache miss */
  }

  const device = await prisma.parentDevice.findFirst({
    where: { parentId, deviceFingerprint },
    select: {
      id: true,
      parentId: true, // 🔧 camelCase
      platform: true,
      isActive: true, // 🔧 camelCase
      loggedOutAt: true, // 🔧 camelCase
    },
  });

  if (device) {
    try {
      await middlewareRedis.set(cacheKey, JSON.stringify(device), 'EX', DEVICE_CACHE_TTL);
    } catch {
      /* non-critical */
    }
  }

  return device;
}

async function getAttendanceDevice(deviceId) {
  const cacheKey = `attendance:device:${deviceId}`;

  try {
    const cached = await middlewareRedis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    /* cache miss */
  }

  const device = await prisma.attendanceDevice.findUnique({
    where: { id: deviceId },
    select: { id: true, name: true, schoolId: true, status: true },
  });

  if (device) {
    try {
      await middlewareRedis.set(cacheKey, JSON.stringify(device), 'EX', DEVICE_CACHE_TTL);
    } catch {
      /* non-critical */
    }
  }

  return device;
}

// ─── Last Seen Update (Throttled) ─────────────────────────────────────────────

async function updateDeviceLastSeen(deviceId) {
  const gateKey = `device:last_seen:${deviceId}`;

  try {
    const canUpdate = await middlewareRedis.set(gateKey, '1', 'EX', LAST_SEEN_THROTTLE, 'NX');
    if (!canUpdate) return;

    await prisma.parentDevice.update({
      where: { id: deviceId },
      data: { lastSeenAt: new Date() }, // 🔧 camelCase
    });
  } catch {
    /* non-critical */
  }
}

// ─── Cache Invalidation ───────────────────────────────────────────────────────

export async function invalidateDeviceCache(parentId, deviceFingerprint) {
  try {
    await middlewareRedis.del(`device:${parentId}:${deviceFingerprint}`);
  } catch {
    /* non-critical */
  }
}
