// TODO: Add implementation
/**
 * sanitize.js
 *
 * Input sanitisation utilities – clean untrusted data BEFORE it reaches
 * services or the database. This is a **defence‑in‑depth** layer.
 *
 * Used by:
 *   - sanitize.middleware.js   (deep cleans req.body)
 *   - any validation file      (as a fallback)
 *   - email/SMS templates      (when inserting raw user input)
 */

import { escapeHtml } from './escapeHtml.js';

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------
const MAX_STRING_LENGTH = 10_000;   // reject strings longer than this
const ALLOWED_TAGS = /^[a-zA-Z0-9 .,!?@#$%^&*()\-_=+[\]{}|;:'"\/\\]+$/;  // very restrictive

/**
 * Aggressively clean a single string.
 * 1. Remove any HTML/XML tags (strip).
 * 2. Trim whitespace.
 * 3. Truncate if over the limit.
 * 4. (Optional) enforce a character whitelist.
 *
 * @param {string} input
 * @returns {string} clean string
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') return '';

  // Remove HTML tags entirely (e.g., <script>, <img onerror=...>)
  let clean = input.replace(/<[^>]*>/g, '');

  // Trim leading/trailing whitespace
  clean = clean.trim();

  // Truncate to a sensible maximum length (prevents DB overflow)
  if (clean.length > MAX_STRING_LENGTH) {
    clean = clean.substring(0, MAX_STRING_LENGTH);
  }

  // Optional: enforce a whitelist of allowed characters
  // (Uncomment if you want to reject any unusual symbols)
  // if (!ALLOWED_TAGS.test(clean)) {
  //   // Replace disallowed characters with nothing
  //   clean = clean.replace(/[^a-zA-Z0-9 .,!?@#$%^&*()\-_=+[\]{}|;:'"\/\\]/g, '');
  // }

  return clean;
}

/**
 * Remove **all** HTML tags from a string without escaping.
 * Use when you never want to render any HTML (e.g., email subjects, SMS).
 *
 * @param {string} input
 * @returns {string}
 */
export function stripHtml(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Recursively sanitise all string values inside an object/array.
 * Modifies the object in place for performance, but also returns it.
 *
 * @param {object|array} obj
 * @returns {object|array}
 */
export function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = sanitizeObject(obj[i]);
    }
    return obj;
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    for (const key of keys) {
      obj[key] = sanitizeObject(obj[key]);
    }
    return obj;
  }

  // Numbers, booleans, etc. are passed through
  return obj;
}

/**
 * Escape a string for safe use in a **JSON** context.
 * Useful when embedding user data inside a <script> tag (e.g., initial state).
 *
 * @param {string} input
 * @returns {string}
 */
export function sanitizeForJson(input) {
  return input
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\//g, '\\u002f');
}