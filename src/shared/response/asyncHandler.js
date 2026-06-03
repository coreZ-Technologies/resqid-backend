// =============================================================================
// asyncHandler.js — RESQID Async Error Handler Wrapper
//
// Wraps async route handlers to catch errors and forward to error middleware.
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
 *
 * @param {Function} fn - Async middleware function
 * @returns {Function} - Async-safe middleware
 */
export const asyncMiddleware = (fn) => asyncHandler(fn);

/**
 * Wraps a request handler with timeout
 *
 * @param {Function} fn - Async route handler
 * @param {number} ms - Timeout in milliseconds (default 30s)
 * @returns {Function} - Timeout-wrapped handler
 */
export const withTimeout =
  (fn, ms = 30000) =>
  (req, res, next) => {
    const timer = setTimeout(() => {
      const err = new Error(`Request timeout after ${ms}ms`);
      err.statusCode = 408;
      err.errorCode = 'REQUEST_TIMEOUT';
      next(err);
    }, ms);

    // Clear timer if request completes before timeout
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    Promise.resolve(fn(req, res, next))
      .then(() => clearTimeout(timer))
      .catch((err) => {
        clearTimeout(timer);
        next(err);
      });
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

        // Don't retry on 4xx errors (client errors)
        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
          return next(error);
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          return next(error);
        }

        // Wait before retry with exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }

    return next(lastError);
  };

// ─── Default Export ──────────────────────────────────────────────────────────
export default asyncHandler;
