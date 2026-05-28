// =============================================================================
// encryption.js — RESQID
//
// Symmetric encryption for sensitive data at rest.
// Uses AES-256-GCM with a 256-bit key.
//
// Ciphertext format: base64(iv + authTag + encryptedData)
//   - iv:        12 random bytes (GCM recommended)
//   - authTag:   16 bytes (GCM authentication tag)
//   - encrypted: the actual ciphertext
//
// Used by:
//   - emergency.repository.js  → encrypt medicalInfo before saving
//   - token.repository.js      → encrypt API keys for devices
//   - QR data encryption       → encrypt student ID in QR codes
// =============================================================================

import crypto from 'crypto';
import { ENV } from '#config/env.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALGORITHM = ENV.QR_ENCRYPTION_ALGORITHM || 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits — recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

// ─── Key Management ──────────────────────────────────────────────────────────

let keyBuffer = null;

function getKey() {
  if (keyBuffer) return keyBuffer;

  const keyHex = ENV.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  keyBuffer = Buffer.from(keyHex, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be 32 bytes (64 hex chars), got ${keyBuffer.length} bytes`
    );
  }

  return keyBuffer;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Encrypt a plaintext string.
 *
 * @param {string} plaintext - Data to encrypt
 * @returns {string} Base64-encoded ciphertext (IV + authTag + data)
 */
export function encrypt(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

  const authTag = cipher.getAuthTag();

  // Combine IV + authTag + ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypt a ciphertext produced by encrypt().
 *
 * @param {string} ciphertext - Base64-encoded ciphertext
 * @returns {string} Original plaintext
 * @throws {Error} If decryption fails (wrong key, tampered data, corrupted)
 */
export function decrypt(ciphertext) {
  const key = getKey();

  try {
    const combined = Buffer.from(ciphertext, 'base64');

    // Extract components
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return decrypted.toString('utf8');
  } catch (err) {
    throw new Error(`Decryption failed: ${err.message}`);
  }
}

/**
 * Encrypt an object by first converting to JSON.
 *
 * @param {object} obj
 * @returns {string} Encrypted base64 string
 */
export function encryptObject(obj) {
  return encrypt(JSON.stringify(obj));
}

/**
 * Decrypt a ciphertext and parse as JSON.
 *
 * @param {string} ciphertext
 * @returns {object}
 */
export function decryptObject(ciphertext) {
  return JSON.parse(decrypt(ciphertext));
}

/**
 * Encrypt data specifically for QR codes (short-lived, includes expiry).
 *
 * @param {string} data - Data to embed in QR
 * @param {number} ttlSeconds - Time-to-live in seconds
 * @returns {string} Encrypted + base64-encoded payload
 */
export function encryptForQR(data, ttlSeconds = 300) {
  const expiry = Date.now() + ttlSeconds * 1000;
  const payload = JSON.stringify({ data, exp: expiry });
  return encrypt(payload);
}

/**
 * Decrypt QR data and check expiry.
 *
 * @param {string} ciphertext
 * @returns {{ data: string, valid: boolean, expired: boolean }}
 */
export function decryptFromQR(ciphertext) {
  try {
    const json = decrypt(ciphertext);
    const { data, exp } = JSON.parse(json);

    const expired = Date.now() > exp;
    return { data, valid: !expired, expired };
  } catch {
    return { data: null, valid: false, expired: true };
  }
}

/**
 * Generate a lookup hash for a value (deterministic, for searching encrypted data).
 *
 * @param {string} value - Value to hash
 * @returns {string} Hex-encoded HMAC-SHA256 hash
 */
export function lookupHash(value) {
  const key = Buffer.from(ENV.LOOKUP_HASH_SECRET || ENV.ENCRYPTION_KEY, 'hex').subarray(0, 32);
  return crypto.createHmac('sha256', key).update(value).digest('hex');
}
