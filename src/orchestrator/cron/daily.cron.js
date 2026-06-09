// orchestrator/cron/daily.cron.js — RESQID
//
// School-specific absence detection cron.
// Schedules checks 30 minutes before each school's start time.
// Handles all scenarios: planned leave, late arrival, half-day, RFID down, mass absence.

import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';
import { crisisQueue } from '../queues/queue.config.js';
import { QUEUE_NAMES } from '../queues/queue.names.js';

const BUFFER_MINUTES = 30;
const MAX_AUTO_SUBSTITUTIONS = 3;
const MASS_ABSENCE_THRESHOLD = 8;
const MAX_CASCADE_DEPTH = 2;

// MAIN SCHEDULER — Runs at midnight, schedules delayed jobs per school

export const scheduleDailyChecks = async () => {
  logger.info('[daily.cron] Starting school scheduling');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const dayOfWeek = now.getDay() || 7;
  let scheduled = 0,
    skipped = 0;

  try {
    const activeSchools = await prisma.school.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        timezone: true,
        timetableConfig: {
          select: {
            workingDays: true,
            startTime: true,
            allowSubstitution: true,
            maxSubstitutionsPerDay: true,
          },
        },
      },
    });

    for (const school of activeSchools) {
      const config = school.timetableConfig;
      if (!config?.startTime) {
        skipped++;
        continue;
      }

      // Skip non-working days
      const workingDays = config.workingDays || [1, 2, 3, 4, 5, 6];
      if (!workingDays.includes(dayOfWeek)) {
        skipped++;
        continue;
      }

      // Skip if substitution disabled
      if (config.allowSubstitution === false) {
        skipped++;
        continue;
      }

      // Skip if holiday
      const isHoliday = await isSchoolHoliday(school.id, todayStr);
      if (isHoliday) {
        skipped++;
        continue;
      }

      // Calculate check time for this school
      const checkTime = calculateCheckTime(config.startTime, BUFFER_MINUTES);
      if (checkTime <= now) {
        skipped++;
        continue;
      }

      const delayMs = checkTime.getTime() - now.getTime();

      await crisisQueue.add(
        QUEUE_NAMES.CRISIS_HANDLING,
        {
          type: 'DAILY_ABSENCE_CHECK',
          schoolId: school.id,
          schoolName: school.name,
          date: todayStr,
          dayOfWeek,
          maxSubstitutions: config.maxSubstitutionsPerDay || MAX_AUTO_SUBSTITUTIONS,
          triggeredBy: 'SCHEDULED_CRON',
        },
        {
          delay: delayMs,
          priority: 1,
          attempts: 2,
          backoff: { type: 'fixed', delay: 5000 },
          jobId: `daily-check-${school.id}-${todayStr}`,
          removeOnComplete: true,
          removeOnFail: false,
        }
      );

      scheduled++;
      logger.info(
        {
          school: school.name,
          startTime: config.startTime,
          checkTime: checkTime.toLocaleTimeString('en-IN'),
          delayMin: Math.round(delayMs / 60000),
        },
        '[daily.cron] Scheduled'
      );
    }

    logger.info({ date: todayStr, scheduled, skipped }, '[daily.cron] Scheduling complete');
    return { scheduled, skipped };
  } catch (error) {
    logger.error({ error: error.message }, '[daily.cron] Fatal scheduling error');
    throw error;
  }
};

// EXECUTION — Runs when the delayed job fires for a specific school

export const runSchoolAbsenceCheck = async (schoolId, date, dayOfWeek, maxSubstitutions) => {
  const today = new Date(date);
  today.setHours(0, 0, 0, 0);

  logger.info({ schoolId, date, dayOfWeek }, '[daily.cron] Running absence check');

  // STEP 1: Pre-flight checks

  // Check if RFID devices are online
  const rfidStatus = await checkRFIDStatus(schoolId);
  if (!rfidStatus.online) {
    logger.warn(
      { schoolId, offlineDevices: rfidStatus.offlineCount },
      '[daily.cron] RFID offline — skipping auto-substitution'
    );
    await createCrisisEvent(
      schoolId,
      null,
      'RFID_OFFLINE',
      'CRITICAL',
      'RFID Devices Offline',
      `${rfidStatus.offlineCount} device(s) offline. Manual attendance verification required.`
    );
    return { status: 'skipped', reason: 'rfid_offline' };
  }

  // Check if school day already started (teacher might have arrived late)
  const schoolConfig = await prisma.timetableConfig.findUnique({
    where: { schoolId },
    select: { startTime: true },
  });

  const schoolStartTime = parseTimeToDate(schoolConfig?.startTime || '09:00');
  const now = new Date();
  const schoolStarted = now >= schoolStartTime;

  // STEP 2: Find absent teachers

  const absentTeachers = await findAbsentTeachers(
    schoolId,
    today,
    dayOfWeek,
    schoolStartTime,
    schoolStarted
  );

  if (absentTeachers.length === 0) {
    logger.info({ schoolId }, '[daily.cron] All teachers present');
    return { status: 'ok', absentCount: 0 };
  }

  // STEP 3: Mass absence check

  if (absentTeachers.length >= MASS_ABSENCE_THRESHOLD) {
    logger.warn(
      { schoolId, absentCount: absentTeachers.length },
      '[daily.cron] MASS ABSENCE — escalating to admin'
    );
    await createCrisisEvent(
      schoolId,
      null,
      'MASS_ABSENCE',
      'CRITICAL',
      `Mass Absence Detected — ${absentTeachers.length} Teachers`,
      absentTeachers.map((t) => t.name).join(', ')
    );
    return { status: 'escalated', absentCount: absentTeachers.length, reason: 'mass_absence' };
  }

  // STEP 4: Process each absent teacher

  const activeTimetable = await prisma.timetable.findFirst({
    where: { schoolId, status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    select: { id: true },
  });

  const crisisEvent = await createCrisisEvent(
    schoolId,
    activeTimetable?.id,
    'DAILY_ABSENCE',
    absentTeachers.length > 5 ? 'HIGH' : 'MEDIUM',
    `Daily Check — ${absentTeachers.length} Teacher(s) Absent`,
    absentTeachers.map((t) => `${t.name} (${t.absenceType})`).join(', ')
  );

  let substituted = 0;
  let failed = 0;
  const totalToProcess = Math.min(absentTeachers.length, maxSubstitutions);

  for (const teacher of absentTeachers.slice(0, totalToProcess)) {
    try {
      await crisisQueue.add(
        QUEUE_NAMES.CRISIS_HANDLING,
        {
          type: 'TEACHER_ABSENT',
          schoolId,
          payload: {
            teacherId: teacher.id,
            teacherName: teacher.name,
            date,
            dayOfWeek,
            timetableId: activeTimetable?.id,
            absenceType: teacher.absenceType,
            missedPeriods: teacher.missedPeriods,
            reason: teacher.reason,
            cascadeDepth: 0,
            maxCascadeDepth: MAX_CASCADE_DEPTH,
          },
          crisisEventId: crisisEvent.id,
          metadata: {
            source: 'DAILY_CRON',
            schoolStarted,
          },
        },
        {
          priority: 1,
          attempts: 2,
          backoff: { type: 'fixed', delay: 5000 },
          jobId: `sub-${schoolId}-${teacher.id}-${date}`,
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
      substituted++;
    } catch (err) {
      logger.error(
        { teacher: teacher.name, error: err.message },
        '[daily.cron] Failed to queue substitution'
      );
      failed++;
    }
  }

  // STEP 5: Update crisis event

  await prisma.crisisEvent.update({
    where: { id: crisisEvent.id },
    data: {
      totalAffectedSlots: absentTeachers.length,
      resolvedSlots: substituted,
      status: failed > 0 ? 'PARTIALLY_RESOLVED' : 'IN_PROGRESS',
    },
  });

  const result = {
    status: 'processed',
    absentCount: absentTeachers.length,
    substituted,
    failed,
    escalated:
      absentTeachers.length - totalToProcess > 0 ? absentTeachers.length - totalToProcess : 0,
  };

  logger.info(result, '[daily.cron] Absence check complete');
  return result;
};

// HELPERS

/**
 * Find absent teachers, categorizing by absence type.
 */
async function findAbsentTeachers(schoolId, date, dayOfWeek, schoolStartTime, schoolStarted) {
  const absentMap = new Map();

  // ── Type 1: PLANNED LEAVE (leave range covers today) ──
  const plannedLeave = await prisma.teacher.findMany({
    where: {
      schoolId,
      isActive: true,
      isOnLeave: true,
      leaveStart: { lte: date },
      leaveEnd: { gte: date },
    },
    select: { id: true, name: true },
  });
  for (const t of plannedLeave) {
    // Check if substitute already assigned
    const hasSub = await hasExistingSubstitute(t.id, date);
    if (!hasSub) {
      absentMap.set(t.id, {
        ...t,
        absenceType: 'PLANNED_LEAVE',
        missedPeriods: null, // Full day
        reason: 'On planned leave',
      });
    }
  }

  // ── Type 2: NO CLOCK-IN (didn't arrive at all) ──
  const noClockIn = await prisma.teacher.findMany({
    where: {
      schoolId,
      isActive: true,
      isOnLeave: false,
      id: { notIn: Array.from(absentMap.keys()) },
      attendance: {
        none: {
          date,
          clockIn: { not: null },
        },
      },
    },
    select: { id: true, name: true },
  });
  for (const t of noClockIn) {
    const hasSwap = await hasExistingSwap(t.id, date);
    if (!hasSwap) {
      absentMap.set(t.id, {
        ...t,
        absenceType: 'NO_SHOW',
        missedPeriods: null, // Full day
        reason: 'Did not clock in',
      });
    }
  }

  // ── Type 3: LATE (clocked in after school started) ──
  if (schoolStarted) {
    const lateTeachers = await prisma.teacher.findMany({
      where: {
        schoolId,
        isActive: true,
        isOnLeave: false,
        id: { notIn: Array.from(absentMap.keys()) },
        attendance: {
          some: {
            date,
            clockIn: { gt: schoolStartTime },
          },
        },
      },
      select: {
        id: true,
        name: true,
        attendance: {
          where: { date },
          select: { clockIn: true },
          take: 1,
        },
      },
    });

    for (const t of lateTeachers) {
      const clockInTime = t.attendance[0]?.clockIn;
      const missedPeriods = calculateMissedPeriods(schoolStartTime, clockInTime);

      if (missedPeriods.length > 0) {
        const hasSwap = await hasExistingSwap(t.id, date);
        if (!hasSwap) {
          absentMap.set(t.id, {
            ...t,
            absenceType: 'LATE',
            missedPeriods,
            reason: `Clocked in at ${clockInTime?.toLocaleTimeString()}`,
          });
        }
      }
    }
  }

  // ── Type 4: HALF-DAY / WELLNESS BLOCK ──
  const wellnessBlocks = await prisma.teacherWellness.findMany({
    where: { schoolId, teacher: { isActive: true, isOnLeave: false } },
    select: { teacherId: true, teacher: { select: { name: true } }, personalBlocks: true },
  });

  for (const w of wellnessBlocks) {
    if (absentMap.has(w.teacherId)) continue;

    const todayBlock = w.personalBlocks?.find((b) => b.day === dayOfWeek);
    if (todayBlock) {
      const hasSwap = await hasExistingSwap(w.teacherId, date);
      if (!hasSwap) {
        absentMap.set(w.teacherId, {
          id: w.teacherId,
          name: w.teacher?.name || 'Unknown',
          absenceType: 'HALF_DAY',
          missedPeriods: todayBlock.periods || null,
          reason: todayBlock.reason || 'Personal block',
        });
      }
    }
  }

  return Array.from(absentMap.values());
}

/**
 * Check if a teacher already has a substitute assigned.
 */
async function hasExistingSubstitute(teacherId, date) {
  const existing = await prisma.crisisEvent.findFirst({
    where: {
      affectedTeacherIds: { has: teacherId },
      status: { in: ['REPORTED', 'IN_PROGRESS', 'RESOLVED'] },
      createdAt: { gte: new Date(date) },
      type: { in: ['DAILY_ABSENCE', 'TEACHER_ABSENT', 'MASS_LEAVE'] },
    },
  });
  return !!existing;
}

/**
 * Check if a teacher has a pre-arranged swap.
 */
async function hasExistingSwap(teacherId, date) {
  const swap = await prisma.timetableSwap.findFirst({
    where: {
      OR: [
        { originalTeacherId: teacherId, date, status: { in: ['PENDING', 'APPROVED'] } },
        { newTeacherId: teacherId, date, status: { in: ['PENDING', 'APPROVED'] } },
      ],
    },
  });
  return !!swap;
}

/**
 * Check RFID device status for a school.
 */
async function checkRFIDStatus(schoolId) {
  const devices = await prisma.device.findMany({
    where: { schoolId, type: 'RFID' },
    select: { status: true },
  });

  const online = devices.filter((d) => d.status === 'ONLINE').length;
  const offline = devices.filter((d) => d.status === 'OFFLINE').length;

  return {
    online: online > 0,
    onlineCount: online,
    offlineCount: offline,
    total: devices.length,
  };
}

/**
 * Check if today is a school holiday.
 */
async function isSchoolHoliday(schoolId, dateStr) {
  const holiday = await prisma.schoolCalendar.findFirst({
    where: { schoolId, date: new Date(dateStr), type: 'HOLIDAY' },
  });
  return !!holiday;
}

/**
 * Calculate check time (startTime - buffer).
 */
function calculateCheckTime(startTime, bufferMinutes) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const checkDate = new Date();
  checkDate.setHours(hours, minutes, 0, 0);
  checkDate.setMinutes(checkDate.getMinutes() - bufferMinutes);
  return checkDate;
}

/**
 * Parse "HH:MM" string to Date object (today).
 */
function parseTimeToDate(timeStr) {
  const [hours, minutes] = (timeStr || '09:00').split(':').map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/**
 * Calculate which periods a late teacher missed.
 */
function calculateMissedPeriods(schoolStartTime, clockInTime) {
  if (!clockInTime || clockInTime <= schoolStartTime) return [];

  const missedMinutes = Math.floor((clockInTime - schoolStartTime) / 60000);
  const periodsMissed = Math.ceil(missedMinutes / 50); // Assuming 50-min periods

  const periods = [];
  for (let i = 1; i <= periodsMissed; i++) {
    periods.push(i);
  }
  return periods;
}

/**
 * Create a crisis event record.
 */
async function createCrisisEvent(schoolId, timetableId, type, severity, title, description) {
  return prisma.crisisEvent.create({
    data: {
      schoolId,
      timetableId,
      type,
      severity,
      status: 'REPORTED',
      title,
      description,
      triggeredBy: 'DAILY_CRON',
    },
  });
}
