// =============================================================================
// modules/auth/auth.validation.js — RESQID
// Zod validation schemas for all auth endpoints.
// 🔧 Flat schemas for use with validate() middleware.
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
  phone: phoneSchema,
  cardNumber: z
    .string()
    .trim()
    .min(5)
    .max(20)
    .transform((v) => v.toUpperCase().replace(/[^A-Z0-9-]/g, ''))
    .optional(),
  purpose: z.enum(['login', 'register']).default('login'),
});

// ─── Parent: Verify OTP + Login ──────────────────────────────────────────────

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: otpSchema,
});

// ─── Parent: Register (Step 2 - Complete Profile) ────────────────────────────

export const registerParentSchema = z.object({
  phone: phoneSchema,
  otp: otpSchema,
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254).optional().nullable(),
});

// ─── Parent: Register Init (Step 1 - Validate Card) ──────────────────────────

export const registerInitSchema = z.object({
  cardNumber: z
    .string()
    .trim()
    .min(5)
    .max(20)
    .transform((v) => v.toUpperCase().replace(/[^A-Z0-9-]/g, '')),
  phone: phoneSchema,
});

// ─── Teacher Login ───────────────────────────────────────────────────────────

export const teacherLoginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1).max(128),
});

// ─── School Admin Login ──────────────────────────────────────────────────────

export const schoolAdminLoginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1).max(128),
  schoolCode: z.string().optional(),
});

// ─── Super Admin Login ───────────────────────────────────────────────────────

export const superAdminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1),
});

// ─── Token Refresh ───────────────────────────────────────────────────────────

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ─── Change Password ─────────────────────────────────────────────────────────

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
  });

// ─── Forgot Password ─────────────────────────────────────────────────────────

export const forgotPasswordSchema = z.object({
  phone: phoneSchema,
  role: z.enum(['teacher', 'admin']),
});

// ─── Reset Password ──────────────────────────────────────────────────────────

export const resetPasswordSchema = z.object({
  phone: phoneSchema,
  otp: otpSchema,
  newPassword: passwordSchema,
});
