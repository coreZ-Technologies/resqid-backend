// modules/auth/parent_user_auth/parent-user.validation.js — RESQID
// Parent user validation schemas

import { z } from 'zod';

// Helpers
const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number (10 digits, starts with 6-9)');

const otpSchema = z
  .string()
  .trim()
  .length(6, 'OTP must be exactly 6 digits')
  .regex(/^\d{6}$/, 'OTP must contain only digits');

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be at most 100 characters')
  .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces');

// Send OTP
export const sendOtpSchema = z.object({
  phone: phoneSchema,
  cardNumber: z
    .string()
    .trim()
    .min(5, 'Card number must be at least 5 characters')
    .max(20, 'Card number must be at most 20 characters')
    .transform((v) => v.toUpperCase().replace(/[^A-Z0-9-]/g, ''))
    .optional(),
  purpose: z.enum(['login', 'register']).default('login'),
});

// Verify OTP & Login
export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: otpSchema,
});

// Register Init (Step 1 - Validate Card + Send OTP)
export const registerInitSchema = z.object({
  cardNumber: z
    .string()
    .trim()
    .min(5, 'Card number is required')
    .max(20, 'Card number is too long')
    .transform((v) => v.toUpperCase().replace(/[^A-Z0-9-]/g, '')),
  phone: phoneSchema,
});

// Register Complete (Step 2 - Verify OTP + Create Profile)
export const registerCompleteSchema = z.object({
  phone: phoneSchema,
  otp: otpSchema,
  firstName: nameSchema,
  lastName: nameSchema.optional(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email format')
    .max(254, 'Email is too long')
    .optional()
    .nullable(),
});

// Update Profile
export const updateProfileSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email format')
    .max(254, 'Email is too long')
    .optional()
    .nullable(),
  address: z.string().trim().max(255, 'Address is too long').optional(),
  city: z.string().trim().max(100, 'City name is too long').optional(),
  state: z.string().trim().max(100, 'State name is too long').optional(),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Invalid pincode (6 digits)')
    .optional(),
  occupation: z.string().trim().max(100, 'Occupation is too long').optional(),
  photoUrl: z.string().url('Invalid photo URL').optional(),
});

// Refresh Token
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});
