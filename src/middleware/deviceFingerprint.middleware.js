// =============================================================================
// deviceFingerprint.middleware.js — RESQID
// Validates that the device making the request matches the active ParentDevice
// on record. Enforces single-device login at the HTTP layer — not just at the
// DB layer on login.
//
// Why this matters:
//   A stolen JWT from device A could be replayed from device B with no
//   detection if we only check the JWT and session. This middleware ensures
//   the device fingerprint in the request header matches the active device
//   record in ParentDevice, killing stolen-token replay attacks.
//
// Only applies to PARENT — mobile app only.
// School users and super admins use password‑based sessions from known
// browsers, not mobile device tokens.
//
// Header: X-Device-ID (device fingerprint from mobile app)
// =============================================================================

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

  next();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getDevice(parentId, deviceFingerprint) {
  const cacheKey = `device:${parentId}:${deviceFingerprint}`;
  const cached = await redis.get(cacheKey);

  if (cached) return JSON.parse(cached);

  const device = await prisma.parentDevice.findFirst({
    where: {
      parentId: parentId,
      deviceFingerprint: deviceFingerprint,
    },
    select: {
      id: true,
      parentId: true,
      platform: true,
      isActive: true,
      loggedOutAt: true,
      logoutReason: true,
    },
  });

  if (device) {
    await redis.setex(cacheKey, DEVICE_CACHE_TTL, JSON.stringify(device));
  }

  return device;
}

async function updateDeviceLastSeen(deviceId) {
  const gateKey = `device:last_seen:${deviceId}`;
  // Use SET NX to throttle updates to once per minute
  const canUpdate = await redis.set(gateKey, '1', 'EX', LAST_SEEN_GATE_TTL, 'NX');
  if (!canUpdate) return; // throttled

  await prisma.parentDevice.update({
    where: { id: deviceId },
    data: { lastSeenAt: new Date() },
  });
}

/**
 * invalidateDeviceCache
 * Call this when a device's isActive status changes (login/logout/force-logout)
 * so the cache doesn't serve stale active=true entries
 */
export async function invalidateDeviceCache(parentId, deviceFingerprint) {
  await redis.del(`device:${parentId}:${deviceFingerprint}`);
}