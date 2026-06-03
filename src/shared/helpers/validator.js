// =============================================================================
// validator.js — RESQID
//
// Lightweight validators for individual fields.
// Each returns { valid: boolean, message: string }.
// Use for quick checks in services/controllers.
//
// For request validation, use validate.middleware.js + Zod schemas instead.
// =============================================================================

import { isValidIndianPhone } from '#shared/utils/phoneNormalize.js';

// ─── Single Field Validators ─────────────────────────────────────────────────

export const validatePhone = (phone) => {
  if (!phone) return { valid: false, message: 'Phone number is required' };
  if (!isValidIndianPhone(phone)) return { valid: false, message: 'Invalid Indian phone number' };
  return { valid: true };
};

export const validateEmail = (email) => {
  if (!email) return { valid: false, message: 'Email is required' };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return { valid: false, message: 'Invalid email address' };
  if (email.length > 254) return { valid: false, message: 'Email too long' };
  return { valid: true };
};

export const validateOtp = (otp) => {
  if (!otp) return { valid: false, message: 'OTP is required' };
  if (!/^\d{6}$/.test(String(otp))) return { valid: false, message: 'OTP must be 6 digits' };
  return { valid: true };
};

export const validatePincode = (pincode) => {
  if (!pincode) return { valid: false, message: 'Pincode is required' };
  if (!/^\d{6}$/.test(String(pincode))) return { valid: false, message: 'Invalid Indian pincode' };
  return { valid: true };
};

export const validateAadhaar = (aadhaar) => {
  if (!aadhaar) return { valid: false, message: 'Aadhaar is required' };
  if (!/^\d{12}$/.test(String(aadhaar)))
    return { valid: false, message: 'Aadhaar must be 12 digits' };
  return { valid: true };
};

export const validateStudentName = (name) => {
  if (!name || !name.trim()) return { valid: false, message: 'Name is required' };
  if (name.trim().length < 2) return { valid: false, message: 'Name too short' };
  if (name.trim().length > 100) return { valid: false, message: 'Name too long' };
  if (!/^[a-zA-Z\s.'-]+$/.test(name))
    return { valid: false, message: 'Name contains invalid characters' };
  return { valid: true };
};

export const validateClass = (cls) => {
  const valid = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  if (!cls) return { valid: false, message: 'Class is required' };
  if (!valid.includes(String(cls)))
    return { valid: false, message: `Class must be one of: ${valid.join(', ')}` };
  return { valid: true };
};

export const validateBloodGroup = (bg) => {
  const valid = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  if (!bg) return { valid: false, message: 'Blood group is required' };
  if (!valid.includes(bg.toUpperCase()))
    return { valid: false, message: `Blood group must be one of: ${valid.join(', ')}` };
  return { valid: true };
};

export const validateUrl = (url) => {
  if (!url) return { valid: false, message: 'URL is required' };
  try {
    new URL(url);
    return { valid: true };
  } catch {
    return { valid: false, message: 'Invalid URL' };
  }
};

export const validateUuid = (id) => {
  if (!id) return { valid: false, message: 'ID is required' };
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(String(id))) return { valid: false, message: 'Invalid ID format' };
  return { valid: true };
};

// ─── Timetable-specific Validators ───────────────────────────────────────────

export const validatePeriodNumber = (period) => {
  const num = parseInt(period);
  if (isNaN(num) || num < 1 || num > 12)
    return { valid: false, message: 'Period must be between 1 and 12' };
  return { valid: true };
};

export const validateDayOfWeek = (day) => {
  const num = parseInt(day);
  if (isNaN(num) || num < 1 || num > 7)
    return { valid: false, message: 'Day must be between 1 (Mon) and 7 (Sun)' };
  return { valid: true };
};

export const validateGrade = (grade) => {
  const valid = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  if (!grade) return { valid: false, message: 'Grade is required' };
  if (!valid.includes(String(grade)))
    return { valid: false, message: `Grade must be one of: ${valid.join(', ')}` };
  return { valid: true };
};

export const validateTeacherLoad = (maxPerDay, maxPerWeek) => {
  const day = parseInt(maxPerDay);
  const week = parseInt(maxPerWeek);
  if (isNaN(day) || day < 1 || day > 12)
    return { valid: false, message: 'Max periods per day must be 1-12' };
  if (isNaN(week) || week < 1 || week > 60)
    return { valid: false, message: 'Max periods per week must be 1-60' };
  if (day > week) return { valid: false, message: 'Daily max cannot exceed weekly max' };
  return { valid: true };
};

// ─── Batch Validation ────────────────────────────────────────────────────────

/**
 * Validate multiple fields at once.
 * Returns first error found or null if all valid.
 *
 * @example
 *   const error = validateFields({
 *     phone: [phone, validatePhone],
 *     email: [email, validateEmail],
 *   });
 *   if (error) throw ApiError.badRequest(error.message);
 */
export const validateFields = (fields) => {
  for (const [fieldName, [value, validatorFn]] of Object.entries(fields)) {
    const result = validatorFn(value);
    if (!result.valid) {
      return { field: fieldName, message: result.message };
    }
  }
  return null;
};

/**
 * Validate and collect ALL errors (not just first).
 * Returns array of { field, message } or empty array if all valid.
 */
export const validateAllFields = (fields) => {
  const errors = [];
  for (const [fieldName, [value, validatorFn]] of Object.entries(fields)) {
    const result = validatorFn(value);
    if (!result.valid) {
      errors.push({ field: fieldName, message: result.message });
    }
  }
  return errors;
};
