/**
 * Crisis validation schemas using Zod.
 */

import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────────────

const CrisisType = z.enum([
  'TEACHER_ABSENT',
  'ROOM_UNAVAILABLE',
  'PARTIAL_RESCHEDULE',
  'MASS_LEAVE',
  'WEATHER_EVENT',
  'OTHER',
]);

const CrisisSeverity = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const CrisisStatus = z.enum(['RESOLVED', 'UNRESOLVED', 'ESCALATED']);

// ─── Payload Schemas ──────────────────────────────────────────────────────────

const teacherAbsentPayload = z.object({
  teacherId: z.string().min(1, 'teacherId is required'),
  date: z.string().min(1, 'date is required'),
  timetableId: z.string().min(1, 'timetableId is required'),
  periods: z.array(z.number().int().min(1).max(12)).optional(),
  reason: z.string().max(500).optional(),
});

const roomUnavailablePayload = z.object({
  roomId: z.string().min(1, 'roomId is required'),
  timetableId: z.string().min(1, 'timetableId is required'),
  date: z.string().optional(),
  periods: z.array(z.number().int().min(1).max(12)).optional(),
  reason: z.string().max(500).optional(),
});

const partialReschedulePayload = z.object({
  timetableId: z.string().min(1, 'timetableId is required'),
  moves: z
    .array(
      z.object({
        slotId: z.string().min(1, 'slotId is required'),
        newDay: z.number().int().min(1).max(7),
        newPeriod: z.number().int().min(1).max(12),
      })
    )
    .min(1, 'moves must have at least 1 item'),
  reason: z.string().max(500).optional(),
});

const massLeavePayload = z.object({
  teacherIds: z.array(z.string().min(1)).min(1, 'teacherIds must have at least 1 teacher'),
  date: z.string().min(1, 'date is required'),
  timetableId: z.string().min(1, 'timetableId is required'),
  reason: z.string().max(500).optional(),
});

const weatherEventPayload = z.object({
  date: z.string().min(1, 'date is required'),
  timetableId: z.string().min(1, 'timetableId is required'),
  earlyDismissal: z.boolean().optional(),
  affectedPeriods: z.array(z.number().int().min(1).max(12)).optional(),
  description: z.string().max(500).optional(),
});

// ─── Main Schemas ─────────────────────────────────────────────────────────────

export const triggerCrisisSchema = z.object({
  type: CrisisType,
  severity: CrisisSeverity.optional().default('MEDIUM'),
  title: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  payload: z.union([
    teacherAbsentPayload,
    roomUnavailablePayload,
    partialReschedulePayload,
    massLeavePayload,
    weatherEventPayload,
    z.object({}).passthrough(),
  ]),
});

export const updateCrisisStatusSchema = z.object({
  status: CrisisStatus,
  resolution: z.string().max(500).optional(),
});

export const crisisHistoryQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  type: CrisisType.optional(),
  status: z
    .enum(['REPORTED', 'ANALYZING', 'RESOLVED', 'PARTIALLY_RESOLVED', 'UNRESOLVED', 'ESCALATED'])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const jobIdParamsSchema = z.object({
  jobId: z.string().min(1, 'jobId is required'),
});

export const crisisIdParamsSchema = z.object({
  crisisId: z.string().min(1, 'crisisId is required'),
});
