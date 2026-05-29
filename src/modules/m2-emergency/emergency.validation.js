// =============================================================================
// modules/m2-emergency/emergency.validation.js — RESQID
// =============================================================================

import { z } from 'zod';

const cuid = z.string().min(1, 'Invalid ID format');

export const getProfileSchema = z.object({
  params: z.object({ studentId: cuid }),
});

export const updateProfileSchema = z.object({
  params: z.object({ studentId: cuid }),
  body: z.object({
    bloodGroup: z
      .enum(['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'O_POS', 'O_NEG', 'AB_POS', 'AB_NEG'])
      .optional(),
    allergies: z.string().max(500).optional(),
    conditions: z.string().max(500).optional(),
    medications: z.string().max(500).optional(),
    doctorName: z.string().max(100).optional(),
    doctorPhone: z.string().max(15).optional(),
    notes: z.string().max(1000).optional(),
    contacts: z
      .array(
        z.object({
          id: z.string().optional(),
          name: z.string().min(1).max(100),
          phone: z.string().min(10).max(15),
          relation: z.string().max(50).optional(),
          priority: z.number().int().min(1).max(10),
          isPrimary: z.boolean().optional(),
        })
      )
      .max(10)
      .optional(),
  }),
});
