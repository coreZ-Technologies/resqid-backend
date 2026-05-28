// =============================================================================
// modules/parents/parent.validation.js — RESQID
// Zod schemas for parent module endpoints.
// =============================================================================

import { z } from 'zod';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHONE_REGEX = /^[6-9]\d{9}$/;

// ─── Blood Group Mapping ─────────────────────────────────────────────────────

const BLOOD_GROUPS = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'O_POS', 'O_NEG', 'AB_POS', 'AB_NEG'];

const BLOOD_GROUP_MAP = {
  'A+': 'A_POS',
  'A-': 'A_NEG',
  'B+': 'B_POS',
  'B-': 'B_NEG',
  'O+': 'O_POS',
  'O-': 'O_NEG',
  'AB+': 'AB_POS',
  'AB-': 'AB_NEG',
};

// ─── Profile Update ──────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  body: z.object({
    studentId: z.string().regex(UUID_REGEX, 'Invalid student ID'),
    firstName: z
      .string()
      .min(1)
      .max(100)
      .transform((v) => v.trim())
      .optional(),
    lastName: z
      .string()
      .min(1)
      .max(100)
      .transform((v) => v.trim())
      .optional(),
    grade: z
      .string()
      .max(50)
      .transform((v) => v.trim())
      .optional(),
    section: z
      .string()
      .max(30)
      .transform((v) => v.trim())
      .optional(),
    photoUrl: z.string().max(500).optional(),
    emergency: z
      .object({
        bloodGroup: z
          .string()
          .optional()
          .transform((v) => {
            if (!v) return undefined;
            return BLOOD_GROUP_MAP[v] ?? (BLOOD_GROUPS.includes(v) ? v : undefined);
          })
          .pipe(z.enum(BLOOD_GROUPS).optional()),
        allergies: z
          .string()
          .max(500)
          .transform((v) => v?.trim() || null)
          .optional(),
        conditions: z
          .string()
          .max(500)
          .transform((v) => v?.trim() || null)
          .optional(),
        medications: z
          .string()
          .max(500)
          .transform((v) => v?.trim() || null)
          .optional(),
        doctorName: z
          .string()
          .max(100)
          .transform((v) => v?.trim() || null)
          .optional(),
        doctorPhone: z.string().regex(PHONE_REGEX, 'Invalid phone').optional(),
        notes: z
          .string()
          .max(1000)
          .transform((v) => v?.trim() || null)
          .optional(),
      })
      .optional(),
    contacts: z
      .array(
        z.object({
          id: z.string().regex(UUID_REGEX).optional(),
          name: z
            .string()
            .min(1)
            .max(100)
            .transform((v) => v.trim()),
          phone: z.string().regex(PHONE_REGEX, 'Invalid phone number'),
          relation: z
            .string()
            .max(50)
            .transform((v) => v?.trim() || null)
            .optional(),
          priority: z.number().int().min(1).max(10),
          isPrimary: z.boolean().optional(),
          callEnabled: z.boolean().optional(),
          whatsappEnabled: z.boolean().optional(),
        })
      )
      .max(10)
      .optional(),
  }),
});

// ─── Card Visibility ─────────────────────────────────────────────────────────

export const updateVisibilitySchema = z.object({
  body: z.object({
    studentId: z.string().regex(UUID_REGEX),
    visibility: z.enum(['PUBLIC', 'MINIMAL', 'HIDDEN']),
  }),
});

// ─── Notification Preferences ────────────────────────────────────────────────

export const updateNotificationsSchema = z.object({
  body: z.object({
    pushEnabled: z.boolean().optional(),
    smsEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
    onScan: z.boolean().optional(),
    onAttendance: z.boolean().optional(),
    onEmergency: z.boolean().optional(),
    onAnnouncement: z.boolean().optional(),
  }),
});

// ─── Scan History ────────────────────────────────────────────────────────────

export const scanHistorySchema = z.object({
  query: z.object({
    studentId: z.string().regex(UUID_REGEX),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    filter: z.enum(['all', 'emergency', 'success', 'flagged']).default('all'),
  }),
});

// ─── Lock Card ───────────────────────────────────────────────────────────────

export const lockCardSchema = z.object({
  body: z.object({
    studentId: z.string().regex(UUID_REGEX),
    confirmation: z.literal('LOCK', { errorMap: () => ({ message: "Type 'LOCK' to confirm" }) }),
  }),
});

// ─── Request Card Replace ────────────────────────────────────────────────────

export const requestReplaceSchema = z.object({
  body: z.object({
    studentId: z.string().regex(UUID_REGEX),
    reason: z
      .string()
      .min(5)
      .max(500)
      .transform((v) => v.trim()),
  }),
});

// ─── Register Device Token ───────────────────────────────────────────────────

export const registerDeviceTokenSchema = z.object({
  body: z.object({
    token: z.string().min(10, 'Token is required'),
    platform: z.enum(['IOS', 'ANDROID', 'WEB']),
    deviceName: z.string().max(100).optional(),
    deviceModel: z.string().max(100).optional(),
    osVersion: z.string().max(50).optional(),
  }),
});

// ─── Link Card ───────────────────────────────────────────────────────────────

export const linkCardSchema = z.object({
  body: z.object({
    cardNumber: z
      .string()
      .trim()
      .min(5)
      .max(20)
      .transform((v) => v.toUpperCase().replace(/[^A-Z0-9-]/g, '')),
  }),
});

// ─── Set Active Student ──────────────────────────────────────────────────────

export const setActiveStudentSchema = z.object({
  body: z.object({
    studentId: z.string().regex(UUID_REGEX),
  }),
});

// ─── Parent Profile ──────────────────────────────────────────────────────────

export const parentProfileSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1)
      .max(100)
      .transform((v) => v.trim()),
    email: z.string().email().toLowerCase().optional(),
  }),
});

// ─── Photo Upload ────────────────────────────────────────────────────────────

export const generateUploadUrlSchema = z.object({
  body: z.object({
    contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    fileSize: z
      .number()
      .int()
      .positive()
      .max(5 * 1024 * 1024, 'Max 5MB'),
  }),
});

export const confirmUploadSchema = z.object({
  body: z.object({
    key: z.string().min(10),
    nonce: z.string().min(10),
  }),
});
