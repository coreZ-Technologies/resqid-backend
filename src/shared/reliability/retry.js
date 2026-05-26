/**
 * Retries an async function up to `maxAttempts` times
 * with exponential backoff between attempts.
 *
 * Backoff: 300ms → 600ms → 1200ms (doubles each time)
 */
export const retry = async (fn, options = {}) => {
  const {
    maxAttempts = 3,
    baseDelayMs = 300,
    shouldRetry = () => true,
    onRetry = () => {},
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      const isLastAttempt = attempt === maxAttempts;
      if (isLastAttempt || !shouldRetry(err, attempt)) {
        throw err;
      }

      const delayMs = baseDelayMs * Math.pow(2, attempt - 1); // exponential backoff
      onRetry(err, attempt, delayMs);

      await new Promise((res) => setTimeout(res, delayMs));
    }
  }

  throw lastError;
};
