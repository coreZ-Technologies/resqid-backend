// =============================================================================
// modules/scan/scan.service.js — RESQID
// Core business logic for QR scan resolution.
// =============================================================================

import { decodeScanCode } from '#shared/helpers/token.helper.js';
import { logger } from '#config/logger.js';
import * as repo from './scan.repository.js';
import { getCachedEmergencyProfile, cacheEmergencyProfile } from '#shared/cache/scan.cache.js';
import { evaluateScan } from '#shared/anomaly/anomaly.evaluator.js';
import { publishNotification } from '#orchestrator/notifications/notification.publisher.js';
import { EVENTS } from '#orchestrator/events/event.types.js';
import {
  maskPhone,
  isSuspiciousUserAgent,
  buildScanLogPayload,
  formatScanResponse,
  formatBloodGroup,
} from './scan.helper.js';

// ─── Cache TTLs ───────────────────────────────────────────────────────────────

const ACTIVE_CACHE_TTL = 300; // 5 minutes
const DEAD_CACHE_TTL = 3600; // 1 hour
const SENTINEL_ID = '00000000-0000-0000-0000-000000000000';

// =============================================================================
// MAIN SCAN RESOLVER
// =============================================================================

/**
 * Resolve a QR scan — decode, validate, build profile, notify.
 */
export const resolveScan = async ({
  code,
  ip,
  userAgent,
  deviceHash,
  scanCount = 1,
  latitude = null,
  longitude = null,
}) => {
  // ── 1. Decode + AES-SIV verify ──────────────────────────────────────────
  let tokenId;
  try {
    tokenId = decodeScanCode(code);
  } catch {
    logScan({
      tokenId: SENTINEL_ID,
      schoolId: SENTINEL_ID,
      result: 'INVALID',
      ip,
      userAgent,
      latitude,
      longitude,
    });
    return buildResponse('INVALID', 'This QR code could not be verified.');
  }

  // ── 2. Redis cache check ─────────────────────────────────────────────────
  const cached = await getCachedEmergencyProfile(tokenId);
  if (cached) {
    logScan({
      tokenId,
      schoolId: cached._schoolId || SENTINEL_ID,
      result: cached.state === 'ACTIVE' ? 'ACTIVE' : cached.state,
      ip,
      userAgent,
      latitude,
      longitude,
    });

    if (cached.state === 'ACTIVE') {
      fireNotification(cached);
      fireAnomalyCheck({
        tokenId,
        schoolId: cached._schoolId,
        studentId: cached._studentId,
        ip,
        scanCount,
      });
    }

    return formatScanResponse(cached);
  }

  // ── 3. DB query ──────────────────────────────────────────────────────────
  const token = await repo.findTokenForScan(tokenId);

  if (!token) {
    logScan({
      tokenId: SENTINEL_ID,
      schoolId: SENTINEL_ID,
      result: 'INVALID',
      ip,
      userAgent,
      latitude,
      longitude,
    });
    return buildResponse('INVALID', 'This QR code could not be verified.');
  }

  const schoolId = token.schoolId;
  const student = token.student;

  // Extract parent Expo tokens
  const parentTokens = (student?.parentLinks || [])
    .flatMap((l) => l.parent?.devices?.map((d) => d.expoPushToken) || [])
    .filter(Boolean);

  // Extract parent phones for SMS
  const parentPhones = (student?.parentLinks || []).map((l) => l.parent?.phone).filter(Boolean);

  // Extract parent emails
  const parentEmails = (student?.parentLinks || []).map((l) => l.parent?.email).filter(Boolean);

  // ── 4. Token state checks ────────────────────────────────────────────────
  const stateResult = validateTokenState(token);
  if (stateResult) {
    logScan({ tokenId, schoolId, result: stateResult.state, ip, userAgent, latitude, longitude });
    const payload = { ...stateResult, _schoolId: schoolId };
    cacheEmergencyProfile(tokenId, payload, DEAD_CACHE_TTL);
    return payload;
  }

  // ── 5. Student check ─────────────────────────────────────────────────────
  if (!student || !student.isActive) {
    const payload = {
      state: 'INACTIVE',
      school: safeSchool(token.school),
      message: 'This card is currently inactive.',
      _schoolId: schoolId,
    };
    logScan({ tokenId, schoolId, result: 'INACTIVE', ip, userAgent, latitude, longitude });
    cacheEmergencyProfile(tokenId, payload, DEAD_CACHE_TTL);
    return payload;
  }

  // ── 6. Build ACTIVE profile ──────────────────────────────────────────────
  // 🔧 Use emergency module's getProfileForScan instead of embedded query
  const emergency = student.emergencyProfile;
  const visibility = student.cardVisibility?.visibility || 'PUBLIC';

  const profile = buildProfile(student, emergency, visibility);

  const payload = {
    state: 'ACTIVE',
    profile,
    school: safeSchool(token.school),
    visibility,
    _schoolId: schoolId,
    _studentId: student.id,
    _parentTokens: parentTokens,
    _parentPhones: parentPhones,
    _parentEmails: parentEmails,
  };

  logScan({
    tokenId,
    schoolId,
    studentId: student.id,
    result: 'ACTIVE',
    ip,
    userAgent,
    latitude,
    longitude,
  });
  cacheEmergencyProfile(tokenId, payload, ACTIVE_CACHE_TTL);

  // 🔧 Fire-and-forget: notifications + anomaly check
  fireNotification(payload);
  fireAnomalyCheck({ tokenId, schoolId, studentId: student.id, ip, scanCount });

  return formatScanResponse(payload);
};

// =============================================================================
// TOKEN STATE VALIDATION
// =============================================================================

const validateTokenState = (token) => {
  if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
    return {
      state: 'EXPIRED',
      school: safeSchool(token.school),
      message: 'This card has expired.',
    };
  }
  if (token.status === 'REVOKED') {
    return {
      state: 'REVOKED',
      school: safeSchool(token.school),
      message: 'This card has been revoked.',
    };
  }
  if (token.status === 'INACTIVE' || token.status === 'LOST') {
    return {
      state: 'INACTIVE',
      school: safeSchool(token.school),
      message: 'This card is currently inactive.',
    };
  }
  if (token.status === 'UNREGISTERED') {
    return {
      state: 'UNREGISTERED',
      school: safeSchool(token.school),
      message: 'This card has not been registered yet.',
    };
  }
  if (token.status === 'ISSUED') {
    return {
      state: 'ISSUED',
      school: safeSchool(token.school),
      message: 'This card has been issued but not yet activated.',
    };
  }
  return null; // ACTIVE
};

// =============================================================================
// PROFILE BUILDER
// =============================================================================

const buildProfile = (student, emergency, visibility) => {
  const base = {
    id: student.id,
    name: [student.firstName, student.lastName].filter(Boolean).join(' ') || null,
    photoUrl: student.photoUrl || null,
    grade: student.grade || null,
    section: student.section || null,
    gender: student.gender || null,
    visibility,
  };

  if (visibility === 'HIDDEN') {
    return { ...base, message: 'Emergency information is hidden by parent.' };
  }

  if (visibility === 'MINIMAL') {
    const primary = (emergency?.contacts || []).sort((a, b) => a.priority - b.priority)[0];
    return {
      ...base,
      bloodGroup: formatBloodGroup(emergency?.bloodGroup),
      primaryContact: primary
        ? { name: primary.name, relation: primary.relation, phone: maskPhone(primary.phone) }
        : null,
    };
  }

  // PUBLIC
  return {
    ...base,
    bloodGroup: formatBloodGroup(emergency?.bloodGroup),
    allergies: emergency?.allergies || [],
    conditions: emergency?.conditions || [],
    medications: emergency?.medications || [],
    doctor: emergency?.doctorName
      ? { name: emergency.doctorName, phone: maskPhone(emergency.doctorPhone) }
      : null,
    notes: emergency?.notes || null,
    contacts: (emergency?.contacts || []).map((c) => ({
      id: c.id,
      name: c.name,
      relation: c.relation,
      phone: maskPhone(c.phone),
      priority: c.priority,
      callEnabled: c.callEnabled,
      whatsappEnabled: c.whatsappEnabled,
    })),
  };
};

const safeSchool = (school) => {
  if (!school) return null;
  return {
    id: school.id,
    name: school.name,
    logoUrl: school.logoUrl,
    phone: school.phone,
    address: [school.street, school.city, school.state].filter(Boolean).join(', ') || null,
  };
};

const buildResponse = (state, message) => ({ state, message });

// =============================================================================
// FIRE-AND-FORGET
// =============================================================================

/**
 * Queue scan log for bulk write by scan worker.
 */
const logScan = (entry) => {
  const payload = buildScanLogPayload(entry);
  // Import dynamically to avoid circular dependency
  import('#shared/cache/scan.cache.js')
    .then(({ enqueueScanLog }) => {
      enqueueScanLog?.(payload)?.catch((err) =>
        logger.error({ err: err.message }, '[scan] Log enqueue failed')
      );
    })
    .catch(() => {});
};

/**
 * 🔧 Publish emergency notification via the notification publisher.
 */
const fireNotification = (payload) => {
  if (!payload._parentTokens?.length && !payload._parentPhones?.length) return;

  // Use notification publisher for emergency alert
  publishNotification
    .emergencyAlertTriggered({
      schoolId: payload._schoolId,
      actorId: payload._studentId || 'anonymous',
      payload: {
        studentId: payload._studentId,
        studentName: payload.profile?.name,
        parentExpoTokens: payload._parentTokens || [],
        parentPhones: payload._parentPhones || [],
        parentEmails: payload._parentEmails || [],
        schoolName: payload.school?.name,
        scannedAt: new Date().toISOString(),
      },
      meta: { studentId: payload._studentId, source: 'QR_SCAN' },
    })
    .catch((err) => logger.error({ err: err.message }, '[scan] Notification publish failed'));
};

/**
 * Run anomaly detection (fire-and-forget).
 */
const fireAnomalyCheck = (data) => {
  evaluateScan({
    type: 'QR',
    studentId: data.studentId || data.tokenId,
    schoolId: data.schoolId,
    timestamp: new Date(),
    scannerIp: data.ip,
    scanId: data.tokenId,
  }).catch((err) => logger.error({ err: err.message }, '[scan] Anomaly check failed'));
};
