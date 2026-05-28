// =============================================================================
// deviceFingerprint.middleware.js — RESQID
//
// Validates device fingerprint for authenticated requests.
// Prevents stolen-token replay attacks by binding sessions to devices.
//
<<<<<<< HEAD
// Only applies to PARENT — mobile app only.
// School users and super admins use password‑based sessions from known
// browsers, not mobile device tokens.
=======
// Applies to:
//   - PARENT              → Mobile app device binding
//   - ATTENDANCE_DEVICE   → RFID machine device binding
//   - EMERGENCY_RESPONDER → Scanner device tracking (optional)
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
//
// Header: X-Device-ID (device fingerprint hash from client)
// =============================================================================

<<<<<<< HEAD
import { prisma } from '../config/prisma.js';
import { redis } from '../config/redis.js';
import { logger } from '../config/logger.js';
import { ApiError } from '../shared/response/ApiError.js';
import { asyncHandler } from '../shared/response/asyncHandler.js';

const DEVICE_CACHE_TTL = 60;       // 1 minute — hot path, cache aggressively
const DEVICE_HEADER = 'x-device-id';
const LAST_SEEN_GATE_TTL = 60;     // 1 minute throttle for last_seen updates

// ─── Core Middleware ──────────────────────────────────────────────────────────

/**
 * verifyDevice
 * Must run AFTER authenticate (which sets req.user with id and role)
 * Only enforced for PARENT — mobile app only
 *
 * Checks:
 *   [1] X-Device-ID header present
 *   [2] Device exists in ParentDevice and belongs to this parent
 *   [3] Device is the active device (isActive = true)
 *   [4] Device has not been logged out
 */
export const verifyDevice = asyncHandler(async (req, _res, next) => {
  // Only enforce for mobile app (PARENT)
  if (req.user?.role !== 'PARENT') return next();

  const deviceFingerprint = req.headers[DEVICE_HEADER];

  if (!deviceFingerprint) {
    throw new ApiError(401, 'Device identification header missing (X-Device-ID required)');
  }

  const device = await getDevice(req.user.id, deviceFingerprint);

  if (!device) {
    throw new ApiError(401, 'Device not recognized — please log in again');
  }

  // Device must belong to this parent
  if (device.parentId !== req.user.id) {
    // Serious security event — log at error level
    logger.error({
      claimedUserId: req.user.id,
      deviceOwnerId: device.parentId,
      deviceFingerprint: deviceFingerprint.slice(0, 16) + '...',
    }, 'Device fingerprint mismatch — token used by wrong parent');
    throw new ApiError(401, 'Device does not belong to this account');
  }

  // Device must be the currently active device
  if (!device.isActive) {
    throw new ApiError(401, 'This device has been logged out — please log in again');
  }

  // Device must not have a logged_out_at timestamp
  if (device.loggedOutAt) {
    throw new ApiError(401, 'This device session has ended — please log in again');
  }

  // Attach device info to request for downstream use
  req.deviceId = device.id;
  req.devicePlatform = device.platform;

  // Update last_seen_at asynchronously — don't block the request
  updateDeviceLastSeen(device.id).catch(err =>
    logger.warn({ deviceId: device.id, err: err.message }, 'Failed to update device last_seen_at')
  );

=======
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

>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
  next();
});

// ─── Device Binding (Enforced) ────────────────────────────────────────────────

<<<<<<< HEAD
async function getDevice(parentId, deviceFingerprint) {
=======
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
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
  const cacheKey = `device:${parentId}:${deviceFingerprint}`;

  try {
    const cached = await middlewareRedis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // Cache miss
  }

  const device = await prisma.parentDevice.findFirst({
    where: {
      parentId: parentId,
      deviceFingerprint: deviceFingerprint,
    },
    select: {
      id: true,
      parentId: true,
      platform: true,
<<<<<<< HEAD
      isActive: true,
      loggedOutAt: true,
      logoutReason: true,
=======
      is_active: true,
      logged_out_at: true,
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
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

<<<<<<< HEAD
async function updateDeviceLastSeen(deviceId) {
  const gateKey = `device:last_seen:${deviceId}`;
  // Use SET NX to throttle updates to once per minute
  const canUpdate = await redis.set(gateKey, '1', 'EX', LAST_SEEN_GATE_TTL, 'NX');
  if (!canUpdate) return; // throttled
=======
async function getAttendanceDevice(deviceId) {
  const cacheKey = `attendance:device:${deviceId}`;
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f

  try {
    const cached = await middlewareRedis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // Cache miss
  }

  const device = await prisma.attendanceDevice.findUnique({
    where: { id: deviceId },
<<<<<<< HEAD
    data: { lastSeenAt: new Date() },
=======
    select: { id: true, name: true, schoolId: true, status: true },
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
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
<<<<<<< HEAD
 * invalidateDeviceCache
 * Call this when a device's isActive status changes (login/logout/force-logout)
 * so the cache doesn't serve stale active=true entries
=======
 * Invalidate device cache — call after device status changes.
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
 */
export async function invalidateDeviceCache(parentId, deviceFingerprint) {
  try {
    await middlewareRedis.del(`device:${parentId}:${deviceFingerprint}`);
  } catch {
    // Non-critical
  }
}
