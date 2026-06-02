/**
 * feasibility.js
 * Quick pre-check before backtracking starts.
 * Catches obviously impossible schedules early.
 * Runs in O(n) — fast enough to call before every generation.
 */

// =============================================================================
// SLOT CAPACITY CHECKS
// =============================================================================

/**
 * Check if total required periods fits within available slots.
 * Now respects grade-level period limits.
 */
export function periodsVsSlots(template, schoolConfig) {
  let totalSlots = 0;
  let totalRequired = 0;

  for (const cls of template.classes) {
    // Get grade-specific period limit
    const gradeConfig = getGradeConfig(cls.grade, schoolConfig.gradeLevels);
    const periodsPerDay =
      cls.periodsPerDay || gradeConfig?.periodsPerDay || schoolConfig.periodsPerDay || 8;
    const breakCount = (
      cls.breakSchedule?.breakAfterPeriods ||
      gradeConfig?.breakAfterPeriods ||
      schoolConfig.breakAfterPeriods ||
      []
    ).length;
    const workingDays = (schoolConfig.workingDays || [1, 2, 3, 4, 5, 6]).length;

    const availableForClass = workingDays * (periodsPerDay - breakCount);
    totalSlots += availableForClass;

    for (const subject of cls.subjects) {
      totalRequired += subject.weeklyPeriods || 0;

      // Check lab periods if applicable
      if (subject.requiresLab && subject.labPeriodsPerWeek) {
        // Lab periods already included in weeklyPeriods
        // But we need lab rooms available
      }
    }
  }

  if (totalRequired > totalSlots) {
    return {
      feasible: false,
      reason: `Total required periods (${totalRequired}) exceeds total available slots (${totalSlots})`,
      details: {
        totalRequired,
        totalSlots,
        deficit: totalRequired - totalSlots,
        suggestion: 'Reduce subject periods, add working days, or increase periods per day',
      },
    };
  }

  return {
    feasible: true,
    totalRequired,
    totalSlots,
    utilization: ((totalRequired / totalSlots) * 100).toFixed(1) + '%',
  };
}

// =============================================================================
// TEACHER COVERAGE CHECKS
// =============================================================================

/**
 * Check every subject has at least one eligible teacher.
 */
export function subjectTeacherCoverage(template) {
  const uncovered = [];

  for (const cls of template.classes) {
    for (const subject of cls.subjects) {
      const eligible = template.teachers.filter(
        (t) => t.eligibleSubjects?.includes(subject.id) || t.subjects?.includes(subject.id)
      );

      if (eligible.length === 0) {
        uncovered.push({
          classId: cls.id,
          className: `${cls.grade || ''}-${cls.section || ''}`,
          subjectId: subject.id,
          subjectName: subject.name || subject.id,
        });
      }
    }
  }

  if (uncovered.length > 0) {
    return {
      feasible: false,
      reason: `${uncovered.length} subject(s) have no eligible teacher`,
      uncovered,
      suggestion: 'Assign teachers to subjects or add new teachers',
    };
  }

  return { feasible: true };
}

/**
 * Check if any teacher is overloaded based on assigned subjects.
 */
export function teacherLoadFeasibility(template) {
  const overloaded = [];

  for (const teacher of template.teachers) {
    // Calculate total periods assigned to this teacher
    let assignedPeriods = 0;

    for (const cls of template.classes) {
      for (const subject of cls.subjects) {
        if (subject.assignedTeacherId === teacher.id) {
          assignedPeriods += subject.weeklyPeriods || 0;
        }
      }
    }

    const maxWeekly = teacher.maxPeriodsPerWeek || 30;

    if (assignedPeriods > maxWeekly) {
      overloaded.push({
        teacherId: teacher.id,
        teacherName: teacher.name,
        assigned: assignedPeriods,
        max: maxWeekly,
        excess: assignedPeriods - maxWeekly,
      });
    }

    // Check if teacher can physically cover all assigned classes
    // (considering they can only be in one place at a time)
    if (teacher.isPartTime && teacher.availableSlots) {
      const availableSlotCount = teacher.availableSlots.length;
      if (assignedPeriods > availableSlotCount) {
        overloaded.push({
          teacherId: teacher.id,
          teacherName: teacher.name,
          assigned: assignedPeriods,
          availableSlots: availableSlotCount,
          issue: 'Part-time teacher assigned more periods than available slots',
        });
      }
    }
  }

  if (overloaded.length > 0) {
    return {
      feasible: false,
      reason: `${overloaded.length} teacher(s) are overloaded`,
      overloaded,
      suggestion: 'Reduce subject periods or reassign to other teachers',
    };
  }

  return { feasible: true };
}

/**
 * Check if any teacher is assigned to two classes at the same grade level
 * where both classes have the same subject in the same period range.
 * (Physically impossible to teach two classes simultaneously)
 */
export function teacherConflictFeasibility(template, schoolConfig) {
  const conflicts = [];
  const workingDays = schoolConfig.workingDays || [1, 2, 3, 4, 5, 6];
  const periodsPerDay = schoolConfig.periodsPerDay || 8;
  const totalSlots = workingDays.length * periodsPerDay;

  for (const teacher of template.teachers) {
    let totalAssignedPeriods = 0;

    for (const cls of template.classes) {
      for (const subject of cls.subjects) {
        if (subject.assignedTeacherId === teacher.id) {
          totalAssignedPeriods += subject.weeklyPeriods || 0;
        }
      }
    }

    // A teacher can teach at most `totalSlots` periods (one per slot)
    if (totalAssignedPeriods > totalSlots) {
      conflicts.push({
        teacherId: teacher.id,
        teacherName: teacher.name,
        totalAssigned: totalAssignedPeriods,
        maxPossible: totalSlots,
        issue: 'Teacher assigned more periods than available time slots',
      });
    }
  }

  if (conflicts.length > 0) {
    return {
      feasible: false,
      reason: `${conflicts.length} teacher(s) have impossible schedules`,
      conflicts,
    };
  }

  return { feasible: true };
}

// =============================================================================
// ROOM CHECKS
// =============================================================================

/**
 * Check if there are enough rooms of required types.
 */
export function roomAvailabilityFeasibility(template) {
  const rooms = template.rooms || [];
  const issues = [];

  // Count available rooms by type
  const roomCounts = {
    total: rooms.filter((r) => r.isActive && r.status === 'AVAILABLE').length,
    regular: rooms.filter((r) => r.type === 'REGULAR' && r.isActive && r.status === 'AVAILABLE')
      .length,
    lab: rooms.filter((r) => r.type === 'LAB' && r.isActive && r.status === 'AVAILABLE').length,
    computerLab: rooms.filter(
      (r) => r.type === 'COMPUTER_LAB' && r.isActive && r.status === 'AVAILABLE'
    ).length,
  };

  if (roomCounts.total === 0) {
    return {
      feasible: false,
      reason: 'No active rooms available',
      suggestion: 'Add rooms or activate existing rooms',
    };
  }

  // Check lab room requirements
  for (const cls of template.classes) {
    for (const subject of cls.subjects) {
      if (subject.requiresLab) {
        if (subject.requiredRoomType === 'COMPUTER_LAB' && roomCounts.computerLab === 0) {
          issues.push({
            classId: cls.id,
            subjectId: subject.id,
            requirement: 'COMPUTER_LAB',
            available: 0,
          });
        } else if (roomCounts.lab === 0 && roomCounts.computerLab === 0) {
          issues.push({
            classId: cls.id,
            subjectId: subject.id,
            requirement: 'LAB',
            available: 0,
          });
        }
      }
    }
  }

  if (issues.length > 0) {
    return {
      feasible: false,
      reason: `${issues.length} subject(s) require specialized rooms that don't exist`,
      issues,
      roomCounts,
      suggestion: 'Add required lab rooms or mark subjects as not requiring labs',
    };
  }

  // Check if total rooms can handle simultaneous classes
  const maxClassesPerPeriod = template.classes.length;
  if (maxClassesPerPeriod > roomCounts.total) {
    return {
      feasible: false,
      reason: `${maxClassesPerPeriod} classes but only ${roomCounts.total} rooms — impossible to schedule without room sharing`,
      maxClasses: maxClassesPerPeriod,
      totalRooms: roomCounts.total,
      suggestion: 'Add more rooms or allow room sharing (not recommended)',
    };
  }

  return { feasible: true, roomCounts };
}

// =============================================================================
// PART-TIME & AVAILABILITY CHECKS
// =============================================================================

/**
 * Check part-time teachers have enough available slots.
 */
export function partTimeCapacity(template, schoolConfig) {
  const issues = [];

  for (const teacher of template.teachers) {
    if (!teacher.isPartTime) continue;

    const availableSlots = teacher.availableSlots || teacher.availablePeriods || [];
    const availableDays = teacher.availableDays || [];

    // If no slots specified but days are, calculate slots
    let totalAvailableSlots = availableSlots.length;
    if (totalAvailableSlots === 0 && availableDays.length > 0) {
      const periodsPerDay = schoolConfig.periodsPerDay || 8;
      totalAvailableSlots = availableDays.length * periodsPerDay;
    }

    let assignedPeriods = 0;
    for (const cls of template.classes) {
      for (const subject of cls.subjects) {
        if (subject.assignedTeacherId === teacher.id) {
          assignedPeriods += subject.weeklyPeriods || 0;
        }
      }
    }

    if (assignedPeriods > totalAvailableSlots && totalAvailableSlots > 0) {
      issues.push({
        teacherId: teacher.id,
        teacherName: teacher.name,
        assigned: assignedPeriods,
        available: totalAvailableSlots,
        deficit: assignedPeriods - totalAvailableSlots,
      });
    }
  }

  if (issues.length > 0) {
    return {
      feasible: false,
      reason: `${issues.length} part-time teacher(s) assigned more than their availability`,
      issues,
      suggestion: 'Reduce assigned periods or increase teacher availability',
    };
  }

  return { feasible: true };
}

/**
 * Check if teachers on leave can still cover their assigned subjects.
 */
export function teacherLeaveFeasibility(template) {
  const issues = [];

  for (const teacher of template.teachers) {
    if (teacher.leaveDays && teacher.leaveDays.length > 0) {
      const leaveCount = teacher.leaveDays.length;
      const workingDays = (schoolConfig?.workingDays || [1, 2, 3, 4, 5, 6]).length;

      // If teacher is absent for >50% of working days, flag it
      if (leaveCount > workingDays * 0.5) {
        let assignedPeriods = 0;
        for (const cls of template.classes) {
          for (const subject of cls.subjects) {
            if (subject.assignedTeacherId === teacher.id) {
              assignedPeriods += subject.weeklyPeriods || 0;
            }
          }
        }

        if (assignedPeriods > 0) {
          issues.push({
            teacherId: teacher.id,
            teacherName: teacher.name,
            leaveDays: leaveCount,
            workingDays,
            assignedPeriods,
            issue: 'Teacher on leave for majority of week but has assigned subjects',
          });
        }
      }
    }
  }

  if (issues.length > 0) {
    return {
      feasible: true, // Not blocking, just a warning
      warnings: issues,
    };
  }

  return { feasible: true };
}

// =============================================================================
// WELLNESS & ACCESSIBILITY CHECKS
// =============================================================================

/**
 * Check if accessibility requirements can be met.
 */
export function accessibilityFeasibility(template) {
  const rooms = template.rooms || [];
  const issues = [];

  // Check ground floor rooms available for pregnant teachers
  const teachersNeedingGroundFloor = template.teachers.filter(
    (t) => t.wellness?.isPregnant || t.wellness?.needsGroundFloor
  );

  if (teachersNeedingGroundFloor.length > 0) {
    const groundFloorRooms = rooms.filter(
      (r) => r.floor === 0 && r.isActive && r.status === 'AVAILABLE'
    );

    if (groundFloorRooms.length === 0) {
      issues.push({
        type: 'GROUND_FLOOR',
        affectedTeachers: teachersNeedingGroundFloor.map((t) => t.name),
        issue: 'Teachers need ground floor rooms but none available',
        severity: 'HIGH',
      });
    }
  }

  // Check accessible rooms for disabled teachers
  const teachersNeedingAccessible = template.teachers.filter(
    (t) => t.wellness?.needsAccessibleRoom
  );

  if (teachersNeedingAccessible.length > 0) {
    const accessibleRooms = rooms.filter(
      (r) => r.isAccessible && r.isActive && r.status === 'AVAILABLE'
    );

    if (accessibleRooms.length === 0) {
      issues.push({
        type: 'ACCESSIBILITY',
        affectedTeachers: teachersNeedingAccessible.map((t) => t.name),
        issue: 'Teachers need accessible rooms but none available',
        severity: 'CRITICAL',
      });
    }
  }

  if (issues.length > 0) {
    const hasBlocking = issues.some((i) => i.severity === 'CRITICAL');
    return {
      feasible: !hasBlocking,
      reason: hasBlocking ? 'Critical accessibility requirements cannot be met' : undefined,
      issues,
      suggestion: 'Add accessible/ground-floor rooms or update teacher wellness data',
    };
  }

  return { feasible: true };
}

// =============================================================================
// GRADE-LEVEL CHECKS
// =============================================================================

/**
 * Check if grade-level configurations are valid.
 */
export function gradeLevelFeasibility(template, schoolConfig) {
  const issues = [];

  for (const cls of template.classes) {
    const gradeConfig = getGradeConfig(cls.grade, schoolConfig.gradeLevels);
    const periodsPerDay =
      cls.periodsPerDay || gradeConfig?.periodsPerDay || schoolConfig.periodsPerDay || 8;

    // Calculate total periods needed per week for this class
    let totalPeriods = 0;
    for (const subject of cls.subjects) {
      totalPeriods += subject.weeklyPeriods || 0;
    }

    const workingDays = (schoolConfig.workingDays || [1, 2, 3, 4, 5, 6]).length;
    const maxPeriodsPerWeek = periodsPerDay * workingDays;

    if (totalPeriods > maxPeriodsPerWeek) {
      issues.push({
        classId: cls.id,
        className: `${cls.grade}-${cls.section}`,
        totalPeriods,
        maxPeriodsPerWeek,
        periodsPerDay,
        deficit: totalPeriods - maxPeriodsPerWeek,
        issue: 'Class has more required periods than available slots',
      });
    }
  }

  if (issues.length > 0) {
    return {
      feasible: false,
      reason: `${issues.length} class(es) have impossible period requirements`,
      issues,
      suggestion: 'Reduce weekly periods or increase periods per day for these classes',
    };
  }

  return { feasible: true };
}

// =============================================================================
// MASTER CHECK
// =============================================================================

/**
 * Run all feasibility checks.
 * Returns first failure or full report.
 */
export function checkAll(template, schoolConfig) {
  const results = [];

  const checks = [
    { name: 'periodsVsSlots', fn: periodsVsSlots },
    { name: 'subjectTeacherCoverage', fn: subjectTeacherCoverage },
    { name: 'teacherLoadFeasibility', fn: teacherLoadFeasibility },
    { name: 'teacherConflictFeasibility', fn: teacherConflictFeasibility },
    { name: 'roomAvailabilityFeasibility', fn: roomAvailabilityFeasibility },
    { name: 'partTimeCapacity', fn: partTimeCapacity },
    { name: 'teacherLeaveFeasibility', fn: teacherLeaveFeasibility },
    { name: 'accessibilityFeasibility', fn: accessibilityFeasibility },
    { name: 'gradeLevelFeasibility', fn: gradeLevelFeasibility },
  ];

  for (const check of checks) {
    const result = check.fn(template, schoolConfig);
    results.push({ name: check.name, ...result });

    // Stop on first blocking issue
    if (!result.feasible) {
      return {
        feasible: false,
        failedCheck: check.name,
        reason: result.reason,
        details: result,
        allResults: results,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // All checks passed
  const warnings = results.filter((r) => r.warnings?.length > 0);

  return {
    feasible: true,
    checksPassed: results.length,
    warnings: warnings.length > 0 ? warnings : undefined,
    summary: {
      totalSlots: results[0]?.totalSlots,
      totalRequired: results[0]?.totalRequired,
      utilization: results[0]?.utilization,
      roomCounts: results[4]?.roomCounts,
    },
    allResults: results,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Quick check — returns boolean only (for fast pre-check).
 */
export function isFeasible(template, schoolConfig) {
  const result = checkAll(template, schoolConfig);
  return result.feasible;
}

// =============================================================================
// HELPERS
// =============================================================================

function getGradeConfig(grade, gradeConfigs) {
  if (!gradeConfigs || gradeConfigs.length === 0) return null;
  const gradeNum = parseInt(grade) || 0;
  return gradeConfigs.find((gc) => gradeNum >= gc.gradeFrom && gradeNum <= gc.gradeTo);
}
