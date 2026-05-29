// =============================================================================
// modules/m1-timetable/report/report.service.js — RESQID
// Auto-generated reports: substitution register, compliance, workload.
// =============================================================================

import { prisma } from '#config/prisma.js';
import { ApiError } from '#shared/response/ApiError.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSTITUTION REGISTER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate substitution register for a date range.
 * Shows every substitution that happened: who was absent, who covered, which class.
 *
 * @param {string} schoolId
 * @param {Object} filters - { from, to, teacherId, grade }
 * @returns {Object} { entries[], summary }
 */
export const getSubstitutionRegister = async (schoolId, filters = {}) => {
  const { from, to, teacherId, grade } = filters;

  const where = {
    schoolId,
    ...(from || to
      ? {
          date: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to) }),
          },
        }
      : {}),
  };

  const overrides = await prisma.dayOverride.findMany({
    where,
    orderBy: { date: 'desc' },
    include: {
      timetableSlot: {
        include: {
          classGroup: { select: { grade: true, section: true } },
          subject: { select: { name: true } },
        },
      },
      originalTeacher: { select: { id: true, name: true } },
      substituteTeacher: { select: { id: true, name: true } },
    },
  });

  // Filter by teacher if specified
  let filtered = overrides;
  if (teacherId) {
    filtered = overrides.filter(
      (o) => o.originalTeacherId === teacherId || o.substituteTeacherId === teacherId
    );
  }

  // Filter by grade if specified
  if (grade) {
    filtered = overrides.filter((o) => o.timetableSlot?.classGroup?.grade === grade);
  }

  // Group by date
  const byDate = {};
  for (const entry of filtered) {
    const dateKey = entry.date.toISOString().split('T')[0];
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push(formatRegisterEntry(entry));
  }

  // Summary stats
  const summary = {
    totalSubstitutions: filtered.length,
    uniqueAbsentTeachers: new Set(filtered.map((o) => o.originalTeacherId)).size,
    uniqueSubstitutes: new Set(filtered.map((o) => o.substituteTeacherId)).size,
    dateRange: {
      from: from || filtered[filtered.length - 1]?.date?.toISOString(),
      to: to || filtered[0]?.date?.toISOString(),
    },
  };

  return {
    entries: byDate,
    summary,
  };
};

/**
 * Format a DayOverride entry for the register.
 */
function formatRegisterEntry(entry) {
  return {
    id: entry.id,
    date: entry.date.toISOString().split('T')[0],
    period: entry.timetableSlot?.periodNumber,
    dayOfWeek: entry.timetableSlot?.dayOfWeek,
    class: entry.timetableSlot?.classGroup
      ? `${entry.timetableSlot.classGroup.grade}-${entry.timetableSlot.classGroup.section}`
      : 'N/A',
    subject: entry.timetableSlot?.subject?.name || 'N/A',
    absentTeacher: entry.originalTeacher?.name || 'Unknown',
    substituteTeacher: entry.substituteTeacher?.name || 'Unknown',
    reason: entry.reason,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEEKLY SUBSTITUTION ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Weekly analysis of substitutions.
 * Who was absent most? Which subjects lost most periods? Which classes affected most?
 *
 * @param {string} schoolId
 * @param {string} weekStart - Monday date
 * @returns {Object} analysis
 */
export const getWeeklyAnalysis = async (schoolId, weekStart) => {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const overrides = await prisma.dayOverride.findMany({
    where: {
      schoolId,
      date: { gte: start, lte: end },
    },
    include: {
      timetableSlot: {
        include: {
          classGroup: { select: { grade: true, section: true } },
          subject: { select: { id: true, name: true } },
        },
      },
      originalTeacher: { select: { id: true, name: true } },
      substituteTeacher: { select: { id: true, name: true } },
    },
  });

  // ── Most absent teachers ──────────────────────────────────────────────────
  const absentCount = {};
  for (const entry of overrides) {
    const key = entry.originalTeacherId;
    if (!absentCount[key]) absentCount[key] = { name: entry.originalTeacher?.name, count: 0 };
    absentCount[key].count++;
  }

  const mostAbsent = Object.values(absentCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ── Most affected subjects ───────────────────────────────────────────────
  const subjectLoss = {};
  for (const entry of overrides) {
    const key = entry.timetableSlot?.subjectId;
    if (!key) continue;
    if (!subjectLoss[key])
      subjectLoss[key] = { name: entry.timetableSlot?.subject?.name, count: 0 };
    subjectLoss[key].count++;
  }

  const mostAffectedSubjects = Object.values(subjectLoss)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ── Most affected classes ────────────────────────────────────────────────
  const classImpact = {};
  for (const entry of overrides) {
    const key = entry.timetableSlot?.classGroup
      ? `${entry.timetableSlot.classGroup.grade}-${entry.timetableSlot.classGroup.section}`
      : null;
    if (!key) continue;
    if (!classImpact[key]) classImpact[key] = { className: key, count: 0 };
    classImpact[key].count++;
  }

  const mostAffectedClasses = Object.values(classImpact)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ── Day-wise breakdown ───────────────────────────────────────────────────
  const byDay = {};
  for (const entry of overrides) {
    const day = entry.date.toISOString().split('T')[0];
    if (!byDay[day]) byDay[day] = 0;
    byDay[day]++;
  }

  // ── Busiest substitutes ──────────────────────────────────────────────────
  const substituteLoad = {};
  for (const entry of overrides) {
    const key = entry.substituteTeacherId;
    if (!substituteLoad[key])
      substituteLoad[key] = { name: entry.substituteTeacher?.name, count: 0 };
    substituteLoad[key].count++;
  }

  const busiestSubstitutes = Object.values(substituteLoad)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    weekRange: {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    },
    totalSubstitutions: overrides.length,
    mostAbsentTeachers: mostAbsent,
    mostAffectedSubjects,
    mostAffectedClasses,
    busiestSubstitutes,
    byDay,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLIANCE REPORT — Period Deficit Per Subject
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if each subject is getting its required periods per week.
 * Shows which subjects are falling behind due to teacher absences.
 *
 * @param {string} schoolId
 * @param {string} weekStart
 * @returns {Object} { subjects[], summary }
 */
export const getComplianceReport = async (schoolId, weekStart) => {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  // Get all subjects with their required periods per week
  const subjects = await prisma.subject.findMany({
    where: { schoolId, isActive: true },
    select: {
      id: true,
      name: true,
      periodsPerWeek: true,
      classSubjects: {
        select: {
          classId: true,
          class: { select: { grade: true, section: true } },
        },
      },
    },
  });

  // Get actual periods delivered this week
  const actualPeriods = await prisma.period.findMany({
    where: {
      schoolId,
      isActive: true,
    },
    select: {
      subjectId: true,
      classId: true,
    },
  });

  // Get substitutions that happened
  const substitutions = await prisma.dayOverride.findMany({
    where: {
      schoolId,
      date: { gte: start, lte: end },
    },
    include: {
      timetableSlot: { select: { subjectId: true, classId: true } },
    },
  });

  // Calculate deficit per subject per class
  const report = [];

  for (const subject of subjects) {
    const required = subject.periodsPerWeek || 5;
    const actual = actualPeriods.filter((p) => p.subjectId === subject.id).length;
    const substituted = substitutions.filter(
      (s) => s.timetableSlot?.subjectId === subject.id
    ).length;

    const deficit = Math.max(0, required - actual);
    const coveragePercent = required > 0 ? Math.round((actual / required) * 100) : 100;

    report.push({
      subjectId: subject.id,
      subjectName: subject.name,
      requiredPeriods: required,
      actualPeriods: actual,
      substitutedPeriods: substituted,
      deficit,
      coveragePercent,
      status: coveragePercent >= 90 ? 'GOOD' : coveragePercent >= 75 ? 'WARNING' : 'CRITICAL',
    });
  }

  // Sort by worst coverage first
  report.sort((a, b) => a.coveragePercent - b.coveragePercent);

  const criticalCount = report.filter((r) => r.status === 'CRITICAL').length;
  const warningCount = report.filter((r) => r.status === 'WARNING').length;

  return {
    weekRange: {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    },
    subjects: report,
    summary: {
      totalSubjects: report.length,
      critical: criticalCount,
      warning: warningCount,
      good: report.length - criticalCount - warningCount,
      overallCompliance: Math.round(
        report.reduce((sum, r) => sum + r.coveragePercent, 0) / report.length
      ),
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEACHER WORKLOAD REPORT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Shows workload distribution across all teachers.
 * Helps identify overloaded and underutilized teachers.
 *
 * @param {string} schoolId
 * @returns {Object} { teachers[], summary }
 */
export const getWorkloadReport = async (schoolId) => {
  const teachers = await prisma.teacher.findMany({
    where: { schoolId, isActive: true },
    select: {
      id: true,
      name: true,
      maxPeriodsPerDay: true,
      maxPeriodsPerWeek: true,
      subjects: true,
      _count: {
        select: {
          periods: { where: { isActive: true } },
          substitutions: { where: { status: 'APPROVED' } },
        },
      },
    },
  });

  const report = teachers.map((teacher) => {
    const actualPeriods = teacher._count.periods;
    const maxWeek = teacher.maxPeriodsPerWeek || 30;
    const loadPercent = Math.round((actualPeriods / maxWeek) * 100);
    const substitutionCount = teacher._count.substitutions;

    return {
      teacherId: teacher.id,
      teacherName: teacher.name,
      subjectsCount: teacher.subjects.length,
      actualPeriods,
      maxPeriodsPerWeek: maxWeek,
      loadPercent,
      substitutionDuty: substitutionCount,
      status:
        loadPercent > 90
          ? 'OVERLOADED'
          : loadPercent > 70
            ? 'FULL'
            : loadPercent > 40
              ? 'NORMAL'
              : 'UNDERUTILIZED',
    };
  });

  report.sort((a, b) => b.loadPercent - a.loadPercent);

  const overloaded = report.filter((t) => t.status === 'OVERLOADED').length;
  const underutilized = report.filter((t) => t.status === 'UNDERUTILIZED').length;
  const avgLoad = Math.round(report.reduce((sum, t) => sum + t.loadPercent, 0) / report.length);

  return {
    teachers: report,
    summary: {
      totalTeachers: report.length,
      overloaded,
      underutilized,
      averageLoadPercent: avgLoad,
      totalSubstitutionDuty: report.reduce((sum, t) => sum + t.substitutionDuty, 0),
    },
  };
};
