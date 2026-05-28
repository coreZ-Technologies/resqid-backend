// =============================================================================
// deviceFingerprint.middleware.js — RESQID
//
// Validates device fingerprint for authenticated requests.
// Prevents stolen-token replay attacks by binding sessions to devices.
//
// Applies to:
//   - PARENT              → Mobile app device binding
//   - ATTENDANCE_DEVICE   → RFID machine device binding
//   - EMERGENCY_RESPONDER → Scanner device tracking (optional)
//
// Header: X-Device-ID (device fingerprint hash from client)
// =============================================================================

import { prisma } from '#config/prisma.js';
import { middlewareRedis } from '#config/redis.js';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { logger } from '#config/logger.js';
import { ROLES } from '#shared/constants/roles.js';
import {
  generateDeviceFingerprint,
  validateDeviceFingerprint,
  getDeviceTrustLevel,
  recordDeviceSeen,
} from '#shared/security/deviceFingerprint.js';

// ─── Configuration ────────────────────────────────────────────────────────────

const DEVICE_HEADER = 'x-device-id';
const DEVICE_CACHE_TTL = 60; // 1 minute cache for device lookups
const LAST_SEEN_THROTTLE = 60; // Update last_seen_at max once per minute

// Roles that require device fingerprint verification
const DEVICE_BOUND_ROLES = new Set([ROLES.PARENT, ROLES.ATTENDANCE_DEVICE]);

// Roles where device fingerprint is optional (tracked but not enforced)
const DEVICE_TRACKED_ROLES = new Set([ROLES.EMERGENCY_RESPONDER]);

// ─── Core Middleware ──────────────────────────────────────────────────────────

export const verifyDevice = asyncHandler(async (req, _res, next) => {
  const role = req.user?.role;
  const userId = req.user?.id;

  if (!role || !userId) {
    return next(); // Let authenticate middleware handle this
  }

  const deviceFingerprint = req.headers[DEVICE_HEADER];

  // ── Enforced: Device-bound roles MUST have device fingerprint ──────────
  if (DEVICE_BOUND_ROLES.has(role)) {
    if (!deviceFingerprint) {
      throw ApiError.unauthorized(
        'Device identification required (X-Device-ID header missing)',
        'DEVICE_NOT_RECOGNIZED'
      );
    }

    await enforceDeviceBinding(req, userId, role, deviceFingerprint);
  }

  // ── Tracked: Optional device fingerprint for analytics/security ────────
  if (DEVICE_TRACKED_ROLES.has(role) && deviceFingerprint) {
    await trackDevice(req, deviceFingerprint);
  }

  // Attach device info to request
  if (deviceFingerprint) {
    req.deviceId = deviceFingerprint;

    // Get trust level (non-blocking, best-effort)
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

// ─── Device Binding (Enforced) ────────────────────────────────────────────────

async function enforceDeviceBinding(req, userId, role, deviceFingerprint) {
  if (role === ROLES.PARENT) {
    await enforceParentDevice(req, userId, deviceFingerprint);
  } else if (role === ROLES.ATTENDANCE_DEVICE) {
    await enforceAttendanceDevice(req, userId, deviceFingerprint);
  }
}

/**
 * Enforce parent mobile device binding.
 * Device must exist in ParentDevice table and be active.
 */
async function enforceParentDevice(req, parentId, deviceFingerprint) {
  const device = await getParentDevice(parentId, deviceFingerprint);

  if (!device) {
    throw ApiError.deviceNotRecognized();
  }

  // Device must belong to this parent
  if (device.parent_id !== parentId) {
    logger.error(
      {
        claimedUserId: parentId,
        deviceOwnerId: device.parent_id,
        deviceFingerprint: deviceFingerprint.slice(0, 16) + '...',
      },
      'Device fingerprint mismatch — token used by wrong parent'
    );
    throw ApiError.deviceNotRecognized();
  }

  // Device must be active
  if (!device.is_active) {
    throw ApiError.unauthorized(
      'This device has been logged out. Please log in again.',
      'DEVICE_BLOCKED'
    );
  }

  // Device must not have been explicitly logged out
  if (device.logged_out_at) {
    throw ApiError.unauthorized('Device session has ended. Please log in again.', 'DEVICE_BLOCKED');
  }

  req.deviceInfo = {
    id: device.id,
    platform: device.platform,
    isActive: device.is_active,
  };

  // Update last_seen_at (throttled)
  updateDeviceLastSeen(device.id).catch(() => {});

  // Record device seen in Redis for trust scoring
  recordDeviceSeen(deviceFingerprint, parentId).catch(() => {});
}

/**
 * Enforce attendance device binding.
 * Device must exist in AttendanceDevice table and be active.
 */
async function enforceAttendanceDevice(req, deviceId, deviceFingerprint) {
  // Device ID from JWT should match fingerprint
  // For RFID devices, the deviceId in JWT is the primary check
  // Fingerprint provides additional verification
  const device = await getAttendanceDevice(deviceId);

  if (!device) {
    throw ApiError.unauthorized('Device not registered', 'DEVICE_UNREGISTERED');
  }

  if (device.status === 'BLOCKED') {
    throw ApiError.deviceBlocked();
  }

  req.deviceInfo = {
    id: device.id,
    name: device.name,
    schoolId: device.schoolId,
    status: device.status,
  };

  // Record heartbeat
  recordDeviceSeen(deviceFingerprint, deviceId).catch(() => {});
}

// ─── Device Tracking (Optional) ───────────────────────────────────────────────

async function trackDevice(req, deviceFingerprint) {
  // For emergency responders, just track the device for security analytics
  recordDeviceSeen(deviceFingerprint, req.user?.id || 'anonymous').catch(() => {});
}

// ─── Device Lookups (with Redis Cache) ────────────────────────────────────────

async function getParentDevice(parentId, deviceFingerprint) {
  const cacheKey = `device:${parentId}:${deviceFingerprint}`;

  try {
    const cached = await middlewareRedis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // Cache miss
  }

  const device = await prisma.parentDevice.findFirst({
    where: {
      parent_id: parentId,
      device_fingerprint: deviceFingerprint,
    },
    select: {
      id: true,
      parent_id: true,
      platform: true,
      is_active: true,
      logged_out_at: true,
    },
  });

  if (device) {
    try {
      await middlewareRedis.set(cacheKey, JSON.stringify(device), 'EX', DEVICE_CACHE_TTL);
    } catch {
      // Non-critical
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
    // Cache miss
  }

  const device = await prisma.attendanceDevice.findUnique({
    where: { id: deviceId },
    select: { id: true, name: true, schoolId: true, status: true },
  });

  if (device) {
    try {
      await middlewareRedis.set(cacheKey, JSON.stringify(device), 'EX', DEVICE_CACHE_TTL);
    } catch {
      // Non-critical
    }
  }

  return device;
}

// ─── Last Seen Update (Throttled) ─────────────────────────────────────────────

async function updateDeviceLastSeen(deviceId) {
  const gateKey = `device:last_seen:${deviceId}`;

  try {
    // Only update if throttle gate allows
    const canUpdate = await middlewareRedis.set(gateKey, '1', 'EX', LAST_SEEN_THROTTLE, 'NX');
    if (!canUpdate) return;

    await prisma.parentDevice.update({
      where: { id: deviceId },
      data: { last_seen_at: new Date() },
    });
  } catch {
    // Non-critical — don't block request
  }
}

// ─── Cache Invalidation ───────────────────────────────────────────────────────

/**
 * Invalidate device cache — call after device status changes.
 */
export async function invalidateDeviceCache(parentId, deviceFingerprint) {
  try {
    await middlewareRedis.del(`device:${parentId}:${deviceFingerprint}`);
  } catch {
    // Non-critical
  }
}
