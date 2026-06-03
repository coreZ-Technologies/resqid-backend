// =============================================================================
// timeout.js — RESQID
//
// Wraps an async function with a timeout.
// If the function doesn't resolve within `ms`, it rejects.
// =============================================================================

export class TimeoutError extends Error {
  constructor(ms, context = '') {
    const message = context
      ? `Operation '${context}' timed out after ${ms}ms`
      : `Operation timed out after ${ms}ms`;
    super(message);
    this.name = 'TimeoutError';
    this.code = 'TIMEOUT';
    this.timeoutMs = ms;
  }
}

/**
 * Wraps an async function with a timeout.
 *
 * @param {Function} fn - Async function to wrap
 * @param {number} ms - Timeout in milliseconds (default 5000)
 * @param {string} [context] - Optional context for error message
 * @returns {Function} - Timeout-wrapped function
 *
 * @example
 *   const result = await withTimeout(fetchData, 3000, 'fetchData')();
 *   const result = await withTimeout(() => prisma.teacher.findMany(), 5000)();
 */
export const withTimeout = (fn, ms = 5000, context = '') => {
  return async (...args) => {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new TimeoutError(ms, context)), ms)
    );

    return Promise.race([fn(...args), timeoutPromise]);
  };
};

/**
 * Create a timeout that can be used with AbortController.
 *
 * @param {number} ms - Timeout in milliseconds
 * @returns {{ signal: AbortSignal, clear: Function }}
 */
export const createTimeoutSignal = (ms) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
};
