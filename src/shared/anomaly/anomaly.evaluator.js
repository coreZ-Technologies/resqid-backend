// TODO: Add implementation
/**
 * anomaly.evaluator.js
 *
 * Shared anomaly detection engine.
 * Runs AFTER a scan (RFID tap or QR emergency scan) is saved.
 * Checks for suspicious patterns and stores anomalies in the database.
 *
 * Called by:
 *   - attendance.service.js   (after marking attendance)
 *   - scan.service.js         (after initiating emergency)
 *
 * Does NOT block the main request. Runs fire‑and‑forget.
 */

import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';

// ------------------------------------------------------------------
// CONFIGURABLE THRESHOLDS
// (could eventually live in shared/constants/anomaly.js)
// ------------------------------------------------------------------
const THRESHOLDS = {
  // 1. Duplicate scan within this many seconds
  DUPLICATE_WINDOW_SECONDS: 30,

  // 2. School operating hours (24h format) – scans outside this are flagged
  SCHOOL_HOURS_START: 6, // 6 AM
  SCHOOL_HOURS_END: 20, // 8 PM

  // 3. Maximum distance (km) between two consecutive scans of the same student
  MAX_LOCATION_JUMP_KM: 50,

  // 4. Maximum number of scans per student per day
  MAX_DAILY_SCANS: 20,

  // 5. Maximum scans per device per minute
  MAX_DEVICE_SCANS_PER_MINUTE: 60,
};

// ------------------------------------------------------------------
// MAIN ENTRY POINT
// ------------------------------------------------------------------

/**
 * @param {Object} scan
 * @param {string}  scan.type          - 'RFID' or 'QR'
 * @param {string}  scan.studentId
 * @param {string}  scan.schoolId
 * @param {Date}    scan.timestamp
 * @param {string} [scan.deviceId]      - present if type = 'RFID'
 * @param {Object} [scan.location]      - { lat, lng } for QR scans
 * @param {string} [scan.initiatedBy]   - user ID who scanned (guard)
 * @param {string} [scan.scanId]        - DB ID of the just‑created record (attendance or emergency)
 */
export async function evaluateScan(scan) {
  const { type, studentId, schoolId, timestamp, deviceId, location, initiatedBy, scanId } = scan;

  try {
    // Run all independent checks in parallel
    const results = await Promise.allSettled([
      checkDuplicateScan(studentId, timestamp),
      checkOffHours(timestamp),
      checkLocationJump(studentId, location, timestamp),
      checkDailyFrequency(studentId, timestamp),
      checkDeviceLoad(deviceId, timestamp),
    ]);

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

      logger.warn(`[ANOMALY] ${anomalies.length} anomaly(ies) for student ${studentId}`, {
        types: anomalies.map((a) => a.type),
        schoolId,
      });
    }
  } catch (error) {
    // Never throw – anomalies must not break the main scan flow
    logger.error('[ANOMALY] Evaluation failed', { error: error.message, scan });
  }
}

// ------------------------------------------------------------------
// INDIVIDUAL ANOMALY CHECK FUNCTIONS
// ------------------------------------------------------------------

/**
 * 1. DUPLICATE SCAN
 * Same student scanned twice within a short window (cloned card / double‑tap).
 */
async function checkDuplicateScan(studentId, timestamp) {
  const windowStart = new Date(timestamp.getTime() - THRESHOLDS.DUPLICATE_WINDOW_SECONDS * 1000);
  const windowEnd = new Date(timestamp.getTime() + THRESHOLDS.DUPLICATE_WINDOW_SECONDS * 1000);

  const previous = await prisma.attendanceRecord.findFirst({
    where: {
      studentId,
      timestamp: { gte: windowStart, lte: windowEnd },
      id: { not: undefined }, // not the current record (will be saved before this runs)
    },
    orderBy: { timestamp: 'desc' },
    select: { id: true, timestamp: true },
  });

  if (previous) {
    return {
      type: 'DUPLICATE_SCAN',
      severity: 'LOW',
      description: `Student scanned twice within ${THRESHOLDS.DUPLICATE_WINDOW_SECONDS}s`,
      metadata: { previousScanId: previous.id, previousTimestamp: previous.timestamp },
    };
  }
  return null;
}

/**
 * 2. OFF‑HOURS SCAN
 * Scan happens outside normal school hours.
 */
async function checkOffHours(timestamp) {
  const hour = new Date(timestamp).getHours();
  if (hour < THRESHOLDS.SCHOOL_HOURS_START || hour >= THRESHOLDS.SCHOOL_HOURS_END) {
    return {
      type: 'OFF_HOURS',
      severity: 'MEDIUM',
      description: `Scan recorded at ${hour}:00 (outside ${THRESHOLDS.SCHOOL_HOURS_START}:00–${THRESHOLDS.SCHOOL_HOURS_END}:00)`,
      metadata: { hour },
    };
  }
  return null;
}

/**
 * 3. LOCATION JUMP (only for QR scans with GPS)
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
      type: 'LOCATION_JUMP',
      severity: 'HIGH',
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
 * 4. HIGH DAILY FREQUENCY
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
      type: 'HIGH_FREQUENCY',
      severity: 'MEDIUM',
      description: `Student scanned ${count} times today (limit: ${THRESHOLDS.MAX_DAILY_SCANS})`,
      metadata: { dailyCount: count },
    };
  }
  return null;
}

/**
 * 5. DEVICE OVERLOAD (only for RFID taps)
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
      type: 'DEVICE_OVERLOAD',
      severity: 'HIGH',
      description: `Device ${deviceId} sent ${recentCount} taps in 1 minute (limit: ${THRESHOLDS.MAX_DEVICE_SCANS_PER_MINUTE})`,
      metadata: { deviceId, count: recentCount },
    };
  }
  return null;
}

// ------------------------------------------------------------------
// HELPER: Haversine distance (km)
// ------------------------------------------------------------------
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
