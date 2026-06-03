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
