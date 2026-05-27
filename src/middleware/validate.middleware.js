<<<<<<< HEAD
// =============================================================================
// validate.middleware.js — RESQID
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
// =============================================================================

import { ZodError } from 'zod';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';

// ─── validate() ───────────────────────────────────────────────────────────────

/**
 * validate(schema)
 *
 * Two modes detected automatically:
 *
 * ENVELOPE mode — schema has explicit `body`, `query`, `params` keys:
 *   const schema = z.object({
 *     body:   z.object({ name: z.string() }),
 *     params: z.object({ id: z.string() }),
 *   });
 *   router.post('/:id', validate(schema), controller);
 *
 * FLAT mode — schema directly describes req.body fields:
 *   const schema = z.object({ email: z.string(), password: z.string() });
 *   router.post('/login', validate(schema), controller);
 *
 * Envelope detection: schema must have ONLY keys from ['body','query','params']
 * This is stricter than checking 'body' in shape — avoids false positives.
 */

const ENVELOPE_KEYS = new Set(['body', 'query', 'params']);

const isEnvelopeSchema = (schema) => {
  if (!schema?.shape || typeof schema.shape !== 'object') return false;
  const keys = Object.keys(schema.shape);
  // Must have at least one envelope key AND no non-envelope keys
  return (
    keys.length > 0 &&
    keys.every((k) => ENVELOPE_KEYS.has(k)) &&
    keys.some((k) => ENVELOPE_KEYS.has(k))
  );
};

export const validate = (schema) =>
  asyncHandler(async (req, _res, next) => {
    if (isEnvelopeSchema(schema)) {
      // ── Envelope mode ────────────────────────────────────────────────────────
      const data = {
=======
// TODO: Add implementation
// =============================================================================
// validate.middleware.js — RESQID
// Zod-based schema validation — strict mode, no unknown fields pass through
// Single validation failure = immediate 422 with full error details
//
// FIX [#12]: assignTarget() was using direct assignment for req.query and
// req.params — both are getter-only on IncomingMessage and throw a TypeError
// on direct reassignment. Fixed with Object.assign() to mutate in-place.
// Same pattern used across sanitize.middleware.js and xss.middleware.js.
// req.body remains a direct assignment (writable property from express.json).
// =============================================================================

import { ZodError } from 'zod';
import { ApiError } from '../shared/response/ApiError.js';
import { asyncHandler } from '../shared/response/asyncHandler.js';

// ─── Validation Targets ───────────────────────────────────────────────────────

/**
 * validate(schema, target?)
 * target: 'body' | 'query' | 'params' | 'all'
 * Default: 'body'
 *
 * Usage:
 *   validate(mySchema)              → validates req.body
 *   validate(mySchema, "query")     → validates req.query
 *   validate(mySchema, "params")    → validates req.params
 *
 * Do NOT pass an object: validate({ body: mySchema }) — that is validateAll().
 *
 * Uses Zod .strict() behavior via schema definition.
 * Unknown fields cause validation failure — no extra data leaks through.
 */
export const validate = schema =>
  asyncHandler(async (req, _res, next) => {
    // Auto-detect schema shape:
    //   envelope shape  — z.object({ body: z.object(...), params?, query? })
    //   flat shape      — z.object({ email, password, ... }) — validates req.body directly
    //
    // Detection: if the schema has a "body" key in its shape, it is an envelope schema.
    // Otherwise treat it as a flat body schema (legacy auth routes).
    const isEnvelope =
      typeof schema.shape === 'object' && schema.shape !== null && 'body' in schema.shape;

    let data, result;

    if (isEnvelope) {
      data = {
>>>>>>> f01dd80bcb1f2add13589bcb4344c76fc3ed4e8b
        body: req.body ?? {},
        query: req.query ?? {},
        params: req.params ?? {},
      };
<<<<<<< HEAD

      const result = schema.safeParse(data);

      if (!result.success) {
        throw ApiError.unprocessable('Validation failed', formatZodErrors(result.error));
      }

      // Write back validated + transformed data
      if (result.data.body !== undefined) req.body = result.data.body;
      if (result.data.query !== undefined) replaceTarget(req.query, result.data.query);
      if (result.data.params !== undefined) replaceTarget(req.params, result.data.params);
    } else {
      // ── Flat mode — validates req.body directly ───────────────────────────────
      const result = schema.safeParse(req.body ?? {});

      if (!result.success) {
        throw ApiError.unprocessable('Validation failed', formatZodErrors(result.error));
      }

=======
      result = schema.safeParse(data);
      if (!result.success) {
        throw ApiError.validationError('Validation failed', formatZodErrors(result.error));
      }
      if (result.data.body !== undefined) req.body = result.data.body;
      if (result.data.query !== undefined) Object.assign(req.query, result.data.query);
      if (result.data.params !== undefined) Object.assign(req.params, result.data.params);
    } else {
      // Flat schema — validate req.body directly (auth routes)
      data = req.body ?? {};
      result = schema.safeParse(data);
      if (!result.success) {
        throw ApiError.validationError('Validation failed', formatZodErrors(result.error));
      }
>>>>>>> f01dd80bcb1f2add13589bcb4344c76fc3ed4e8b
      req.body = result.data;
    }

    next();
  });

<<<<<<< HEAD
// ─── validateAll() ────────────────────────────────────────────────────────────

/**
 * validateAll(schemas)
 *
 * Validate multiple targets simultaneously — collects ALL errors before throwing.
 * Use when a route needs body + params or body + query at the same time.
 *
 * Usage:
 *   router.patch('/:id',
 *     validateAll({
 *       body:   updateBodySchema,
 *       params: idParamsSchema,
 *     }),
 *     controller
 *   );
 */
export const validateAll = (schemas) =>
  asyncHandler(async (req, _res, next) => {
    const errors = [];
    const pending = []; // store valid results — only write if ALL pass
=======
/**
 * validateAll(schemas)
 * Validate multiple targets in one middleware.
 * Usage: validateAll({ body: bodySchema, params: paramsSchema })
 *
 * Use this when a route needs simultaneous body + params or body + query
 * validation. For single-target validation use validate() instead.
 */
export const validateAll = schemas =>
  asyncHandler(async (req, _res, next) => {
    const errors = [];
>>>>>>> f01dd80bcb1f2add13589bcb4344c76fc3ed4e8b

    for (const [target, schema] of Object.entries(schemas)) {
      const data = selectTarget(req, target);
      const result = schema.safeParse(data);

      if (!result.success) {
<<<<<<< HEAD
        const formatted = formatZodErrors(result.error).map((e) => ({
          ...e,
          location: target,
        }));
        errors.push(...formatted);
      } else {
        pending.push({ target, data: result.data });
      }
    }

    // Only write back if everything passed — no partial state
    if (errors.length > 0) {
      throw ApiError.unprocessable('Validation failed', errors);
    }

    for (const { target, data } of pending) {
      assignTarget(req, target, data);
=======
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
      throw ApiError.validationError('Validation failed', errors);
>>>>>>> f01dd80bcb1f2add13589bcb4344c76fc3ed4e8b
    }

    next();
  });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function selectTarget(req, target) {
  switch (target) {
    case 'body':
<<<<<<< HEAD
      return req.body ?? {};
    case 'query':
      return req.query ?? {};
    case 'params':
      return req.params ?? {};
    default:
      throw new Error(`validate.middleware: unknown target '${target}'`);
  }
}

=======
      return req.body;
    case 'query':
      return req.query;
    case 'params':
      return req.params;
    case 'all':
      return { body: req.body, query: req.query, params: req.params };
    default:
      return req.body;
  }
}

/**
 * assignTarget
 * Writes validated Zod output back onto the request object.
 *
 * NOTE on assignment strategy:
 *   req.body   → direct reassignment OK (writable property set by express.json)
 *   req.query  → Object.assign required (getter-only on IncomingMessage)
 *   req.params → Object.assign required (getter-only on IncomingMessage)
 */
>>>>>>> f01dd80bcb1f2add13589bcb4344c76fc3ed4e8b
function assignTarget(req, target, data) {
  switch (target) {
    case 'body':
      req.body = data;
      break;
    case 'query':
<<<<<<< HEAD
      replaceTarget(req.query, data);
      break;
    case 'params':
      replaceTarget(req.params, data);
=======
      Object.assign(req.query, data); // getter-only — mutate in-place
      break;
    case 'params':
      Object.assign(req.params, data); // getter-only — mutate in-place
      break;
    case 'all':
      if (data.body) req.body = data.body;
      if (data.query) Object.assign(req.query, data.query); // getter-only
      if (data.params) Object.assign(req.params, data.params); // getter-only
>>>>>>> f01dd80bcb1f2add13589bcb4344c76fc3ed4e8b
      break;
  }
}

<<<<<<< HEAD
/**
 * replaceTarget — clear existing keys then assign new ones.
 * Object.assign alone would leave unknown keys from original request.
 * Must mutate in-place — cannot reassign req.query / req.params directly.
 */
function replaceTarget(target, data) {
  // Remove all existing keys
  for (const key of Object.keys(target)) {
    delete target[key];
  }
  // Assign validated data
  Object.assign(target, data);
}

/**
 * formatZodErrors — extract clean field/message/code from ZodError.
 * Only processes actual ZodError instances — rethrows anything else.
 */
function formatZodErrors(error) {
  if (!(error instanceof ZodError)) {
    throw error; // not a ZodError — don't swallow it
  }

  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : 'root',
    message: issue.message,
    code: issue.code,
  }));
}
=======
function formatZodErrors(error) {
  const issues = error?.issues || error?.errors || [];

  return issues.map(e => ({
    field: e.path?.join('.') ?? '',
    message: e.message,
    code: e.code,
  }));
}
>>>>>>> f01dd80bcb1f2add13589bcb4344c76fc3ed4e8b
