// modules/auth/super_admin_auth/superadmin.validation.js — RESQID
// Super admin validation schemas

import { z } from 'zod';
import { emailSchema, passwordSchema } from '../school_auth/schoolauth.validation.js';

// Login

export const superAdminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Forgot Password
export const superAdminForgotPasswordSchema = z.object({
  email: emailSchema,
});

// Reset Password

export const superAdminResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordSchema,
});

// Change Password
export const superAdminChangePasswordSchema = z
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
