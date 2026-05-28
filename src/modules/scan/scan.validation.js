// =============================================================================
// modules/scan/scan.validation.js — RESQID
// Zod schemas for public QR scan endpoints.
// =============================================================================

import { z } from 'zod';

export const scanCodeRegex = /^[A-Za-z0-9]{43}$/;

export const scanCodeParamsSchema = z.object({
  code: z.string().regex(scanCodeRegex, 'Invalid scan code format'),
});

export const contactRedirectParamsSchema = z.object({
  contactId: z.string().min(1, 'Contact ID required'),
  token: z.string().regex(scanCodeRegex, 'Invalid token format'),
});

export const tokenOnlyParamsSchema = z.object({
  token: z.string().regex(scanCodeRegex, 'Invalid token format'),
});
