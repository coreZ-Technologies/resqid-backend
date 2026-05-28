// =============================================================================
// sanitize.middleware.js — RESQID
//
// STRICT input sanitization — NoSQL injection prevention + deep cleaning.
// Rejects suspicious input before it reaches services/DB.
// =============================================================================

import { asyncHandler } from '#shared/response/asyncHandler.js';
import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';
import { extractIp } from '#shared/network/extractIp.js';

// ─── NoSQL Key Detection ─────────────────────────────────────────────────────

const NOSQL_KEY_RE = /^\$|[\$\.]/;
const MAX_DEPTH = 10;
const MAX_STRING_LEN = 50_000;
const MAX_ARRAY_LEN = 10_000;
const MAX_OBJECT_KEYS = 500;

<<<<<<< HEAD
=======
<<<<<<< HEAD
// Blocked MongoDB operators (full list)
const BLOCKED_OPERATORS = new Set([
  '$where', '$regex', '$options', '$and', '$or', '$nor', '$not',
  '$expr', '$jsonSchema', '$mod', '$text', '$search',
  '$geoWithin', '$geoIntersects', '$near', '$nearSphere',
  '$elemMatch', '$size', '$all', '$in', '$nin', '$exists', '$type',
  '$slice', '$sort', '$project', '$group', '$match', '$lookup',
  '$unwind', '$out', '$merge', '$addFields', '$set', '$unset',
  '$replaceRoot', '$replaceWith', '$graphLookup', '$facet',
  '$bucket', '$bucketAuto', '$sortByCount', '$count', '$skip', '$limit', '$sample',
=======
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
const DANGEROUS_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
<<<<<<< HEAD
=======
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
]);

// ─── Core Sanitizers ─────────────────────────────────────────────────────────

/**
 * Strip NoSQL injection operators from object keys.
 */
function stripNoSqlKeys(obj, depth = 0, path = '') {
  if (depth > MAX_DEPTH) {
    throw new Error(`Nesting too deep at: ${path || 'root'}`);
  }

  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item, idx) => stripNoSqlKeys(item, depth + 1, `${path}[${idx}]`));
  }

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;

    if (NOSQL_KEY_RE.test(key)) {
<<<<<<< HEAD
=======
<<<<<<< HEAD
      logger.warn({ key, path: currentPath }, `STRICT: NoSQL injection key blocked: "${key}"`);
      throw new Error(`Invalid character in field name: "${key}"`);
    }

    // Check for blocked MongoDB operators
    if (BLOCKED_OPERATORS.has(key)) {
      logger.warn({ key, path: currentPath }, `STRICT: Blocked MongoDB operator: "${key}"`);
      throw new Error(`Invalid operator in request: "${key}"`);
    }

=======
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
      logger.warn({ key, path: currentPath }, `NoSQL injection key blocked: "${key}"`);
      throw new Error(`Invalid character in field name: "${key}"`);
    }

<<<<<<< HEAD
=======
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
    clean[key] = stripNoSqlKeys(value, depth + 1, currentPath);
  }
  return clean;
}

<<<<<<< HEAD
/**
 * Deep clean — enforce limits and strip dangerous patterns.
 */
=======
<<<<<<< HEAD
// ─── NoSQL Injection Sanitizer — STRICT ───────────────────────────────────────

export const sanitizeNoSql = (req, res, next) => {
  try {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = stripNoSqlKeys(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      const cleanQuery = stripNoSqlKeys(req.query);
      Object.assign(req.query, cleanQuery);
    }

    // Sanitize route parameters
    if (req.params && typeof req.params === 'object') {
      const cleanParams = stripNoSqlKeys(req.params);
      Object.assign(req.params, cleanParams);
    }

    next();
  } catch (err) {
    logger.warn(
      {
        err: err.message,
        ip: req.ip,
        userId: req.userId,
        path: req.path,
        method: req.method,
      },
      'STRICT: NoSQL injection blocked'
    );
    next(new ApiError(400, 'Invalid characters detected in request'));
  }
};

// ─── Deep Object Sanitizer — STRICT ───────────────────────────────────────────

const DANGEROUS_KEYS = new Set([
  '__proto__', 'constructor', 'prototype',
  '__defineGetter__', '__defineSetter__',
  '__lookupGetter__', '__lookupSetter__',
]);
const MAX_DEPTH = 10;
const MAX_STRING_LEN = 50_000;
const MAX_ARRAY_LEN = 10_000;
const MAX_OBJECT_KEYS = 500;

export const sanitizeDeep = asyncHandler(async (req, _res, next) => {
  try {
    if (req.body) {
      req.body = deepClean(req.body, 0, 'body');
    }
    if (req.query) {
      Object.assign(req.query, deepClean(req.query, 0, 'query'));
    }
    if (req.params) {
      Object.assign(req.params, deepClean(req.params, 0, 'params'));
    }
  } catch (err) {
    logger.warn(
      { err: err.message, ip: req.ip, userId: req.userId, path: req.path },
      'STRICT: Deep sanitization blocked'
    );
    throw new ApiError(400, err.message); // structural errors are safe to expose
  }
  next();
});

=======
/**
 * Deep clean — enforce limits and strip dangerous patterns.
 */
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
function deepClean(obj, depth, source = '') {
  if (depth > MAX_DEPTH) {
    throw new Error(`Nesting too deep (max ${MAX_DEPTH}) in ${source}`);
  }

  if (typeof obj === 'string') {
    if (obj.length > MAX_STRING_LEN) {
<<<<<<< HEAD
      throw new Error(`String exceeds max length ${MAX_STRING_LEN} in ${source}`);
=======
<<<<<<< HEAD
      throw new Error(`String field exceeds maximum length of ${MAX_STRING_LEN} characters in ${source}`);
=======
      throw new Error(`String exceeds max length ${MAX_STRING_LEN} in ${source}`);
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
    }
    if (obj.includes('\u0000')) {
      throw new Error(`Null byte detected in ${source}`);
    }
<<<<<<< HEAD
    // Strip control characters
    return obj.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
=======
<<<<<<< HEAD
    return obj;
=======
    // Strip control characters
    return obj.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
  }

  if (Array.isArray(obj)) {
    if (obj.length > MAX_ARRAY_LEN) {
      throw new Error(`Array exceeds max ${MAX_ARRAY_LEN} items in ${source}`);
    }
    return obj.map((item, idx) => deepClean(item, depth + 1, `${source}[${idx}]`));
  }

  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date) && !Buffer.isBuffer(obj)) {
    const keys = Object.keys(obj);
    if (keys.length > MAX_OBJECT_KEYS) {
      throw new Error(`Object exceeds max ${MAX_OBJECT_KEYS} keys in ${source}`);
    }

    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
      if (DANGEROUS_KEYS.has(key)) {
        throw new Error(`Prototype pollution attempt: "${key}" in ${source}`);
      }
<<<<<<< HEAD
=======
<<<<<<< HEAD
      // Block keys with null bytes
=======
>>>>>>> f12b34193109594a272a9511d4ea4c7b1fbd8b5f
>>>>>>> e674064afecbcf65dfae0ef363dfc4b63404f201
      if (key.includes('\u0000')) {
        throw new Error(`Null byte in key: "${key}" in ${source}`);
      }
      clean[key] = deepClean(value, depth + 1, `${source}.${key}`);
    }
    return clean;
  }

  return obj;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * NoSQL injection sanitizer — strips $ operators from keys.
 */
export const sanitizeNoSql = (req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = stripNoSqlKeys(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      const clean = stripNoSqlKeys(req.query);
      // Clear and reassign (query is a getter/setter)
      for (const key of Object.keys(req.query)) delete req.query[key];
      Object.assign(req.query, clean);
    }
    if (req.params && typeof req.params === 'object') {
      const clean = stripNoSqlKeys(req.params);
      for (const key of Object.keys(req.params)) delete req.params[key];
      Object.assign(req.params, clean);
    }
    next();
  } catch (err) {
    const ip = extractIp(req);
    logger.warn({ err: err.message, ip, path: req.path }, 'NoSQL injection blocked');
    next(ApiError.badRequest('Invalid characters in request', [], 'NOSQL_INJECTION_DETECTED'));
  }
};

/**
 * Deep sanitizer — enforces limits and strips dangerous patterns.
 */
export const sanitizeDeep = asyncHandler(async (req, _res, next) => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = deepClean(req.body, 0, 'body');
    }
    if (req.query && typeof req.query === 'object') {
      const clean = deepClean(req.query, 0, 'query');
      for (const key of Object.keys(req.query)) delete req.query[key];
      Object.assign(req.query, clean);
    }
    if (req.params && typeof req.params === 'object') {
      const clean = deepClean(req.params, 0, 'params');
      for (const key of Object.keys(req.params)) delete req.params[key];
      Object.assign(req.params, clean);
    }
  } catch (err) {
    const ip = extractIp(req);
    logger.warn({ err: err.message, ip, path: req.path }, 'Deep sanitization blocked');
    throw ApiError.badRequest(err.message, [], 'VALIDATION_ERROR');
  }
  next();
});
