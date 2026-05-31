// =============================================================================
// modules/m1-timetable/timetable.service.js — RESQID
// Business logic + constraint validation + solver integration.
// =============================================================================

import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';
import * as repo from './timetable.repository.js';
import { generateTimetable as solveTimetable } from './solver/index.js';
import { validateTimetable as validateSlots } from './solver/validator.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export const getConfig = (schoolId) => repo.getTimetableConfig(schoolId);

export const updateConfig = (schoolId, data) => repo.upsertTimetableConfig(schoolId, data);

// ═══════════════════════════════════════════════════════════════════════════════
// TEACHER
// ═══════════════════════════════════════════════════════════════════════════════

export const createTeacher = (schoolId, data) => repo.createTeacher({ ...data, schoolId });

export const listTeachers = (schoolId) => repo.listTeachers(schoolId);

export const getTeacher = (id, schoolId) => repo.findTeacher(id, schoolId);

export const updateTeacher = (id, data) => repo.updateTeacher(id, data);

export const removeTeacher = (id) => repo.deleteTeacher(id);

// ═══════════════════════════════════════════════════════════════════════════════
// SUBJECT
// ═══════════════════════════════════════════════════════════════════════════════

export const createSubject = (schoolId, data) => repo.createSubject({ ...data, schoolId });

export const listSubjects = (schoolId) => repo.listSubjects(schoolId);

// ═══════════════════════════════════════════════════════════════════════════════
// CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export const createClass = (schoolId, data) => repo.createClassGroup({ ...data, schoolId });

export const listClasses = (schoolId) => repo.listClassGroups(schoolId);

// ═══════════════════════════════════════════════════════════════════════════════
// PERIOD — Manual CRUD with constraint validation
// ═══════════════════════════════════════════════════════════════════════════════

export const addPeriod = async (schoolId, data) => {
  // Validate constraints
  const violations = await validatePeriodConstraints(schoolId, data);
  const hardViolations = violations.filter((v) => v.type === 'HARD');

  if (hardViolations.length > 0) {
    throw ApiError.conflict(
      `Cannot add period: ${hardViolations.map((v) => v.message).join('. ')}`
    );
  }

  return repo.createPeriod({ ...data, schoolId });
};

export const addBulkPeriods = async (schoolId, classId, periods) => {
  const enriched = periods.map((p) => ({ ...p, schoolId, classId }));
  await repo.bulkCreatePeriods(enriched);
  return { count: periods.length };
};

export const getClassTimetable = (classId, schoolId) => repo.getClassTimetable(classId, schoolId);

export const getTeacherTimetable = (teacherId, schoolId) =>
  repo.getTeacherTimetable(teacherId, schoolId);

export const removePeriod = (id) => repo.deletePeriod(id);

export const clearTimetable = (classId) => repo.clearClassTimetable(classId);

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTRAINT VALIDATION (Single Period)
// ═══════════════════════════════════════════════════════════════════════════════

async function validatePeriodConstraints(schoolId, data, excludePeriodId = null) {
  const violations = [];
  const config = await repo.getTimetableConfig(schoolId);
  const teachers = await repo.getTeachersWithConstraints(schoolId);
  const teacher = teachers.find((t) => t.id === data.teacherId);

  if (!teacher) {
    violations.push({ type: 'HARD', message: 'Teacher not found' });
    return violations;
  }

  // ── HARD: Teacher double-booking ──────────────────────────────────────────
  const teacherBooked = await repo.findTeacherPeriodAtSlot(
    data.teacherId,
    data.dayOfWeek,
    data.periodNumber,
    excludePeriodId
  );

  if (teacherBooked) {
    violations.push({
      type: 'HARD',
      message: `${teacher.name} is already assigned at Day ${data.dayOfWeek}, Period ${data.periodNumber}`,
    });
  }

  // ── HARD: Class double-booking ────────────────────────────────────────────
  const classBooked = await repo.findClassPeriodAtSlot(
    data.classId,
    data.dayOfWeek,
    data.periodNumber,
    excludePeriodId
  );

  if (classBooked) {
    violations.push({
      type: 'HARD',
      message: `Class already has a period at Day ${data.dayOfWeek}, Period ${data.periodNumber}`,
    });
  }

  // ── HARD: Subject qualification ───────────────────────────────────────────
  if (!teacher.subjects.includes(data.subjectId)) {
    violations.push({
      type: 'HARD',
      message: `${teacher.name} is not qualified to teach this subject`,
    });
  }

  // ── HARD: Daily max ──────────────────────────────────────────────────────
  const dayCount = await repo.countTeacherPeriodsOnDay(data.teacherId, data.dayOfWeek);
  if (dayCount >= (teacher.maxPeriodsPerDay || 6)) {
    violations.push({
      type: 'HARD',
      message: `${teacher.name} has reached daily max (${teacher.maxPeriodsPerDay})`,
    });
  }

  // ── MEDIUM: Weekly max ───────────────────────────────────────────────────
  const weekCount = await repo.countTeacherPeriodsInWeek(data.teacherId);
  if (weekCount >= (teacher.maxPeriodsPerWeek || 30)) {
    violations.push({
      type: 'MEDIUM',
      message: `${teacher.name} has reached weekly max (${teacher.maxPeriodsPerWeek})`,
    });
  }

  // ── MEDIUM: Consecutive limit ────────────────────────────────────────────
  const dayPeriods = await repo.getTeacherPeriodsOnDay(data.teacherId, data.dayOfWeek);
  const consecutiveCount = getConsecutiveCount(
    dayPeriods.map((p) => p.periodNumber),
    data.periodNumber
  );

  if (consecutiveCount >= (teacher.maxConsecutive || 4)) {
    violations.push({
      type: 'MEDIUM',
      message: `${teacher.name} would exceed consecutive limit (${teacher.maxConsecutive})`,
    });
  }

  return violations;
}

function getConsecutiveCount(periodNumbers, target) {
  const all = [...periodNumbers, target].sort((a, b) => a - b);
  let maxConsecutive = 1;
  let current = 1;

  for (let i = 1; i < all.length; i++) {
    if (all[i] - all[i - 1] === 1) {
      current++;
      maxConsecutive = Math.max(maxConsecutive, current);
    } else {
      current = 1;
    }
  }

  return maxConsecutive;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-GENERATE
// ═══════════════════════════════════════════════════════════════════════════════

export const generateTimetable = async (schoolId, options) => {
  const result = await solveTimetable({
    schoolId,
    ...options,
  });

  if (result.success && options.autoSave !== false) {
    await repo.saveGeneratedTimetable(schoolId, options.classIds, result.timetable);
    logger.info(
      { schoolId, classCount: options.classIds.length },
      '[timetable] Auto-saved generated timetable'
    );
  }

  return result;
};

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATE IMPORTED
// ═══════════════════════════════════════════════════════════════════════════════

export const validateImportedTimetable = async (schoolId, periods) => {
  const teachers = await repo.getTeachersWithConstraints(schoolId);
  const config = await repo.getTimetableConfig(schoolId);

  return validateSlots(periods, teachers, config);
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSTITUTION
// ═══════════════════════════════════════════════════════════════════════════════

export const createSubstitution = (schoolId, data) =>
  repo.createSubstitution({ ...data, schoolId, status: 'PENDING' });

export const listSubstitutions = (schoolId, date) => repo.listSubstitutions(schoolId, date);

export const approveSubstitution = (id, schoolId, status, approvedBy) =>
  repo.updateSubstitutionStatus(id, status, approvedBy);

export const findSubstituteForPeriod = async (schoolId, periodId) => {
  const period = await prisma.period.findUnique({
    where: { id: periodId },
    include: {
      subject: true,
      classGroup: true,
    },
  });

  if (!period) throw ApiError.notFound('Period not found');

  const teachers = await repo.getTeachersWithConstraints(schoolId);
  const qualified = teachers.filter(
    (t) => t.subjects.includes(period.subjectId) && !t.noSubstitutionDuty
  );

  // Find available at this day+period
  const available = [];
  for (const teacher of qualified) {
    const booked = await repo.findTeacherPeriodAtSlot(
      teacher.id,
      period.dayOfWeek,
      period.periodNumber
    );
    if (!booked) available.push(teacher);
  }

  return available;
};
