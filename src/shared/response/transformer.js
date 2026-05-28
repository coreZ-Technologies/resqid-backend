// =============================================================================
// transformer.js — RESQID Data Transformers
//
// Utilities for transforming DB records before sending to client.
// Removes sensitive fields, normalizes data, and shapes API responses.
// =============================================================================

/**
 * Pick only specific keys from an object
 */
export const pick = (obj, keys) => {
  return keys.reduce((acc, key) => {
    if (obj[key] !== undefined) acc[key] = obj[key];
    return acc;
  }, {});
};

/**
 * Omit specific keys from an object
 */
export const omit = (obj, keys) => {
  const keySet = new Set(keys); // Faster lookup for large key lists
  return Object.fromEntries(Object.entries(obj).filter(([key]) => !keySet.has(key)));
};

// ─── Common Fields to Strip ──────────────────────────────────────────────────
// Standard fields that should never be sent to clients

const COMMON_SENSITIVE_FIELDS = ['password', 'otp', 'otpExpiresAt', 'refreshToken'];
const COMMON_META_FIELDS = ['createdAt', 'updatedAt', 'deletedAt'];
const STRIP_FIELDS = [...COMMON_SENSITIVE_FIELDS, ...COMMON_META_FIELDS];

// ─── RESQID Transformers ─────────────────────────────────────────────────────

export const transformSchool = (school) => {
  return omit(school, COMMON_META_FIELDS);
};

export const transformStudent = (student) => {
  return omit(student, COMMON_META_FIELDS);
};

export const transformParent = (parent) => {
  return omit(parent, [...COMMON_SENSITIVE_FIELDS, ...COMMON_META_FIELDS]);
};

export const transformSubscription = (subscription) => {
  return omit(subscription, COMMON_META_FIELDS);
};

export const transformAttendance = (record) => ({
  ...omit(record, ['updatedAt']),
  ...(record.amountPaise !== undefined && {
    amountRupees: record.amountPaise / 100,
  }),
});

/**
 * Transform a list — apply any transformer to an array
 */
export const transformList = (list, transformerFn) => {
  return list.map(transformerFn);
};

// ─── Additional Transformers (for middleware/auth responses) ─────────────────

/**
 * Transform user for auth responses (removes all sensitive data)
 */
export const transformUser = (user) => {
  return omit(user, STRIP_FIELDS);
};

/**
 * Transform emergency profile (public view - hides internal fields)
 */
export const transformEmergencyProfile = (profile) => {
  return omit(profile, ['internalNotes', 'createdAt', 'updatedAt']);
};

/**
 * Transform scan log (for audit display)
 */
export const transformScanLog = (log) => {
  return omit(log, ['rawHeaders', 'createdAt', 'updatedAt']);
};
