// =============================================================================
// anomaly.evaluator.js — RESQID
// Shared anomaly detection engine
// =============================================================================

import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';
import { ENV } from '#config/env.js';
import { middlewareRedis } from '#config/redis.js';

// ─── Configurable Thresholds ──────────────────────────────────────────────────

const THRESHOLDS = {
  DUPLICATE_WINDOW_SECONDS: 30,
  SCHOOL_HOURS_START: ENV.UNUSUAL_HOURS_END || 6,
  SCHOOL_HOURS_END: ENV.UNUSUAL_HOURS_START || 20,
  MAX_LOCATION_JUMP_KM: ENV.IMPOSSIBLE_TRAVEL_THRESHOLD_KM || 500, // 🔧 Fixed: was 50, should be 500
  MAX_DAILY_SCANS: 20,
  MAX_DEVICE_SCANS_PER_MINUTE: 60,
  RAPID_SCAN_THRESHOLD: ENV.RAPID_SCAN_THRESHOLD || 10,
  RAPID_SCAN_WINDOW_SECONDS: 60,
};

// ─── Anomaly Types (Inline — avoid missing import errors) ─────────────────────

const ANOMALY_TYPE = {
  RAPID_SCANS: 'RAPID_SCANS',
  UNUSUAL_HOURS: 'UNUSUAL_HOURS',
  IMPOSSIBLE_TRAVEL: 'IMPOSSIBLE_TRAVEL',
  FREQUENCY_ANOMALY: 'FREQUENCY_ANOMALY',
  VOLUME_ANOMALY: 'VOLUME_ANOMALY',
};

const SECURITY_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

// ─── Main Entry Point ─────────────────────────────────────────────────────────

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
  } = scan;

  try {
    const checks = [checkOffHours(timestamp), checkDailyFrequency(studentId, timestamp)];

    if (type === 'RFID') {
      checks.push(checkDuplicateAttendance(studentId, timestamp));
      checks.push(checkDeviceLoad(deviceId, timestamp));
    }

    if (type === 'QR') {
      checks.push(checkDuplicateEmergencyScan(studentId, timestamp));
      checks.push(checkLocationJump(studentId, location, timestamp));
      checks.push(checkRapidQRScans(studentId, scannerIp, timestamp));
    }

    const results = await Promise.allSettled(checks);
    const anomalies = results
      .filter((r) => r.status === 'fulfilled' && r.value !== null)
      .map((r) => r.value);

    if (anomalies.length > 0) {
      // Save to database (fire-and-forget, don't await)
      Promise.all(
        anomalies.map((anomaly) =>
          prisma.scanAnomaly
            .create({
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
            .catch((err) => logger.error({ err: err.message }, '[ANOMALY] DB save failed'))
        )
      );

      // Update behavior scores
      if (studentId) updateBehaviorScore(studentId, -5 * anomalies.length);
      if (scannerIp) updateIpReputation(scannerIp, -10 * anomalies.length);

      logger.warn(
        { count: anomalies.length, studentId, schoolId, types: anomalies.map((a) => a.type) },
        `[ANOMALY] ${anomalies.length} detected for student ${studentId}`
      );
    }
  } catch (error) {
    logger.error({ err: error.message }, '[ANOMALY] Evaluation failed');
  }
}

// ─── Check Functions ──────────────────────────────────────────────────────────

async function checkDuplicateAttendance(studentId, timestamp) {
  const windowStart = new Date(timestamp.getTime() - THRESHOLDS.DUPLICATE_WINDOW_SECONDS * 1000);
  const windowEnd = new Date(timestamp.getTime() + THRESHOLDS.DUPLICATE_WINDOW_SECONDS * 1000);

  const previous = await prisma.attendanceRecord.findFirst({
    where: { studentId, timestamp: { gte: windowStart, lte: windowEnd } },
    orderBy: { timestamp: 'desc' },
    select: { id: true, timestamp: true },
  });

  return previous
    ? {
        type: ANOMALY_TYPE.RAPID_SCANS,
        severity: SECURITY_SEVERITY.LOW,
        description: `RFID tapped twice within ${THRESHOLDS.DUPLICATE_WINDOW_SECONDS}s`,
        metadata: { previousScanId: previous.id, previousTimestamp: previous.timestamp },
      }
    : null;
}

async function checkDuplicateEmergencyScan(studentId, timestamp) {
  const windowStart = new Date(timestamp.getTime() - THRESHOLDS.DUPLICATE_WINDOW_SECONDS * 1000);
  const windowEnd = new Date(timestamp.getTime() + THRESHOLDS.DUPLICATE_WINDOW_SECONDS * 1000);

  const previous = await prisma.emergencyIncident.findFirst({
    where: { studentId, occurredAt: { gte: windowStart, lte: windowEnd } }, // 🔧 Fixed: 'timestamp' → 'occurredAt'
    orderBy: { occurredAt: 'desc' },
    select: { id: true, occurredAt: true },
  });

  return previous
    ? {
        type: ANOMALY_TYPE.RAPID_SCANS,
        severity: SECURITY_SEVERITY.LOW,
        description: `QR scanned twice within ${THRESHOLDS.DUPLICATE_WINDOW_SECONDS}s`,
        metadata: { previousScanId: previous.id, previousTimestamp: previous.occurredAt },
      }
    : null;
}

async function checkOffHours(timestamp) {
  const hour = new Date(timestamp).getHours();
  return hour < THRESHOLDS.SCHOOL_HOURS_START || hour >= THRESHOLDS.SCHOOL_HOURS_END
    ? {
        type: ANOMALY_TYPE.UNUSUAL_HOURS,
        severity: SECURITY_SEVERITY.MEDIUM,
        description: `Scan at ${hour}:00 (outside ${THRESHOLDS.SCHOOL_HOURS_START}:00–${THRESHOLDS.SCHOOL_HOURS_END}:00)`,
        metadata: { hour },
      }
    : null;
}

async function checkLocationJump(studentId, location, timestamp) {
  if (!location?.lat || !location?.lng) return null;

  const lastIncident = await prisma.emergencyIncident.findFirst({
    where: {
      studentId,
      locationLat: { not: null },
      locationLng: { not: null },
      occurredAt: { lt: timestamp },
    },
    orderBy: { occurredAt: 'desc' },
    select: { locationLat: true, locationLng: true, occurredAt: true },
  });

  if (!lastIncident) return null;

  const distance = haversineDistance(
    { lat: lastIncident.locationLat, lng: lastIncident.locationLng },
    { lat: location.lat, lng: location.lng }
  );

  return distance > THRESHOLDS.MAX_LOCATION_JUMP_KM
    ? {
        type: ANOMALY_TYPE.IMPOSSIBLE_TRAVEL,
        severity: SECURITY_SEVERITY.HIGH,
        description: `Student scanned ${distance.toFixed(1)} km away from previous scan`,
        metadata: {
          previousLocation: { lat: lastIncident.locationLat, lng: lastIncident.locationLng },
          previousTimestamp: lastIncident.occurredAt,
          distanceKm: distance,
        },
      }
    : null;
}

async function checkDailyFrequency(studentId, timestamp) {
  const dayStart = new Date(timestamp);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(timestamp);
  dayEnd.setHours(23, 59, 59, 999);

  const count = await prisma.attendanceRecord.count({
    where: { studentId, timestamp: { gte: dayStart, lte: dayEnd } },
  });

  return count > THRESHOLDS.MAX_DAILY_SCANS
    ? {
        type: ANOMALY_TYPE.FREQUENCY_ANOMALY,
        severity: SECURITY_SEVERITY.MEDIUM,
        description: `Student scanned ${count} times today (limit: ${THRESHOLDS.MAX_DAILY_SCANS})`,
        metadata: { dailyCount: count },
      }
    : null;
}

async function checkDeviceLoad(deviceId, timestamp) {
  if (!deviceId) return null;
  const oneMinAgo = new Date(timestamp.getTime() - 60 * 1000);
  const count = await prisma.attendanceRecord.count({
    where: { deviceId, timestamp: { gte: oneMinAgo } },
  });

  return count > THRESHOLDS.MAX_DEVICE_SCANS_PER_MINUTE
    ? {
        type: ANOMALY_TYPE.VOLUME_ANOMALY,
        severity: SECURITY_SEVERITY.HIGH,
        description: `Device ${deviceId} sent ${count} taps in 1 minute`,
        metadata: { deviceId, count },
      }
    : null;
}

async function checkRapidQRScans(studentId, scannerIp, timestamp) {
  if (!scannerIp) return null;
  const windowStart = new Date(timestamp.getTime() - THRESHOLDS.RAPID_SCAN_WINDOW_SECONDS * 1000);
  const count = await prisma.emergencyIncident.count({
    where: { studentId, initiatedBy: scannerIp, occurredAt: { gte: windowStart } },
  });

  return count > THRESHOLDS.RAPID_SCAN_THRESHOLD
    ? {
        type: ANOMALY_TYPE.RAPID_SCANS,
        severity: SECURITY_SEVERITY.HIGH,
        description: `${count} QR scans from IP ${scannerIp} in ${THRESHOLDS.RAPID_SCAN_WINDOW_SECONDS}s`,
        metadata: { studentId, scannerIp, scanCount: count },
      }
    : null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function haversineDistance(c1, c2) {
  const R = 6371;
  const dLat = toRad(c2.lat - c1.lat),
    dLng = toRad(c2.lng - c1.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(c1.lat)) * Math.cos(toRad(c2.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

async function updateBehaviorScore(studentId, delta) {
  try {
    await middlewareRedis.incrby(`behavior:scan:${studentId}`, delta);
    await middlewareRedis.expire(`behavior:scan:${studentId}`, 86400);
  } catch {}
}

async function updateIpReputation(ip, delta) {
  try {
    await middlewareRedis.incrby(`iprep:${ip}`, delta);
    await middlewareRedis.expire(`iprep:${ip}`, 604800);
  } catch {}
}
