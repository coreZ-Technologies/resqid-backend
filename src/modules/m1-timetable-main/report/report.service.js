/**
 * report/report.service.js
 * Generates structured reports from a timetable:
 * - Teacher-wise view
 * - Class-wise view
 * - Room utilisation
 * - Validation summary
 * - Improvement suggestions
 */

import * as timetableRepository from '../timetable.repository.js';
import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';

/**
 * Teacher-wise timetable: for each teacher, their schedule per day/period.
 */
export async function teacherReport(timetableId, schoolId) {
  try {
    const { assignments } = await timetableRepository.loadTimetableContext(timetableId, schoolId);

    if (!assignments || assignments.length === 0) {
      logger.warn({ timetableId, schoolId }, 'No assignments found for teacher report');
      return [];
    }

    const map = {};
    for (const a of assignments) {
      if (!map[a.teacherId]) {
        map[a.teacherId] = { 
          teacherId: a.teacherId, 
          slots: [],
          totalPeriods: 0,
        };
      }
      map[a.teacherId].slots.push({
        day: a.day,
        period: a.period,
        classId: a.classId,
        subjectId: a.subjectId,
        roomId: a.roomId,
        isTemporary: a.isTemporary ?? false,
      });
    }

    // Sort slots by day then period and calculate totals
    const result = Object.values(map).map(t => {
      t.slots.sort((a, b) => a.day - b.day || a.period - b.period);
      t.totalPeriods = t.slots.length;
      
      // Calculate periods per day for each teacher
      const periodsByDay = {};
      for (const slot of t.slots) {
        periodsByDay[slot.day] = (periodsByDay[slot.day] || 0) + 1;
      }
      t.periodsByDay = periodsByDay;
      
      return t;
    });

    logger.debug({ 
      timetableId, 
      schoolId, 
      teacherCount: result.length,
      totalAssignments: assignments.length 
    }, 'Teacher report generated');

    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ error: error.message, timetableId, schoolId }, 'Failed to generate teacher report');
    throw ApiError.internal('Failed to generate teacher report');
  }
}

/**
 * Class-wise timetable: for each class, their schedule.
 */
export async function classReport(timetableId, schoolId) {
  try {
    const { assignments } = await timetableRepository.loadTimetableContext(timetableId, schoolId);

    if (!assignments || assignments.length === 0) {
      logger.warn({ timetableId, schoolId }, 'No assignments found for class report');
      return [];
    }

    const map = {};
    for (const a of assignments) {
      if (!map[a.classId]) {
        map[a.classId] = { 
          classId: a.classId, 
          slots: [],
          totalPeriods: 0,
        };
      }
      map[a.classId].slots.push({
        day: a.day,
        period: a.period,
        subjectId: a.subjectId,
        teacherId: a.teacherId,
        roomId: a.roomId,
      });
    }

    // Sort slots by day then period
    const result = Object.values(map).map(c => {
      c.slots.sort((a, b) => a.day - b.day || a.period - b.period);
      c.totalPeriods = c.slots.length;
      
      // Calculate periods per day for each class
      const periodsByDay = {};
      for (const slot of c.slots) {
        periodsByDay[slot.day] = (periodsByDay[slot.day] || 0) + 1;
      }
      c.periodsByDay = periodsByDay;
      
      return c;
    });

    logger.debug({ 
      timetableId, 
      schoolId, 
      classCount: result.length,
      totalAssignments: assignments.length 
    }, 'Class report generated');

    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ error: error.message, timetableId, schoolId }, 'Failed to generate class report');
    throw ApiError.internal('Failed to generate class report');
  }
}

/**
 * Room utilisation: how many slots each room is used vs total available.
 */
export async function roomUtilisationReport(timetableId, schoolId, schoolConfig) {
  try {
    const { assignments, template } = await timetableRepository.loadTimetableContext(timetableId, schoolId);

    if (!assignments || assignments.length === 0) {
      logger.warn({ timetableId, schoolId }, 'No assignments found for room utilisation report');
      return [];
    }

    const { workingDays, periodsPerDay, breaks = [] } = schoolConfig;
    const totalSlots = workingDays * (periodsPerDay - breaks.length);

    const roomCounts = {};
    const roomAssignments = {};

    for (const a of assignments) {
      if (!a.roomId) continue;
      
      roomCounts[a.roomId] = (roomCounts[a.roomId] || 0) + 1;
      
      if (!roomAssignments[a.roomId]) {
        roomAssignments[a.roomId] = [];
      }
      roomAssignments[a.roomId].push({
        day: a.day,
        period: a.period,
        classId: a.classId,
        subjectId: a.subjectId,
        teacherId: a.teacherId,
      });
    }

    // Get room configurations if available from template
    const roomConfigs = template?.rooms ? Object.fromEntries(
      template.rooms.map(r => [r.id, r])
    ) : {};

    const result = Object.entries(roomCounts).map(([roomId, used]) => ({
      roomId,
      roomName: roomConfigs[roomId]?.name || roomId,
      usedSlots: used,
      totalSlots,
      freeSlots: totalSlots - used,
      utilisationPct: Math.round((used / totalSlots) * 100),
      assignments: roomAssignments[roomId]?.slice(0, 10) || [], // First 10 assignments for context
    }));

    // Sort by utilisation percentage descending
    result.sort((a, b) => b.utilisationPct - a.utilisationPct);

    logger.debug({ 
      timetableId, 
      schoolId, 
      roomCount: result.length,
      totalSlots,
      avgUtilisation: result.reduce((sum, r) => sum + r.utilisationPct, 0) / (result.length || 1)
    }, 'Room utilisation report generated');

    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ error: error.message, timetableId, schoolId }, 'Failed to generate room utilisation report');
    throw ApiError.internal('Failed to generate room utilisation report');
  }
}

/**
 * Validation summary report — violations, warnings, suggestions.
 */
export async function validationReport(timetableId, schoolId) {
  try {
    const report = await timetableRepository.getValidationReport(timetableId);
    
    if (!report) {
      throw ApiError.notFound('No validation report found. Run validate first.');
    }
    
    // Add summary statistics
    const summary = {
      totalViolations: report.violations?.length || 0,
      totalWarnings: report.warnings?.length || 0,
      totalSuggestions: report.suggestions?.length || 0,
      overallScore: report.score,
      isAcceptable: (report.violations?.length || 0) === 0,
    };
    
    logger.info({ 
      timetableId, 
      schoolId,
      ...summary 
    }, 'Validation report retrieved');

    return {
      ...report,
      summary,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ error: error.message, timetableId, schoolId }, 'Failed to get validation report');
    throw ApiError.internal('Failed to get validation report');
  }
}

/**
 * Improvement suggestions — extract top-N soft/medium issues.
 */
export async function improvementSuggestions(timetableId, schoolId, limit = 20) {
  try {
    const report = await validationReport(timetableId, schoolId);

    const all = [
      ...(report.warnings || []).map((w) => ({ 
        ...w, 
        severity: 'medium',
        type: 'warning',
      })),
      ...(report.suggestions || []).map((s) => ({ 
        ...s, 
        severity: 'soft',
        type: 'suggestion',
      })),
    ];

    // Sort by penalty (higher penalty = more important to fix)
    all.sort((a, b) => (b.penalty || 0) - (a.penalty || 0));

    const topSuggestions = all.slice(0, limit);
    
    // Group suggestions by type for better organization
    const grouped = {
      critical: topSuggestions.filter(s => (s.penalty || 0) > 50),
      important: topSuggestions.filter(s => (s.penalty || 0) > 20 && (s.penalty || 0) <= 50),
      minor: topSuggestions.filter(s => (s.penalty || 0) <= 20),
    };

    logger.debug({ 
      timetableId, 
      schoolId, 
      limit,
      totalAvailable: all.length,
      returnedCount: topSuggestions.length,
      criticalCount: grouped.critical.length,
      importantCount: grouped.important.length,
      minorCount: grouped.minor.length,
    }, 'Improvement suggestions generated');

    return {
      suggestions: topSuggestions,
      grouped,
      summary: {
        total: all.length,
        returned: topSuggestions.length,
        limit,
        hasSuggestions: topSuggestions.length > 0,
      },
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ error: error.message, timetableId, schoolId }, 'Failed to generate improvement suggestions');
    throw ApiError.internal('Failed to generate improvement suggestions');
  }
}

/**
 * Export report to CSV format
 */
export async function exportToCsv(timetableId, schoolId, reportType = 'teachers') {
  let data;
  let headers;
  
  switch (reportType) {
    case 'teachers':
      data = await teacherReport(timetableId, schoolId);
      headers = ['Teacher ID', 'Day', 'Period', 'Class ID', 'Subject ID', 'Room ID'];
      break;
    case 'classes':
      data = await classReport(timetableId, schoolId);
      headers = ['Class ID', 'Day', 'Period', 'Subject ID', 'Teacher ID', 'Room ID'];
      break;
    case 'rooms':
      data = await roomUtilisationReport(timetableId, schoolId, { workingDays: 5, periodsPerDay: 8 });
      headers = ['Room ID', 'Used Slots', 'Total Slots', 'Utilisation %'];
      break;
    default:
      throw ApiError.badRequest(`Unknown report type: ${reportType}`);
  }
  
  return { data, headers };
}

/**
 * Get overall timetable health score and metrics
 */
export async function timetableHealth(timetableId, schoolId) {
  try {
    const validation = await validationReport(timetableId, schoolId);
    const teacherData = await teacherReport(timetableId, schoolId);
    const classData = await classReport(timetableId, schoolId);
    
    // Calculate health score (0-100)
    let healthScore = 100;
    
    // Deduct for violations
    if (validation.summary.totalViolations > 0) {
      healthScore -= Math.min(50, validation.summary.totalViolations * 10);
    }
    
    // Deduct for warnings
    if (validation.summary.totalWarnings > 0) {
      healthScore -= Math.min(30, validation.summary.totalWarnings * 2);
    }
    
    // Check teacher workload balance
    const teacherWorkloads = teacherData.map(t => t.totalPeriods);
    const maxWorkload = Math.max(...teacherWorkloads, 0);
    const minWorkload = Math.min(...teacherWorkloads, Infinity);
    const workloadVariance = maxWorkload - minWorkload;
    
    if (workloadVariance > 10) {
      healthScore -= 10;
    }
    
    healthScore = Math.max(0, Math.min(100, healthScore));
    
    const result = {
      healthScore,
      healthGrade: healthScore >= 90 ? 'A' : healthScore >= 80 ? 'B' : healthScore >= 70 ? 'C' : healthScore >= 60 ? 'D' : 'F',
      metrics: {
        totalTeachers: teacherData.length,
        totalClasses: classData.length,
        totalAssignments: teacherData.reduce((sum, t) => sum + t.totalPeriods, 0),
        violationsCount: validation.summary.totalViolations,
        warningsCount: validation.summary.totalWarnings,
        suggestionsCount: validation.summary.totalSuggestions,
        teacherWorkloadVariance: workloadVariance,
        averageTeacherLoad: teacherWorkloads.reduce((a, b) => a + b, 0) / (teacherWorkloads.length || 1),
      },
      validation,
    };
    
    logger.info({ timetableId, schoolId, healthScore, healthGrade: result.healthGrade }, 'Timetable health assessed');
    
    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ error: error.message, timetableId, schoolId }, 'Failed to assess timetable health');
    throw ApiError.internal('Failed to assess timetable health');
  }
}