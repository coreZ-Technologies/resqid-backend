// =============================================================================
// deviceFingerprint.js — RESQID
//
// Stateless device fingerprinting for session binding and anomaly detection.
// Used by deviceFingerprint.middleware.js and authenticate.middleware.js
//
// Intentionally EXCLUDES req.ip — mobile users switch networks constantly.
// Uses stable browser/OS headers that persist across network changes.
// =============================================================================

import crypto from 'crypto';
import { middlewareRedis } from '#config/redis.js';
import { ENV } from '#config/env.js';

// ─── Fingerprint Components ──────────────────────────────────────────────────

const FINGERPRINT_COMPONENTS = [
  'user-agent', // browser + version + OS
  'accept-language', // locale settings
  'accept-encoding', // compression support
  'sec-ch-ua-platform', // "Windows" / "Android" / "iOS"
  'sec-ch-ua', // browser brand + version hints
  'sec-ch-ua-mobile', // ?1 for mobile
  'viewport-width', // screen width (from client header)
];

// ─── Generate ─────────────────────────────────────────────────────────────────

/**
 * Generate a device fingerprint hash.
 *
 * Salt ties the fingerprint to a specific user/session —
 * two users on identical devices get different hashes.
 *
 * @param {Request} req - Express request
 * @param {string} salt - userId or sessionId (required)
 * @returns {{ fingerprint: string, coverage: number, components: object }}
 */
export const generateDeviceFingerprint = (req, salt) => {
  if (!salt) throw new Error('deviceFingerprint: salt is required');

  const componentValues = {};
  const values = FINGERPRINT_COMPONENTS.map((header) => {
    const value = (req.headers[header] || '').trim();
    componentValues[header] = value;
    return value;
  });

  // Track how many components actually had values
  const presentCount = values.filter(Boolean).length;
  const coverage = presentCount / FINGERPRINT_COMPONENTS.length;

  // Salt prefixed — binds fingerprint to this user/session
  const payload = `${salt}|${values.join('|')}`;
  const fingerprint = crypto.createHash('sha256').update(payload, 'utf8').digest('hex');

  return { fingerprint, coverage, components: componentValues };
};

// ─── Validate ─────────────────────────────────────────────────────────────────

/**
 * Compare stored fingerprint with current fingerprint.
 * Uses timingSafeEqual to prevent timing attacks.
 *
 * @param {string} storedFingerprint  — from session/DB/Redis
 * @param {string} currentFingerprint — freshly generated from req
 * @param {object} options
 * @param {Function} options.onLegacy   — called when no stored fingerprint exists
 * @param {Function} options.onMismatch — called on mismatch (for logging)
 * @returns {boolean}
 */
export const validateDeviceFingerprint = (storedFingerprint, currentFingerprint, options = {}) => {
  const { onLegacy = () => {}, onMismatch = () => {} } = options;

  // Legacy session — no fingerprint stored yet
  if (!storedFingerprint) {
    onLegacy();
    return true; // allow but caller should re-fingerprint and store
  }

  // Both must be valid hex strings (sha256 = 64 chars)
  if (
    typeof storedFingerprint !== 'string' ||
    storedFingerprint.length !== 64 ||
    typeof currentFingerprint !== 'string' ||
    currentFingerprint.length !== 64
  ) {
    onMismatch({ reason: 'invalid_format' });
    return false;
  }

  // Use timing-safe comparison
  try {
    const stored = Buffer.from(storedFingerprint, 'hex');
    const current = Buffer.from(currentFingerprint, 'hex');

    if (stored.length !== current.length) {
      onMismatch({ reason: 'length_mismatch' });
      return false;
    }

    const match = crypto.timingSafeEqual(stored, current);
    if (!match) onMismatch({ reason: 'fingerprint_mismatch' });
    return match;
  } catch {
    onMismatch({ reason: 'comparison_error' });
    return false;
  }
};

// ─── Trust Scoring (Redis-backed) ────────────────────────────────────────────

/**
 * Get device trust level.
 * Trusted = seen for > 30 days, Known = seen before, Unknown = first time.
 *
 * @param {string} deviceId - Device fingerprint hash
 * @returns {Promise<'TRUSTED'|'KNOWN'|'UNKNOWN'|'BLOCKED'>}
 */
export const getDeviceTrustLevel = async (deviceId) => {
  try {
    const key = `device:trust:${deviceId}`;
    const data = await middlewareRedis.get(key);

    if (!data) return 'UNKNOWN';

    const trust = JSON.parse(data);

    // Check if blocked
    if (trust.blocked) return 'BLOCKED';

    // Check if trusted (seen for > threshold days)
    const firstSeen = new Date(trust.firstSeen).getTime();
    const daysSinceFirstSeen = (Date.now() - firstSeen) / (1000 * 60 * 60 * 24);
    const thresholdDays = ENV.DEVICE_TRUST_THRESHOLD_DAYS || 30;

    if (daysSinceFirstSeen > thresholdDays) return 'TRUSTED';

    return 'KNOWN';
  } catch {
    return 'UNKNOWN';
  }
};

/**
 * Record a device seen event (updates trust data in Redis).
 *
 * @param {string} deviceId - Device fingerprint hash
 * @param {string} userId - Associated user
 */
export const recordDeviceSeen = async (deviceId, userId) => {
  try {
    const key = `device:trust:${deviceId}`;
    const existing = await middlewareRedis.get(key);

    const data = existing
      ? JSON.parse(existing)
      : {
          firstSeen: new Date().toISOString(),
          userId,
          blocked: false,
          seenCount: 0,
        };

    data.lastSeen = new Date().toISOString();
    data.seenCount = (data.seenCount || 0) + 1;

    await middlewareRedis.set(key, JSON.stringify(data), 'EX', 90 * 24 * 60 * 60); // 90 days
  } catch {
    // Non-critical
  }
};

/**
 * Block a device.
 *
 * @param {string} deviceId - Device fingerprint hash
 * @param {string} reason - Block reason
 */
export const blockDevice = async (deviceId, reason = 'Security block') => {
  try {
    const key = `device:trust:${deviceId}`;
    const existing = await middlewareRedis.get(key);
    const data = existing ? JSON.parse(existing) : { firstSeen: new Date().toISOString() };

    data.blocked = true;
    data.blockReason = reason;
    data.blockedAt = new Date().toISOString();

    await middlewareRedis.set(key, JSON.stringify(data), 'EX', 90 * 24 * 60 * 60);
  } catch {
    // Non-critical
  }
};

/**
 * Get device history for a user.
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export const getUserDevices = async (userId) => {
  try {
    const key = `device:history:${userId}`;
    const data = await middlewareRedis.get(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};
