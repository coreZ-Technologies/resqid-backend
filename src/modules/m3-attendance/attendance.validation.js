// =============================================================================
// modules/m3-attendance/attendance.validation.js — RESQID
// Zod schemas for all attendance endpoints.
// 🔧 Flat schemas for use with validate() middleware.
// =============================================================================

import { z } from 'zod';

// ─── Reusable ─────────────────────────────────────────────────────────────────

const cuid = z.string().min(1, 'Invalid ID format');
const grade = z.string().min(1).max(10);
const section = z.string().min(1).max(5);
const attendanceStatus = z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'HALF_DAY']);

// ─── Session ──────────────────────────────────────────────────────────────────

export const openSessionSchema = z.object({
  grade,
  section,
  subject: z.string().min(1).max(100).optional(),
});

// ─── Tap (RFID Device) ───────────────────────────────────────────────────────

export const tapSchema = z.object({
  uidHash: z.string().min(8).max(128),
  deviceId: z.string().min(1).max(100),
  tappedAt: z.string().datetime().optional(),
});

// ─── Bulk Sync (ESP32 Offline) ───────────────────────────────────────────────

export const bulkTapSchema = z.object({
  deviceId: z.string().min(1).max(100),
  taps: z
    .array(
      z.object({
        uidHash: z.string().min(8).max(128),
        tappedAt: z.string().datetime(),
      })
    )
    .min(1)
    .max(1000),
});

// ─── Manual Mark ──────────────────────────────────────────────────────────────

export const markAttendanceSchema = z.object({
  studentId: cuid,
  status: attendanceStatus,
});

export const bulkMarkAttendanceSchema = z.object({
  records: z
    .array(
      z.object({
        studentId: cuid,
        status: attendanceStatus,
      })
    )
    .min(1)
    .max(200),
});

export const updateAttendanceSchema = z.object({
  status: attendanceStatus,
});

// ─── Device ──────────────────────────────────────────────────────────────────

export const registerDeviceSchema = z.object({
  name: z.string().min(1).max(100),
  location: z.string().max(200).optional(),
});
