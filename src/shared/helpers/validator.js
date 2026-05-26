// src/helpers/validator.js
import { isValidIndianPhone } from '../utils/phoneNormalize.js';

/**
 * Each validator returns { valid: boolean, message: string }
 * So you can use them anywhere — controller, service, or middleware
 */

export const validatePhone = (phone) => {
  if (!phone) return { valid: false, message: 'Phone number is required' };
  if (!isValidIndianPhone(phone)) return { valid: false, message: 'Invalid Indian phone number' };
  return { valid: true };
};

export const validateEmail = (email) => {
  if (!email) return { valid: false, message: 'Email is required' };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return { valid: false, message: 'Invalid email address' };
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

/**
 * Validate multiple fields at once
 * Returns first error found or null if all valid
 *
 * Usage:
 * const error = validateFields({
 *   phone: [phone, validatePhone],
 *   email: [email, validateEmail],
 * });
 * if (error) throw ApiError.badRequest(error.message);
 */
export const validateFields = (fields) => {
  for (const [field, [value, validatorFn]] of Object.entries(fields)) {
    const result = validatorFn(value);
    if (!result.valid) {
      return { field, message: result.message };
    }
  }
  return null;
};
