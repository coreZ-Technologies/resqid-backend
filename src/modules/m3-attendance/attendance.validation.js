// TODO: Add implementation
// =============================================================================
// attendance.validation.js — RESQID
// Zod schemas for all attendance endpoints
// =============================================================================

import { z } from 'zod';

// ─── Reusable field schemas ───────────────────────────────────────────────────

const cuid = z.string().cuid('Invalid ID format');

const grade = z
  .string()
  .min(1)
  .max(10)
  .regex(/^[a-zA-Z0-9]+$/, 'Grade must be alphanumeric');

const section = z
  .string()
  .min(1)
  .max(5)
  .regex(/^[a-zA-Z0-9]+$/, 'Section must be alphanumeric');

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Session Schemas ──────────────────────────────────────────────────────────

export const openSessionSchema = z.object({
  body: z.object({
    grade,
    section,
    subject: z.string().min(1).max(100).optional(),
  }),
});

export const closeSessionSchema = z.object({
  params: z.object({
    sessionId: cuid,
  }),
});

export const getSessionSchema = z.object({
  params: z.object({
    sessionId: cuid,
  }),
});

export const listSessionsSchema = z.object({
  query: paginationSchema.extend({
    grade: z.string().optional(),
    section: z.string().optional(),
    isActive: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    teacherId: cuid.optional(),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
  }),
});

// ─── Tap Schema (RFID device) ─────────────────────────────────────────────────

export const tapSchema = z.object({
  body: z.object({
    sessionId: cuid,
    uidHash: z.string().min(8).max(128, 'UID hash too long'),
    deviceId: z.string().min(1).max(100).optional(),
    tappedAt: z.string().datetime({ offset: true }).optional(),
  }),
});

// ─── Manual Mark Schemas ──────────────────────────────────────────────────────

const attendanceStatus = z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'HALF_DAY']);

export const markAttendanceSchema = z.object({
  params: z.object({
    sessionId: cuid,
  }),
  body: z.object({
    studentId: cuid,
    status: attendanceStatus,
  }),
});

export const bulkMarkAttendanceSchema = z.object({
  params: z.object({
    sessionId: cuid,
  }),
  body: z.object({
    records: z
      .array(
        z.object({
          studentId: cuid,
          status: attendanceStatus,
        })
      )
      .min(1, 'At least one record required')
      .max(200, 'Max 200 records per bulk mark'),
  }),
});

export const updateAttendanceSchema = z.object({
  params: z.object({
    sessionId: cuid,
    studentId: cuid,
  }),
  body: z.object({
    status: attendanceStatus,
  }),
});

export const deleteAttendanceSchema = z.object({
  params: z.object({
    sessionId: cuid,
    studentId: cuid,
  }),
});

// ─── Query / Report Schemas ───────────────────────────────────────────────────

export const sessionRecordsSchema = z.object({
  params: z.object({
    sessionId: cuid,
  }),
  query: paginationSchema,
});

export const studentAttendanceSchema = z.object({
  params: z.object({
    studentId: cuid,
  }),
  query: paginationSchema.extend({
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
  }),
});

export const classAttendanceSchema = z.object({
  query: z.object({
    grade,
    section,
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
      .optional(),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
  }),
});

// ─── Device Registration Schemas ─────────────────────────────────────────────

export const registerDeviceSchema = z.object({
  body: z.object({
    deviceName: z.string().min(1).max(100),
    deviceIdentifier: z.string().min(4).max(100),
    location: z.string().max(200).optional(),
  }),
});

export const removeDeviceSchema = z.object({
  params: z.object({
    deviceId: cuid,
  }),
});