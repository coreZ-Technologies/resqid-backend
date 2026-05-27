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
  // Use shared MAX_DEPTH constant — consistent with deepClean
  if (depth > MAX_DEPTH) {
    throw new Error(`Payload nesting too deep at: ${path || 'root'}`);
  }

  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item, idx) => stripNoSqlKeys(item, depth + 1, `${path}[${idx}]`));
  }

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;

    if (NOSQL_KEY_RE.test(key)) {
      throw new Error(`Invalid character in field name: "${key}" at ${currentPath}`);
    }

    if (BLOCKED_OPERATORS.has(key)) {
      throw new Error(`Blocked operator in request: "${key}" at ${currentPath}`);
    }

    clean[key] = stripNoSqlKeys(value, depth + 1, currentPath);
  }

  return clean;
}

// asyncHandler for consistency — if stripNoSqlKeys ever becomes async this works
export const sanitizeNoSql = asyncHandler(async (req, _res, next) => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = stripNoSqlKeys(req.body);
    }

    if (req.query && typeof req.query === 'object') {
      replaceTarget(req.query, stripNoSqlKeys(req.query));
    }

    if (req.params && typeof req.params === 'object') {
      replaceTarget(req.params, stripNoSqlKeys(req.params));
    }

    next();
  } catch (err) {
    // Log with req.ip directly — never use global for request context
    logger.warn(
      {
        type: 'nosql_injection_blocked',
        err: err.message,
        ip: req.ip, // ← req.ip not global.reqIp
        userId: req.user?.id,
        path: req.path,
        method: req.method,
      },
      'STRICT: NoSQL injection blocked'
    );
    throw ApiError.badRequest('Invalid characters detected in request');
  }
});

// ─── Deep Object Sanitizer ────────────────────────────────────────────────────

const DANGEROUS_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
]);

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

export const sanitizeDeep = asyncHandler(async (req, _res, next) => {
  try {
    if (req.body) {
      req.body = deepClean(req.body, 0, 'body');
    }
    if (req.query) {
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
      'STRICT: Deep sanitization blocked'
    );
    throw ApiError.badRequest(err.message);
  }

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
