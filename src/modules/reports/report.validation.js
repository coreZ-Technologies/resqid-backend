// src/modules/reports/report.validation.js
import { z } from 'zod';

const dateRangeEnum = z.enum(['Today', 'ThisWeek', 'ThisMonth', 'LastMonth', 'Custom']);
const exportTypeEnum = z.enum(['attendance', 'scan_logs', 'students', 'sessions']);
const exportFormatEnum = z.enum(['csv', 'pdf', 'print']);

export const statsQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const attendanceQuerySchema = z.object({
  dateRange: dateRangeEnum.optional().default('Today'),
  fromDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  toDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  class: z.string().optional(),
  search: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const scanLogQuerySchema = z.object({
  dateRange: dateRangeEnum.optional().default('Today'),
  fromDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  toDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  class: z.string().optional(),
  search: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const exportQuerySchema = z.object({
  type: exportTypeEnum,
  format: exportFormatEnum.optional().default('csv'),
  dateRange: dateRangeEnum.optional().default('Today'),
  fromDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  toDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  class: z.string().optional(),
  search: z.string().max(200).optional(),
});
