// =============================================================================
// Otp.service.js — RESQID
//
// OTP generation, expiry, and verification utilities.
// Used by auth.service.js for parent login via phone OTP.
// =============================================================================

import crypto from 'crypto';
import { ENV } from '#config/env.js';

// ─── Configuration ───────────────────────────────────────────────────────────

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = ENV.OTP_EXPIRY_MINUTES || 10;
const OTP_MAX_ATTEMPTS = ENV.OTP_MAX_ATTEMPTS || 5;
const OTP_COOLDOWN_SECONDS = ENV.OTP_COOLDOWN_SECONDS || 60;

// ─── Generate ────────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure 6-digit OTP.
 * Uses crypto.randomInt for uniform distribution (no modulo bias).
 *
 * @returns {string} 6-digit OTP string (e.g., "482931")
 */
export const generateOtp = () => {
  const otp = crypto.randomInt(100000, 999999);
  return String(otp);
};

/**
 * Generate OTP expiry timestamp.
 *
 * @param {number} minutes - Expiry in minutes (default: 10)
 * @returns {Date} Expiry date
 */
export const generateOtpExpiry = (minutes = OTP_EXPIRY_MINUTES) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};

// ─── Verify ──────────────────────────────────────────────────────────────────

/**
 * Check if OTP is expired.
 *
 * @param {Date|string} expiry - OTP expiry timestamp
 * @returns {boolean} True if expired
 */
export const isOtpExpired = (expiry) => {
  if (!expiry) return true;
  return new Date() > new Date(expiry);
};

/**
 * Verify OTP with timing-safe comparison.
 * Prevents timing attacks on OTP verification.
 *
 * @param {string} inputOtp - User-provided OTP
 * @param {string} storedOtp - Stored OTP hash
 * @returns {boolean} True if OTP matches
 */
export const verifyOtp = (inputOtp, storedOtp) => {
  if (!inputOtp || !storedOtp) return false;

  // Both must be strings
  const input = String(inputOtp);
  const stored = String(storedOtp);

  // Length check before timing-safe compare
  if (input.length !== OTP_LENGTH || stored.length !== OTP_LENGTH) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(Buffer.from(input), Buffer.from(stored));
  } catch {
    return false;
  }
};

// ─── Rate Limiting Helpers ───────────────────────────────────────────────────

/**
 * Get OTP cooldown remaining time in seconds.
 *
 * @param {Date} lastSentAt - When the last OTP was sent
 * @returns {number} Seconds remaining before new OTP can be sent
 */
export const getOtpCooldownRemaining = (lastSentAt) => {
  if (!lastSentAt) return 0;

  const elapsed = (Date.now() - new Date(lastSentAt).getTime()) / 1000;
  const remaining = OTP_COOLDOWN_SECONDS - elapsed;

  return Math.max(0, Math.ceil(remaining));
};

/**
 * Check if a new OTP can be sent (cooldown period passed).
 *
 * @param {Date} lastSentAt - When the last OTP was sent
 * @returns {boolean} True if new OTP can be sent
 */
export const canSendOtp = (lastSentAt) => {
  return getOtpCooldownRemaining(lastSentAt) === 0;
};

/**
 * Format OTP for SMS delivery.
 *
 * @param {string} otp - 6-digit OTP
 * @returns {string} Formatted message
 */
export const formatOtpMessage = (otp) => {
  return `${otp} is your RESQID verification code. Valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share this with anyone.`;
};

// ─── Constants ───────────────────────────────────────────────────────────────

export { OTP_LENGTH, OTP_EXPIRY_MINUTES, OTP_MAX_ATTEMPTS, OTP_COOLDOWN_SECONDS };
