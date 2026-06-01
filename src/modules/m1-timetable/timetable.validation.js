// =============================================================================
// modules/m1-timetable/timetable.validation.js — RESQID
// Zod schemas for all timetable endpoints.
// =============================================================================

import { z } from 'zod';

const cuid = z.string().min(1, 'Invalid ID format');
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dayOfWeek = z.number().int().min(1).max(6);

// ═══════════════════════════════════════════════════════════════════════════════
// SCHOOL TIMETABLE CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export const updateTimetableConfigSchema = z.object({
  body: z.object({
    periodsPerDay: z.number().int().min(4).max(12).optional(),
    periodDuration: z.number().int().min(30).max(60).optional(),
    startTime: z.string().regex(timeRegex, 'HH:MM format').optional(),
    workingDays: z.number().int().min(1).max(63).optional(),
    breakAfterPeriods: z.array(z.number().int().min(1)).optional(),
    breakDuration: z.number().int().min(5).max(30).optional(),
    allowSubstitution: z.boolean().optional(),
    maxSubstitutionsPerDay: z.number().int().min(1).max(10).optional(),
    substitutionNoticeMins: z.number().int().min(15).max(120).optional(),
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEACHER
// ═══════════════════════════════════════════════════════════════════════════════

export const createTeacherSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    email: z.string().email().optional(),
    phone: z.string().max(15).optional(),
    subjects: z.array(z.string()).min(1, 'At least one subject required'),
    maxPeriodsPerDay: z.number().int().min(1).max(12).default(6),
    maxPeriodsPerWeek: z.number().int().min(1).max(60).default(30),
    maxConsecutive: z.number().int().min(1).max(8).default(4),
    gradeMin: z.number().int().min(1).max(12).optional(),
    gradeMax: z.number().int().min(1).max(12).optional(),
    floorRestriction: z.enum(['NONE', 'GROUND_FLOOR_ONLY']).default('NONE'),
    noLabDuty: z.boolean().default(false),
    noSubstitutionDuty: z.boolean().default(false),
    unavailableDays: z.array(z.number().int().min(1).max(6)).optional(),
  }),
});

export const updateTeacherSchema = z.object({
  params: z.object({ teacherId: cuid }),
  body: createTeacherSchema.shape.body.partial(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUBJECT
// ═══════════════════════════════════════════════════════════════════════════════

export const createSubjectSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    code: z.string().max(20).optional(),
    category: z.enum(['CORE', 'ELECTIVE', 'LAB', 'SPORTS']).default('CORE'),
    periodsPerWeek: z.number().int().min(1).max(10).default(5),
    requiresLab: z.boolean().default(false),
    labPeriodsPerWeek: z.number().int().min(0).max(5).default(0),
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLASS GROUP
// ═══════════════════════════════════════════════════════════════════════════════

export const createClassSchema = z.object({
  body: z.object({
    grade: z.string().min(1).max(10),
    section: z.string().min(1).max(5),
    teacherId: cuid.optional(),
    roomNumber: z.string().max(20).optional(),
    studentCount: z.number().int().min(0).default(0),
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// PERIOD
// ═══════════════════════════════════════════════════════════════════════════════

export const createPeriodSchema = z.object({
  body: z.object({
    classId: cuid,
    teacherId: cuid,
    subjectId: cuid,
    dayOfWeek,
    periodNumber: z.number().int().min(1),
    roomNumber: z.string().max(20).optional(),
    periodType: z.enum(['REGULAR', 'LAB', 'SPORTS', 'ASSEMBLY']).default('REGULAR'),
  }),
});

export const bulkCreatePeriodsSchema = z.object({
  body: z.object({
    classId: cuid,
    periods: z
      .array(
        z.object({
          teacherId: cuid,
          subjectId: cuid,
          dayOfWeek,
          periodNumber: z.number().int().min(1),
          roomNumber: z.string().max(20).optional(),
          periodType: z.enum(['REGULAR', 'LAB', 'SPORTS', 'ASSEMBLY']).default('REGULAR'),
        })
      )
      .min(1)
      .max(60),
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-GENERATE
// ═══════════════════════════════════════════════════════════════════════════════

export const generateTimetableSchema = z.object({
  body: z.object({
    classIds: z.array(cuid).min(1, 'At least one class required'),
    strictMode: z.boolean().default(true),
    preferMorningCore: z.boolean().default(true),
    balanceTeacherLoad: z.boolean().default(true),
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSTITUTION
// ═══════════════════════════════════════════════════════════════════════════════

export const createSubstitutionSchema = z.object({
  body: z.object({
    periodId: cuid,
    substituteTeacherId: cuid,
    date: z.string(),
    reason: z.string().max(200).optional(),
    notifyParents: z.boolean().default(false),
  }),
});

export const approveSubstitutionSchema = z.object({
  params: z.object({ substitutionId: cuid }),
  body: z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

export const classTimetableSchema = z.object({
  params: z.object({ classId: cuid }),
});

export const teacherTimetableSchema = z.object({
  params: z.object({ teacherId: cuid }),
});

export const getConfigSchema = z.object({
  params: z.object({ schoolId: cuid.optional() }),
});
