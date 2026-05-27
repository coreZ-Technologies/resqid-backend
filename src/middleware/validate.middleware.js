// =============================================================================
// validate.middleware.js — RESQID
// Zod-based schema validation — strict mode, no unknown fields pass through
// Single validation failure = immediate 422 with full error details
// =============================================================================

import { ZodError } from 'zod';
import { ApiError } from '../shared/response/ApiError.js';
import { asyncHandler } from '../shared/response/asyncHandler.js';

// ─── Validation Targets ───────────────────────────────────────────────────────

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
        body: req.body ?? {},
        query: req.query ?? {},
        params: req.params ?? {},
      };
      result = schema.safeParse(data);
      if (!result.success) {
        throw validationError(formatZodErrors(result.error));
      }
      if (result.data.body !== undefined) req.body = result.data.body;
      if (result.data.query !== undefined) Object.assign(req.query, result.data.query);
      if (result.data.params !== undefined) Object.assign(req.params, result.data.params);
    } else {
      // Flat schema – validate req.body directly
      data = req.body ?? {};
      result = schema.safeParse(data);
      if (!result.success) {
        throw validationError(formatZodErrors(result.error));
      }
      req.body = result.data;
    }

    next();
  });

/**
 * validateAll(schemas)
 * Validate multiple targets in one middleware.
 * Usage: validateAll({ body: bodySchema, params: paramsSchema })
 */
export const validateAll = schemas =>
  asyncHandler(async (req, _res, next) => {
    const errors = [];

    for (const [target, schema] of Object.entries(schemas)) {
      const data = selectTarget(req, target);
      const result = schema.safeParse(data);

      if (!result.success) {
        errors.push(
          ...formatZodErrors(result.error).map(e => ({
            ...e,
            location: target,
          }))
        );
      } else {
        assignTarget(req, target, result.data);
      }
    }

    if (errors.length > 0) {
      throw validationError(errors);
    }

    next();
  });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function selectTarget(req, target) {
  switch (target) {
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
function assignTarget(req, target, data) {
  switch (target) {
    case 'body':
      req.body = data;
      break;
    case 'query':
      Object.assign(req.query, data);
      break;
    case 'params':
      Object.assign(req.params, data);
      break;
    case 'all':
      if (data.body) req.body = data.body;
      if (data.query) Object.assign(req.query, data.query);
      if (data.params) Object.assign(req.params, data.params);
      break;
  }
}

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