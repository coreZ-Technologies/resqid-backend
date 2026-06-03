// src/modules/scan/scan.service.js
import { ScanRepository } from './scan.repository.js';
import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';
<<<<<<< HEAD
import { extractIp } from '#shared/network/extractIp.js';
import { parseUserAgent } from '#shared/network/userAgent.js';
import { extractLocation } from '#shared/network/extractLocation.js';
import { SCAN_PURPOSE, SCAN_TYPES } from './scan.constants.js'; // SCAN_RESULTS removed
=======
import * as repo from './scan.repository.js';
import { getCachedEmergencyProfile, cacheEmergencyProfile } from '#shared/cache/scan.cache.js';
import { evaluateScan } from '#shared/anomaly/anomaly.evaluator.js';
import { publishNotification } from '#orchestrator/notifications/notification.publisher.js';
import { EVENTS } from '#orchestrator/events/event.types.js';
>>>>>>> f769c34b07b38ef93f84fb7ec946cdc6fdb91efd
import {
  maskTokenHash,
  formatRelativeTime,
  humanizeEnum,
  calculateRiskScore,
  isUnusualScanTime,
} from './scan.helper.js';

<<<<<<< HEAD
const repo = new ScanRepository();

export class ScanService {
  // ===========================================================================
  // EXISTING SCAN LOGIC
  // ===========================================================================

  async processScan(scanCode, req) {
    const startTime = Date.now();
    const ip = extractIp(req);
    const userAgent = parseUserAgent(req);
    
    // Safely get location (fallback if geo‑IP fails)
    let location = { lat: null, lon: null, city: null, country: null };
    try {
      location = await extractLocation(req);
    } catch (err) {
      logger.warn({ err: err.message, ip }, 'Geo‑IP lookup failed, using fallback');
=======
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
>>>>>>> f769c34b07b38ef93f84fb7ec946cdc6fdb91efd
    }

    const token = await repo.findTokenByCode(scanCode);
    
    let result = 'INVALID';
    let student = null;
    let scanPurpose = SCAN_PURPOSE.UNKNOWN;

    if (!token) {
      result = 'INVALID';
    } else if (token.status === 'EXPIRED') {
      result = 'EXPIRED';
    } else if (token.status === 'REVOKED') {
      result = 'REVOKED';
    } else if (token.status === 'ACTIVE' || token.status === 'ISSUED') {
      result = 'SUCCESS';
      student = token.student;
      scanPurpose = SCAN_PURPOSE.EMERGENCY;
    }

    const responseTimeMs = Date.now() - startTime;

    const riskScore = calculateRiskScore({
      isSuspiciousUA: userAgent.isBot,
      isNewDevice: false,
      unusualLocation: location.country !== 'IN',
      unusualTime: isUnusualScanTime(),
      rapidScanCount: req.scanCount || 1,
    });

    const scan = await repo.createScan({
      tokenId: token?.id,
      studentId: student?.id,
      schoolId: token?.schoolId,
      result,
      type: SCAN_TYPES.QR_EMERGENCY,
      status: result === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
      deviceIp: ip,
      userAgent: userAgent.raw,
      locationLat: location.lat,
      locationLng: location.lon,
      initiatedBy: 'public_scan',
      metadata: {
        scanPurpose,
        city: location.city,
        country: location.country,
        device: userAgent.device,
        os: userAgent.os,
        browser: userAgent.browser,
        responseTimeMs,
        riskScore,
        userAgentParsed: userAgent,
      },
      createdAt: new Date(),
    });

    logger.info({
      scanId: scan.id,
      result,
      studentId: student?.id,
      schoolId: token?.schoolId,
      riskScore,
      responseTimeMs,
    }, 'Scan processed');

<<<<<<< HEAD
=======
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
>>>>>>> f769c34b07b38ef93f84fb7ec946cdc6fdb91efd
    return {
      success: result === 'SUCCESS',
      result,
      student: student ? {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        grade: student.grade,
        section: student.section,
        photoUrl: student.photoUrl,
        emergencyProfile: student.emergencyProfile,
      } : null,
      scanId: scan.id,
      responseTimeMs,
      riskScore,
    };
  }

<<<<<<< HEAD
  // ===========================================================================
  // SCAN LOGS METHODS (unchanged – correct)
  // ===========================================================================

  async listScanLogs(query, schoolId) {
    const { scans, total } = await repo.listScanLogs({ ...query, schoolId });

    const transformedScans = scans.map(scan => ({
      id: scan.id,
      token_hash: maskTokenHash(scan.token?.qrCode || scan.token?.rfidUid || 'Unknown'),
      result: scan.result,
      result_label: humanizeEnum(scan.result),
      student_name: scan.student
        ? `${scan.student.firstName} ${scan.student.lastName}`
=======
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
>>>>>>> f769c34b07b38ef93f84fb7ec946cdc6fdb91efd
        : null,
      student_id: scan.student?.id || null,
      student_class: scan.student?.grade || null,
      student_section: scan.student?.section || null,
      ip_address: scan.deviceIp,
      ip_city: scan.metadata?.city || null,
      device: scan.metadata?.device || 'Unknown',
      scan_purpose: scan.metadata?.scanPurpose || 'UNKNOWN',
      scan_purpose_label: humanizeEnum(scan.metadata?.scanPurpose || 'UNKNOWN'),
      response_time_ms: scan.metadata?.responseTimeMs || null,
      relative_time: formatRelativeTime(scan.createdAt),
      created_at: scan.createdAt,
      risk_score: scan.metadata?.riskScore || 0,
    }));

    const totalPages = Math.ceil(total / query.limit);

    return {
      data: transformedScans,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1,
      },
    };
  }

<<<<<<< HEAD
  async getTodayStats(schoolId) {
    const stats = await repo.getTodayStats(schoolId);
    
    return {
      ...stats,
      successRate: stats.total ? Math.round((stats.success / stats.total) * 100) : 0,
      failureRate: stats.total ? Math.round((stats.failed / stats.total) * 100) : 0,
    };
  }

  async getScanLogById(id, schoolId) {
    const scan = await repo.getScanLogById(id, schoolId);
    if (!scan) {
      throw ApiError.notFound('Scan log not found');
    }
    
    return {
      ...scan,
      relative_time: formatRelativeTime(scan.createdAt),
      result_label: humanizeEnum(scan.result),
      scan_purpose_label: humanizeEnum(scan.metadata?.scanPurpose || 'UNKNOWN'),
      token_masked: maskTokenHash(scan.token?.qrCode || scan.token?.rfidUid),
    };
  }
=======
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
>>>>>>> f769c34b07b38ef93f84fb7ec946cdc6fdb91efd

  async exportScanLogs(query, schoolId) {
    const scans = await repo.exportScanLogs({ ...query, schoolId });

<<<<<<< HEAD
    const exportData = scans.map(scan => ({
      'Scan ID': scan.id,
      'Student Name': scan.student
        ? `${scan.student.firstName} ${scan.student.lastName}`
        : 'Unknown',
      'Class': scan.student?.grade || 'N/A',
      'Section': scan.student?.section || 'N/A',
      'Token': scan.token?.qrCode || scan.token?.rfidUid || 'Unknown',
      'Token Type': scan.token?.type || 'Unknown',
      'Result': scan.result,
      'IP Address': scan.deviceIp,
      'City': scan.metadata?.city || 'N/A',
      'Country': scan.metadata?.country || 'N/A',
      'Device': scan.metadata?.device || 'Unknown',
      'Browser': scan.metadata?.browser || 'Unknown',
      'OS': scan.metadata?.os || 'Unknown',
      'Scan Purpose': scan.metadata?.scanPurpose || 'UNKNOWN',
      'Response Time (ms)': scan.metadata?.responseTimeMs || 'N/A',
      'Risk Score': scan.metadata?.riskScore || 0,
      'Scanned At': scan.createdAt,
    }));

    return exportData;
  }

  // ===========================================================================
  // ADDITIONAL STATISTICS METHODS (unchanged)
  // ===========================================================================

  async getScanSummary(startDate, schoolId) {
    return repo.getScanSummary(startDate, schoolId);
  }

  async getDailyScanStats(days, schoolId) {
    return repo.getDailyScanStats(days, schoolId);
  }

  async getResultDistribution(schoolId) {
    return repo.getResultDistribution(schoolId);
  }

  async getPeakScanHours(schoolId, days = 7) {
    return repo.getPeakScanHours(schoolId, days);
  }

  async getRecentScans(limit = 10, schoolId) {
    const scans = await repo.getRecentScans(limit, schoolId);
    
    return scans.map(scan => ({
      id: scan.id,
      result: scan.result,
      student_name: scan.student
        ? `${scan.student.firstName} ${scan.student.lastName}`
        : 'Unknown',
      token_masked: maskTokenHash(scan.token?.qrCode),
      relative_time: formatRelativeTime(scan.createdAt),
    }));
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  async validateScanCode(scanCode) {
    const token = await repo.findTokenByCodeLight(scanCode); // Use lightweight method
    
    if (!token) {
      return { valid: false, reason: 'INVALID_CODE' };
    }
    
    if (token.status === 'REVOKED') {
      return { valid: false, reason: 'TOKEN_REVOKED' };
    }
    
    if (token.status === 'EXPIRED') {
      return { valid: false, reason: 'TOKEN_EXPIRED' };
    }
    
    if (token.status === 'INACTIVE') {
      return { valid: false, reason: 'TOKEN_INACTIVE' };
    }
    
    return {
      valid: true,
      studentId: token.studentId,
      studentName: null, // We don't have student name in lightweight query – optional
    };
  }

  async getScanCountByDateRange(startDate, endDate, schoolId) {
    return repo.getScanCountByDateRange(startDate, endDate, schoolId);
  }

  async cleanupOldScans(daysOld = 90) {
    const result = await repo.deleteOldScans(daysOld);
    logger.info({ deletedCount: result.count, daysOld }, 'Old scans cleaned up');
    return result;
  }
}
=======
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
>>>>>>> f769c34b07b38ef93f84fb7ec946cdc6fdb91efd
