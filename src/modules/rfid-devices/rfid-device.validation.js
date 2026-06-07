// src/modules/rfid-devices/rfid-device.validation.js
import { z } from 'zod';

const cuid = z.string().min(1, 'Invalid ID format');

export const deviceIdParamsSchema = z.object({
  id: cuid,
});

export const deviceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.enum(['online', 'offline', 'faulty']).optional(),
  zone: z.enum(['Entry', 'Classroom', 'Library', 'Outdoor', 'Indoor']).optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['name', 'status', 'todayScans']).optional().default('name'),
});

export const firmwareUpdateSchema = z.object({
  firmwareVersion: z.string().max(20).optional(),
});

export const recentActivityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export const exportQuerySchema = z.object({
  status: z.enum(['online', 'offline', 'faulty']).optional(),
  zone: z.enum(['Entry', 'Classroom', 'Library', 'Outdoor', 'Indoor']).optional(),
  search: z.string().max(200).optional(),
});
