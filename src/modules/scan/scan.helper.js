<<<<<<< HEAD
// TODO: Add implementation
// =============================================================================
// modules/scan/scan.helper.js — RESQID
//
// Pure helper functions for the scan module.
// All functions are stateless and side-effect free.
// =============================================================================

import { performance } from 'perf_hooks';

// =============================================================================
// maskPhone
// Masks a phone number for safe public display on the emergency scan page.
// Follows a conservative masking standard — only last 2 digits visible.
// Input can be any raw phone string format.
//
// @param {string|null} phone
// @returns {string|null}
// =============================================================================
export const maskPhone = phone => {
  if (!phone) return null;

  const cleaned = phone.replace(/\D/g, '');

  // FIX: Validate it's actually a phone number (E.164: 7–15 digits)
  if (cleaned.length < 7 || cleaned.length > 15) return null;

  // FIX: Conservative masking — only last 2 digits exposed regardless of length
  // Matches RBI/UIDAI convention for sensitive number display
  return 'X'.repeat(cleaned.length - 2) + cleaned.slice(-2);
};

// =============================================================================
// isSuspiciousUserAgent
// Basic bot/crawler detection for anomaly scoring.
// Not a hard block — feeds into evaluateAnomaly() weight.
//
// @param {string|null} ua
// @returns {boolean}
// =============================================================================
const BOT_PATTERNS = /bot|crawl|spider|slurp|curl|wget|python|java|go-http|axios|insomnia|postman/i;

export const isSuspiciousUserAgent = ua => {
  if (!ua || typeof ua !== 'string') return true; // no UA = suspicious
  return BOT_PATTERNS.test(ua);
};

// =============================================================================
// isValidScanCode
// Validates format of the QR scan code before any DB/crypto touch.
// Mirrors scanCodeSchema regex — single source of truth should be in
// scan.validation.js; use this for non-Zod contexts (middleware, helpers).
//
// @param {string} code
// @returns {boolean}
// =============================================================================
export const isValidScanCode = code => {
  if (!code || typeof code !== 'string') return false;
  return /^[A-Za-z0-9]{43}$/.test(code);
};

// =============================================================================
// calculateResponseTime
// Returns elapsed milliseconds from a performance.now() startTime.
// Always returns a non-negative integer.
//
// @param {number} startTime — from performance.now()
// @returns {number} ms
// =============================================================================
export const calculateResponseTime = startTime => {
  return Math.max(0, Math.round(performance.now() - startTime));
};

// =============================================================================
// buildScanLogPayload
// Constructs a clean, schema-aligned ScanLog record from raw scan context.
// Use this everywhere a log entry is built to avoid field drift.
//
// @param {object} params
// @returns {object} — ready for enqueueScanLog / writeScanLog
// =============================================================================
// =============================================================================
// formatScanResponse
// Strips internal cache metadata fields before sending to client.
// Call this on every cached payload before res.json().
//
// @param {object} cachedPayload
// @returns {object} — safe for wire
// =============================================================================
export const formatScanResponse = cachedPayload => {
  // eslint-disable-next-line no-unused-vars
  const { _schoolId, _parentTokens, _settings, ...safePayload } = cachedPayload;
  return safePayload;
};

export const buildScanLogPayload = ({
  tokenId,
  schoolId,
  studentId = null,
  result,
  scanPurpose = 'QR_SCAN',
  ip,
  userAgent,
  deviceHash,
  startTime,
  latitude = null,
  longitude = null,
  accuracy = null,
}) => ({
  token_id: tokenId,
  school_id: schoolId,
  student_id: studentId ?? null,
  result,
  scan_purpose: scanPurpose,
  ip_address: ip ?? null,
  user_agent: userAgent ?? null,
  device_hash: deviceHash ?? null,
  response_time_ms: calculateResponseTime(startTime),
  ip_capture_basis: 'LEGITIMATE_INTEREST',
  scanned_at: new Date().toISOString(),
  latitude: typeof latitude === 'number' && isFinite(latitude) ? latitude : null,
  longitude: typeof longitude === 'number' && isFinite(longitude) ? longitude : null,
  accuracy: typeof accuracy === 'number' && isFinite(accuracy) ? accuracy : null,
  location_derived: !!(latitude && longitude),
});
=======
// =============================================================================
// modules/scan/scan.helper.js — RESQID
// Pure helper functions — stateless, side-effect free.
// =============================================================================

/**
 * Mask phone number for public display.
 * Only last 2 digits visible — RBI/UIDAI convention.
 */
export const maskPhone = (phone) => {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 7 || cleaned.length > 15) return null;
  return 'X'.repeat(cleaned.length - 2) + cleaned.slice(-2);
};

/**
 * Bot/crawler detection for anomaly scoring.
 */
const BOT_PATTERNS = /bot|crawl|spider|slurp|curl|wget|python|java|go-http|axios|insomnia|postman/i;

export const isSuspiciousUserAgent = (ua) => {
  if (!ua || typeof ua !== 'string') return true;
  return BOT_PATTERNS.test(ua);
};

/**
 * Build a clean ScanLog payload.
 */
export const buildScanLogPayload = ({
  tokenId,
  schoolId,
  result,
  ip,
  userAgent,
  latitude = null,
  longitude = null,
}) => ({
  tokenId,
  schoolId,
  result,
  scannedAt: new Date(),
  ipAddress: ip || null,
  device: userAgent?.slice(0, 200) || null,
  latitude: typeof latitude === 'number' && isFinite(latitude) ? latitude : null,
  longitude: typeof longitude === 'number' && isFinite(longitude) ? longitude : null,
});

/**
 * Blood group display mapping.
 */
const BLOOD_GROUP_MAP = {
  A_POS: 'A+',
  A_NEG: 'A-',
  B_POS: 'B+',
  B_NEG: 'B-',
  AB_POS: 'AB+',
  AB_NEG: 'AB-',
  O_POS: 'O+',
  O_NEG: 'O-',
};

export const formatBloodGroup = (bg) => BLOOD_GROUP_MAP[bg] || bg || null;

/**
 * Strip internal cache fields before sending to client.
 */
export const formatScanResponse = (cached) => {
  const { _schoolId, _parentTokens, _studentId, ...safe } = cached;
  return safe;
};
>>>>>>> d6d1c2d1f9491eb08dd3635a1ab69697f9d14590
