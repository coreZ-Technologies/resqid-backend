/**
 * feasibility.js
 * Quick pre-check before backtracking starts.
 * Catches obviously impossible schedules early.
 */

import { logger } from '#config/logger.js';
import { ApiError } from '#shared/response/ApiError.js';

/**
 * Check if total required periods fits within available slots.
 */
export function periodsVsSlots(template, schoolConfig) {
  const { periodsPerDay, workingDays, breaks = [] } = schoolConfig;
  const totalSlots = workingDays * (periodsPerDay - breaks.length);

  let totalRequired = 0;
  for (const cls of template.classes) {
    for (const subject of cls.subjects) {
      totalRequired += subject.weeklyPeriods || 0;
    }
  }

  const classesCount = template.classes.length;
  const availableCapacity = totalSlots * classesCount;

  if (totalRequired > availableCapacity) {
    const reason = `Total required periods (${totalRequired}) exceeds available slots (${totalSlots} per class × ${classesCount} classes = ${availableCapacity})`;
    
    logger.warn({ 
      totalRequired, 
      totalSlotsPerClass: totalSlots,
      classesCount,
      availableCapacity
    }, 'Feasibility check failed: periods vs slots');
    
    return {
      feasible: false,
      reason,
    };
  }
  
  logger.debug({ 
    totalRequired, 
    availableCapacity,
    utilizationRate: Math.round((totalRequired / availableCapacity) * 100) + '%'
  }, 'Periods vs slots check passed');
  
  return { feasible: true };
}

/**
 * Check every subject has at least one eligible teacher.
 */
export function subjectTeacherCoverage(template) {
  const uncovered = [];
  
  for (const cls of template.classes) {
    for (const subject of cls.subjects) {
      const eligible = template.teachers.filter((t) => 
        t.eligibleSubjects && t.eligibleSubjects.includes(subject.id)
      );
      
      if (eligible.length === 0) {
        uncovered.push({ 
          classId: cls.id, 
          className: cls.name,
          subjectId: subject.id,
          subjectName: subject.name 
        });
      }
    }
  }
  
  if (uncovered.length > 0) {
    const reason = `No teacher available for ${uncovered.length} subject(s): ${JSON.stringify(uncovered)}`;
    
    logger.warn({ 
      uncoveredCount: uncovered.length,
      uncoveredSubjects: uncovered 
    }, 'Feasibility check failed: subject teacher coverage');
    
    return {
      feasible: false,
      reason,
      details: uncovered,
    };
  }
  
  logger.debug({ totalSubjectsChecked: template.classes.reduce((acc, cls) => acc + cls.subjects.length, 0) }, 'Subject coverage check passed');
  
  return { feasible: true };
}

/**
 * Check part-time teachers have enough available slots to cover their assigned load.
 */
export function partTimeCapacity(template) {
  const violations = [];
  
  for (const teacher of template.teachers) {
    if (!teacher.isPartTime) continue;
    
    const available = (teacher.availableSlots || []).length;
    
    // Calculate total assigned periods for this teacher
    let assigned = 0;
    for (const cls of template.classes) {
      for (const subject of cls.subjects) {
        if (subject.assignedTeacherId === teacher.id) {
          assigned += subject.weeklyPeriods || 0;
        }
      }
    }
    
    if (assigned > available) {
      violations.push({
        teacherId: teacher.id,
        teacherName: teacher.name,
        assignedPeriods: assigned,
        availableSlots: available,
        shortfall: assigned - available,
      });
    }
  }
  
  if (violations.length > 0) {
    const reason = `${violations.length} part-time teacher(s) exceed available slots`;
    
    logger.warn({ 
      violations,
      teacherCount: violations.length 
    }, 'Feasibility check failed: part-time teacher capacity');
    
    return {
      feasible: false,
      reason,
      details: violations,
    };
  }
  
  logger.debug({ partTimeTeachersChecked: template.teachers.filter(t => t.isPartTime).length }, 'Part-time capacity check passed');
  
  return { feasible: true };
}

/**
 * Check if any teacher is overloaded beyond reasonable limits.
 */
export function teacherWorkloadBalance(template) {
  const maxPeriodsPerDay = 8; // Reasonable default
  const teacherWorkloads = new Map();
  
  for (const teacher of template.teachers) {
    let totalAssigned = 0;
    
    for (const cls of template.classes) {
      for (const subject of cls.subjects) {
        if (subject.assignedTeacherId === teacher.id) {
          totalAssigned += subject.weeklyPeriods || 0;
        }
      }
    }
    
    teacherWorkloads.set(teacher.id, {
      teacherId: teacher.id,
      teacherName: teacher.name,
      totalPeriods: totalAssigned,
      isPartTime: teacher.isPartTime || false,
    });
  }
  
  // Check for excessive workload (more than 40 periods per week)
  const overloaded = Array.from(teacherWorkloads.values()).filter(
    (w) => !w.isPartTime && w.totalPeriods > 40
  );
  
  if (overloaded.length > 0) {
    logger.warn({ overloaded }, 'Teachers may be overloaded');
    // This is a warning, not a hard stop - return feasible but include warning
    return { 
      feasible: true, 
      warnings: overloaded.map(w => `${w.teacherName}: ${w.totalPeriods} periods/week`) 
    };
  }
  
  return { feasible: true };
}

/**
 * Check if room constraints can be satisfied (if rooms are defined).
 */
export function roomAvailability(template, schoolConfig) {
  // If no rooms defined in config, skip
  if (!schoolConfig.rooms || schoolConfig.rooms.length === 0) {
    return { feasible: true };
  }
  
  const periodsPerDay = schoolConfig.periodsPerDay;
  const workingDays = schoolConfig.workingDays;
  const totalRoomSlots = schoolConfig.rooms.length * periodsPerDay * workingDays;
  
  // Count required room assignments (assuming each slot needs a room)
  let requiredRoomAssignments = 0;
  for (const cls of template.classes) {
    for (const subject of cls.subjects) {
      if (subject.needsRoom) {
        requiredRoomAssignments += subject.weeklyPeriods || 0;
      }
    }
  }
  
  if (requiredRoomAssignments > totalRoomSlots) {
    const reason = `Required room assignments (${requiredRoomAssignments}) exceeds available room slots (${totalRoomSlots})`;
    
    logger.warn({ 
      requiredRoomAssignments, 
      totalRoomSlots,
      roomCount: schoolConfig.rooms.length 
    }, 'Feasibility check failed: room availability');
    
    return {
      feasible: false,
      reason,
    };
  }
  
  return { feasible: true };
}

/**
 * Run all feasibility checks.
 * @returns {Object} { feasible: boolean, reason?: string, details?: any, warnings?: string[] }
 */
export function checkAll(template, schoolConfig) {
  const startTime = Date.now();
  
  // Validate inputs
  if (!template || !template.classes || template.classes.length === 0) {
    return {
      feasible: false,
      reason: 'Template has no classes defined',
    };
  }
  
  if (!template.teachers || template.teachers.length === 0) {
    return {
      feasible: false,
      reason: 'Template has no teachers defined',
    };
  }
  
  const checks = [
    periodsVsSlots(template, schoolConfig),
    subjectTeacherCoverage(template),
    partTimeCapacity(template),
    teacherWorkloadBalance(template),
    roomAvailability(template, schoolConfig),
  ];
  
  const warnings = [];
  
  for (const result of checks) {
    if (!result.feasible) {
      const durationMs = Date.now() - startTime;
      logger.info({ 
        durationMs, 
        reason: result.reason,
        details: result.details 
      }, 'Feasibility check failed');
      
      return result;
    }
    
    if (result.warnings) {
      warnings.push(...result.warnings);
    }
  }
  
  const durationMs = Date.now() - startTime;
  
  logger.info({ 
    durationMs, 
    classesCount: template.classes.length,
    teachersCount: template.teachers.length,
    warnings: warnings.length > 0 ? warnings : undefined
  }, 'All feasibility checks passed');
  
  return { 
    feasible: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Check feasibility and throw ApiError if infeasible.
 * Useful for pre-validation before running solver.
 */
export function requireFeasible(template, schoolConfig) {
  const result = checkAll(template, schoolConfig);
  
  if (!result.feasible) {
    throw ApiError.badRequest(`Timetable infeasible: ${result.reason}`, [
      { message: result.reason, details: result.details }
    ]);
  }
  
  return result;
}