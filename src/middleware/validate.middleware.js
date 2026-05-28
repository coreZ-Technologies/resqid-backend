// =============================================================================
// validate.middleware.js — RESQID
<<<<<<< HEAD
// Zod-based schema validation — strict mode, no unknown fields pass through
// Single validation failure = immediate 422 with full error details
=======
// Zod-based request validation — strict, no unknown fields pass through
//
// Two functions:
//   validate(schema)        → single target (body default, or envelope)
//   validateAll(schemas)    → multiple targets simultaneously
//
// Assignment strategy:
//   req.body   → direct reassignment (writable, set by express.json)
//   req.query  → clear + Object.assign (getter-only on IncomingMessage)
//   req.params → clear + Object.assign (getter-only on IncomingMessage)
>>>>>>>>> Temporary merge branch 2
// =============================================================================

import { ZodError } from 'zod';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';

// ─── validate() ───────────────────────────────────────────────────────────────

<<<<<<<<< Temporary merge branch 1
/**
 * validate(schema)
 * Auto-detects envelope schema (with body/query/params keys) vs flat schema.
 * Default: validates req.body for flat schema.
 *
 * Usage:
 *   validate(mySchema)              → validates req.body
 *   validate(mySchema, "query")     → (use validateAll for multiple targets)
 */
export const validate = schema =>
  asyncHandler(async (req, _res, next) => {
    // Detect envelope schema (z.object({ body: ..., query?, params? }))
    const isEnvelope =
      typeof schema.shape === 'object' && schema.shape !== null && 'body' in schema.shape;

    let data, result;

    if (isEnvelope) {
      data = {
=========
const ENVELOPE_KEYS = new Set(['body', 'query', 'params']);

const isEnvelopeSchema = (schema) => {
  if (!schema?.shape || typeof schema.shape !== 'object') return false;
  const keys = Object.keys(schema.shape);
  return (
    keys.length > 0 &&
    keys.every((k) => ENVELOPE_KEYS.has(k)) &&
    keys.some((k) => ENVELOPE_KEYS.has(k))
  );
};

export const validate = (schema) =>
  asyncHandler(async (req, _res, next) => {
    if (isEnvelopeSchema(schema)) {
      // ── Envelope mode ──────────────────────────────────────────────────────
      const data = {
>>>>>>>>> Temporary merge branch 2
        body: req.body ?? {},
        query: req.query ?? {},
        params: req.params ?? {},
      };

      const result = schema.safeParse(data);

      if (!result.success) {
<<<<<<<<< Temporary merge branch 1
        throw validationError(formatZodErrors(result.error));
=========
        throw ApiError.unprocessable('Validation failed', formatZodErrors(result.error));
>>>>>>>>> Temporary merge branch 2
      }

      if (result.data.body !== undefined) req.body = result.data.body;
      if (result.data.query !== undefined) replaceTarget(req.query, result.data.query);
      if (result.data.params !== undefined) replaceTarget(req.params, result.data.params);
    } else {
<<<<<<<<< Temporary merge branch 1
      // Flat schema – validate req.body directly
      data = req.body ?? {};
      result = schema.safeParse(data);
      if (!result.success) {
        throw validationError(formatZodErrors(result.error));
=========
      // ── Flat mode — validates req.body directly ─────────────────────────────
      const result = schema.safeParse(req.body ?? {});

      if (!result.success) {
        throw ApiError.unprocessable('Validation failed', formatZodErrors(result.error));
>>>>>>>>> Temporary merge branch 2
      }

      req.body = result.data;
    }

    next();
  });

<<<<<<<<< Temporary merge branch 1
/**
 * validateAll(schemas)
 * Validate multiple targets in one middleware.
 * Usage: validateAll({ body: bodySchema, params: paramsSchema })
 */
export const validateAll = schemas =>
=========
// ─── validateAll() ────────────────────────────────────────────────────────────

export const validateAll = (schemas) =>
>>>>>>>>> Temporary merge branch 2
  asyncHandler(async (req, _res, next) => {
    const errors = [];
    const pending = [];

    for (const [target, schema] of Object.entries(schemas)) {
      const data = selectTarget(req, target);
      const result = schema.safeParse(data);

      if (!result.success) {
        const formatted = formatZodErrors(result.error).map((e) => ({
          ...e,
          location: target,
        }));
        errors.push(...formatted);
      } else {
        pending.push({ target, data: result.data });
      }
    }

    if (errors.length > 0) {
<<<<<<<<< Temporary merge branch 1
      throw validationError(errors);
=========
      throw ApiError.unprocessable('Validation failed', errors);
    }

    for (const { target, data } of pending) {
      assignTarget(req, target, data);
>>>>>>>>> Temporary merge branch 2
    }

    next();
  });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function selectTarget(req, target) {
  switch (target) {
<<<<<<<<< Temporary merge branch 1
    case 'body':  return req.body;
    case 'query': return req.query;
    case 'params': return req.params;
    case 'all':   return { body: req.body, query: req.query, params: req.params };
    default:      return req.body;
  }
}

/**
 * assignTarget
 * Writes validated data back onto the request.
 * NOTE: req.query and req.params are getter‑only → use Object.assign.
 */
=========
    case 'body':
      return req.body ?? {};
    case 'query':
      return req.query ?? {};
    case 'params':
      return req.params ?? {};
    default:
      throw new Error(`validate.middleware: unknown target '${target}'`);
  }
}

>>>>>>>>> Temporary merge branch 2
function assignTarget(req, target, data) {
  switch (target) {
    case 'body':
      req.body = data;
      break;
    case 'query':
<<<<<<<<< Temporary merge branch 1
      Object.assign(req.query, data);
      break;
    case 'params':
      Object.assign(req.params, data);
      break;
    case 'all':
      if (data.body) req.body = data.body;
      if (data.query) Object.assign(req.query, data.query);
      if (data.params) Object.assign(req.params, data.params);
=========
      replaceTarget(req.query, data);
      break;
    case 'params':
      replaceTarget(req.params, data);
>>>>>>>>> Temporary merge branch 2
      break;
  }
}

<<<<<<<<< Temporary merge branch 1
function formatZodErrors(error) {
  const issues = error?.issues || error?.errors || [];
  return issues.map(e => ({
    field: e.path?.join('.') ?? '',
    message: e.message,
    code: e.code,
  }));
}

/**
 * Build an ApiError with 422 status and attached validation errors.
 * This matches the error.middleware.js handling (err.isOperational + err.errors).
 */
function validationError(errors) {
  const apiError = new ApiError(422, 'Validation failed');
  apiError.errors = errors;           // error.middleware.js sends this as `errors`
  return apiError;
}
=========
/**
 * replaceTarget — clear existing keys then assign new ones.
 * Object.assign alone would leave unknown keys from original request.
 * Must mutate in-place — cannot reassign req.query / req.params directly.
 */
function replaceTarget(target, data) {
  for (const key of Object.keys(target)) {
    delete target[key];
  }
  Object.assign(target, data);
}

function formatZodErrors(error) {
  if (!(error instanceof ZodError)) {
    throw error;
  }

  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : 'root',
    message: issue.message,
    code: issue.code,
  }));
}
>>>>>>>>> Temporary merge branch 2
