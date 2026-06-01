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
 * Mask token hash for public display.
 * Shows first 4 and last 4 characters only.
 */
export const maskTokenHash = (token) => {
  if (!token) return null;
  const str = String(token);
  if (str.length <= 8) return '••••••••';
  return `${str.slice(0, 4)}••••${str.slice(-4)}`;
};

/**
 * Format relative time from ISO date string.
 * Returns "Just now", "5m ago", "2h ago", "3d ago", or formatted date.
 */
export const formatRelativeTime = (isoDate) => {
  if (!isoDate) return '';
  
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * Humanize enum values for display.
 * Converts "RATE_LIMITED" → "Rate Limited"
 */
export const humanizeEnum = (str) => {
  if (!str) return '';
  return str
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
};

/**
 * Bot/crawler detection for anomaly scoring.
 */
const BOT_PATTERNS = /bot|crawl|spider|slurp|curl|wget|python|java|go-http|axios|insomnia|postman|scrapy|headless/i;

export const isSuspiciousUserAgent = (ua) => {
  if (!ua || typeof ua !== 'string') return true;
  return BOT_PATTERNS.test(ua);
};

/**
 * Detect if request is from mobile device based on User-Agent.
 */
export const isMobileDevice = (userAgent) => {
  if (!userAgent) return false;
  const mobilePatterns = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i;
  return mobilePatterns.test(userAgent);
};

/**
 * Extract device type from User-Agent.
 */
export const getDeviceType = (userAgent) => {
  if (!userAgent) return 'Unknown';
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(userAgent)) return 'Tablet';
  if (/Mobile|iPhone|Android.*Mobile/i.test(userAgent)) return 'Mobile';
  return 'Desktop';
};

/**
 * Extract browser name from User-Agent.
 */
export const getBrowserName = (userAgent) => {
  if (!userAgent) return 'Unknown';
  if (/Edg\//i.test(userAgent)) return 'Edge';
  if (/OPR\//i.test(userAgent)) return 'Opera';
  if (/Chrome\//i.test(userAgent)) return 'Chrome';
  if (/Firefox\//i.test(userAgent)) return 'Firefox';
  if (/Safari\//i.test(userAgent)) return 'Safari';
  if (/MSIE|Trident/i.test(userAgent)) return 'Internet Explorer';
  return 'Unknown';
};

/**
 * Extract OS name from User-Agent.
 */
export const getOsName = (userAgent) => {
  if (!userAgent) return 'Unknown';
  if (/Windows NT 10/i.test(userAgent)) return 'Windows 10';
  if (/Windows NT 6\.3/i.test(userAgent)) return 'Windows 8.1';
  if (/Windows NT 6\.2/i.test(userAgent)) return 'Windows 8';
  if (/Windows NT 6\.1/i.test(userAgent)) return 'Windows 7';
  if (/Windows/i.test(userAgent)) return 'Windows';
  if (/Android/i.test(userAgent)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
  if (/Mac OS X/i.test(userAgent)) return 'macOS';
  if (/Linux/i.test(userAgent)) return 'Linux';
  return 'Unknown';
};

/**
 * Build a clean ScanLog payload.
 */
export const buildScanLogPayload = ({
  tokenId,
  schoolId,
  studentId,
  result,
  ip,
  userAgent,
  latitude = null,
  longitude = null,
  city = null,
  scanPurpose = 'UNKNOWN',
  responseTimeMs = null,
}) => ({
  tokenId,
  schoolId,
  studentId,
  result,
  scannedAt: new Date(),
  ipAddress: ip || null,
  device: userAgent?.slice(0, 200) || null,
  latitude: typeof latitude === 'number' && isFinite(latitude) ? latitude : null,
  longitude: typeof longitude === 'number' && isFinite(longitude) ? longitude : null,
  city: city || null,
  scanPurpose,
  responseTimeMs,
  userAgent: userAgent?.slice(0, 500) || null,
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
  if (!cached) return null;
  const { _schoolId, _parentTokens, _studentId, ...safe } = cached;
  return safe;
};

/**
 * Calculate risk score for a scan based on various factors.
 * Returns score from 0 (safe) to 100 (high risk).
 */
export const calculateRiskScore = ({
  isSuspiciousUA,
  isNewDevice,
  unusualLocation,
  unusualTime,
  rapidScanCount,
}) => {
  let score = 0;
  
  if (isSuspiciousUA) score += 30;
  if (isNewDevice) score += 20;
  if (unusualLocation) score += 25;
  if (unusualTime) score += 15;
  if (rapidScanCount > 5) score += Math.min(30, (rapidScanCount - 5) * 3);
  
  return Math.min(100, score);
};

/**
 * Check if scan time is unusual (outside 6 AM - 10 PM).
 */
export const isUnusualScanTime = (timestamp = new Date()) => {
  const hour = timestamp.getHours();
  return hour < 6 || hour > 22;
};

/**
 * Generate a unique scan ID.
 */
export const generateScanId = () => {
  return `SCN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
};

/**
 * Validate scan result.
 */
export const isValidScanResult = (result) => {
  const validResults = ['SUCCESS', 'INVALID', 'REVOKED', 'EXPIRED', 'RATE_LIMITED', 'ERROR'];
  return validResults.includes(result);
};

/**
 * Get result style for frontend display.
 */
export const getResultStyle = (result) => {
  const styles = {
    SUCCESS: { bg: '#ECFDF5', color: '#047857', label: 'Success', icon: 'check' },
    INVALID: { bg: '#FEF2F2', color: '#B91C1C', label: 'Invalid', icon: 'x' },
    REVOKED: { bg: '#FEF2F2', color: '#B91C1C', label: 'Revoked', icon: 'x' },
    EXPIRED: { bg: '#FFFBEB', color: '#B45309', label: 'Expired', icon: 'clock' },
    RATE_LIMITED: { bg: '#FEF3C7', color: '#92400E', label: 'Rate Limited', icon: 'clock' },
    ERROR: { bg: '#FEF2F2', color: '#B91C1C', label: 'Error', icon: 'alert' },
  };
  return styles[result] || styles.ERROR;
};

/**
 * Truncate string to max length.
 */
export const truncate = (str, maxLength = 100, suffix = '...') => {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
};

/**
 * Parse User-Agent into structured object.
 */
export const parseUserAgent = (userAgent) => {
  if (!userAgent) {
    return {
      raw: null,
      browser: 'Unknown',
      os: 'Unknown',
      device: 'Unknown',
      isBot: false,
    };
  }
  
  const isBot = BOT_PATTERNS.test(userAgent);
  
  return {
    raw: userAgent,
    browser: getBrowserName(userAgent),
    os: getOsName(userAgent),
    device: getDeviceType(userAgent),
    isBot,
    isMobile: isMobileDevice(userAgent),
  };
};

/**
 * Format scan log for API response.
 */
export const formatScanLogForResponse = (scan) => {
  return {
    id: scan.id,
    token_hash: scan.token?.qrCode || scan.token?.rfidUid || 'Unknown',
    result: scan.result,
    student_name: scan.student ? `${scan.student.firstName} ${scan.student.lastName}` : null,
    student_id: scan.student?.id || null,
    ip_address: scan.deviceIp,
    ip_city: scan.metadata?.city || null,
    device: scan.metadata?.device || 'Unknown',
    scan_purpose: scan.metadata?.scanPurpose || 'UNKNOWN',
    response_time_ms: scan.metadata?.responseTimeMs || null,
    created_at: scan.createdAt,
  };
};

/**
 * Format stats for frontend dashboard.
 */
export const formatStatsResponse = (stats) => {
  return {
    total: stats.total || 0,
    success: stats.success || 0,
    failed: stats.failed || 0,
    avgResponse: stats.avgResponse || '0ms',
    successRate: stats.total ? Math.round((stats.success / stats.total) * 100) : 0,
  };
};