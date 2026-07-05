// =============================================================================
// modules/auth/school_user_auth/school-user.validation.js — RESQID
// School user validation schemas
// =============================================================================

import { z } from 'zod';
import { emailSchema, passwordSchema } from '../school_auth/schoolauth.validation.js';

// Login
export const schoolUserLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

// Forgot Password
export const schoolUserForgotPasswordSchema = z.object({
  email: emailSchema,
});

// Reset Password
export const schoolUserResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordSchema,
});

// Change Password
export const schoolUserChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });
