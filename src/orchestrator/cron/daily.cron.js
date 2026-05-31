// =============================================================================
// orchestrator/cron/daily.cron.js — RESQID
// Fires 30 min before school starts. Checks absences, triggers REPLACE.
// =============================================================================

import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';
import { substituteQueue } from '../queues/queue.config.js';
import { QUEUE_NAMES } from '../queues/queue.names.js';

/**
 * Daily cron: find all active schools, check for absent teachers,
 * push substitute jobs to queue.
 */
export const runDailyCron = async () => {
  logger.info('[daily.cron] Starting daily absence check');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Get all active schools
  const activeSchools = await prisma.school.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true },
  });

  let totalJobs = 0;

  for (const school of activeSchools) {
    // 2. Skip if holiday or suspended
    const isHoliday = await prisma.schoolCalendar.findFirst({
      where: { schoolId: school.id, date: today, type: 'HOLIDAY' },
    });

    if (isHoliday) {
      logger.debug({ school: school.name }, '[daily.cron] Holiday — skipping');
      continue;
    }

    // 3. Count absent teachers
    const absentCount = await prisma.teacherAttendance.count({
      where: {
        schoolId: school.id,
        date: today,
        status: { in: ['ABSENT', 'LATE'] },
      },
    });

    if (absentCount === 0) {
      logger.debug({ school: school.name }, '[daily.cron] All present — skipping');
      continue;
    }

    // 4. Push to substitute queue
    await substituteQueue.add(
      'DAILY_REPLACE',
      {
        schoolId: school.id,
        date: today.toISOString(),
        absentCount,
      },
      {
        priority: 1,
        attempts: 2,
        backoff: { type: 'fixed', delay: 5000 },
        jobId: `daily-replace-${school.id}-${today.toISOString().split('T')[0]}`,
      }
    );

    totalJobs++;
    logger.info({ school: school.name, absentCount }, '[daily.cron] REPLACE job queued');
  }

  logger.info({ totalJobs, schoolsChecked: activeSchools.length }, '[daily.cron] Complete');
  return { schoolsChecked: activeSchools.length, jobsQueued: totalJobs };
};
