// =============================================================================
// asyncHandler.js — RESQID Async Error Handler Wrapper
//
// Wraps async route handlers to catch errors and forward to error middleware.
// Express v5 automatically catches async errors, but this wrapper:
//   1. Ensures Express v4 compatibility
//   2. Provides utility variants for different patterns
//   3. Makes intent explicit in route definitions
//
// Usage:
//   router.get('/users', asyncHandler(userController.list));
//   router.post('/users', validate(schema), asyncHandler(userController.create));
// =============================================================================

/**
 * Standard async handler — wraps a single async function
 *
 * @param {Function} fn - Async route handler (req, res, next)
 * @returns {Function} - Express middleware-compatible function
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Wraps an entire controller object — all methods become async-safe
 *
 * Usage:
 *   const userController = asyncController({
 *     list: async (req, res) => { ... },
 *     create: async (req, res) => { ... },
 *   });
 *
 * @param {Object} controller - Object with async methods
 * @returns {Object} - Controller with all methods wrapped
 */
export const asyncController = (controller) => {
  const wrapped = {};
  for (const [key, fn] of Object.entries(controller)) {
    if (typeof fn === 'function') {
      wrapped[key] = asyncHandler(fn);
    } else {
      wrapped[key] = fn;
    }
  }
  return wrapped;
};

/**
 * Wraps middleware that also needs async error handling
 * Identical to asyncHandler but semantically clearer for middleware
 *
 * @param {Function} fn - Async middleware function
 * @returns {Function} - Async-safe middleware
 */
export const asyncMiddleware = (fn) => asyncHandler(fn);

/**
 * Wraps a request handler with timeout
 *
 * @param {Function} fn - Async route handler
 * @param {number} ms - Timeout in milliseconds
 * @returns {Function} - Timeout-wrapped handler
 */
export const withTimeout =
  (fn, ms = 30000) =>
  (req, res, next) => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${ms}ms`));
      }, ms);
    });

    Promise.race([Promise.resolve(fn(req, res, next)), timeoutPromise]).catch(next);
  };

/**
 * Wraps a handler with retry logic (for idempotent operations)
 *
 * @param {Function} fn - Async route handler
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} delayMs - Delay between retries
 * @returns {Function} - Retry-wrapped handler
 */
export const withRetry =
  (fn, maxRetries = 3, delayMs = 1000) =>
  async (req, res, next) => {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn(req, res, next);
      } catch (error) {
        lastError = error;

        // Don't retry on 4xx errors
        if (error.statusCode && error.statusCode < 500) {
          throw error;
        }

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
        }
      }
    }

    throw lastError;
  };

// ─── Default Export (Backward Compatible) ────────────────────────────────────
export default asyncHandler;
