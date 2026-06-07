// src/modules/subjects/subject.validation.js
import { z } from 'zod';

const cuid = z.string().min(1, 'Invalid ID format');

export const subjectIdParamsSchema = z.object({
  id: cuid,
});

export const subjectQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  search: z.string().max(200).optional(),
  status: z.enum(['All', 'Active', 'Inactive']).optional().default('All'),
  sortBy: z.enum(['Name', 'Code', 'Periods']).optional().default('Name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export const createSubjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  code: z
    .string()
    .min(1, 'Code is required')
    .max(20)
    .transform((v) => v.toUpperCase()),
  description: z.string().max(1000).nullable().optional(),
  periodsPerWeek: z.number().int().min(1).max(6),
  status: z.enum(['Active', 'Inactive']).optional().default('Active'),
});

export const updateSubjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  code: z
    .string()
    .min(1)
    .max(20)
    .transform((v) => v.toUpperCase())
    .optional(),
  description: z.string().max(1000).nullable().optional(),
  periodsPerWeek: z.number().int().min(1).max(6).optional(),
  status: z.enum(['Active', 'Inactive']).optional(),
});

export const exportQuerySchema = z.object({
  search: z.string().max(200).optional(),
  status: z.enum(['All', 'Active', 'Inactive']).optional().default('All'),
  sortBy: z.enum(['Name', 'Code', 'Periods']).optional().default('Name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export const jobIdParamsSchema = z.object({
  jobId: cuid,
});
