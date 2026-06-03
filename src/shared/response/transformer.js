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
  if (!obj) return {};
  return keys.reduce((acc, key) => {
    if (obj[key] !== undefined) acc[key] = obj[key];
    return acc;
  }, {});
};

/**
 * Omit specific keys from an object
 */
export const omit = (obj, keys) => {
  if (!obj) return {};
  const keySet = new Set(keys);
  return Object.fromEntries(Object.entries(obj).filter(([key]) => !keySet.has(key)));
};

// ─── Common Fields to Strip ──────────────────────────────────────────────────

const COMMON_SENSITIVE_FIELDS = ['password', 'passwordHash', 'otp', 'otpExpiresAt', 'refreshToken'];
const COMMON_META_FIELDS = ['createdAt', 'updatedAt', 'deletedAt'];
const STRIP_FIELDS = [...COMMON_SENSITIVE_FIELDS, ...COMMON_META_FIELDS];

// ─── RESQID Transformers ─────────────────────────────────────────────────────

export const transformSchool = (school) => omit(school, COMMON_META_FIELDS);

export const transformStudent = (student) => omit(student, COMMON_META_FIELDS);

export const transformParent = (parent) =>
  omit(parent, [...COMMON_SENSITIVE_FIELDS, ...COMMON_META_FIELDS]);

export const transformSubscription = (subscription) => omit(subscription, COMMON_META_FIELDS);

export const transformAttendance = (record) => ({
  ...omit(record, ['updatedAt']),
  ...(record.amountPaise !== undefined && {
    amountRupees: record.amountPaise / 100,
  }),
});

export const transformUser = (user) => omit(user, STRIP_FIELDS);

export const transformEmergencyProfile = (profile) =>
  omit(profile, ['internalNotes', 'createdAt', 'updatedAt']);

export const transformScanLog = (log) => omit(log, ['rawHeaders', 'createdAt', 'updatedAt']);

// ─── Timetable Transformers ──────────────────────────────────────────────────

export const transformTeacher = (teacher) => {
  if (!teacher) return null;
  return {
    ...omit(teacher, ['createdAt', 'updatedAt', 'deletedAt']),
    // Hide sensitive wellness data from general view
    wellness: teacher.wellness ? transformWellness(teacher.wellness) : null,
  };
};

export const transformWellness = (wellness) => {
  if (!wellness) return null;
  // Only show wellness data to HR-level admins
  // Frontend controls visibility based on role
  return omit(wellness, ['createdAt', 'updatedAt', 'isConfidential']);
};

export const transformTimetable = (timetable) => {
  if (!timetable) return null;
  return {
    ...omit(timetable, ['createdAt', 'updatedAt']),
    assignments: timetable.assignments?.length
      ? transformList(timetable.assignments, transformAssignment)
      : undefined,
  };
};

export const transformAssignment = (assignment) => {
  if (!assignment) return null;
  return omit(assignment, ['createdAt', 'updatedAt', 'constraintViolations']);
};

export const transformCrisisEvent = (event) => {
  if (!event) return null;
  return omit(event, ['createdAt', 'updatedAt']);
};

export const transformRoom = (room) => {
  if (!room) return null;
  return omit(room, ['createdAt', 'updatedAt']);
};

export const transformClassGroup = (classGroup) => {
  if (!classGroup) return null;
  return omit(classGroup, ['createdAt', 'updatedAt']);
};

// ─── List Transform ──────────────────────────────────────────────────────────

/**
 * Transform a list — apply any transformer to an array
 */
export const transformList = (list, transformerFn) => {
  if (!list || !Array.isArray(list)) return [];
  return list.map(transformerFn);
};

// ─── Deep Transform ──────────────────────────────────────────────────────────

/**
 * Recursively strip common fields from nested objects
 */
export const deepStrip = (obj, fields = COMMON_META_FIELDS) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((item) => deepStrip(item, fields));
  if (obj instanceof Date || Buffer.isBuffer(obj)) return obj;

  const keySet = new Set(fields);
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!keySet.has(key)) {
      result[key] = typeof value === 'object' && value !== null ? deepStrip(value, fields) : value;
    }
  }
  return result;
};
