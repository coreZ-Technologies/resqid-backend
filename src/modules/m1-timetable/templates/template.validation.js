/**
 * Template validation schemas.
 */

import { z } from 'zod';

export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(500).optional(),
  academicYear: z.string().optional(),
  term: z.string().optional(),

  // Config snapshot
  config: z
    .object({
      periodsPerDay: z.number().int().min(1).max(15).optional().default(8),
      periodDuration: z.number().int().min(20).max(120).optional().default(45),
      startTime: z.string().optional().default('08:00'),
      endTime: z.string().optional().default('15:00'),
      workingDays: z.array(z.number().int().min(1).max(7)).optional().default([1, 2, 3, 4, 5, 6]),
      breakAfterPeriods: z.array(z.number().int()).optional().default([2, 4, 6]),
      breakDurations: z.array(z.number().int()).optional().default([15, 30, 10]),
      lunchAfterPeriod: z.number().int().optional().default(4),
      lunchDuration: z.number().int().optional().default(30),
      morningPeriodsEnd: z.number().int().optional().default(4),
    })
    .optional(),

  // Constraints snapshot
  constraints: z
    .object({
      maxConsecutivePeriods: z.number().int().min(1).max(8).optional().default(3),
      minGapBetweenSubjects: z.number().int().min(0).max(5).optional().default(1),
      maxSameSubjectPerDay: z.number().int().min(1).max(5).optional().default(2),
      allowSubstitution: z.boolean().optional().default(true),
      maxSubstitutionsPerDay: z.number().int().min(1).max(10).optional().default(3),
    })
    .optional(),

  // Grade levels
  gradeLevels: z
    .array(
      z.object({
        gradeFrom: z.number().int().min(1).max(12),
        gradeTo: z.number().int().min(1).max(12),
        label: z.string().min(1).max(100),
        periodsPerDay: z.number().int().min(1).max(15),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        breakAfterPeriods: z.array(z.number().int()).optional(),
        breakDurations: z.array(z.number().int()).optional(),
        lunchAfterPeriod: z.number().int().nullable().optional(),
      })
    )
    .optional(),

  basedOnTemplateId: z.string().optional(),
});

export const updateTemplateSchema = createTemplateSchema.partial();

export const templateIdParamsSchema = z.object({
  id: z.string().min(1, 'Template ID is required'),
});

export const templateListQuerySchema = z.object({
  isActive: z.coerce.boolean().optional(),
  academicYear: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
