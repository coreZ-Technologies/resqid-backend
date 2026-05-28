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

const DANGEROUS_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
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
      logger.warn({ key, path: currentPath }, `NoSQL injection key blocked: "${key}"`);
      throw new Error(`Invalid character in field name: "${key}"`);
    }

    clean[key] = stripNoSqlKeys(value, depth + 1, currentPath);
  }
  return clean;
}

/**
 * Deep clean — enforce limits and strip dangerous patterns.
 */
function deepClean(obj, depth, source = '') {
  if (depth > MAX_DEPTH) {
    throw new Error(`Nesting too deep (max ${MAX_DEPTH}) in ${source}`);
  }

  if (typeof obj === 'string') {
    if (obj.length > MAX_STRING_LEN) {
      throw new Error(`String exceeds max length ${MAX_STRING_LEN} in ${source}`);
    }
    if (obj.includes('\u0000')) {
      throw new Error(`Null byte detected in ${source}`);
    }
    // Strip control characters
    return obj.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
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
