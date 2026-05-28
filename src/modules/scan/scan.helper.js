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
