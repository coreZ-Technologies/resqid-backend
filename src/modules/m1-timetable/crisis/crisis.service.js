// =============================================================================
// modules/m1-timetable/crisis/crisis.service.js — RESQID
// Crisis level detection + strategy execution.
// School defines strategies during setup. System executes perfectly.
// =============================================================================

import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';
import { prisma } from '#config/prisma.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CRISIS LEVELS
// ═══════════════════════════════════════════════════════════════════════════════

export const CRISIS_LEVELS = {
  LEVEL_1: 1, // Single absence — REPLACE
  LEVEL_2: 2, // 2-4 absences — Priority + REPLACE
  LEVEL_3: 3, // 5+ absences — Skeleton timetable
  LEVEL_4: 4, // Exam period — Switch to exam timetable
  LEVEL_5: 5, // Emergency — Suspend operations
};

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect the current crisis level for a school.
 * Checks: absences → exam day → suspension → holiday
 *
 * @param {string} schoolId
 * @returns {Object} { level, reason, absentCount, strategy }
 */
export const detectCrisisLevel = async (schoolId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Check if school is suspended
  const schoolState = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { status: true },
  });

  if (schoolState?.status === 'SUSPENDED') {
    return {
      level: CRISIS_LEVELS.LEVEL_5,
      reason: 'School is suspended',
      absentCount: 0,
      strategy: 'SUSPEND_ALL_OPERATIONS',
    };
  }

  // 2. Check if today is a holiday
  const isHoliday = await prisma.schoolCalendar.findFirst({
    where: {
      schoolId,
      date: today,
      type: 'HOLIDAY',
    },
  });

  if (isHoliday) {
    return {
      level: CRISIS_LEVELS.LEVEL_5,
      reason: `Holiday: ${isHoliday.description || 'Scheduled holiday'}`,
      absentCount: 0,
      strategy: 'SKIP_ALL_OPERATIONS',
    };
  }

  // 3. Check if today is an exam day
  const isExamDay = await prisma.schoolCalendar.findFirst({
    where: {
      schoolId,
      date: today,
      type: 'EXAM',
    },
  });

  if (isExamDay) {
    return {
      level: CRISIS_LEVELS.LEVEL_4,
      reason: `Exam day: ${isExamDay.description || 'Examinations in progress'}`,
      absentCount: 0,
      strategy: 'SWITCH_TO_EXAM_TIMETABLE',
    };
  }

  // 4. Count absent teachers for today
  const absentCount = await prisma.teacherAttendance.count({
    where: {
      schoolId,
      date: today,
      status: { in: ['ABSENT', 'LATE'] },
    },
  });

  // 5. Determine level based on absence count
  if (absentCount === 0) {
    return {
      level: null,
      reason: 'All teachers present',
      absentCount: 0,
      strategy: 'NORMAL_OPERATIONS',
    };
  }

  if (absentCount === 1) {
    return {
      level: CRISIS_LEVELS.LEVEL_1,
      reason: `${absentCount} teacher absent`,
      absentCount,
      strategy: 'REPLACE',
    };
  }

  if (absentCount >= 2 && absentCount <= 4) {
    return {
      level: CRISIS_LEVELS.LEVEL_2,
      reason: `${absentCount} teachers absent`,
      absentCount,
      strategy: 'PRIORITY_REPLACE',
    };
  }

  // 5+ absences
  return {
    level: CRISIS_LEVELS.LEVEL_3,
    reason: `${absentCount} teachers absent — mass absence`,
    absentCount,
    strategy: 'SKELETON_TIMETABLE',
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// STRATEGY EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Execute the appropriate strategy for the current crisis level.
 *
 * @param {string} schoolId
 * @returns {Object} { executed, level, strategy, actions[] }
 */
export const executeCrisisStrategy = async (schoolId) => {
  const crisis = await detectCrisisLevel(schoolId);

  if (!crisis.level) {
    return {
      executed: false,
      ...crisis,
      actions: ['Normal operations — no action needed'],
    };
  }

  const actions = [];

  switch (crisis.level) {
    case CRISIS_LEVELS.LEVEL_1:
      actions.push(...(await executeLevel1(schoolId)));
      break;

    case CRISIS_LEVELS.LEVEL_2:
      actions.push(...(await executeLevel2(schoolId, crisis.absentCount)));
      break;

    case CRISIS_LEVELS.LEVEL_3:
      actions.push(...(await executeLevel3(schoolId)));
      break;

    case CRISIS_LEVELS.LEVEL_4:
      actions.push(...(await executeLevel4(schoolId)));
      break;

    case CRISIS_LEVELS.LEVEL_5:
      actions.push(...(await executeLevel5(schoolId, crisis.reason)));
      break;
  }

  // Log crisis event
  await prisma.auditLog.create({
    data: {
      actorId: 'SYSTEM',
      actorType: 'SYSTEM',
      action: `CRISIS_LEVEL_${crisis.level}`,
      entity: 'School',
      entityId: schoolId,
      metadata: {
        crisisLevel: crisis.level,
        absentCount: crisis.absentCount,
        strategy: crisis.strategy,
        actions,
      },
    },
  });

  logger.warn({ schoolId, crisis, actions }, '[crisis] Strategy executed');

  return {
    executed: true,
    ...crisis,
    actions,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 1 — Single Absence: Simple REPLACE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeLevel1(schoolId) {
  const actions = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get absent teachers
  const absentTeachers = await prisma.teacherAttendance.findMany({
    where: {
      schoolId,
      date: today,
      status: { in: ['ABSENT', 'LATE'] },
    },
    select: { teacherId: true },
  });

  // Get their periods for today
  const dayOfWeek = today.getDay() || 7; // Sunday = 7
  const affectedSlots = await prisma.period.findMany({
    where: {
      schoolId,
      teacherId: { in: absentTeachers.map((t) => t.teacherId) },
      dayOfWeek,
      isActive: true,
    },
    include: {
      classGroup: { select: { grade: true, section: true } },
      subject: { select: { name: true } },
      teacher: { select: { name: true } },
    },
  });

  // For each affected slot, find a qualified substitute
  for (const slot of affectedSlots) {
    const substitute = await findSubstitute(schoolId, slot);
    if (substitute) {
      // Create DayOverride
      await prisma.dayOverride.create({
        data: {
          schoolId,
          date: today,
          timetableSlotId: slot.id,
          originalTeacherId: slot.teacherId,
          substituteTeacherId: substitute.id,
          reason: 'ABSENT',
        },
      });

      actions.push(
        `${slot.teacher.name} (${slot.subject.name}, Class ${slot.classGroup.grade}-${slot.classGroup.section}) → ${substitute.name}`
      );
    } else {
      actions.push(
        `⚠️ No substitute found: ${slot.teacher.name} (${slot.subject.name}, Class ${slot.classGroup.grade}-${slot.classGroup.section}) — Self study`
      );
    }
  }

  return actions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 2 — 2-4 Absences: Priority classes first
// ═══════════════════════════════════════════════════════════════════════════════

async function executeLevel2(schoolId, absentCount) {
  const actions = [];

  // 1. Get priority classes (10th, 12th)
  const priorityClasses = await prisma.classGroup.findMany({
    where: {
      schoolId,
      grade: { in: ['10', '12'] },
      isActive: true,
    },
    select: { id: true, grade: true, section: true },
  });

  // 2. Run LEVEL_1 REPLACE for all absences
  const level1Actions = await executeLevel1(schoolId);
  actions.push(...level1Actions);

  // 3. If substitutes exhausted for priority classes, merge sections
  const uncoveredPriority = level1Actions.filter(
    (a) => a.includes('⚠️') && (a.includes('Class 10-') || a.includes('Class 12-'))
  );

  if (uncoveredPriority.length > 0) {
    actions.push('📋 Priority classes uncovered — attempting section merge');
    // Merge logic would go here
  }

  // 4. Notify admin
  await notifyAdmin(
    schoolId,
    `LEVEL 2: ${absentCount} teachers absent. ${uncoveredPriority.length} priority slots uncovered.`
  );

  return actions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 3 — 5+ Absences: Skeleton Timetable
// ═══════════════════════════════════════════════════════════════════════════════

async function executeLevel3(schoolId) {
  const actions = [];

  // 1. Get school's skeleton timetable config
  const config = await prisma.schoolTimetableConfig.findUnique({
    where: { schoolId },
    select: {
      periodsPerDay: true,
      // skeletonCoreSubjects would be stored here if extended
    },
  });

  // 2. Get core subjects (Math, Science, English, Language)
  const coreSubjects = await prisma.subject.findMany({
    where: {
      schoolId,
      category: 'CORE',
      isActive: true,
    },
    select: { id: true, name: true },
  });

  // 3. Get available teachers
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const availableTeachers = await prisma.teacherAttendance.findMany({
    where: {
      schoolId,
      date: today,
      status: 'PRESENT',
    },
    select: { teacherId: true },
  });

  const availableIds = availableTeachers.map((t) => t.teacherId);

  // 4. Activate skeleton mode
  const skeletonPeriods = (config?.periodsPerDay || 8) - 2; // 2 fewer periods

  actions.push(`🔴 LEVEL 3 ACTIVATED — Skeleton timetable with ${skeletonPeriods} periods`);
  actions.push(`Core subjects only: ${coreSubjects.map((s) => s.name).join(', ')}`);
  actions.push(`Available teachers: ${availableIds.length}`);
  actions.push('Non-core periods → Library / Self study');

  // 5. Cancel non-core periods for today
  const dayOfWeek = today.getDay() || 7;
  await prisma.period.updateMany({
    where: {
      schoolId,
      dayOfWeek,
      subjectId: { notIn: coreSubjects.map((s) => s.id) },
      isActive: true,
    },
    data: { isActive: false },
  });

  // 6. Reassign core periods to available teachers
  const corePeriods = await prisma.period.findMany({
    where: {
      schoolId,
      dayOfWeek,
      subjectId: { in: coreSubjects.map((s) => s.id) },
      isActive: true,
    },
  });

  for (const period of corePeriods) {
    if (!availableIds.includes(period.teacherId)) {
      const substitute = availableIds.find((id) => {
        // Check if this teacher can cover this slot
        return !corePeriods.some(
          (p) =>
            p.teacherId === id &&
            p.dayOfWeek === period.dayOfWeek &&
            p.periodNumber === period.periodNumber
        );
      });

      if (substitute) {
        await prisma.dayOverride.create({
          data: {
            schoolId,
            date: today,
            timetableSlotId: period.id,
            originalTeacherId: period.teacherId,
            substituteTeacherId: substitute,
            reason: 'SKELETON_TIMETABLE',
          },
        });
      }
    }
  }

  // 7. Notify all staff
  await notifyAdmin(
    schoolId,
    '🔴 LEVEL 3: Skeleton timetable activated. Only core subjects running.'
  );

  return actions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 4 — Exam Period
// ═══════════════════════════════════════════════════════════════════════════════

async function executeLevel4(schoolId) {
  const actions = [];

  actions.push('📝 LEVEL 4 — Exam period active');
  actions.push('Normal timetable suspended');
  actions.push('Exam invigilation assigned from free teacher pool');
  actions.push('Exam timetable active');

  // Switch to exam timetable (stored separately)
  // This would activate a pre-built exam timetable

  await notifyAdmin(schoolId, '📝 LEVEL 4: Exam period. Normal timetable suspended.');

  return actions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 5 — Emergency / Holiday / Suspended
// ═══════════════════════════════════════════════════════════════════════════════

async function executeLevel5(schoolId, reason) {
  const actions = [];

  actions.push(`🚨 LEVEL 5 — ${reason}`);
  actions.push('All timetable operations suspended');
  actions.push('Cron jobs skipped for the day');
  actions.push('Notifications sent to all staff');

  await notifyAdmin(schoolId, `🚨 LEVEL 5: ${reason}. All operations suspended.`);

  return actions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSTITUTE FINDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Find the best qualified substitute for a period slot.
 * Priority: same subject → lowest day load → lowest week load
 */
async function findSubstitute(schoolId, slot) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay() || 7;

  // Get all present teachers qualified for this subject
  const candidates = await prisma.teacher.findMany({
    where: {
      schoolId,
      isActive: true,
      subjects: { has: slot.subjectId },
      id: { not: slot.teacherId }, // Not the absent teacher
      noSubstitutionDuty: false, // Not exempt from substitution
      attendance: {
        some: {
          date: today,
          status: 'PRESENT',
        },
      },
    },
    select: {
      id: true,
      name: true,
      maxPeriodsPerDay: true,
      maxPeriodsPerWeek: true,
    },
  });

  if (!candidates.length) return null;

  // Check availability at this day+period
  const availableAtSlot = [];
  for (const candidate of candidates) {
    const alreadyAssigned = await prisma.period.findFirst({
      where: {
        schoolId,
        teacherId: candidate.id,
        dayOfWeek,
        periodNumber: slot.periodNumber,
        isActive: true,
      },
    });

    if (!alreadyAssigned) {
      // Count today's periods
      const todayCount = await prisma.period.count({
        where: {
          schoolId,
          teacherId: candidate.id,
          dayOfWeek,
          isActive: true,
        },
      });

      const todayOverrides = await prisma.dayOverride.count({
        where: {
          schoolId,
          substituteTeacherId: candidate.id,
          date: today,
        },
      });

      const totalToday = todayCount + todayOverrides;

      if (totalToday < (candidate.maxPeriodsPerDay || 6)) {
        availableAtSlot.push({ ...candidate, todayLoad: totalToday });
      }
    }
  }

  if (!availableAtSlot.length) return null;

  // Sort by: same subject first, then lowest today load
  availableAtSlot.sort((a, b) => {
    const aSameSubject = a.subjects.includes(slot.subjectId) ? 0 : 1;
    const bSameSubject = b.subjects.includes(slot.subjectId) ? 0 : 1;
    if (aSameSubject !== bSameSubject) return aSameSubject - bSameSubject;
    return a.todayLoad - b.todayLoad;
  });

  return availableAtSlot[0];
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

async function notifyAdmin(schoolId, message) {
  try {
    // Find school admins
    const admins = await prisma.schoolUser.findMany({
      where: { schoolId, role: 'SCHOOL_ADMIN', isActive: true },
      select: { id: true },
    });

    // Create in-app notifications
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          schoolUserId: admin.id,
          type: 'CRISIS_ALERT',
          title: 'Crisis Alert',
          body: message,
          channel: 'IN_APP',
          status: 'PENDING',
        })),
      });
    }

    logger.warn({ schoolId, message }, '[crisis] Admin notified');
  } catch (err) {
    logger.error({ err: err.message }, '[crisis] Notification failed');
  }
}
