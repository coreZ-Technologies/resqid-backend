// =============================================================================
// anomaly.evaluator.js — RESQID
// Shared anomaly detection engine
//
// Runs AFTER a scan (RFID tap or QR emergency scan) is saved.
// Checks for suspicious patterns and stores anomalies in the database.
//
// Called by:
//   - attendance.service.js   (after marking attendance)
//   - scan.service.js         (after initiating emergency QR scan)
//
// Does NOT block the main request. Runs fire-and-forget.
// =============================================================================

import { prisma } from '#config/prisma.js';
import { logger, securityLog } from '#config/logger.js';
import { ENV } from '#config/env.js';
import { ANOMALY_TYPE, ANOMALY_STATUS, SECURITY_SEVERITY } from '#shared/constants/status.js';
import { EVENTS } from '#shared/constants/events.js';
import { middlewareRedis } from '#config/redis.js';

// ─── Configurable Thresholds ──────────────────────────────────────────────────

const THRESHOLDS = {
  // Duplicate scan window (seconds)
  DUPLICATE_WINDOW_SECONDS: 30,

  // School operating hours (24h format)
  SCHOOL_HOURS_START: ENV.UNUSUAL_HOURS_END || 6, // 6 AM
  SCHOOL_HOURS_END: ENV.UNUSUAL_HOURS_START || 20, // 8 PM

  // Maximum distance (km) between two consecutive scans
  MAX_LOCATION_JUMP_KM: ENV.IMPOSSIBLE_TRAVEL_THRESHOLD_KM || 50,

  // Maximum scans per student per day
  MAX_DAILY_SCANS: 20,

  // Maximum scans per device per minute
  MAX_DEVICE_SCANS_PER_MINUTE: 60,

  // Rapid scan threshold (scans per minute for same student by same IP)
  RAPID_SCAN_THRESHOLD: ENV.RAPID_SCAN_THRESHOLD || 10,

  // Rapid scan window (seconds)
  RAPID_SCAN_WINDOW_SECONDS: 60,
};

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * @param {Object} scan
 * @param {string}  scan.type          - 'RFID' or 'QR'
 * @param {string}  scan.studentId
 * @param {string}  scan.schoolId
 * @param {Date}    scan.timestamp
 * @param {string} [scan.deviceId]      - present if type = 'RFID'
 * @param {Object} [scan.location]      - { lat, lng } for QR scans
 * @param {string} [scan.initiatedBy]   - user ID who scanned (guard/responder)
 * @param {string} [scan.scanId]        - DB ID of the just-created record
 * @param {string} [scan.scannerIp]     - IP of the person scanning (QR scans)
 * @param {string} [scan.deviceFingerprint] - Device fingerprint of scanner
 */
export async function evaluateScan(scan) {
  const {
    type,
    studentId,
    schoolId,
    timestamp,
    deviceId,
    location,
    initiatedBy,
    scanId,
    scannerIp,
    deviceFingerprint,
  } = scan;

  try {
    // Select checks based on scan type
    const checks = [checkOffHours(timestamp), checkDailyFrequency(studentId, timestamp)];

    // RFID-specific checks
    if (type === 'RFID') {
      checks.push(checkDuplicateAttendance(studentId, timestamp));
      checks.push(checkDeviceLoad(deviceId, timestamp));
    }

    // QR-specific checks
    if (type === 'QR') {
      checks.push(checkDuplicateEmergencyScan(studentId, timestamp));
      checks.push(checkLocationJump(studentId, location, timestamp));
      checks.push(checkRapidQRScans(studentId, scannerIp, timestamp));
    }

    // Run all checks in parallel
    const results = await Promise.allSettled(checks);

    // Collect only fulfilled checks that returned an anomaly
    const anomalies = results
      .filter((r) => r.status === 'fulfilled' && r.value !== null)
      .map((r) => r.value);

    // Save all detected anomalies to the database
    if (anomalies.length > 0) {
      await Promise.all(
        anomalies.map((anomaly) =>
          prisma.scanAnomaly.create({
            data: {
              type: anomaly.type,
              severity: anomaly.severity,
              description: anomaly.description,
              studentId,
              schoolId,
              scanId: scanId || null,
              deviceId: deviceId || null,
              initiatedBy: initiatedBy || null,
              metadata: anomaly.metadata || {},
              timestamp,
            },
          })
        )
      );

      // Log security event for each anomaly
      for (const anomaly of anomalies) {
        securityLog(EVENTS.ANOMALY_DETECTED, anomaly.severity, {
          anomalyType: anomaly.type,
          studentId,
          schoolId,
          scanType: type,
          description: anomaly.description,
        });
      }

      // Update Redis behavior score for the student
      if (studentId) {
        await updateBehaviorScore(studentId, -5 * anomalies.length);
      }

      // Update IP reputation if scanner IP available
      if (scannerIp) {
        await updateIpReputation(scannerIp, -10 * anomalies.length);
      }

      logger.warn(
        { type: 'anomaly_detected', count: anomalies.length, studentId, schoolId },
        `[ANOMALY] ${anomalies.length} anomaly(ies) for student ${studentId}`
      );
    }
  } catch (error) {
    // Never throw — anomalies must not break the main scan flow
    logger.error({ err: error.message, scan }, '[ANOMALY] Evaluation failed');
  }
}

// ─── Individual Anomaly Check Functions ───────────────────────────────────────

/**
 * 1. DUPLICATE ATTENDANCE SCAN (RFID)
 * Same student tapped twice on RFID within a short window.
 */
async function checkDuplicateAttendance(studentId, timestamp) {
  const windowStart = new Date(timestamp.getTime() - THRESHOLDS.DUPLICATE_WINDOW_SECONDS * 1000);
  const windowEnd = new Date(timestamp.getTime() + THRESHOLDS.DUPLICATE_WINDOW_SECONDS * 1000);

  const previous = await prisma.attendanceRecord.findFirst({
    where: {
      studentId,
      timestamp: { gte: windowStart, lte: windowEnd },
    },
    orderBy: { timestamp: 'desc' },
    select: { id: true, timestamp: true },
  });

  if (previous) {
    return {
      type: ANOMALY_TYPE.RAPID_SCANS,
      severity: SECURITY_SEVERITY.LOW,
      description: `Student tapped RFID twice within ${THRESHOLDS.DUPLICATE_WINDOW_SECONDS}s`,
      metadata: { previousScanId: previous.id, previousTimestamp: previous.timestamp },
    };
  }
  return null;
}

/**
 * 2. DUPLICATE EMERGENCY SCAN (QR)
 * Same student's QR scanned twice within a short window.
 */
async function checkDuplicateEmergencyScan(studentId, timestamp) {
  const windowStart = new Date(timestamp.getTime() - THRESHOLDS.DUPLICATE_WINDOW_SECONDS * 1000);
  const windowEnd = new Date(timestamp.getTime() + THRESHOLDS.DUPLICATE_WINDOW_SECONDS * 1000);

  const previous = await prisma.emergencyIncident.findFirst({
    where: {
      studentId,
      timestamp: { gte: windowStart, lte: windowEnd },
    },
    orderBy: { timestamp: 'desc' },
    select: { id: true, timestamp: true },
  });

  if (previous) {
    return {
      type: ANOMALY_TYPE.RAPID_SCANS,
      severity: SECURITY_SEVERITY.LOW,
      description: `Student QR scanned twice within ${THRESHOLDS.DUPLICATE_WINDOW_SECONDS}s`,
      metadata: { previousScanId: previous.id, previousTimestamp: previous.timestamp },
    };
  }
  return null;
}

/**
 * 3. OFF-HOURS SCAN
 * Scan happens outside normal school hours.
 */
async function checkOffHours(timestamp) {
  const hour = new Date(timestamp).getHours();
  if (hour < THRESHOLDS.SCHOOL_HOURS_START || hour >= THRESHOLDS.SCHOOL_HOURS_END) {
    return {
      type: ANOMALY_TYPE.UNUSUAL_HOURS,
      severity: SECURITY_SEVERITY.MEDIUM,
      description: `Scan at ${hour}:00 (outside ${THRESHOLDS.SCHOOL_HOURS_START}:00–${THRESHOLDS.SCHOOL_HOURS_END}:00)`,
      metadata: { hour },
    };
  }
  return null;
}

/**
 * 4. LOCATION JUMP (QR scans with GPS)
 * Same student scanned at two distant locations in a short timeframe.
 */
async function checkLocationJump(studentId, location, timestamp) {
  if (!location || location.lat == null || location.lng == null) return null;

  const lastIncident = await prisma.emergencyIncident.findFirst({
    where: {
      studentId,
      locationLat: { not: null },
      locationLng: { not: null },
      timestamp: { lt: timestamp },
    },
    orderBy: { timestamp: 'desc' },
    select: { locationLat: true, locationLng: true, timestamp: true },
  });

  if (!lastIncident) return null;

  const distance = haversineDistance(
    { lat: lastIncident.locationLat, lng: lastIncident.locationLng },
    { lat: location.lat, lng: location.lng }
  );

  if (distance > THRESHOLDS.MAX_LOCATION_JUMP_KM) {
    return {
      type: ANOMALY_TYPE.IMPOSSIBLE_TRAVEL,
      severity: SECURITY_SEVERITY.HIGH,
      description: `Student scanned ${distance.toFixed(1)} km away from previous scan`,
      metadata: {
        previousLocation: { lat: lastIncident.locationLat, lng: lastIncident.locationLng },
        previousTimestamp: lastIncident.timestamp,
        distanceKm: distance,
      },
    };
  }
  return null;
}

/**
 * 5. HIGH DAILY FREQUENCY
 * Student scanned an unusually high number of times in a single day.
 */
async function checkDailyFrequency(studentId, timestamp) {
  const dayStart = new Date(timestamp);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(timestamp);
  dayEnd.setHours(23, 59, 59, 999);

  const count = await prisma.attendanceRecord.count({
    where: {
      studentId,
      timestamp: { gte: dayStart, lte: dayEnd },
    },
  });

  if (count > THRESHOLDS.MAX_DAILY_SCANS) {
    return {
      type: ANOMALY_TYPE.FREQUENCY_ANOMALY,
      severity: SECURITY_SEVERITY.MEDIUM,
      description: `Student scanned ${count} times today (limit: ${THRESHOLDS.MAX_DAILY_SCANS})`,
      metadata: { dailyCount: count },
    };
  }
  return null;
}

/**
 * 6. DEVICE OVERLOAD (RFID only)
 * A single device sends an excessive number of taps in a short period.
 */
async function checkDeviceLoad(deviceId, timestamp) {
  if (!deviceId) return null;

  const oneMinAgo = new Date(timestamp.getTime() - 60 * 1000);

  const recentCount = await prisma.attendanceRecord.count({
    where: {
      deviceId,
      timestamp: { gte: oneMinAgo },
    },
  });

  if (recentCount > THRESHOLDS.MAX_DEVICE_SCANS_PER_MINUTE) {
    return {
      type: ANOMALY_TYPE.VOLUME_ANOMALY,
      severity: SECURITY_SEVERITY.HIGH,
      description: `Device ${deviceId} sent ${recentCount} taps in 1 minute (limit: ${THRESHOLDS.MAX_DEVICE_SCANS_PER_MINUTE})`,
      metadata: { deviceId, count: recentCount },
    };
  }
  return null;
}

/**
 * 7. RAPID QR SCANS (Same student, same IP)
 * Detects abuse where someone repeatedly scans the same student's QR code.
 */
async function checkRapidQRScans(studentId, scannerIp, timestamp) {
  if (!scannerIp) return null;

  const windowStart = new Date(timestamp.getTime() - THRESHOLDS.RAPID_SCAN_WINDOW_SECONDS * 1000);

  const recentScans = await prisma.emergencyIncident.count({
    where: {
      studentId,
      initiatedBy: scannerIp, // Using IP as proxy for scanner identity
      timestamp: { gte: windowStart },
    },
  });

  if (recentScans > THRESHOLDS.RAPID_SCAN_THRESHOLD) {
    return {
      type: ANOMALY_TYPE.RAPID_SCANS,
      severity: SECURITY_SEVERITY.HIGH,
      description: `${recentScans} QR scans of student ${studentId} from IP ${scannerIp} in ${THRESHOLDS.RAPID_SCAN_WINDOW_SECONDS}s`,
      metadata: { studentId, scannerIp, scanCount: recentScans },
    };
  }
  return null;
}

// ─── Redis Helpers ────────────────────────────────────────────────────────────

/**
 * Update behavior score for a student in Redis
 */
async function updateBehaviorScore(studentId, delta) {
  try {
    const key = `behavior:scan:${studentId}`;
    await middlewareRedis.incrby(key, delta);
    await middlewareRedis.expire(key, ENV.BEHAVIOR_SCORE_TTL || 86400);
  } catch (err) {
    // Non-critical — don't throw
  }
}

/**
 * Update IP reputation score in Redis
 */
async function updateIpReputation(ip, delta) {
  try {
    const key = `iprep:${ip}`;
    await middlewareRedis.incrby(key, delta);
    await middlewareRedis.expire(key, ENV.IP_REPUTATION_TTL || 604800);
  } catch (err) {
    // Non-critical — don't throw
  }
}

// ─── Helper: Haversine Distance (km) ─────────────────────────────────────────

function haversineDistance(coord1, coord2) {
  const R = 6371;
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLng = toRad(coord2.lng - coord1.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(coord1.lat)) * Math.cos(toRad(coord2.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}
