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
        body: req.body ?? {},
        query: req.query ?? {},
        params: req.params ?? {},
      };

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

      req.body = result.data;
    }

    next();
  });

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

    // Only write back if everything passed — no partial state
    if (errors.length > 0) {
      throw ApiError.unprocessable('Validation failed', errors);
    }

    for (const { target, data } of pending) {
      assignTarget(req, target, data);
    }

    next();
  });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function selectTarget(req, target) {
  switch (target) {
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

function assignTarget(req, target, data) {
  switch (target) {
    case 'body':
      req.body = data;
      break;
    case 'query':
      replaceTarget(req.query, data);
      break;
    case 'params':
      replaceTarget(req.params, data);
      break;
  }
}

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
