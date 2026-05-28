<<<<<<< HEAD
// TODO: Add implementation
// =============================================================================
// modules/scan/scan.service.js — RESQID
//
// Core logic for QR scan resolution with precise GPS location support
// =============================================================================

import { performance } from 'perf_hooks';
import { decodeScanCode } from '#services/token/token.helpers.js';
import { decryptField } from '#shared/security/encryption.js';
import { getStorage } from '#infrastructure/storage/storage.index.js';
import { dispatch } from '#orchestrator/notifications/notification.dispatcher.js';
import { EVENTS } from '#orchestrator/events/event.types.js';
import { logger } from '#config/logger.js';
import * as repo from './scan.repository.js';
import { getCachedProfile, setCachedProfile, enqueueScanLog } from '#shared/cache/scan.cache.js';
import { evaluateAnomaly } from '#shared/anomaly/anomaly.evaluator.js';
=======
// =============================================================================
// modules/scan/scan.service.js — RESQID
// Core business logic for QR scan resolution.
// =============================================================================

import { decodeScanCode } from '#shared/helpers/token.helper.js';
import { logger } from '#config/logger.js';
import * as repo from './scan.repository.js';
import { getCachedEmergencyProfile, cacheEmergencyProfile } from '#shared/cache/scan.cache.js';
import { evaluateScan } from '#shared/anomaly/anomaly.evaluator.js';
import { publish } from '#orchestrator/events/event.publisher.js';
import { EVENTS } from '#orchestrator/events/event.types.js';
>>>>>>> d6d1c2d1f9491eb08dd3635a1ab69697f9d14590
import {
  maskPhone,
  isSuspiciousUserAgent,
  buildScanLogPayload,
  formatScanResponse,
<<<<<<< HEAD
  calculateResponseTime,
} from './scan.helper.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const MIN_RESPONSE_MS = 150;
const MIN_RESPONSE_BYTES = 1500;

const SENTINEL_TOKEN_ID = '00000000-0000-0000-0000-000000000000';
const SENTINEL_SCHOOL_ID = '00000000-0000-0000-0000-000000000000';

const ACTIVE_PROFILE_CACHE_TTL_S = 300;
const DEAD_STATE_CACHE_TTL_S = 3600;

// =============================================================================
// MAIN — resolveScan
// =============================================================================

=======
  formatBloodGroup,
} from './scan.helper.js';

const ACTIVE_CACHE_TTL = 300; // 5 minutes
const DEAD_CACHE_TTL = 3600; // 1 hour
const SENTINEL_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Resolve a QR scan — decode, validate, build profile, notify.
 */
>>>>>>> d6d1c2d1f9491eb08dd3635a1ab69697f9d14590
export const resolveScan = async ({
  code,
  ip,
  userAgent,
  deviceHash,
<<<<<<< HEAD
  startTime,
  scanCount = 1,
  latitude = null,
  longitude = null,
  accuracy = null,
}) => {
  // ── 1. Decode + AES-SIV verify ────────────────────────────────────────────
=======
  scanCount = 1,
  latitude = null,
  longitude = null,
}) => {
  // ── 1. Decode + AES-SIV verify ──────────────────────────────────────────
>>>>>>> d6d1c2d1f9491eb08dd3635a1ab69697f9d14590
  let tokenId;
  try {
    tokenId = decodeScanCode(code);
  } catch {
<<<<<<< HEAD
    fireLog(
      buildScanLogPayload({
        tokenId: SENTINEL_TOKEN_ID,
        schoolId: SENTINEL_SCHOOL_ID,
        result: 'INVALID',
        scanPurpose: 'QR_SCAN',
        ip,
        userAgent,
        deviceHash,
        startTime,
        latitude,
        longitude,
        accuracy,
      })
    );
    setImmediate(() =>
      evaluateAnomaly({
        tokenId: SENTINEL_TOKEN_ID,
        schoolId: SENTINEL_SCHOOL_ID,
        ip,
        scanResult: 'INVALID',
        isSuspiciousUa: isSuspiciousUserAgent(userAgent),
      })
    );
    return respond(startTime, buildError('INVALID', 'This QR code could not be verified.'));
  }

  // ── 2. Redis cache check ───────────────────────────────────────────────────
  const cached = await getCachedProfile(tokenId);
  if (cached) {
    console.log('🟢 [SCAN] Cache HIT for token:', tokenId);

    const schoolId = cached._schoolId ?? SENTINEL_SCHOOL_ID;
    const scanResult = cached.state === 'ACTIVE' ? 'SUCCESS' : cached.state;

    fireLog(
      buildScanLogPayload({
        tokenId,
        schoolId,
        result: scanResult,
        scanPurpose: 'QR_SCAN',
        ip,
        userAgent,
        deviceHash,
        startTime,
        latitude,
        longitude,
        accuracy,
      })
    );

    setImmediate(() => evaluateAnomaly({ tokenId, schoolId, ip, scanResult, scanCount }));

    const responsePayload = formatScanResponse(cached);

    if (cached.state === 'ACTIVE') {
      fireNotification({
        schoolId,
        studentName: cached.profile?.name,
        parentExpoTokens: cached._parentTokens ?? [],
        notifyEnabled: cached._settings ?? false,
        studentId: cached._studentId ?? null,
        tokenId,
      });

      // ✅ NEW: Fire emergency email for cached ACTIVE scans
      fireEmergencyEmail({
        schoolId,
        studentId: cached._studentId,
        studentName: cached.profile?.name,
        schoolName: null, // Will be fetched from DB
        scanResult: 'SUCCESS',
        ip,
        userAgent,
        deviceHash,
        latitude,
        longitude,
        accuracy,
        tokenId,
      });

      if (cached._photoKey && responsePayload.profile) {
        try {
          responsePayload.profile.photo_url = await getStorage().getUrl(cached._photoKey, 300);
        } catch (err) {
          logger.warn(
            { err: err.message, key: cached._photoKey },
            '[scan.service] Failed to generate photo URL'
          );
          responsePayload.profile.photo_url = null;
        }
      }
    }

    return respond(startTime, responsePayload);
  }

  // ── 3. DB query ────────────────────────────────────────────────────────────
  const token = await repo.findTokenForScan(tokenId);
  console.log('🔵 [SCAN] Cache MISS - DB query for token:', tokenId);

  if (!token) {
    fireLog(
      buildScanLogPayload({
        tokenId: SENTINEL_TOKEN_ID,
        schoolId: SENTINEL_SCHOOL_ID,
        result: 'INVALID',
        scanPurpose: 'QR_SCAN',
        ip,
        userAgent,
        deviceHash,
        startTime,
        latitude,
        longitude,
        accuracy,
      })
    );
    setImmediate(() => evaluateAnomaly({ tokenId: SENTINEL_SCHOOL_ID, ip, scanResult: 'INVALID' }));
    return respond(startTime, buildError('INVALID', 'This QR code could not be verified.'));
  }

  const schoolId = token.school_id;

  const parentExpoTokens = (token.student?.parents ?? [])
    .flatMap(p => p.parent?.devices?.map(d => d.expo_push_token) ?? [])
    .filter(Boolean);
  const scanNotificationsEnabled = token.school?.settings?.scan_notifications_enabled ?? false;

  // ── 4. Honeypot check ──────────────────────────────────────────────────────
  if (token.is_honeypot) {
    fireLog(
      buildScanLogPayload({
        tokenId,
        schoolId,
        result: 'INVALID',
        scanPurpose: 'HONEYPOT',
        ip,
        userAgent,
        deviceHash,
        startTime,
        latitude,
        longitude,
        accuracy,
      })
    );
    setImmediate(() =>
      evaluateAnomaly({ tokenId, schoolId, ip, scanResult: 'INVALID', isHoneypot: true })
    );

    // ✅ NEW: Send emergency email for honeypot scans
    fireEmergencyEmail({
      schoolId,
      studentId: null,
      studentName: null,
      schoolName: token.school?.name,
      scanResult: 'HONEYPOT',
      ip,
      userAgent,
      deviceHash,
      latitude,
      longitude,
      accuracy,
      tokenId,
    });

    return respond(startTime, buildError('INVALID', 'This QR code could not be verified.'));
  }

  // ── 5. Token state checks ──────────────────────────────────────────────────

  if (token.expires_at && token.expires_at < new Date()) {
    const payload = {
      state: 'INACTIVE',
      school: safeSchoolMinimal(token.school),
      message: 'This card is no longer active. Please contact the school.',
    };
    fireLog(
      buildScanLogPayload({
        tokenId,
        schoolId,
        result: 'EXPIRED',
        scanPurpose: 'QR_SCAN',
        ip,
        userAgent,
        deviceHash,
        startTime,
        latitude,
        longitude,
        accuracy,
      })
    );
    setCachedProfile(tokenId, { ...payload, _schoolId: schoolId }, DEAD_STATE_CACHE_TTL_S);
    return respond(startTime, payload);
  }

  if (token.status === 'REVOKED') {
    const payload = {
      state: 'INACTIVE',
      school: safeSchoolMinimal(token.school),
      message: 'This card is no longer active. Please contact the school.',
    };
    fireLog(
      buildScanLogPayload({
        tokenId,
        schoolId,
        result: 'REVOKED',
        scanPurpose: 'QR_SCAN',
        ip,
        userAgent,
        deviceHash,
        startTime,
        latitude,
        longitude,
        accuracy,
      })
    );
    setCachedProfile(tokenId, { ...payload, _schoolId: schoolId }, DEAD_STATE_CACHE_TTL_S);
    return respond(startTime, payload);
  }

  if (token.status === 'INACTIVE') {
    const payload = {
      state: 'INACTIVE',
      school: safeSchoolFull(token.school),
      message: 'This card is currently inactive. Please contact the school.',
    };
    fireLog(
      buildScanLogPayload({
        tokenId,
        schoolId,
        result: 'INACTIVE',
        scanPurpose: 'QR_SCAN',
        ip,
        userAgent,
        deviceHash,
        startTime,
        latitude,
        longitude,
        accuracy,
      })
    );
    setCachedProfile(tokenId, { ...payload, _schoolId: schoolId }, DEAD_STATE_CACHE_TTL_S);
    return respond(startTime, payload);
  }

  if (token.status === 'UNASSIGNED' || !token.student_id) {
    const payload = {
      state: 'UNREGISTERED',
      school: safeSchoolFull(token.school),
      message: 'This card has not been registered yet. Please ask the parent to register.',
    };
    fireLog(
      buildScanLogPayload({
        tokenId,
        schoolId,
        result: 'UNREGISTERED',
        scanPurpose: 'QR_SCAN',
        ip,
        userAgent,
        deviceHash,
        startTime,
        latitude,
        longitude,
        accuracy,
      })
    );
    return respond(startTime, payload);
  }

  if (token.status === 'ISSUED') {
    const payload = {
      state: 'ISSUED',
      school: safeSchoolFull(token.school),
      message: 'This card has been issued but not yet activated by the family.',
    };
    fireLog(
      buildScanLogPayload({
        tokenId,
        schoolId,
        result: 'ISSUED',
        scanPurpose: 'QR_SCAN',
        ip,
        userAgent,
        deviceHash,
        startTime,
        latitude,
        longitude,
        accuracy,
      })
    );
    setCachedProfile(tokenId, { ...payload, _schoolId: schoolId });
    return respond(startTime, payload);
  }

  // ── 8. ACTIVE token — validate student ────────────────────────────────────
  const student = token.student;

  if (!student || !student.is_active) {
    const payload = {
      state: 'INACTIVE',
      school: safeSchoolFull(token.school),
      message: 'This card is currently inactive.',
    };
    fireLog(
      buildScanLogPayload({
        tokenId,
        schoolId,
        result: 'INACTIVE',
        scanPurpose: 'QR_SCAN',
        ip,
        userAgent,
        deviceHash,
        startTime,
        latitude,
        longitude,
        accuracy,
      })
    );
    setCachedProfile(tokenId, { ...payload, _schoolId: schoolId });
    return respond(startTime, payload);
  }

  if (student.setup_stage !== 'COMPLETE' && student.setup_stage !== 'VERIFIED') {
    const payload = {
      state: 'INACTIVE',
      school: safeSchoolFull(token.school),
      message: 'This card profile is not yet complete. Please ask the family to finish setup.',
    };
    fireLog(
      buildScanLogPayload({
        tokenId,
        schoolId,
        result: 'INACTIVE',
        scanPurpose: 'QR_SCAN',
        ip,
        userAgent,
        deviceHash,
        startTime,
        latitude,
        longitude,
        accuracy,
      })
    );
    return respond(startTime, payload);
  }

  // ── 9. Build full ACTIVE profile ──────────────────────────────────────────
  const emergency = student.emergency;
  const visibility = emergency?.visibility ?? 'PUBLIC';
  const hiddenFields = student.cardVisibility?.hidden_fields ?? [];

  const { profile, photoKey } = await buildProfile({
    student,
    emergency,
    visibility,
    hiddenFields,
  });
=======
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
        scanResult: 'SUCCESS',
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
  const emergency = student.emergencyProfile;
  const visibility = student.cardVisibility?.visibility || 'PUBLIC';

  const profile = buildProfile(student, emergency, visibility);
>>>>>>> d6d1c2d1f9491eb08dd3635a1ab69697f9d14590

  const payload = {
    state: 'ACTIVE',
    profile,
<<<<<<< HEAD
    school: safeSchoolFull(token.school),
    visibility: visibility,
    hidden_fields: hiddenFields,
  };

  fireLog(
    buildScanLogPayload({
      tokenId,
      schoolId,
      studentId: student.id,
      result: 'SUCCESS',
      scanPurpose: 'QR_SCAN',
      ip,
      userAgent,
      deviceHash,
      startTime,
      latitude,
      longitude,
      accuracy,
    })
  );

  const cachePayload = {
    ...payload,
    _schoolId: schoolId,
    _studentId: student.id,
    _parentTokens: parentExpoTokens,
    _settings: scanNotificationsEnabled,
    _photoKey: photoKey ?? null,
    visibility: visibility,
    hidden_fields: hiddenFields,
  };
  setCachedProfile(tokenId, cachePayload, ACTIVE_PROFILE_CACHE_TTL_S);

  setImmediate(() => evaluateAnomaly({ tokenId, schoolId, ip, scanResult: 'SUCCESS', scanCount }));

  fireNotification({
    schoolId,
    studentName: profile.name,
    parentExpoTokens,
    notifyEnabled: scanNotificationsEnabled,
    studentId: student.id,
    tokenId,
  });

  // ✅ NEW: Fire emergency email for ACTIVE scans
  fireEmergencyEmail({
    schoolId,
    studentId: student.id,
    studentName: profile.name,
    schoolName: token.school?.name,
    scanResult: 'SUCCESS',
    ip,
    userAgent,
    deviceHash,
    latitude,
    longitude,
    accuracy,
    tokenId,
  });

  return respond(startTime, payload);
};

// =============================================================================
// FIRE-AND-FORGET HELPERS
// =============================================================================

const fireLog = logEntry => {
  enqueueScanLog(logEntry).catch(err =>
    logger.error({ err: err.message, entry: logEntry }, '[scan.service] fireLog failed')
  );
};

const fireNotification = ({
  schoolId,
  studentName,
  parentExpoTokens,
  notifyEnabled,
  studentId,
  tokenId,
}) => {
  if (!notifyEnabled || !parentExpoTokens?.length) return;

  setImmediate(async () => {
    try {
      await dispatch({
        type: EVENTS.STUDENT_QR_SCANNED,
        schoolId,
        payload: {
          studentName,
          location: null,
          parentExpoTokens,
          notifyEnabled: true,
        },
        meta: { studentId, tokenId },
      });
    } catch (err) {
      logger.error({ err: err.message, studentId }, '[scan.service] notification dispatch failed');
    }
  });
};

// ✅ NEW: Emergency email function - fires for EVERY scan
const fireEmergencyEmail = async ({
  schoolId,
  studentId,
  studentName,
  schoolName,
  scanResult,
  ip,
  userAgent,
  deviceHash,
  latitude,
  longitude,
  accuracy,
  tokenId,
}) => {
  console.log('\n📧 [EMERGENCY EMAIL] ========================');
  console.log('   Token ID:', tokenId);
  console.log('   Student ID:', studentId);
  console.log('   Student Name:', studentName);
  console.log('   School:', schoolName);
  console.log('   Result:', scanResult);
  console.log('   IP:', ip);
  console.log('   User Agent:', userAgent?.substring(0, 50) + '...');
  console.log('   Device Hash:', deviceHash);
  console.log('   Location:', { latitude, longitude, accuracy });

  try {
    let parentEmail = null;
    let parentPhone = null; // ✅ ADD THIS for future SMS
    let parentName = null;

    if (studentId) {
      console.log('   🔍 Looking up parent for student:', studentId);
      const student = await repo.findStudentWithParent(studentId);
      console.log('   📋 Student found:', student ? 'YES' : 'NO');

      if (student) {
        const parent = student?.parents?.[0]?.parent;
        parentEmail = parent?.email ?? null;
        parentPhone = parent?.phone ?? null; // ✅ ADD THIS LINE
        parentName = parent?.name ?? null;

        console.log('   👤 Parent:', parentName || 'No name');
        console.log('   📧 Parent Email:', parentEmail || 'NO EMAIL!');
        console.log('   📱 Parent Phone:', parentPhone || 'NO PHONE!'); // ✅ ADD THIS
      }
    } else {
      console.log('   ⚠️ No studentId provided, skipping email');
    }

    if (!parentEmail) {
      console.log('   ❌ No parent email found - email NOT sent');
      console.log('========================================\n');
      return;
    }

    const locationStr =
      [
        ip ? `IP: ${ip}` : null,
        latitude ? `Lat: ${latitude}` : null,
        longitude ? `Lng: ${longitude}` : null,
        accuracy ? `Accuracy: ${accuracy}m` : null,
      ]
        .filter(Boolean)
        .join(' | ') || 'Location not available';

    console.log('   📨 Dispatching EMERGENCY_ALERT_TRIGGERED...');

    await dispatch({
      type: EVENTS.EMERGENCY_ALERT_TRIGGERED,
      schoolId,
      actorId: studentId || tokenId,
      actorType: 'SYSTEM',
      payload: {
        studentName: studentName || 'Student',
        schoolName: schoolName || 'Unknown School',
        scannedAt: new Date().toISOString(),
        location: locationStr,
        parentContacts: [],
        parentExpoTokens: [],
        parentEmail,
        scanDetails: {
          result: scanResult,
          ip_address: ip,
          user_agent: userAgent,
          device_hash: deviceHash,
          latitude,
          longitude,
          accuracy,
        },
      },
      meta: {
        alertId: tokenId,
        studentId: studentId || tokenId,
        scanLogId: tokenId,
      },
    });

    console.log('   ✅ Emergency email DISPATCHED successfully!');
    console.log('   📧 To:', parentEmail);
  } catch (err) {
    console.log('   ❌ FAILED:', err.message);
    console.error('[scan.service] Emergency email dispatch failed:', err);
  }
  console.log('========================================\n');
};

// =============================================================================
// TIMING + PADDING
// =============================================================================

const respond = async (startTime, result) => {
  const jsonLen = JSON.stringify(result).length;
  if (jsonLen < MIN_RESPONSE_BYTES) {
    result._ = ' '.repeat(MIN_RESPONSE_BYTES - jsonLen);
  }

  const elapsed = calculateResponseTime(startTime);
  const pad = Math.max(0, MIN_RESPONSE_MS - elapsed);
  if (pad > 0) await new Promise(resolve => setTimeout(resolve, pad));

  return result;
};

const buildError = (state, message) => ({ state, message });

// =============================================================================
// PROFILE ASSEMBLY
// =============================================================================

const buildProfile = async ({ student, emergency, visibility, hiddenFields }) => {
  let photoKey = null;
  let photoUrl = null;

  if (student.photo_url && !hiddenFields.includes('photo')) {
    photoKey = student.photo_url;
    try {
      photoUrl = await getStorage().getUrl(photoKey, 300);
    } catch (err) {
      logger.warn(
        { err: err.message, key: photoKey },
        '[scan.service] Failed to generate photo URL'
      );
      photoUrl = null;
    }
  }

  const base = {
    name: hiddenFields.includes('name')
      ? null
      : [student.first_name, student.last_name].filter(Boolean).join(' '),
    photo_url: photoUrl,
    class: hiddenFields.includes('class') ? null : (student.class ?? null),
    section: hiddenFields.includes('section') ? null : (student.section ?? null),
    gender: hiddenFields.includes('gender') ? null : (student.gender ?? null),
  };

  if (visibility === 'HIDDEN') {
    return { profile: { ...base, visibility: 'HIDDEN' }, photoKey };
  }

  if (visibility === 'MINIMAL') {
    const primaryContact = getPrimaryContact(emergency?.contacts ?? []);
    return {
      profile: { ...base, visibility: 'MINIMAL', primary_contact: primaryContact },
      photoKey,
    };
  }

  // PUBLIC — full emergency info
  const profile = {
    ...base,
    visibility: 'PUBLIC',
    blood_group: formatBloodGroup(emergency?.blood_group),
    allergies: emergency?.allergies ?? null,
    conditions: emergency?.conditions ?? null,
    medications: emergency?.medications ?? null,
    doctor: emergency?.doctor_name
      ? {
          name: emergency.doctor_name,
          phone: maskPhone(safeDecrypt(emergency.doctor_phone_encrypted)),
        }
      : null,
    notes: emergency?.notes ?? null,
    contacts: buildContacts(emergency?.contacts ?? []),
  };

  return { profile, photoKey };
};

const buildContacts = contacts =>
  contacts.map(c => ({
    id: c.id,
    name: c.name,
    relationship: c.relationship ?? null,
    phone: maskPhone(safeDecrypt(c.phone_encrypted)),
    priority: c.priority,
    call_enabled: c.call_enabled,
    whatsapp_enabled: c.whatsapp_enabled,
  }));

const getPrimaryContact = contacts => {
  if (!contacts.length) return null;
  const primary = [...contacts].sort((a, b) => a.priority - b.priority)[0];
  return {
    id: primary.id,
    name: primary.name,
    relationship: primary.relationship ?? null,
    phone: maskPhone(safeDecrypt(primary.phone_encrypted)),
    call_enabled: primary.call_enabled,
    whatsapp_enabled: primary.whatsapp_enabled,
  };
};

const safeDecrypt = encrypted => {
  if (!encrypted) return null;
  try {
    return decryptField(encrypted);
  } catch {
    return null;
  }
};

const safeSchoolFull = school => {
  if (!school) return null;
  return {
    name: school.name,
    logo_url: school.logo_url ?? null,
    phone: school.phone ?? null,
    address: school.address ?? null,
  };
};

const safeSchoolMinimal = school => {
  if (!school) return null;
  return { name: school.name };
};

const BLOOD_GROUP_DISPLAY = {
  A_POS: 'A+',
  A_NEG: 'A-',
  B_POS: 'B+',
  B_NEG: 'B-',
  AB_POS: 'AB+',
  AB_NEG: 'AB-',
  O_POS: 'O+',
  O_NEG: 'O-',
  UNKNOWN: 'Unknown',
};

const formatBloodGroup = bg => {
  if (!bg) return null;
  return BLOOD_GROUP_DISPLAY[bg] ?? bg;
=======
    school: safeSchool(token.school),
    visibility,
    _schoolId: schoolId,
    _studentId: student.id,
    _parentTokens: parentTokens,
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

  fireNotification(payload);
  fireAnomalyCheck({
    tokenId,
    schoolId,
    studentId: student.id,
    ip,
    scanResult: 'SUCCESS',
    scanCount,
  });

  return formatScanResponse(payload);
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

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

const buildProfile = (student, emergency, visibility) => {
  const base = {
    name: [student.firstName, student.lastName].filter(Boolean).join(' ') || null,
    photoUrl: student.photoUrl || null,
    grade: student.grade || null,
    section: student.section || null,
    visibility,
  };

  if (visibility === 'HIDDEN')
    return { ...base, message: 'Emergency information is hidden by parent.' };
  if (visibility === 'MINIMAL') {
    const primary = (emergency?.contacts || []).sort((a, b) => a.priority - b.priority)[0];
    return {
      ...base,
      primaryContact: primary
        ? {
            name: primary.name,
            relation: primary.relation,
            phone: maskPhone(primary.phone),
          }
        : null,
    };
  }

  // PUBLIC
  return {
    ...base,
    bloodGroup: formatBloodGroup(emergency?.bloodGroup),
    allergies: emergency?.allergies || null,
    conditions: emergency?.conditions || null,
    medications: emergency?.medications || null,
    doctor: emergency?.doctorName
      ? {
          name: emergency.doctorName,
          phone: maskPhone(emergency.doctorPhone),
        }
      : null,
    notes: emergency?.notes || null,
    contacts: (emergency?.contacts || []).map((c) => ({
      id: c.id,
      name: c.name,
      relation: c.relation,
      phone: maskPhone(c.phone),
      priority: c.priority,
    })),
  };
};

const safeSchool = (school) => {
  if (!school) return null;
  return {
    name: school.name,
    logoUrl: school.logoUrl,
    phone: school.phone,
    address: school.address,
  };
};

const buildResponse = (state, message) => ({ state, message });

// ═══════════════════════════════════════════════════════════════════════════════
// FIRE-AND-FORGET
// ═══════════════════════════════════════════════════════════════════════════════

const logScan = (entry) => {
  const payload = buildScanLogPayload(entry);
  // Enqueue to Redis for bulk write by scan worker
  import('#shared/cache/scan.cache.js')
    .then(({ enqueueScanLog }) => {
      enqueueScanLog(payload).catch((err) =>
        logger.error({ err: err.message }, '[scan] Log enqueue failed')
      );
    })
    .catch(() => {});
};

const fireNotification = (payload) => {
  if (!payload._parentTokens?.length) return;

  publish({
    type: EVENTS.EMERGENCY_QR_SCANNED,
    schoolId: payload._schoolId,
    actorId: payload._studentId || 'anonymous',
    actorType: 'EMERGENCY_RESPONDER',
    payload: {
      studentId: payload._studentId,
      studentName: payload.profile?.name,
      parentTokens: payload._parentTokens,
    },
  }).catch((err) => logger.error({ err: err.message }, '[scan] Notification publish failed'));
};

const fireAnomalyCheck = (data) => {
  evaluateScan({
    type: 'QR',
    studentId: data.studentId || data.tokenId,
    schoolId: data.schoolId,
    timestamp: new Date(),
    scannerIp: data.ip,
    scanId: data.tokenId,
  }).catch((err) => logger.error({ err: err.message }, '[scan] Anomaly check failed'));
>>>>>>> d6d1c2d1f9491eb08dd3635a1ab69697f9d14590
};
