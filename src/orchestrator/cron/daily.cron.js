// orchestrator/cron/daily.cron.js — RESQID
// Fires 30 min before school starts. Checks absences, triggers REPLACE.

import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';
import { crisisQueue } from '../queues/queue.config.js';
import { QUEUE_NAMES } from '../queues/queue.names.js';

/**
 * Daily cron: find all active schools, check for absent teachers,
 * push crisis jobs to queue for automatic substitution.
 *
 * Runs ~30 minutes before each school's start time (timezone-aware).
 */
export const runDailyCron = async () => {
  logger.info('[daily.cron] Starting daily absence check');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  const dayOfWeek = today.getDay() || 7; // 1=Mon, 7=Sun

  let totalJobs = 0;
  let schoolsChecked = 0;
  let schoolsSkipped = 0;
  let schoolsWithAbsences = 0;

  try {
    // 1. Get all active schools with timetable config
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

    schoolsChecked = activeSchools.length;
    logger.info({ schoolCount: schoolsChecked }, '[daily.cron] Schools to check');

    for (const school of activeSchools) {
      try {
        // 2. Skip if not a working day
        const workingDays = school.timetableConfig?.workingDays || [1, 2, 3, 4, 5, 6];
        if (!workingDays.includes(dayOfWeek)) {
          schoolsSkipped++;
          continue;
        }

        // 3. Skip if substitutions disabled
        if (school.timetableConfig?.allowSubstitution === false) {
          schoolsSkipped++;
          continue;
        }

        // 4. Skip if holiday
        const isHoliday = await prisma.schoolCalendar
          ?.findFirst({
            where: { schoolId: school.id, date: today, type: 'HOLIDAY' },
          })
          .catch(() => null);

        if (isHoliday) {
          schoolsSkipped++;
          continue;
        }

        // 5. Get active PUBLISHED timetable
        const activeTimetable = await prisma.timetable.findFirst({
          where: { schoolId: school.id, status: 'PUBLISHED' },
          orderBy: { publishedAt: 'desc' },
          select: { id: true },
        });

        if (!activeTimetable) {
          schoolsSkipped++;
          continue;
        }

        // 6. Find absent teachers
        const absentList = await findAbsentTeachers(school.id, today, dayOfWeek);

        if (absentList.length === 0) {
          schoolsSkipped++;
          continue;
        }

        schoolsWithAbsences++;

        // 7. Check max substitutions
        const maxSubs = school.timetableConfig?.maxSubstitutionsPerDay || 3;

        if (absentList.length > maxSubs * 3) {
          logger.warn(
            {
              school: school.name,
              absentCount: absentList.length,
              maxSubs,
            },
            '[daily.cron] High absenteeism — may need manual intervention'
          );
        }

        // 8. Create crisis event
        const crisisEvent = await prisma.crisisEvent.create({
          data: {
            schoolId: school.id,
            timetableId: activeTimetable.id,
            type: 'MASS_LEAVE',
            severity: absentList.length > 5 ? 'HIGH' : 'MEDIUM',
            status: 'REPORTED',
            title: `Daily Absence Check — ${absentList.length} teacher(s) absent`,
            description: `Auto-detected absences for ${todayStr}: ${absentList.map((t) => t.name).join(', ')}`,
            affectedTeacherIds: absentList.map((t) => t.id),
            totalAffectedSlots: 0,
            triggeredBy: 'CRON',
            triggerReason: `Daily cron detected ${absentList.length} absent teachers`,
          },
        });

        // 9. Push to crisis queue
        for (const teacher of absentList) {
          await crisisQueue.add(
            QUEUE_NAMES.CRISIS_HANDLING,
            {
              type: 'TEACHER_ABSENT',
              schoolId: school.id,
              payload: {
                teacherId: teacher.id,
                date: todayStr,
                timetableId: activeTimetable.id,
                reason: `Auto-detected absence on ${todayStr}`,
              },
              crisisEventId: crisisEvent.id,
              metadata: {
                source: 'DAILY_CRON',
                schoolName: school.name,
                teacherName: teacher.name,
                dayOfWeek,
              },
            },
            {
              priority: 1,
              attempts: 2,
              backoff: { type: 'fixed', delay: 5000 },
              jobId: `daily-absent-${school.id}-${teacher.id}-${todayStr}`,
              removeOnComplete: true,
              removeOnFail: false,
            }
          );
          totalJobs++;
        }

        logger.info(
          {
            school: school.name,
            absentCount: absentList.length,
            crisisEventId: crisisEvent.id,
            jobsCreated: absentList.length,
          },
          '[daily.cron] Crisis jobs queued'
        );
      } catch (schoolError) {
        logger.error(
          { school: school.name, schoolId: school.id, error: schoolError.message },
          '[daily.cron] Error processing school'
        );
        schoolsSkipped++;
      }
    }

    const summary = {
      schoolsChecked,
      schoolsWithAbsences,
      schoolsSkipped,
      totalJobsCreated: totalJobs,
      date: todayStr,
      dayOfWeek,
    };

    logger.info(summary, '[daily.cron] Daily cron complete');
    return summary;
  } catch (error) {
    logger.error(
      { error: error.message, stack: error.stack },
      '[daily.cron] Fatal error in daily cron'
    );
    throw error;
  }
};

/**
 * Run cron for a specific school (manual trigger).
 */
export const runSchoolCron = async (schoolId) => {
  logger.info({ schoolId }, '[daily.cron] Running school-specific check');

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, name: true },
  });

  if (!school) {
    throw new Error(`School ${schoolId} not found`);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay() || 7;

  const absentList = await findAbsentTeachers(schoolId, today, dayOfWeek);

  logger.info(
    { school: school.name, absentCount: absentList.length },
    '[daily.cron] School check complete'
  );

  return {
    schoolId,
    schoolName: school.name,
    date: today.toISOString().split('T')[0],
    absentTeachers: absentList.map((t) => ({ id: t.id, name: t.name })),
    absentCount: absentList.length,
  };
};

// HELPERS

/**
 * Find all absent teachers for a school on a given day.
 * Checks: leave range, leave days, unavailable days, wellness blocks.
 */
async function findAbsentTeachers(schoolId, date, dayOfWeek) {
  // 1. Teachers with leave range covering today
  const onLeaveRange = await prisma.teacher.findMany({
    where: {
      schoolId,
      isActive: true,
      isOnLeave: true,
      leaveStart: { lte: date },
      leaveEnd: { gte: date },
    },
    select: { id: true, name: true, employeeId: true },
  });

  // 2. Teachers with specific leave days
  const onLeaveDay = await prisma.teacher.findMany({
    where: {
      schoolId,
      isActive: true,
      isOnLeave: false, // Not already caught by range check
      leaveDays: { has: dayOfWeek },
    },
    select: { id: true, name: true, employeeId: true },
  });

  // 3. Teachers marked unavailable on this day
  const unavailable = await prisma.teacher.findMany({
    where: {
      schoolId,
      isActive: true,
      isOnLeave: false,
      leaveDays: { none: { equals: dayOfWeek } },
      unavailableDays: { has: dayOfWeek },
    },
    select: { id: true, name: true, employeeId: true },
  });

  // 4. Teachers with wellness personal blocks on this day
  const wellnessBlocks = await prisma.teacherWellness.findMany({
    where: {
      schoolId,
      teacher: { isActive: true, isOnLeave: false },
    },
    select: {
      teacherId: true,
      teacher: { select: { name: true, employeeId: true } },
      personalBlocks: true,
    },
  });

  const wellnessAbsent = wellnessBlocks.filter((w) => {
    if (!w.personalBlocks) return false;
    return w.personalBlocks.some((block) => block.day === dayOfWeek);
  });

  // Combine and deduplicate
  const allAbsent = new Map();

  for (const t of onLeaveRange) allAbsent.set(t.id, t);
  for (const t of onLeaveDay) allAbsent.set(t.id, t);
  for (const t of unavailable) allAbsent.set(t.id, t);
  for (const w of wellnessAbsent) {
    if (!allAbsent.has(w.teacherId)) {
      allAbsent.set(w.teacherId, {
        id: w.teacherId,
        name: w.teacher?.name || 'Unknown',
        employeeId: w.teacher?.employeeId,
      });
    }
  }

  return Array.from(allAbsent.values());
}
