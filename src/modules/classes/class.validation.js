// src/modules/classes/class.validation.js
import { z } from 'zod';

const cuid = z.string().min(1, 'Invalid ID format');

const gradeEnum = z.enum([
  'Nursery',
  'LKG',
  'UKG',
  'Cls 1',
  'Cls 2',
  'Cls 3',
  'Cls 4',
  'Cls 5',
  'Cls 6',
  'Cls 7',
  'Cls 8',
  'Cls 9',
  'Cls 10',
  'Cls 11',
  'Cls 12',
]);

const sectionEnum = z.enum(['A', 'B', 'C', 'D', 'E']);
const statusEnum = z.enum(['Active', 'Inactive']);
const gradeGroupEnum = z.enum(['Primary', 'Middle', 'Secondary', 'Senior']);

export const classIdParamsSchema = z.object({
  id: cuid,
});

export const classQuerySchema = z.object({
  gradeGroup: gradeGroupEnum.optional(),
  status: statusEnum.optional(),
  search: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const createClassSchema = z.object({
  grade: gradeEnum,
  section: sectionEnum,
  classTeacher: z.string().max(200).nullable().optional(),
  room: z.string().max(50).nullable().optional(),
  status: statusEnum.optional().default('Active'),
});

export const updateClassSchema = z.object({
  grade: gradeEnum.optional(),
  section: sectionEnum.optional(),
  classTeacher: z.string().max(200).nullable().optional(),
  room: z.string().max(50).nullable().optional(),
  status: statusEnum.optional(),
});

export const exportQuerySchema = z.object({
  gradeGroup: gradeGroupEnum.optional(),
  status: statusEnum.optional(),
  search: z.string().max(200).optional(),
});

export const jobIdParamsSchema = z.object({
  jobId: cuid,
});
