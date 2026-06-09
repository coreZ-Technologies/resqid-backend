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

// ─── Blood Group Display Mapping (matches Prisma BloodGroup enum) ─────────────

const BLOOD_GROUP_MAP = {
  A_POSITIVE: 'A+',
  A_NEGATIVE: 'A-',
  B_POSITIVE: 'B+',
  B_NEGATIVE: 'B-',
  AB_POSITIVE: 'AB+',
  AB_NEGATIVE: 'AB-',
  O_POSITIVE: 'O+',
  O_NEGATIVE: 'O-',
  UNKNOWN: 'Unknown',
};

/**
 * Format blood group for display.
 * Converts Prisma enum → display label.
 *   A_POSITIVE → A+
 *   UNKNOWN   → Unknown
 */
export const formatBloodGroup = (bg) => BLOOD_GROUP_MAP[bg] || bg || null;

/**
 * Apply visibility filters to emergency profile.
 * Used by scan service to filter what responder sees.
 */
export const applyVisibilityFilters = (profile) => {
  if (!profile) return null;

  return {
    student: profile.student
      ? {
          id: profile.student.id,
          firstName: profile.student.firstName,
          lastName: profile.student.lastName,
          grade: profile.student.grade,
          section: profile.student.section,
          photoUrl: profile.student.photoUrl,
        }
      : null,

    // Only show if visibility flag allows
    bloodGroup: profile.showBloodGroup ? formatBloodGroup(profile.bloodGroup) : null,
    allergies: profile.showAllergies ? profile.allergies : [],
    medications: profile.showMedications ? profile.medications : [],
    conditions: profile.showConditions ? profile.conditions : [],
    medicalNotes: profile.showConditions ? profile.medicalNotes : null,
    emergencyInstructions: profile.showInstructions ? profile.emergencyInstructions : null,
    specialNeeds: profile.showSpecialNeeds ? profile.specialNeeds : null,

    // Doctor info
    doctorName: profile.showDoctorInfo ? profile.doctorName : null,
    doctorPhone: profile.showDoctorInfo ? maskPhone(profile.doctorPhone) : null,

    // Hospital info
    hospitalName: profile.showDoctorInfo ? profile.hospitalName : null,
    hospitalPhone: profile.showDoctorInfo ? maskPhone(profile.hospitalPhone) : null,

    // Contacts
    contacts: profile.showContacts
      ? (profile.contacts || []).map((c) => ({
          name: c.name,
          phone: maskPhone(c.phone),
          relation: c.relation,
          priority: c.priority,
          isPrimary: c.isPrimary,
        }))
      : [],

    // Insurance (usually hidden)
    insuranceProvider: profile.showInsurance ? profile.insuranceProvider : null,
    insurancePolicyNumber: profile.showInsurance ? profile.insurancePolicyNumber : null,
  };
};

/**
 * Strip internal cache fields before sending to client.
 */
export const formatScanResponse = (data) => {
  const { _schoolId, _parentTokens, _studentId, ...safe } = data;
  return safe;
};

/**
 * Get severity label for display.
 */
export const getSeverityLabel = (severity) => {
  const labels = {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    CRITICAL: 'Critical',
  };
  return labels[severity] || severity;
};

/**
 * Get incident type label for display.
 */
export const getIncidentTypeLabel = (type) => {
  const labels = {
    INJURY: 'Injury',
    ILLNESS: 'Illness',
    ALLERGIC_REACTION: 'Allergic Reaction',
    ASTHMA_ATTACK: 'Asthma Attack',
    ACCIDENT: 'Accident',
    SEIZURE: 'Seizure',
    FAINTING: 'Fainting',
    BLEEDING: 'Bleeding',
    FRACTURE: 'Fracture',
    BURN: 'Burn',
    POISONING: 'Poisoning',
    HEAD_INJURY: 'Head Injury',
    BREATHING_DIFFICULTY: 'Breathing Difficulty',
    DIABETIC_EMERGENCY: 'Diabetic Emergency',
    OTHER: 'Other',
  };
  return labels[type] || type;
};
