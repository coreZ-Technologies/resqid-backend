// TODO: Add implementation
// school-admin/qr/qr.validation.js
import { z } from 'zod';

const QrFormatEnum = z.enum(['PNG', 'SVG', 'PDF']);
const QrSizeSchema = z.object({
  width: z.number().int().min(128).max(2048),
  height: z.number().int().min(128).max(2048),
});

export const generateQrSchema = z.object({
  format: QrFormatEnum.default('PNG'),
  width: z.number().int().min(128).max(2048).default(512),
  height: z.number().int().min(128).max(2048).default(512),
});

export const assignTokenSchema = z.object({
  studentId: z.string().min(1),
});

export const listTokensQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});