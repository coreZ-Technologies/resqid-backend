/**
 * Hard constraints — engine rejects any assignment that violates these.
 * Each function returns { ok: boolean, reason?: string }
 *
 * These are NON-NEGOTIABLE rules. Any violation = invalid timetable.
 */

// =============================================================================
// CORE CONFLICT CHECKS
// =============================================================================

/**
 * No teacher assigned to two slots at the same time.
 */
export function noTeacherDoubleBook(assignment, existing) {
  const clash = existing.find(
    (e) =>
      e.teacherId === assignment.teacherId &&
      e.day === assignment.day &&
      e.period === assignment.period &&
      e.id !== assignment.id
  );
  if (clash)
    return {
      ok: false,
      reason: `Teacher ${assignment.teacherId} double-booked on day ${assignment.day} period ${assignment.period}`,
    };
  return { ok: true };
}

/**
 * No class assigned to two slots at the same time.
 */
export function noClassDoubleBook(assignment, existing) {
  const clash = existing.find(
    (e) =>
      e.classId === assignment.classId &&
      e.day === assignment.day &&
      e.period === assignment.period &&
      e.id !== assignment.id
  );
  if (clash)
    return {
      ok: false,
      reason: `Class ${assignment.classId} double-booked on day ${assignment.day} period ${assignment.period}`,
    };
  return { ok: true };
}

/**
 * No room used by two classes at the same time.
 */
export function noRoomDoubleBook(assignment, existing) {
  if (!assignment.roomId) return { ok: true };
  const clash = existing.find(
    (e) =>
      e.roomId === assignment.roomId &&
      e.day === assignment.day &&
      e.period === assignment.period &&
      e.id !== assignment.id
  );
  if (clash)
    return {
      ok: false,
      reason: `Room ${assignment.roomId} double-booked on day ${assignment.day} period ${assignment.period}`,
    };
  return { ok: true };
}

// =============================================================================
// TIME & SCHEDULE CHECKS
// =============================================================================

/**
 * Assignment must not fall on a break period.
 */
export function notInBreakSlot(assignment, schoolConfig) {
  const breaks = schoolConfig?.breakAfterPeriods || schoolConfig?.breaks || [];
  const isBreak = breaks.some((b) => {
    if (typeof b === 'object') return b.period === assignment.period;
    return b === assignment.period;
  });
  if (isBreak) return { ok: false, reason: `Period ${assignment.period} is a break` };
  return { ok: true };
}

/**
 * Assignment must be within valid period range.
 */
export function validPeriodRange(assignment, schoolConfig) {
  const maxPeriod = schoolConfig?.periodsPerDay ?? 8;
  if (assignment.period < 1 || assignment.period > maxPeriod) {
    return {
      ok: false,
      reason: `Period ${assignment.period} is outside valid range (1-${maxPeriod})`,
    };
  }
  return { ok: true };
}

/**
 * Assignment must be on a working day.
 */
export function validWorkingDay(assignment, schoolConfig) {
  const workingDays = schoolConfig?.workingDays ?? [1, 2, 3, 4, 5, 6];
  if (!workingDays.includes(assignment.day)) {
    return {
      ok: false,
      reason: `Day ${assignment.day} is not a working day`,
    };
  }
  return { ok: true };
}

// =============================================================================
// TEACHER STATUS & QUALIFICATION CHECKS
// =============================================================================

/**
 * Teacher must be active (not suspended, not deleted).
 */
export function teacherActiveOk(assignment, teacherConfig) {
  if (teacherConfig?.isActive === false) {
    return {
      ok: false,
      reason: `Teacher ${assignment.teacherId} is inactive or deleted`,
    };
  }
  return { ok: true };
}

/**
 * Teacher must be qualified to teach the assigned subject.
 */
export function teacherQualifiedForSubject(assignment, teacherConfig) {
  const eligibleSubjects = teacherConfig?.subjects || teacherConfig?.eligibleSubjects || [];

  if (eligibleSubjects.length === 0) {
    return { ok: true }; // No subject restrictions configured
  }

  if (!eligibleSubjects.includes(assignment.subjectId)) {
    return {
      ok: false,
      reason: `Teacher ${assignment.teacherId} is not qualified to teach subject ${assignment.subjectId}`,
    };
  }
  return { ok: true };
}

// =============================================================================
// TEACHER WORKLOAD CHECKS
// =============================================================================

/**
 * Teacher must not exceed max daily load.
 */
export function teacherDailyLoadOk(assignment, existing, teacherConfig) {
  const maxDaily = teacherConfig?.maxPeriodsPerDay ?? 8;
  const count = existing.filter(
    (e) => e.teacherId === assignment.teacherId && e.day === assignment.day
  ).length;
  if (count >= maxDaily)
    return {
      ok: false,
      reason: `Teacher ${assignment.teacherId} exceeds daily load (${count + 1}/${maxDaily}) on day ${assignment.day}`,
    };
  return { ok: true };
}

/**
 * Teacher must not exceed max weekly load.
 */
export function teacherWeeklyLoadOk(assignment, existing, teacherConfig) {
  const maxWeekly = teacherConfig?.maxPeriodsPerWeek ?? 40;
  const count = existing.filter((e) => e.teacherId === assignment.teacherId).length;
  if (count >= maxWeekly)
    return {
      ok: false,
      reason: `Teacher ${assignment.teacherId} exceeds weekly load (${count + 1}/${maxWeekly})`,
    };
  return { ok: true };
}

/**
 * Teacher must not exceed max consecutive periods without a break.
 */
export function teacherConsecutivePeriodsOk(assignment, existing, teacherConfig) {
  const maxConsecutive = teacherConfig?.maxConsecutivePeriods ?? 3;

  // Get all periods for this teacher on this day
  const dayPeriods = existing
    .filter((e) => e.teacherId === assignment.teacherId && e.day === assignment.day)
    .map((e) => e.period);

  dayPeriods.push(assignment.period);
  dayPeriods.sort((a, b) => a - b);

  // Find max consecutive streak
  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < dayPeriods.length; i++) {
    if (dayPeriods[i] === dayPeriods[i - 1] + 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  if (maxStreak > maxConsecutive) {
    return {
      ok: false,
      reason: `Teacher ${assignment.teacherId} would have ${maxStreak} consecutive periods (max: ${maxConsecutive}) on day ${assignment.day}`,
    };
  }

  return { ok: true };
}

// =============================================================================
// TEACHER AVAILABILITY CHECKS
// =============================================================================

/**
 * Part-time teachers must only be assigned within their available slots.
 */
export function partTimeWindowOk(assignment, teacherConfig) {
  if (!teacherConfig?.isPartTime) return { ok: true };

  const availableSlots = teacherConfig?.availableSlots || teacherConfig?.availablePeriods || [];

  if (availableSlots.length === 0) {
    // If part-time but no slots specified, check available days
    const availableDays = teacherConfig?.availableDays || [];
    if (availableDays.length > 0 && !availableDays.includes(assignment.day)) {
      return {
        ok: false,
        reason: `Part-time teacher ${assignment.teacherId} not available on day ${assignment.day}`,
      };
    }
    return { ok: true };
  }

  const ok = availableSlots.some((s) => s.day === assignment.day && s.period === assignment.period);

  if (!ok)
    return {
      ok: false,
      reason: `Part-time teacher ${assignment.teacherId} not available at day ${assignment.day} period ${assignment.period}`,
    };
  return { ok: true };
}

/**
 * Teacher must not be assigned on their unavailable days.
 */
export function teacherAvailableDayOk(assignment, teacherConfig) {
  const unavailableDays = teacherConfig?.unavailableDays || [];
  if (unavailableDays.includes(assignment.day)) {
    return {
      ok: false,
      reason: `Teacher ${assignment.teacherId} unavailable on day ${assignment.day}`,
    };
  }
  return { ok: true };
}

/**
 * Teacher must not be assigned during unavailable periods.
 */
export function teacherAvailablePeriodOk(assignment, teacherConfig) {
  const unavailablePeriods = teacherConfig?.unavailablePeriods || [];

  const isBlocked = unavailablePeriods.some(
    (b) => b.day === assignment.day && b.periods?.includes(assignment.period)
  );

  if (isBlocked) {
    return {
      ok: false,
      reason: `Teacher ${assignment.teacherId} has blocked period ${assignment.period} on day ${assignment.day}`,
    };
  }
  return { ok: true };
}

/**
 * Teacher must not be assigned on leave dates (day-level).
 */
export function teacherNotOnLeave(assignment, teacherConfig) {
  const leaveDays = teacherConfig?.leaveDays || [];
  if (leaveDays.includes(assignment.day)) {
    return {
      ok: false,
      reason: `Teacher ${assignment.teacherId} is on leave on day ${assignment.day}`,
    };
  }
  return { ok: true };
}

/**
 * Teacher must not be on leave for a specific date range.
 */
export function teacherNotOnLeaveDate(assignment, teacherConfig, dateContext) {
  if (!dateContext?.date) return { ok: true };

  // Check if teacher is on leave range
  if (teacherConfig?.isOnLeave) {
    const leaveStart = teacherConfig?.leaveStart;
    const leaveEnd = teacherConfig?.leaveEnd;

    if (leaveStart && leaveEnd) {
      const assignmentDate = new Date(dateContext.date);
      if (assignmentDate >= new Date(leaveStart) && assignmentDate <= new Date(leaveEnd)) {
        return {
          ok: false,
          reason: `Teacher ${assignment.teacherId} is on leave from ${leaveStart} to ${leaveEnd}`,
        };
      }
    }

    // If no date range but isOnLeave is true
    if (!leaveStart) {
      return {
        ok: false,
        reason: `Teacher ${assignment.teacherId} is currently on leave`,
      };
    }
  }

  return { ok: true };
}

// =============================================================================
// TEACHER WELLNESS & ACCESSIBILITY CHECKS (HARD - Cannot Violate)
// =============================================================================

/**
 * Assignment must respect teacher's personal blocks (medical, prayer, etc.).
 */
export function personalBlocksRespected(assignment, teacherWellness) {
  if (!teacherWellness) return { ok: true };

  const blocks = teacherWellness?.personalBlocks || [];

  const isBlocked = blocks.some((b) => b.day === assignment.day && b.period === assignment.period);

  if (isBlocked) {
    return {
      ok: false,
      reason: `Teacher ${assignment.teacherId} has personal block on day ${assignment.day} period ${assignment.period}`,
    };
  }

  return { ok: true };
}

/**
 * Teacher with accessibility needs must be assigned appropriate rooms.
 */
export function teacherAccessibilityOk(assignment, roomConfig, teacherWellness) {
  if (!assignment.roomId || !roomConfig) return { ok: true };
  if (!teacherWellness) return { ok: true };

  // Pregnant teachers MUST be on ground floor
  if (teacherWellness?.isPregnant && roomConfig?.floor > 0) {
    return {
      ok: false,
      reason: `Pregnant teacher ${assignment.teacherId} cannot be assigned to floor ${roomConfig.floor}. Ground floor required.`,
    };
  }

  // Teachers with mobility needs MUST have accessible rooms
  if (teacherWellness?.needsAccessibleRoom && !roomConfig?.isAccessible) {
    return {
      ok: false,
      reason: `Teacher ${assignment.teacherId} requires accessible room, but room ${assignment.roomId} is not accessible`,
    };
  }

  // Check elevator access if room is not on ground floor
  if (
    teacherWellness?.needsAccessibleRoom &&
    roomConfig?.floor > 0 &&
    !roomConfig?.hasElevatorAccess
  ) {
    return {
      ok: false,
      reason: `Teacher ${assignment.teacherId} needs elevator access for floor ${roomConfig.floor}`,
    };
  }

  return { ok: true };
}

// =============================================================================
// ROOM CHECKS
// =============================================================================

/**
 * Room must be available (not under maintenance, not reserved, not inactive).
 */
export function roomAvailabilityOk(assignment, roomConfig) {
  if (!assignment.roomId) return { ok: true };

  if (!roomConfig) {
    return {
      ok: false,
      reason: `Room ${assignment.roomId} does not exist`,
    };
  }

  if (roomConfig?.isActive === false) {
    return {
      ok: false,
      reason: `Room ${assignment.roomId} is inactive`,
    };
  }

  if (roomConfig?.status && roomConfig.status !== 'AVAILABLE') {
    return {
      ok: false,
      reason: `Room ${assignment.roomId} is ${roomConfig.status.toLowerCase()}`,
    };
  }

  // Check if room is available on this day
  if (roomConfig?.availableDays && !roomConfig.availableDays.includes(assignment.day)) {
    return {
      ok: false,
      reason: `Room ${assignment.roomId} not available on day ${assignment.day}`,
    };
  }

  // Check blocked slots
  if (roomConfig?.blockedSlots) {
    const isBlocked = roomConfig.blockedSlots.some(
      (b) => b.day === assignment.day && b.periods?.includes(assignment.period)
    );
    if (isBlocked) {
      return {
        ok: false,
        reason: `Room ${assignment.roomId} blocked on day ${assignment.day} period ${assignment.period}`,
      };
    }
  }

  return { ok: true };
}

/**
 * Class student count must not exceed room capacity.
 */
export function roomCapacityOk(assignment, roomConfig, classConfig) {
  if (!assignment.roomId || !roomConfig) return { ok: true };

  const studentCount = classConfig?.studentCount ?? 0;
  const roomCapacity = roomConfig?.capacity ?? 999;

  if (studentCount > roomCapacity) {
    return {
      ok: false,
      reason: `Room ${assignment.roomId} capacity (${roomCapacity}) insufficient for class ${assignment.classId} (${studentCount} students)`,
    };
  }

  return { ok: true };
}

/**
 * Lab subjects must be assigned to appropriate lab rooms.
 */
export function labRoomRequired(assignment, subjectConfig, roomConfig) {
  if (!subjectConfig?.requiresLab) return { ok: true };
  if (!assignment.roomId) {
    return {
      ok: false,
      reason: `Subject ${assignment.subjectId} requires a lab room but no room assigned`,
    };
  }

  if (!roomConfig) {
    return {
      ok: false,
      reason: `Lab room ${assignment.roomId} not found for subject ${assignment.subjectId}`,
    };
  }

  // Check if room is a lab type
  if (roomConfig.type !== 'LAB' && roomConfig.type !== 'COMPUTER_LAB') {
    return {
      ok: false,
      reason: `Subject ${assignment.subjectId} requires lab, but room ${assignment.roomId} is type '${roomConfig.type}'`,
    };
  }

  // Check specific lab type match
  if (subjectConfig?.requiredRoomType && roomConfig?.labType !== subjectConfig.requiredRoomType) {
    return {
      ok: false,
      reason: `Subject ${assignment.subjectId} requires ${subjectConfig.requiredRoomType} lab, but room ${assignment.roomId} is ${roomConfig.labType} lab`,
    };
  }

  return { ok: true };
}

// =============================================================================
// SUBJECT & CLASS CHECKS
// =============================================================================

/**
 * Class must not exceed required periods per week for a subject.
 */
export function subjectWeeklyLimitOk(assignment, existing, subjectConfig) {
  const maxPerWeek = subjectConfig?.periodsPerWeek ?? 99;

  const count = existing.filter(
    (e) => e.classId === assignment.classId && e.subjectId === assignment.subjectId
  ).length;

  if (count >= maxPerWeek) {
    return {
      ok: false,
      reason: `Class ${assignment.classId} already has ${count}/${maxPerWeek} periods of subject ${assignment.subjectId} this week`,
    };
  }

  return { ok: true };
}

/**
 * Lab periods must not exceed required lab periods per week.
 */
export function labPeriodsLimitOk(assignment, existing, subjectConfig) {
  if (!subjectConfig?.requiresLab) return { ok: true };

  const maxLab = subjectConfig?.labPeriodsPerWeek ?? subjectConfig?.periodsPerWeek ?? 99;

  const labCount = existing.filter(
    (e) =>
      e.classId === assignment.classId &&
      e.subjectId === assignment.subjectId &&
      e.periodType === 'LAB'
  ).length;

  if (assignment.periodType === 'LAB' && labCount >= maxLab) {
    return {
      ok: false,
      reason: `Class ${assignment.classId} already has ${labCount}/${maxLab} lab periods for subject ${assignment.subjectId}`,
    };
  }

  return { ok: true };
}

/**
 * Class must be active.
 */
export function classActiveOk(assignment, classConfig) {
  if (classConfig?.isActive === false) {
    return {
      ok: false,
      reason: `Class ${assignment.classId} is inactive or archived`,
    };
  }
  return { ok: true };
}

// Add to hard.js

/**
 * Class must respect its grade-level period limits.
 * Different grades can have different maximum periods per day.
 *
 * Grade 1-5: Typically 6 periods
 * Grade 6-8: Typically 7 periods
 * Grade 9-12: Typically 8 periods
 */
export function gradePeriodRangeOk(assignment, classConfig, schoolConfig) {
  if (!classConfig) return { ok: true };

  // Priority: Class override > Grade config > School default
  let maxPeriods;

  // 1. Check if class has specific override
  if (classConfig.periodsPerDay) {
    maxPeriods = classConfig.periodsPerDay;
  }
  // 2. Check grade-level config
  else if (schoolConfig?.gradePeriodLimits) {
    const grade = parseInt(classConfig.grade) || 0;
    const limits = schoolConfig.gradePeriodLimits;

    if (grade <= 5) maxPeriods = limits.primary?.periods || 6;
    else if (grade <= 8) maxPeriods = limits.middle?.periods || 7;
    else if (grade <= 10) maxPeriods = limits.secondary?.periods || 8;
    else maxPeriods = limits.seniorSecondary?.periods || 8;
  }
  // 3. Fall back to school default
  else {
    maxPeriods = schoolConfig?.periodsPerDay || 8;
  }

  if (assignment.period > maxPeriods) {
    return {
      ok: false,
      reason: `Period ${assignment.period} exceeds limit (${maxPeriods}) for Grade ${classConfig.grade} class ${classConfig.section || ''}`,
    };
  }

  return { ok: true };
}

/**
 * Check if class has reached its daily period limit.
 * Prevents scheduling more periods than the class should have in a day.
 */
export function classDailyPeriodLimitOk(assignment, existing, classConfig, schoolConfig) {
  if (!classConfig) return { ok: true };

  const maxPeriods = classConfig.periodsPerDay || schoolConfig?.periodsPerDay || 8;

  const dayCount = existing.filter(
    (e) => e.classId === assignment.classId && e.day === assignment.day
  ).length;

  if (dayCount >= maxPeriods) {
    return {
      ok: false,
      reason: `Class ${assignment.classId} already has ${dayCount}/${maxPeriods} periods on day ${assignment.day}`,
    };
  }

  return { ok: true };
}

/**
 * Check if class has reached its weekly period limit.
 */
export function classWeeklyPeriodLimitOk(assignment, existing, classConfig) {
  if (!classConfig) return { ok: true };

  // Calculate total periods allowed per week for this class
  const periodsPerDay = classConfig.periodsPerDay || 8;
  const workingDays = 6; // Or from schoolConfig
  const maxWeekly = periodsPerDay * workingDays;

  const weeklyCount = existing.filter((e) => e.classId === assignment.classId).length;

  if (weeklyCount >= maxWeekly) {
    return {
      ok: false,
      reason: `Class ${assignment.classId} already has ${weeklyCount}/${maxWeekly} periods this week`,
    };
  }

  return { ok: true };
}

// =============================================================================
// MASTER CHECK - RUNS ALL CONSTRAINTS
// =============================================================================

/**
 * Run all hard constraints. Returns first failure or ok.
 *
 * @param {Object} assignment - The proposed assignment
 * @param {Array} existing - Already placed assignments
 * @param {Object} schoolConfig - School timetable configuration
 * @param {Object} teacherConfig - Teacher-specific configuration
 * @param {Object} context - Additional context (room, class, subject, wellness, date)
 * @returns {{ ok: boolean, reason?: string }}
 */
export function checkAll(
  assignment,
  existing,
  schoolConfig = {},
  teacherConfig = {},
  context = {}
) {
  const {
    roomConfig = null,
    classConfig = null,
    subjectConfig = null,
    teacherWellness = null,
    dateContext = null,
  } = context;

  const checks = [
    // ─── Core Conflict Checks ───
    noTeacherDoubleBook(assignment, existing),
    noClassDoubleBook(assignment, existing),
    noRoomDoubleBook(assignment, existing),

    // ─── Time & Schedule Checks ───
    notInBreakSlot(assignment, schoolConfig),
    validPeriodRange(assignment, schoolConfig),
    validWorkingDay(assignment, schoolConfig),

    // ─── Teacher Status Checks ───
    teacherActiveOk(assignment, teacherConfig),
    teacherQualifiedForSubject(assignment, teacherConfig),

    // ─── Teacher Workload Checks ───
    teacherDailyLoadOk(assignment, existing, teacherConfig),
    teacherWeeklyLoadOk(assignment, existing, teacherConfig),
    teacherConsecutivePeriodsOk(assignment, existing, teacherConfig),

    // ─── Teacher Availability Checks ───
    partTimeWindowOk(assignment, teacherConfig),
    teacherAvailableDayOk(assignment, teacherConfig),
    teacherAvailablePeriodOk(assignment, teacherConfig),
    teacherNotOnLeave(assignment, teacherConfig),
    teacherNotOnLeaveDate(assignment, teacherConfig, dateContext),

    // ─── Wellness & Accessibility (HARD) ───
    personalBlocksRespected(assignment, teacherWellness),
    teacherAccessibilityOk(assignment, roomConfig, teacherWellness),

    // ─── Room Checks ───
    roomAvailabilityOk(assignment, roomConfig),
    roomCapacityOk(assignment, roomConfig, classConfig),
    labRoomRequired(assignment, subjectConfig, roomConfig),

    // ─── Subject & Class Checks ───
    subjectWeeklyLimitOk(assignment, existing, subjectConfig),
    labPeriodsLimitOk(assignment, existing, subjectConfig),
    classActiveOk(assignment, classConfig),

    // ─── Grade-Level Period Limits ───
    gradePeriodRangeOk(assignment, classConfig, schoolConfig),
    classDailyPeriodLimitOk(assignment, existing, classConfig, schoolConfig),
    classWeeklyPeriodLimitOk(assignment, existing, classConfig),
  ];

  for (const result of checks) {
    if (!result.ok) return result;
  }

  return { ok: true };
}

// =============================================================================
// UTILITY: GET ALL VIOLATIONS (for validation, not just first)
// =============================================================================

/**
 * Run all hard constraints and return ALL violations (for validation reports).
 * Use this when you need to show all problems, not just the first one.
 */
export function checkAllWithDetails(
  assignment,
  existing,
  schoolConfig = {},
  teacherConfig = {},
  context = {}
) {
  const {
    roomConfig = null,
    classConfig = null,
    subjectConfig = null,
    teacherWellness = null,
    dateContext = null,
  } = context;

  const allChecks = [
    // ─── Core Conflict Checks ───
    { name: 'noTeacherDoubleBook', fn: noTeacherDoubleBook, args: [assignment, existing] },
    { name: 'noClassDoubleBook', fn: noClassDoubleBook, args: [assignment, existing] },
    { name: 'noRoomDoubleBook', fn: noRoomDoubleBook, args: [assignment, existing] },

    // ─── Time & Schedule Checks ───
    { name: 'notInBreakSlot', fn: notInBreakSlot, args: [assignment, schoolConfig] },
    { name: 'validPeriodRange', fn: validPeriodRange, args: [assignment, schoolConfig] },
    { name: 'validWorkingDay', fn: validWorkingDay, args: [assignment, schoolConfig] },

    // ─── Teacher Status Checks ───
    { name: 'teacherActiveOk', fn: teacherActiveOk, args: [assignment, teacherConfig] },
    {
      name: 'teacherQualifiedForSubject',
      fn: teacherQualifiedForSubject,
      args: [assignment, teacherConfig],
    },

    // ─── Teacher Workload Checks ───
    {
      name: 'teacherDailyLoadOk',
      fn: teacherDailyLoadOk,
      args: [assignment, existing, teacherConfig],
    },
    {
      name: 'teacherWeeklyLoadOk',
      fn: teacherWeeklyLoadOk,
      args: [assignment, existing, teacherConfig],
    },
    {
      name: 'teacherConsecutivePeriodsOk',
      fn: teacherConsecutivePeriodsOk,
      args: [assignment, existing, teacherConfig],
    },

    // ─── Teacher Availability Checks ───
    { name: 'partTimeWindowOk', fn: partTimeWindowOk, args: [assignment, teacherConfig] },
    { name: 'teacherAvailableDayOk', fn: teacherAvailableDayOk, args: [assignment, teacherConfig] },
    {
      name: 'teacherAvailablePeriodOk',
      fn: teacherAvailablePeriodOk,
      args: [assignment, teacherConfig],
    },
    { name: 'teacherNotOnLeave', fn: teacherNotOnLeave, args: [assignment, teacherConfig] },
    {
      name: 'teacherNotOnLeaveDate',
      fn: teacherNotOnLeaveDate,
      args: [assignment, teacherConfig, dateContext],
    },

    // ─── Wellness & Accessibility Checks ───
    {
      name: 'personalBlocksRespected',
      fn: personalBlocksRespected,
      args: [assignment, teacherWellness],
    },
    {
      name: 'teacherAccessibilityOk',
      fn: teacherAccessibilityOk,
      args: [assignment, roomConfig, teacherWellness],
    },

    // ─── Room Checks ───
    { name: 'roomAvailabilityOk', fn: roomAvailabilityOk, args: [assignment, roomConfig] },
    { name: 'roomCapacityOk', fn: roomCapacityOk, args: [assignment, roomConfig, classConfig] },
    { name: 'labRoomRequired', fn: labRoomRequired, args: [assignment, subjectConfig, roomConfig] },

    // ─── Subject & Class Checks ───
    {
      name: 'subjectWeeklyLimitOk',
      fn: subjectWeeklyLimitOk,
      args: [assignment, existing, subjectConfig],
    },
    {
      name: 'labPeriodsLimitOk',
      fn: labPeriodsLimitOk,
      args: [assignment, existing, subjectConfig],
    },
    { name: 'classActiveOk', fn: classActiveOk, args: [assignment, classConfig] },

    // ─── 🔧 Grade-Level Period Limits (WERE MISSING) ───
    {
      name: 'gradePeriodRangeOk',
      fn: gradePeriodRangeOk,
      args: [assignment, classConfig, schoolConfig],
    },
    {
      name: 'classDailyPeriodLimitOk',
      fn: classDailyPeriodLimitOk,
      args: [assignment, existing, classConfig, schoolConfig],
    },
    {
      name: 'classWeeklyPeriodLimitOk',
      fn: classWeeklyPeriodLimitOk,
      args: [assignment, existing, classConfig],
    },
  ];

  const violations = [];

  for (const check of allChecks) {
    const result = check.fn(...check.args);
    if (!result.ok) {
      violations.push({
        constraint: check.name,
        reason: result.reason,
        assignment: {
          day: assignment.day,
          period: assignment.period,
          classId: assignment.classId,
          teacherId: assignment.teacherId,
          subjectId: assignment.subjectId,
          roomId: assignment.roomId,
        },
      });
    }
  }

  return {
    ok: violations.length === 0,
    violations,
    totalChecks: allChecks.length,
    passedChecks: allChecks.length - violations.length,
    failedChecks: violations.length,
  };
}
