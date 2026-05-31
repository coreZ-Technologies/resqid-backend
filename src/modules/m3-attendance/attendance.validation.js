// =============================================================================
// modules/attendance/attendance.validation.js — RESQID
// =============================================================================
import { z } from 'zod';

const VALID_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'HALF_DAY', 'HOLIDAY'] as const;
const CLASSES = [
  'Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'
] as const;
const SECTIONS = ['A', 'B', 'C', 'D'] as const;

export const getAttendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  class: z.enum(CLASSES).optional(),
  section: z.enum(SECTIONS).optional(),
  search: z.string().optional(),
});

export const statsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const monthlySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
});

export const markAttendanceSchema = z.object({
  sessionId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  class: z.enum(CLASSES).optional(),
  section: z.enum(SECTIONS).optional(),
  studentId: z.string(),
  status: z.enum(VALID_STATUSES),
  remark: z.string().optional(),
});

export const bulkMarkSchema = z.object({
  sessionId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  class: z.enum(CLASSES).optional(),
  section: z.enum(SECTIONS).optional(),
  records: z.array(
    z.object({
      studentId: z.string(),
      status: z.enum(VALID_STATUSES),
      remark: z.string().optional(),
    })
  ).min(1).max(100),
});

export default {
  getAttendance: getAttendanceSchema,
  stats: statsSchema,
  monthly: monthlySchema,
  markAttendance: markAttendanceSchema,
  bulkMark: bulkMarkSchema,
};