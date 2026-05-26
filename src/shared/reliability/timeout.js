/**
 * Wraps an async function with a timeout.
 * If the function doesn't resolve within `ms`, it rejects.
 */
export class TimeoutError extends Error {
  constructor(ms) {
    super(`Operation timed out after ${ms}ms`);
    this.name = 'TimeoutError';
    this.code = 'TIMEOUTs';
  }
}

export const withTimeout = (fn, ms = 5000) => {
  return async (...args) => {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new TimeoutError(ms)), ms)
    );

    return Promise.race([fn(...args), timeoutPromise]);
  };
};
