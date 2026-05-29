// =============================================================================
// modules/auth/auth.validation.js — RESQID
// Zod validation schemas for all auth endpoints.
// =============================================================================

import { z } from 'zod';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number (10 digits, starts with 6-9)');

const otpSchema = z.string().trim().length(6, 'OTP must be exactly 6 digits');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Must contain at least one digit')
  .regex(/[!@#$%&*]/, 'Must contain at least one special character (!@#$%&*)');

// ─── Parent: Send OTP ────────────────────────────────────────────────────────

export const sendOtpSchema = z.object({
  body: z.object({
    phone: phoneSchema,
    cardNumber: z
      .string()
      .trim()
      .min(5, 'Card number too short')
      .max(20, 'Card number too long')
      .transform((v) => v.toUpperCase().replace(/[^A-Z0-9-]/g, ''))
      .optional(),
    purpose: z.enum(['login', 'register']).default('login'),
  }),
});

// ─── Parent: Verify OTP + Login ──────────────────────────────────────────────

export const verifyOtpSchema = z.object({
  body: z.object({
    phone: phoneSchema,
    otp: otpSchema,
  }),
});

// ─── Parent: Register (Step 2 - Complete Profile) ────────────────────────────

export const registerParentSchema = z.object({
  body: z.object({
    phone: phoneSchema,
    otp: otpSchema,
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
    email: z.string().trim().toLowerCase().email('Invalid email').max(254).optional().nullable(),
  }),
});

// ─── Teacher Login ───────────────────────────────────────────────────────────

export const teacherLoginSchema = z.object({
  body: z.object({
    phone: phoneSchema,
    password: z.string().min(1, 'Password is required').max(128),
  }),
});

// ─── School Admin Login ──────────────────────────────────────────────────────

export const schoolAdminLoginSchema = z.object({
  body: z.object({
    phone: phoneSchema,
    password: z.string().min(1, 'Password is required').max(128),
    schoolCode: z.string().optional(),
  }),
});

// ─── Super Admin Login ───────────────────────────────────────────────────────

export const superAdminLoginSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Invalid email').max(254),
    password: z.string().min(1, 'Password is required'),
  }),
});

// ─── Token Refresh ───────────────────────────────────────────────────────────

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

// ─── Change Password (First-time + Regular) ──────────────────────────────────

export const changePasswordSchema = z
  .object({
    body: z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: passwordSchema,
    }),
  })
  .refine((data) => data.body.currentPassword !== data.body.newPassword, {
    message: 'New password must be different from current password',
    path: ['body', 'newPassword'],
  });

// ─── Forgot Password (Request Reset OTP) ─────────────────────────────────────

export const forgotPasswordSchema = z.object({
  body: z.object({
    phone: phoneSchema,
    role: z.enum(['teacher', 'admin']),
  }),
});

// ─── Reset Password (With OTP) ───────────────────────────────────────────────

export const resetPasswordSchema = z.object({
  body: z.object({
    phone: phoneSchema,
    otp: otpSchema,
    newPassword: passwordSchema,
  }),
});

// ─── Parent: Register Init (Step 1 - Validate Card) ─────────────────────────

export const registerInitSchema = z.object({
  body: z.object({
    cardNumber: z
      .string()
      .trim()
      .min(5, 'Card number too short')
      .max(20, 'Card number too long')
      .transform((v) => v.toUpperCase().replace(/[^A-Z0-9-]/g, '')),
    phone: phoneSchema,
  }),
});
