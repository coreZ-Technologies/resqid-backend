// src/utils/security/deviceFingerprint.js

import crypto from 'crypto';

/**
 * Components used for fingerprinting — ordered, stable list.
 *
 * Intentionally EXCLUDES req.ip:
 *   - Mobile users switch between WiFi and cellular constantly
 *   - VPNs, proxies, CGNAT all change IP mid-session
 *   - IP change = false positive = legitimate user logged out
 *
 * These headers are stable across IP changes but
 * differ meaningfully across devices and browsers.
 */
const FINGERPRINT_COMPONENTS = [
  'user-agent', // browser + version + OS
  'accept-language', // locale settings
  'accept-encoding', // compression support
  'sec-ch-ua-platform', // "Windows" / "Android" / "iOS"
  'sec-ch-ua', // browser brand + version hints
];

/**
 * generateDeviceFingerprint(req, salt)
 *
 * Salt ties the fingerprint to a specific user/session —
 * two users on identical devices get different hashes.
 * Use userId or sessionId as salt.
 *
 * @param {Request} req
 * @param {string}  salt  — userId or sessionId (required)
 * @returns {{ fingerprint: string, coverage: number }}
 *   coverage: 0–1, how many components were present (lower = weaker)
 */
export const generateDeviceFingerprint = (req, salt) => {
  if (!salt) throw new Error('deviceFingerprint: salt is required');

  const values = FINGERPRINT_COMPONENTS.map(
    (header) => req.headers[header] || '' // empty string, not dropped — preserves position
  );

  // Track how many components actually had values
  const presentCount = values.filter(Boolean).length;
  const coverage = presentCount / FINGERPRINT_COMPONENTS.length;

  // Salt prefixed — binds fingerprint to this user/session
  const payload = `${salt}|${values.join('|')}`;
  const fingerprint = crypto.createHash('sha256').update(payload, 'utf8').digest('hex');

  return { fingerprint, coverage };
};

/**
 * validateDeviceFingerprint(storedFingerprint, currentFingerprint, options)
 *
 * @param {string} storedFingerprint   — from session/DB
 * @param {string} currentFingerprint  — freshly generated from req
 * @param {object} options
 * @param {Function} options.onLegacy  — called when no stored fingerprint exists
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

  const stored = Buffer.from(storedFingerprint, 'hex');
  const current = Buffer.from(currentFingerprint, 'hex');

  // Lengths must match for timingSafeEqual — they will since both are sha256
  if (stored.length !== current.length) {
    onMismatch({ reason: 'length_mismatch' });
    return false;
  }

  const match = crypto.timingSafeEqual(stored, current);

  if (!match) onMismatch({ reason: 'fingerprint_mismatch' });

  return match;
};
