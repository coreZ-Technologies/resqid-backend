// =============================================================================
// PasswordGenerator.service.js — RESQID
//
// Generates secure, policy-compliant default passwords for new accounts.
// Used when creating admin/teacher accounts that need initial passwords.
// =============================================================================

import { customAlphabet } from 'nanoid';

// ─── Character Sets ──────────────────────────────────────────────────────────

// Remove ambiguous characters: O/0, I/1/l
const UPPER = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const LOWER = 'abcdefghjkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SPECIAL = '!@#$%&*';

const upperGen = customAlphabet(UPPER, 3);
const lowerGen = customAlphabet(LOWER, 3);
const digitsGen = customAlphabet(DIGITS, 2);
const specialGen = customAlphabet(SPECIAL, 1);

// ─── Shuffle ─────────────────────────────────────────────────────────────────

/**
 * Fisher-Yates shuffle for uniform random distribution.
 * Better than sort(() => Math.random() - 0.5) which is biased.
 */
const shuffle = (arr) => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// ─── Generators ──────────────────────────────────────────────────────────────

/**
 * Generate a default password for admin/teacher accounts.
 * 9 characters: 3 upper + 3 lower + 2 digits + 1 special
 * Example: HkTmxq84$
 *
 * Policy compliance:
 *   - Min 8 characters    ✓ (9 chars)
 *   - Uppercase letters   ✓
 *   - Lowercase letters   ✓
 *   - Numbers             ✓
 *   - Special character   ✓
 */
export const generateDefaultPassword = () => {
  const chars = [
    ...upperGen().split(''),
    ...lowerGen().split(''),
    ...digitsGen().split(''),
    ...specialGen().split(''),
  ];
  return shuffle(chars).join('');
};

/**
 * Generate a stronger password (12 characters).
 * For super admin or high-privilege accounts.
 * Example: HkTmxq84$pWn2
 */
export const generateStrongPassword = () => {
  const upper = customAlphabet(UPPER, 4)();
  const lower = customAlphabet(LOWER, 4)();
  const digits = customAlphabet(DIGITS, 2)();
  const special = customAlphabet(SPECIAL, 2)();

  const chars = [...upper.split(''), ...lower.split(''), ...digits.split(''), ...special.split('')];
  return shuffle(chars).join('');
};

/**
 * Generate a temporary PIN (6 digits, no ambiguous chars).
 * For quick setup flows.
 * Example: 847295
 */
export const generateTempPin = () => {
  return customAlphabet(DIGITS, 6)();
};

/**
 * Validate if a password meets policy requirements.
 * Returns array of errors (empty = valid).
 */
export const validatePasswordPolicy = (password) => {
  const errors = [];

  if (!password || password.length < 8) {
    errors.push('At least 8 characters required');
  }
  if (password && password.length > 128) {
    errors.push('Maximum 128 characters');
  }
  if (password && !/[A-Z]/.test(password)) {
    errors.push('At least one uppercase letter');
  }
  if (password && !/[a-z]/.test(password)) {
    errors.push('At least one lowercase letter');
  }
  if (password && !/[0-9]/.test(password)) {
    errors.push('At least one digit');
  }
  if (password && !/[!@#$%&*]/.test(password)) {
    errors.push('At least one special character (!@#$%&*)');
  }

  return errors;
};

/**
 * Check if password meets minimum policy.
 */
export const isPasswordValid = (password) => {
  return validatePasswordPolicy(password).length === 0;
};
