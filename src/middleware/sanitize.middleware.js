<<<<<<< HEAD
// =============================================================================
// sanitize.middleware.js — RESQID
// STRICT MODE — NoSQL injection prevention + deep object sanitization
// Rejects ANY suspicious input — no exceptions
//
// Two middlewares — apply both in order:
//   1. sanitizeNoSql  → blocks $ operators and MongoDB injection keys
//   2. sanitizeDeep   → depth/length/prototype pollution checks
//
// Position in stack: AFTER express.json(), BEFORE validate.middleware
// =============================================================================

import { asyncHandler } from '#shared/response/asyncHandler.js';
import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';

// ─── Shared Constants ─────────────────────────────────────────────────────────

const MAX_DEPTH = 10;
const MAX_STRING_LEN = 50_000;
const MAX_ARRAY_LEN = 10_000;
const MAX_OBJECT_KEYS = 500;

// ─── NoSQL Injection Prevention ───────────────────────────────────────────────

// Block any key starting with $ or containing $ or .
const NOSQL_KEY_RE = /^\$|[\$.]/;

=======
// TODO: Add implementation
// =============================================================================
// sanitize.middleware.js — RESQID
// STRICT MODE — NoSQL injection prevention + deep object sanitization
// Rejects ANY suspicious input — no exceptions, no mercy
// =============================================================================

import { asyncHandler } from '../shared/response/asyncHandler.js';
import { ApiError } from '../shared/response/ApiError.js';
import { logger } from '../config/logger.js';

// ─── NoSQL key detector — STRICT ──────────────────────────────────────────────

// Block ANY key starting with $ or containing . or $ anywhere
const NOSQL_KEY_RE = /^\$|[\$\.]/; // starts with $ OR contains $ or .

// Blocked MongoDB operators (full list)
>>>>>>> f01dd80bcb1f2add13589bcb4344c76fc3ed4e8b
const BLOCKED_OPERATORS = new Set([
  '$where',
  '$regex',
  '$options',
  '$and',
  '$or',
  '$nor',
  '$not',
  '$expr',
  '$jsonSchema',
  '$mod',
  '$text',
  '$search',
  '$geoWithin',
  '$geoIntersects',
  '$near',
  '$nearSphere',
  '$elemMatch',
  '$size',
  '$all',
  '$in',
  '$nin',
  '$exists',
  '$type',
  '$slice',
  '$sort',
  '$project',
  '$group',
  '$match',
  '$lookup',
  '$unwind',
  '$out',
  '$merge',
  '$addFields',
  '$set',
  '$unset',
  '$replaceRoot',
  '$replaceWith',
  '$graphLookup',
  '$facet',
  '$bucket',
  '$bucketAuto',
  '$sortByCount',
  '$count',
  '$skip',
  '$limit',
  '$sample',
]);

function stripNoSqlKeys(obj, depth = 0, path = '') {
<<<<<<< HEAD
  // Use shared MAX_DEPTH constant — consistent with deepClean
  if (depth > MAX_DEPTH) {
    throw new Error(`Payload nesting too deep at: ${path || 'root'}`);
=======
  if (depth > 10) {
    throw new Error(`Request payload nesting too deep at path: ${path || 'root'}`);
>>>>>>> f01dd80bcb1f2add13589bcb4344c76fc3ed4e8b
  }

  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item, idx) => stripNoSqlKeys(item, depth + 1, `${path}[${idx}]`));
  }

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;

<<<<<<< HEAD
    if (NOSQL_KEY_RE.test(key)) {
      throw new Error(`Invalid character in field name: "${key}" at ${currentPath}`);
    }

    if (BLOCKED_OPERATORS.has(key)) {
      throw new Error(`Blocked operator in request: "${key}" at ${currentPath}`);
=======
    // Check for NoSQL operators
    if (NOSQL_KEY_RE.test(key)) {
      logger.warn(
        { key, path: currentPath, ip: global.reqIp },
        `STRICT: NoSQL injection key blocked: "${key}"`
      );
      throw new Error(`Invalid character in field name: "${key}"`);
    }

    // Check for blocked MongoDB operators
    if (BLOCKED_OPERATORS.has(key)) {
      logger.warn(
        { key, path: currentPath, ip: global.reqIp },
        `STRICT: Blocked MongoDB operator: "${key}"`
      );
      throw new Error(`Invalid operator in request: "${key}"`);
>>>>>>> f01dd80bcb1f2add13589bcb4344c76fc3ed4e8b
    }

    clean[key] = stripNoSqlKeys(value, depth + 1, currentPath);
  }
<<<<<<< HEAD

  return clean;
}

// asyncHandler for consistency — if stripNoSqlKeys ever becomes async this works
export const sanitizeNoSql = asyncHandler(async (req, _res, next) => {
  try {
=======
  return clean;
}

// ─── NoSQL Injection Sanitizer — STRICT ───────────────────────────────────────

export const sanitizeNoSql = (req, res, next) => {
  // Store IP for logging
  global.reqIp = req.ip;

  try {
    // Sanitize body
>>>>>>> f01dd80bcb1f2add13589bcb4344c76fc3ed4e8b
    if (req.body && typeof req.body === 'object') {
      req.body = stripNoSqlKeys(req.body);
    }

<<<<<<< HEAD
    if (req.query && typeof req.query === 'object') {
      replaceTarget(req.query, stripNoSqlKeys(req.query));
    }

    if (req.params && typeof req.params === 'object') {
      replaceTarget(req.params, stripNoSqlKeys(req.params));
=======
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      const cleanQuery = stripNoSqlKeys(req.query);
      Object.assign(req.query, cleanQuery);
    }

    // Sanitize route parameters
    if (req.params && typeof req.params === 'object') {
      const cleanParams = stripNoSqlKeys(req.params);
      Object.assign(req.params, cleanParams);
>>>>>>> f01dd80bcb1f2add13589bcb4344c76fc3ed4e8b
    }

    next();
  } catch (err) {
<<<<<<< HEAD
    // Log with req.ip directly — never use global for request context
    logger.warn(
      {
        type: 'nosql_injection_blocked',
        err: err.message,
        ip: req.ip, // ← req.ip not global.reqIp
        userId: req.user?.id,
=======
    logger.warn(
      {
        err: err.message,
        ip: req.ip,
        userId: req.userId,
>>>>>>> f01dd80bcb1f2add13589bcb4344c76fc3ed4e8b
        path: req.path,
        method: req.method,
      },
      'STRICT: NoSQL injection blocked'
    );
<<<<<<< HEAD
    throw ApiError.badRequest('Invalid characters detected in request');
  }
});

// ─── Deep Object Sanitizer ────────────────────────────────────────────────────
=======
    next(ApiError.badRequest('Invalid characters detected in request'));
  }
};

// ─── Deep Object Sanitizer — STRICT ───────────────────────────────────────────
>>>>>>> f01dd80bcb1f2add13589bcb4344c76fc3ed4e8b

const DANGEROUS_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
]);
<<<<<<< HEAD

function deepClean(obj, depth = 0, source = '') {
  if (depth > MAX_DEPTH) {
    throw new Error(`Payload nesting too deep (max ${MAX_DEPTH}) in ${source}`);
  }

  if (typeof obj === 'string') {
    if (obj.length > MAX_STRING_LEN) {
      throw new Error(`Field exceeds max length (${MAX_STRING_LEN}) in ${source}`);
    }
    if (obj.includes('\u0000')) {
      throw new Error(`Null byte detected in ${source}`);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    if (obj.length > MAX_ARRAY_LEN) {
      throw new Error(`Array exceeds max length (${MAX_ARRAY_LEN}) in ${source}`);
    }
    return obj.map((item, idx) => deepClean(item, depth + 1, `${source}[${idx}]`));
  }

  if (obj !== null && typeof obj === 'object') {
    const keys = Object.keys(obj);

    if (keys.length > MAX_OBJECT_KEYS) {
      throw new Error(`Object exceeds max keys (${MAX_OBJECT_KEYS}) in ${source}`);
    }

    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
      if (DANGEROUS_KEYS.has(key)) {
        throw new Error(`Prototype pollution attempt: "${key}" in ${source}`);
      }
      if (key.includes('\u0000')) {
        throw new Error(`Null byte in field name: "${key}" in ${source}`);
      }
      clean[key] = deepClean(value, depth + 1, `${source}.${key}`);
    }
    return clean;
  }

  // number, boolean, null — safe as-is
  return obj;
}
=======
const MAX_DEPTH = 10;
const MAX_STRING_LEN = 50_000;
const MAX_ARRAY_LEN = 10_000;
const MAX_OBJECT_KEYS = 500;
>>>>>>> f01dd80bcb1f2add13589bcb4344c76fc3ed4e8b

export const sanitizeDeep = asyncHandler(async (req, _res, next) => {
  try {
    if (req.body) {
      req.body = deepClean(req.body, 0, 'body');
    }
    if (req.query) {
<<<<<<< HEAD
      replaceTarget(req.query, deepClean(req.query, 0, 'query'));
    }
    if (req.params) {
      replaceTarget(req.params, deepClean(req.params, 0, 'params'));
    }
  } catch (err) {
    logger.warn(
      {
        type: 'deep_sanitize_blocked',
        err: err.message,
        ip: req.ip,
        userId: req.user?.id,
        path: req.path,
      },
=======
      Object.assign(req.query, deepClean(req.query, 0, 'query'));
    }
    if (req.params) {
      Object.assign(req.params, deepClean(req.params, 0, 'params'));
    }
  } catch (err) {
    logger.warn(
      { err: err.message, ip: req.ip, userId: req.userId, path: req.path },
>>>>>>> f01dd80bcb1f2add13589bcb4344c76fc3ed4e8b
      'STRICT: Deep sanitization blocked'
    );
    throw ApiError.badRequest(err.message);
  }
<<<<<<< HEAD

  next();
});

// ─── replaceTarget ────────────────────────────────────────────────────────────
// Clear existing keys then assign — prevents stale unknown keys surviving
// Must mutate in-place — req.query and req.params are getter-only

function replaceTarget(target, data) {
  for (const key of Object.keys(target)) {
    delete target[key];
  }
  Object.assign(target, data);
}
=======
  next();
});

function deepClean(obj, depth, source = '') {
  if (depth > MAX_DEPTH) {
    throw new Error(`Request payload nesting too deep (max ${MAX_DEPTH} levels) in ${source}`);
  }

  // String validation
  if (typeof obj === 'string') {
    if (obj.length > MAX_STRING_LEN) {
      throw new Error(
        `String field exceeds maximum length of ${MAX_STRING_LEN} characters in ${source}`
      );
    }

    // Block null bytes and control characters
    if (obj.includes('\u0000')) {
      throw new Error(`Null byte detected in ${source}`);
    }

    return obj;
  }

  // Array validation
  if (Array.isArray(obj)) {
    if (obj.length > MAX_ARRAY_LEN) {
      throw new Error(`Array exceeds maximum length of ${MAX_ARRAY_LEN} items in ${source}`);
    }
    return obj.map((item, idx) => deepClean(item, depth + 1, `${source}[${idx}]`));
  }

  // Object validation
  if (obj !== null && typeof obj === 'object') {
    const keys = Object.keys(obj);

    // Limit number of keys to prevent DoS
    if (keys.length > MAX_OBJECT_KEYS) {
      throw new Error(`Object exceeds maximum of ${MAX_OBJECT_KEYS} keys in ${source}`);
    }

    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
      // Block prototype pollution keys
      if (DANGEROUS_KEYS.has(key)) {
        throw new Error(`Prototype pollution attempt detected: "${key}" in ${source}`);
      }

      // Block keys with null bytes
      if (key.includes('\u0000')) {
        throw new Error(`Null byte in field name: "${key}" in ${source}`);
      }

      clean[key] = deepClean(value, depth + 1, `${source}.${key}`);
    }
    return clean;
  }

  // Primitives (number, boolean, null) are safe
  return obj;
}

// ─── Additional Validation Helpers ────────────────────────────────────────────

/**
 * validateEmail
 * Strict email validation for user input
 */
export function validateEmail(email) {
  if (!email) return false;
  if (typeof email !== 'string') return false;
  if (email.length > 254) return false;

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * validatePhone
 * Strict Indian phone number validation
 */
export function validatePhone(phone) {
  if (!phone) return false;
  if (typeof phone !== 'string') return false;

  // Indian mobile: 10 digits, starts with 6-9
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * sanitizeString
 * Strip dangerous characters from string
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return str;

  // Remove null bytes
  str = str.replace(/\u0000/g, '');

  // Remove control characters except newline, tab, carriage return
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Trim whitespace
  str = str.trim();

  // Limit length
  if (str.length > MAX_STRING_LEN) {
    str = str.slice(0, MAX_STRING_LEN);
  }

  return str;
}
>>>>>>> f01dd80bcb1f2add13589bcb4344c76fc3ed4e8b
