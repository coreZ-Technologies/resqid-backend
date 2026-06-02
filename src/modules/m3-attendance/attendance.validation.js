// =============================================================================
// modules/m3-attendance/attendance.validation.js — RESQID
// Zod schemas for all attendance endpoints.
// =============================================================================

import { z } from 'zod';

// ─── Reusable ─────────────────────────────────────────────────────────────────

const cuid = z.string().min(1, 'Invalid ID format');
const grade = z.string().min(1).max(10);
const section = z.string().min(1).max(5);
const attendanceStatus = z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'HALF_DAY']);

// ─── Session ──────────────────────────────────────────────────────────────────

export const openSessionSchema = z.object({
  body: z.object({
    grade,
    section,
    subject: z.string().min(1).max(100).optional(),
  }),
});

export const closeSessionSchema = z.object({
  params: z.object({ sessionId: cuid }),
});

export const listSessionsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    grade: z.string().optional(),
    section: z.string().optional(),
    isActive: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    teacherId: cuid.optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});

// ─── Tap (RFID Device) ───────────────────────────────────────────────────────

export const tapSchema = z.object({
  body: z.object({
    uidHash: z.string().min(8).max(128),
    deviceId: z.string().min(1).max(100),
    tappedAt: z.string().optional(),
  }),
});

// ─── Bulk Sync (ESP32 Offline) ───────────────────────────────────────────────

export const bulkTapSchema = z.object({
  body: z.object({
    deviceId: z.string().min(1).max(100),
    taps: z
      .array(
        z.object({
          uidHash: z.string().min(8).max(128),
          tappedAt: z.string(),
        })
      )
      .min(1)
      .max(1000),
  }),
});

// ─── Manual Mark ──────────────────────────────────────────────────────────────

export const markAttendanceSchema = z.object({
  params: z.object({ sessionId: cuid }),
  body: z.object({
    studentId: cuid,
    status: attendanceStatus,
  }),
});

export const bulkMarkAttendanceSchema = z.object({
  params: z.object({ sessionId: cuid }),
  body: z.object({
    records: z
      .array(
        z.object({
          studentId: cuid,
          status: attendanceStatus,
        })
      )
      .min(1)
      .max(200),
  }),
});

export const updateAttendanceSchema = z.object({
  params: z.object({ sessionId: cuid, studentId: cuid }),
  body: z.object({ status: attendanceStatus }),
});

// ─── Query ────────────────────────────────────────────────────────────────────

export const sessionRecordsSchema = z.object({
  params: z.object({ sessionId: cuid }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const studentAttendanceSchema = z.object({
  params: z.object({ studentId: cuid }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});

export const classAttendanceSchema = z.object({
  query: z.object({
    grade,
    section,
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});

// ─── Device ──────────────────────────────────────────────────────────────────

export const registerDeviceSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    location: z.string().max(200).optional(),
  }),
});
