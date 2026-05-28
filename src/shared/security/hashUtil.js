// =============================================================================
// hashUtil.js — RESQID
//
// Password hashing and verification using bcrypt.
//
// Used by:
//   - auth.service.js     → login verification
//   - parent.service.js   → parent account creation
//   - admins.service.js   → admin account management
// =============================================================================

import bcrypt from 'bcrypt';
import { ENV } from '#config/env.js';

// Cost factor — 12 is a good balance. Increase over time as hardware improves.
const SALT_ROUNDS = ENV.BCRYPT_SALT_ROUNDS || 12;

// ─── Password Hashing ────────────────────────────────────────────────────────

/**
 * Hash a plaintext password.
 * Never log or return the plaintext.
 *
 * @param {string} plainPassword - User-provided password (min 8 chars)
 * @returns {Promise<string>} Bcrypt hash
 * @throws {Error} If password is too short or empty
 */
export async function hashPassword(plainPassword) {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new Error('Password is required');
  }

  if (plainPassword.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  // Optional: check against common weak passwords
  if (isCommonPassword(plainPassword)) {
    throw new Error('Password is too common. Please choose a stronger password.');
  }

  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

// ─── Password Verification ───────────────────────────────────────────────────

/**
 * Compare a plaintext password against a stored hash.
 * Uses constant-time comparison via bcrypt.
 *
 * @param {string} plainPassword - Password to check
 * @param {string} hashedPassword - Hash from database
 * @returns {Promise<boolean>} True if password matches
 */
export async function verifyPassword(plainPassword, hashedPassword) {
  if (!plainPassword || !hashedPassword) return false;

  // Basic format check — bcrypt hashes start with $2a$, $2b$, or $2y$
  if (!hashedPassword.startsWith('$2')) return false;

  return bcrypt.compare(plainPassword, hashedPassword);
}

// ─── Hash Upgrade ────────────────────────────────────────────────────────────

/**
 * Re-hash a password if the cost factor has increased.
 * Allows seamless security upgrades without forcing password resets.
 *
 * @param {string} plainPassword
 * @param {string} existingHash
 * @returns {Promise<string|null>} New hash if upgrade needed, else null
 */
export async function maybeRehash(plainPassword, existingHash) {
  try {
    const rounds = bcrypt.getRounds(existingHash);
    if (rounds < SALT_ROUNDS) {
      return hashPassword(plainPassword);
    }
  } catch {
    // Invalid hash format — should be logged but not thrown
  }
  return null;
}

// ─── Password Validation ─────────────────────────────────────────────────────

/**
 * Validate password strength.
 * Returns array of validation errors (empty = valid).
 */
export function validatePasswordStrength(password) {
  const errors = [];

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (password && password.length > 128) {
    errors.push('Password must be at most 128 characters');
  }
  if (password && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (password && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (password && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one digit');
  }
  if (password && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return errors;
}

// ─── Common Password Check (Basic) ───────────────────────────────────────────

const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  '12345678',
  'qwerty123',
  'admin123',
  'letmein',
  'welcome1',
  'monkey123',
  'abc12345',
  'password1',
  '123456789',
  'iloveyou',
]);

function isCommonPassword(password) {
  return COMMON_PASSWORDS.has(password.toLowerCase());
}
