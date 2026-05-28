// =============================================================================
// IdGenerator.service.js — RESQID
//
// Generates human-readable, unique, sortable IDs for all entities.
//
// Pattern: {PREFIX}-{TIMESTAMP}-{RANDOM}
//   PREFIX    = 3-char entity code
//   TIMESTAMP = Base36 encoded millisecond timestamp (6-7 chars)
//   RANDOM    = 5-6 char nanoid (collision-safe)
//
// Examples:
//   SCH-KX9M2N-A3X9KQ    — School
//   ADM-KX9M2N-F2NX8R    — Admin
//   TCH-KX9M2N-B7M2PQ    — Teacher
//   STU-KX9M2N-K9QW3Z    — Student
//   PAR-KX9M2N-M5V8NH    — Parent
//   DEV-KX9M2N-W4P7RJ    — Device
//   TKN-KX9M2N-X2C6FL    — Token/Card
//   ORD-KX9M2N-Y8D3TG    — Order
// =============================================================================

import { customAlphabet } from 'nanoid';

// Remove ambiguous characters: 0/O, 1/I/L
const SAFE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const nanoId5 = customAlphabet(SAFE_ALPHABET, 5);
const nanoId6 = customAlphabet(SAFE_ALPHABET, 6);

// Base36 timestamp
const ts = () => Date.now().toString(36).toUpperCase();

// ─── Entity Prefixes ─────────────────────────────────────────────────────────

const PREFIX = {
  SCHOOL: 'SCH',
  ADMIN: 'ADM',
  TEACHER: 'TCH',
  STUDENT: 'STU',
  PARENT: 'PAR',
  DEVICE: 'DEV',
  TOKEN: 'TKN',
  ORDER: 'ORD',
  SESSION: 'SES',
  ATTENDANCE: 'ATT',
  ANOMALY: 'ANM',
  SCAN: 'SCN',
  SUBSCRIPTION: 'SUB',
};

// ─── ID Generators ───────────────────────────────────────────────────────────

export const generateSchoolId = () => `${PREFIX.SCHOOL}-${ts()}-${nanoId5()}`;
export const generateAdminId = () => `${PREFIX.ADMIN}-${ts()}-${nanoId5()}`;
export const generateTeacherId = () => `${PREFIX.TEACHER}-${ts()}-${nanoId5()}`;
export const generateStudentId = () => `${PREFIX.STUDENT}-${ts()}-${nanoId5()}`;
export const generateParentId = () => `${PREFIX.PARENT}-${ts()}-${nanoId5()}`;
export const generateDeviceId = () => `${PREFIX.DEVICE}-${ts()}-${nanoId5()}`;
export const generateTokenId = () => `${PREFIX.TOKEN}-${ts()}-${nanoId6()}`;
export const generateOrderId = () => `${PREFIX.ORDER}-${ts()}-${nanoId5()}`;
export const generateSessionId = () => `${PREFIX.SESSION}-${ts()}-${nanoId6()}`;
export const generateAttendanceId = () => `${PREFIX.ATTENDANCE}-${ts()}-${nanoId6()}`;
export const generateAnomalyId = () => `${PREFIX.ANOMALY}-${ts()}-${nanoId5()}`;
export const generateScanId = () => `${PREFIX.SCAN}-${ts()}-${nanoId6()}`;
export const generateSubscriptionId = () => `${PREFIX.SUBSCRIPTION}-${ts()}-${nanoId5()}`;

export const generateId = (prefix) => `${prefix.toUpperCase()}-${ts()}-${nanoId6()}`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const getEntityType = (id) => id?.split('-')[0] || null;
export const getTimestampFromId = (id) => {
  const parts = id?.split('-');
  return parts?.[1] ? parseInt(parts[1], 36) : null;
};
export const isValidId = (id, expectedPrefix = null) => {
  if (!id || typeof id !== 'string') return false;
  const parts = id.split('-');
  if (parts.length !== 3) return false;
  if (expectedPrefix && parts[0] !== expectedPrefix) return false;
  return true;
};
