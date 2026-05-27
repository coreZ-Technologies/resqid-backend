// TODO: Add implementation
/**
 * encryption.js
 *
 * Symmetric encryption for sensitive data at rest.
 * Uses AES-256-GCM with a 256-bit key from the environment.
 *
 * Ciphertext format: base64(iv + authTag + encryptedData)
 *   - iv:        12 random bytes (GCM recommended)
 *   - authTag:   16 bytes (GCM authentication tag)
 *   - encrypted: the actual ciphertext
 *
 * Used by:
 *   - emergency.repository.js → encrypt medicalInfo before saving
 *   - token.repository.js     → encrypt API keys for devices
 *   - any other module that stores PII
 */

import crypto from 'crypto';

// ---------------------------------------------------------------
// KEY MANAGEMENT
// ---------------------------------------------------------------
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;   // hex-encoded 32 bytes (64 hex chars)
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;   // 96 bits is recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

if (!ENCRYPTION_KEY) {
  throw new Error('Missing ENCRYPTION_KEY environment variable');
}

const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
if (keyBuffer.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
}

// ---------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------

/**
 * Encrypt a plaintext string.
 * @param {string} plaintext - The data to encrypt.
 * @returns {string} Base64-encoded ciphertext (includes IV + auth tag).
 */
export function encrypt(plaintext) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  // Combine IV + authTag + ciphertext into a single buffer, then base64 it
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypt a ciphertext produced by encrypt().
 * @param {string} ciphertext - Base64-encoded ciphertext (IV + authTag + data).
 * @returns {string} Original plaintext.
 * @throws {Error} If decryption fails (wrong key, tampered data).
 */
export function decrypt(ciphertext) {
  const combined = Buffer.from(ciphertext, 'base64');

  // Extract IV, authTag, and encrypted data
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

/**
 * Convenience: encrypt an object by first converting to JSON.
 * @param {object} obj
 * @returns {string} Encrypted base64 string.
 */
export function encryptObject(obj) {
  return encrypt(JSON.stringify(obj));
}

/**
 * Convenience: decrypt a ciphertext and parse as JSON.
 * @param {string} ciphertext
 * @returns {object}
 */
export function decryptObject(ciphertext) {
  return JSON.parse(decrypt(ciphertext));
}