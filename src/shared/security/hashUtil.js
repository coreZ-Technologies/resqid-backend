// TODO: Add implementation
/**
 * hashUtil.js
 *
 * Password hashing and verification utility.
 * Uses bcrypt with a configurable salt rounds value.
 *
 * Used by:
 *   - auth.service.js          (login verification)
 *   - parent.service.js         (when creating/updating parent passwords)
 *   - admins.service.js         (school admin & super admin creation)
 *   - any other module that handles credentials
 */

import bcrypt from 'bcrypt';

// Cost factor – 12 is a good balance between security and speed.
// Increase over time as hardware improves.
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

/**
 * Hash a plaintext password.
 * Never log or return the plaintext.
 *
 * @param {string} plainPassword - The user‑provided password.
 * @returns {Promise<string>} The bcrypt hash.
 */
export async function hashPassword(plainPassword) {
  if (!plainPassword || typeof plainPassword !== 'string' || plainPassword.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Compare a plaintext password against a stored hash.
 *
 * @param {string} plainPassword - The password to check.
 * @param {string} hashedPassword - The hash retrieved from the database.
 * @returns {Promise<boolean>} True if the password matches.
 */
export async function verifyPassword(plainPassword, hashedPassword) {
  if (!plainPassword || !hashedPassword) return false;
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * (Optional) Re‑hash a password if the cost factor has increased.
 * Useful when upgrading security without forcing all users to reset.
 *
 * @param {string} plainPassword
 * @param {string} existingHash
 * @returns {Promise<string|null>} New hash if it needed upgrading, else null.
 */
export async function maybeRehash(plainPassword, existingHash) {
  const needsUpgrade = bcrypt.getRounds(existingHash) < SALT_ROUNDS;
  if (needsUpgrade) {
    return hashPassword(plainPassword);
  }
  return null;
}