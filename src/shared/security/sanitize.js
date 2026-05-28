// =============================================================================
// sanitize.js — RESQID
//
// Input sanitization utilities — defense-in-depth layer.
// Cleans untrusted data BEFORE it reaches services or database.
//
// Used by:
//   - sanitize.middleware.js   → deep cleans req.body, req.query, req.params
//   - validate.middleware.js   → post-validation sanitization
//   - email/SMS templates      → when inserting raw user input
// =============================================================================

import { escapeHtml } from './escapeHtml.js';

// ─── Configuration ───────────────────────────────────────────────────────────

const MAX_STRING_LENGTH = 10_000;

// MongoDB/NoSQL injection operators to strip
const NOSQL_OPERATORS = ['$', '.'];

// ─── String Sanitization ─────────────────────────────────────────────────────

/**
 * Clean a single string.
 * 1. Remove HTML/XML tags
 * 2. Trim whitespace
 * 3. Truncate if over limit
 *
 * @param {string} input
 * @returns {string} Clean string
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') return '';

  let clean = input;

  // Remove HTML tags entirely
  clean = clean.replace(/<[^>]*>/g, '');

  // Trim whitespace
  clean = clean.trim();

  // Truncate to maximum length
  if (clean.length > MAX_STRING_LENGTH) {
    clean = clean.substring(0, MAX_STRING_LENGTH);
  }

  return clean;
}

/**
 * Strip all HTML tags without escaping.
 * Use when HTML should never be rendered (email subjects, SMS, push notifications).
 *
 * @param {string} input
 * @returns {string}
 */
export function stripHtml(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/<[^>]*>/g, '');
}

// ─── NoSQL Injection Prevention ──────────────────────────────────────────────

/**
 * Remove MongoDB/NoSQL injection operators from object keys.
 * Prevents queries like: { "$gt": "" } or { "password": { "$ne": "" } }
 *
 * Even though you use Prisma/PostgreSQL, some libraries pass
 * raw objects that could contain these operators.
 *
 * @param {object} obj
 * @returns {object} Sanitized object
 */
export function sanitizeNoSQL(obj) {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeNoSQL);
  }

  if (typeof obj === 'object' && !(obj instanceof Date) && !Buffer.isBuffer(obj)) {
    const sanitized = {};

    for (const [key, value] of Object.entries(obj)) {
      // Strip $ and . from keys (MongoDB operator injection)
      let cleanKey = key;
      for (const op of NOSQL_OPERATORS) {
        cleanKey = cleanKey.replaceAll(op, '');
      }

      sanitized[cleanKey] = sanitizeNoSQL(value);
    }

    return sanitized;
  }

  return obj;
}

// ─── Deep Sanitization ───────────────────────────────────────────────────────

/**
 * Recursively sanitize all string values in an object/array.
 * Applies: strip HTML, trim, truncate, AND NoSQL prevention.
 *
 * @param {object|array|string} obj
 * @returns {object|array|string}
 */
export function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;

  // Sanitize strings
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  // Sanitize arrays
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  // Sanitize objects (skip Date and Buffer)
  if (typeof obj === 'object' && !(obj instanceof Date) && !Buffer.isBuffer(obj)) {
    const sanitized = {};

    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key (NoSQL prevention)
      let cleanKey = key;
      for (const op of NOSQL_OPERATORS) {
        cleanKey = cleanKey.replaceAll(op, '');
      }

      // Sanitize value recursively
      sanitized[cleanKey] = sanitizeObject(value);
    }

    return sanitized;
  }

  // Numbers, booleans, null — pass through
  return obj;
}

// ─── Context-Specific Sanitization ───────────────────────────────────────────

/**
 * Escape a string for safe use in JSON context (inside <script> tags).
 *
 * @param {string} input
 * @returns {string}
 */
export function sanitizeForJson(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\//g, '\\u002f');
}

/**
 * Sanitize a string for use in SQL LIKE queries.
 * Escapes % and _ wildcards to prevent wildcard injection.
 *
 * @param {string} input
 * @returns {string}
 */
export function sanitizeForLike(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/\\/g, '\\\\') // Escape backslash first
    .replace(/%/g, '\\%') // Escape %
    .replace(/_/g, '\\_'); // Escape _
}

/**
 * Sanitize a phone number (remove everything except + and digits).
 *
 * @param {string} phone
 * @returns {string}
 */
export function sanitizePhone(phone) {
  if (typeof phone !== 'string') return '';
  return phone.replace(/[^\d+]/g, '').substring(0, 15);
}

/**
 * Sanitize an email address (trim, lowercase).
 *
 * @param {string} email
 * @returns {string}
 */
export function sanitizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase().substring(0, 254);
}

// ─── Request Sanitization ────────────────────────────────────────────────────

/**
 * Sanitize the entire Express request body, query, and params.
 * Used by sanitize.middleware.js as defense-in-depth.
 *
 * @param {object} req - Express request
 */
export function sanitizeRequest(req) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
}
