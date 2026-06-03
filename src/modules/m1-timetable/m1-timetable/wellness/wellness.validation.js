/**
 * Wellness validation schemas.
 */

import { z } from 'zod';

export const wellnessUpsertSchema = z.object({
  // Physical accommodations
  isPregnant: z.boolean().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  needsGroundFloor: z.boolean().optional(),
  needsAccessibleRoom: z.boolean().optional(),
  mobilityAid: z.string().max(100).nullable().optional(),
  medicalConditions: z.array(z.string()).optional(),

  // Workload preferences
  isSenior: z.boolean().optional(),
  preferredMaxPerDay: z.number().int().min(1).max(12).nullable().optional(),
  preferredMaxPerWeek: z.number().int().min(1).max(60).nullable().optional(),

  // Time preferences
  avoidEarlyMorning: z.boolean().optional(),
  avoidLateEvening: z.boolean().optional(),
  needsCommuteBuffer: z.boolean().optional(),
  commuteDistance: z.number().int().min(0).nullable().optional(),
  commuteTime: z.number().int().min(0).nullable().optional(),

  // Personal blocks
  preferredSlots: z
    .array(
      z.object({
        day: z.number().int().min(1).max(7),
        period: z.number().int().min(1).max(12),
      })
    )
    .nullable()
    .optional(),
  personalBlocks: z
    .array(
      z.object({
        day: z.number().int().min(1).max(7),
        period: z.number().int().min(1).max(12),
        reason: z.string().max(200).optional(),
      })
    )
    .nullable()
    .optional(),

  // Wellness tracking
  burnoutRisk: z.boolean().optional(),
  burnoutScore: z.number().int().min(0).max(100).optional(),
  wellnessNotes: z.string().max(1000).nullable().optional(),

  // Emergency contact
  emergencyContact: z.string().max(200).nullable().optional(),
  emergencyPhone: z.string().max(20).nullable().optional(),

  // Privacy
  isConfidential: z.boolean().optional(),
});

export const wellnessUpdateSchema = wellnessUpsertSchema.partial();

export const teacherIdParamsSchema = z.object({
  teacherId: z.string().min(1, 'teacherId is required'),
});
