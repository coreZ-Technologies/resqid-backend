// =============================================================================
// orchestrator/cron/daily.cron.js — RESQID
// Fires 30 min before school starts. Checks absences, triggers REPLACE.
// =============================================================================

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

  try {
    // 1. Get all active schools with timetable config
    const activeSchools = await prisma.school.findMany({
      where: {
        status: 'ACTIVE',
      },
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

    for (const school of activeSchools) {
      try {
        // 2. Skip if not a working day for this school
        const workingDays = school.timetableConfig?.workingDays || [1, 2, 3, 4, 5, 6];
        if (!workingDays.includes(dayOfWeek)) {
          logger.debug(
            { school: school.name, dayOfWeek },
            '[daily.cron] Not a working day — skipping'
          );
          schoolsSkipped++;
          continue;
        }

        // 3. Skip if substitutions are disabled
        if (school.timetableConfig?.allowSubstitution === false) {
          logger.debug({ school: school.name }, '[daily.cron] Substitutions disabled — skipping');
          schoolsSkipped++;
          continue;
        }

        // 4. Skip if holiday
        const isHoliday = await prisma.schoolCalendar
          ?.findFirst({
            where: {
              schoolId: school.id,
              date: today,
              type: 'HOLIDAY',
            },
          })
          .catch(() => null);

        if (isHoliday) {
          logger.debug({ school: school.name }, '[daily.cron] Holiday — skipping');
          schoolsSkipped++;
          continue;
        }

        // 5. Get active/published timetable for today
        const activeTimetable = await prisma.timetable.findFirst({
          where: {
            schoolId: school.id,
            status: 'PUBLISHED',
          },
          orderBy: { publishedAt: 'desc' },
          select: { id: true },
        });

        if (!activeTimetable) {
          logger.debug({ school: school.name }, '[daily.cron] No published timetable — skipping');
          schoolsSkipped++;
          continue;
        }

        // 6. Find teachers marked as absent/on-leave today
        const absentTeachers = await prisma.teacher.findMany({
          where: {
            schoolId: school.id,
            isActive: true,
            OR: [
              // Teachers with leave covering today
              {
                isOnLeave: true,
                leaveStart: { lte: today },
                leaveEnd: { gte: today },
              },
              // Teachers with specific leave days including today
              {
                leaveDays: { has: dayOfWeek },
              },
              // Teachers marked unavailable today
              {
                unavailableDays: { has: dayOfWeek },
              },
            ],
          },
          select: {
            id: true,
            name: true,
            employeeId: true,
          },
        });

        // Also check wellness records for emergency leave
        const wellnessAbsent = await prisma.teacherWellness.findMany({
          where: {
            schoolId: school.id,
            personalBlocks: {
              path: ['$'],
              array_contains: [{ day: dayOfWeek }],
            },
          },
          select: {
            teacherId: true,
            teacher: { select: { name: true, employeeId: true } },
          },
        });

        // Combine all absent teachers (deduplicate)
        const allAbsent = new Map();
        for (const t of absentTeachers) {
          allAbsent.set(t.id, t);
        }
        for (const w of wellnessAbsent) {
          if (!allAbsent.has(w.teacherId)) {
            allAbsent.set(w.teacherId, {
              id: w.teacherId,
              name: w.teacher?.name || 'Unknown',
              employeeId: w.teacher?.employeeId,
            });
          }
        }

        const absentList = Array.from(allAbsent.values());

        if (absentList.length === 0) {
          logger.debug({ school: school.name }, '[daily.cron] All teachers present — skipping');
          schoolsSkipped++;
          continue;
        }

        // 7. Check max substitutions per day
        const maxSubs = school.timetableConfig?.maxSubstitutionsPerDay || 3;

        if (absentList.length > maxSubs * 3) {
          logger.warn(
            {
              school: school.name,
              absentCount: absentList.length,
              maxSubs,
            },
            '[daily.cron] High absenteeism detected — may need manual intervention'
          );
        }

        // 8. Create a MASS_LEAVE crisis event
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
            totalAffectedSlots: 0, // Will be calculated by worker
            triggeredBy: 'CRON',
            triggerReason: `Daily cron detected ${absentList.length} absent teachers`,
          },
        });

        // 9. Push to crisis queue for each absent teacher
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
              priority: 1, // High priority for daily operations
              attempts: 2,
              backoff: { type: 'fixed', delay: 5000 },
              jobId: `daily-absent-${school.id}-${teacher.id}-${todayStr}`,
              removeOnComplete: true,
              removeOnFail: false, // Keep failed for debugging
            }
          );

          totalJobs++;
        }

        logger.info(
          {
            school: school.name,
            absentTeachers: absentList.map((t) => t.name),
            crisisEventId: crisisEvent.id,
            jobsCreated: absentList.length,
          },
          '[daily.cron] Crisis jobs queued'
        );
      } catch (schoolError) {
        // Don't fail entire cron for one school
        logger.error(
          {
            school: school.name,
            schoolId: school.id,
            error: schoolError.message,
          },
          '[daily.cron] Error processing school'
        );
        schoolsSkipped++;
      }
    }

    const summary = {
      schoolsChecked,
      schoolsWithAbsences: schoolsChecked - schoolsSkipped,
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
 * Run cron for a specific school (manual trigger or per-school schedule).
 */
export const runSchoolCron = async (schoolId) => {
  logger.info({ schoolId }, '[daily.cron] Running school-specific check');

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, name: true, timezone: true },
  });

  if (!school) {
    throw new Error(`School ${schoolId} not found`);
  }

  // Delegate to main cron logic but filter for this school
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const absentTeachers = await prisma.teacher.findMany({
    where: {
      schoolId,
      isActive: true,
      OR: [
        {
          isOnLeave: true,
          leaveStart: { lte: today },
          leaveEnd: { gte: today },
        },
        {
          leaveDays: { has: today.getDay() || 7 },
        },
      ],
    },
    select: { id: true, name: true },
  });

  logger.info(
    { school: school.name, absentCount: absentTeachers.length },
    '[daily.cron] School check complete'
  );

  return {
    schoolId,
    schoolName: school.name,
    date: today.toISOString().split('T')[0],
    absentTeachers: absentTeachers.map((t) => ({ id: t.id, name: t.name })),
    absentCount: absentTeachers.length,
  };
};
