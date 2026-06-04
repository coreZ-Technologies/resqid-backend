// school-admin/subjects/subjects.validation.js
import { z } from 'zod';

const RoomTypeEnum = z.enum(['REGULAR', 'LAB', 'COMPUTER_LAB', 'AUDIO_VISUAL', 'LIBRARY', 'SPORTS', 'AUDITORIUM', 'STAFF_ROOM', 'OTHER']);

export const createSubjectSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20).optional(),
  category: z.string().max(50).optional(),
  periodsPerWeek: z.number().int().min(0).max(40).default(5),
  requiresLab: z.boolean().default(false),
  labPeriodsPerWeek: z.number().int().min(0).max(20).default(0),
  isHeavy: z.boolean().default(false),
  isPractical: z.boolean().default(false),
  requiredRoomType: RoomTypeEnum.optional(),
  isActive: z.boolean().default(true),
});

export const updateSubjectSchema = createSubjectSchema.partial();

export const listSubjectsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(15),
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  requiresLab: z.enum(['true', 'false']).optional(),
  isHeavy: z.enum(['true', 'false']).optional(),
  isPractical: z.enum(['true', 'false']).optional(),
  category: z.string().optional(),
});

export const bulkUpdateSubjectsSchema = z.object({
  updates: z.array(z.object({
    id: z.string().min(1),
    data: updateSubjectSchema,
  })).min(1).max(100),
});