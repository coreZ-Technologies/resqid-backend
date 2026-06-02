// =============================================================================
// orchestrator/events/event.consumer.js — RESQID
// consume(eventType, handler) — registers a typed handler.
// Workers call this to subscribe to specific event types from their queue.
//
// IMPORTANT: consume() must only be called from worker entry files, never from
// app.js or API routes. This registry is in-process — handlers registered in
// the API process will never fire because BullMQ jobs execute in the worker
// process. A worker context guard enforces this at startup.
// =============================================================================

import { EVENTS } from './event.types.js';
import { logger } from '#config/logger.js';

// ── Worker context guard ──────────────────────────────────────────────────────
// Set WORKER_PROCESS=true in worker entry files before importing this module.
// This prevents accidental consume() calls from the API process.

const _isWorkerProcess = process.env.WORKER_PROCESS === 'true';

// Registry: eventType → Set of handler functions
const _registry = new Map();

// Track handler execution for monitoring
const _handlerStats = new Map(); // handlerId → { runs, errors, lastRun, lastError }

/**
 * Register a handler for a specific event type.
 * Multiple handlers for the same type are all called in registration order.
 *
 * MUST be called only from worker entry files (workers/index.js or individual
 * worker bootstraps). Set WORKER_PROCESS=true in the worker entry point.
 *
 * @param {string} eventType — must be a value from EVENTS
 * @param {function} handler — async (event) => void
 * @param {object} options — { name?: string, timeout?: number }
 * @returns {function} unsubscribe function
 */
export const consume = (eventType, handler, options = {}) => {
  if (!_isWorkerProcess) {
    throw new Error(
      `consume("${eventType}") called outside a worker process. ` +
        'Set WORKER_PROCESS=true in your worker entry file before importing event.consumer.js. ' +
        'Handlers registered in the API process will never fire.'
    );
  }

  if (!EVENTS[eventType]) {
    throw new TypeError(
      `consume: unknown event type "${eventType}". Valid types: ${Object.keys(EVENTS).join(', ')}`
    );
  }

  if (typeof handler !== 'function') {
    throw new TypeError('consume: handler must be a function');
  }

  if (!_registry.has(eventType)) {
    _registry.set(eventType, new Set());
  }

  const handlerId = options.name || `handler_${eventType}_${_registry.get(eventType).size}`;

  // Attach metadata to handler for tracking
  handler._handlerId = handlerId;
  handler._timeout = options.timeout || 30000;

  _registry.get(eventType).add(handler);

  logger.info(
    { eventType, handlerId, timeout: handler._timeout },
    '[event.consumer] Handler registered'
  );

  // Return unsubscribe function
  return () => {
    const handlers = _registry.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      logger.info({ eventType, handlerId }, '[event.consumer] Handler unregistered');
    }
  };
};

/**
 * Dispatch an event to all registered handlers for its type.
 * Called internally by workers — not by application code.
 *
 * @param {object} event — full stamped event with { type, data, metadata, timestamp }
 * @returns {Promise<{ success: number, failed: number, results: Array }>}
 */
export const dispatch = async (event) => {
  const handlers = _registry.get(event.type);

  if (!handlers || handlers.size === 0) {
    logger.warn({ type: event.type }, '[event.consumer] No handlers registered for event type');
    return { success: 0, failed: 0, results: [] };
  }

  const startTime = Date.now();
  const results = [];

  // Execute all handlers with timeout
  const promises = [...handlers].map((handler) => {
    const handlerId = handler._handlerId || 'unknown';
    const timeout = handler._timeout || 30000;

    return Promise.race([
      handler(event),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Handler timeout after ${timeout}ms`)), timeout)
      ),
    ])
      .then((result) => {
        updateHandlerStats(handlerId, 'success');
        return { handlerId, status: 'fulfilled', result };
      })
      .catch((error) => {
        updateHandlerStats(handlerId, 'error', error);
        return { handlerId, status: 'rejected', error: error.message };
      });
  });

  const settled = await Promise.allSettled(promises);

  let successCount = 0;
  let failedCount = 0;

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      const value = result.value;
      if (value.status === 'fulfilled') {
        successCount++;
      } else {
        failedCount++;
        logger.error(
          {
            type: event.type,
            handlerId: value.handlerId,
            error: value.error,
          },
          '[event.consumer] Handler error'
        );
      }
      results.push(value);
    } else {
      failedCount++;
      logger.error(
        { type: event.type, error: result.reason?.message },
        '[event.consumer] Handler promise rejected'
      );
    }
  }

  const duration = Date.now() - startTime;
  logger.debug(
    {
      type: event.type,
      handlers: handlers.size,
      success: successCount,
      failed: failedCount,
      durationMs: duration,
    },
    '[event.consumer] Event dispatched'
  );

  return {
    success: successCount,
    failed: failedCount,
    total: handlers.size,
    durationMs: duration,
    results,
  };
};

/**
 * Dispatch event with retry on failure.
 */
export const dispatchWithRetry = async (event, maxRetries = 3) => {
  let lastResult;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    lastResult = await dispatch(event);

    if (lastResult.failed === 0) break;

    logger.warn(
      { type: event.type, attempt, failed: lastResult.failed },
      '[event.consumer] Retrying failed handlers'
    );

    // Small delay before retry
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }

  return lastResult;
};

// =============================================================================
// STATS & MONITORING
// =============================================================================

function updateHandlerStats(handlerId, status, error = null) {
  if (!_handlerStats.has(handlerId)) {
    _handlerStats.set(handlerId, { runs: 0, errors: 0, lastRun: null, lastError: null });
  }

  const stats = _handlerStats.get(handlerId);
  stats.runs++;
  stats.lastRun = new Date();

  if (status === 'error') {
    stats.errors++;
    stats.lastError = {
      message: error?.message || 'Unknown error',
      time: new Date(),
    };
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Check if any handlers are registered for a given event type.
 */
export const hasHandlers = (eventType) => {
  const handlers = _registry.get(eventType);
  return !!handlers && handlers.size > 0;
};

/**
 * Returns a snapshot of all registered event types.
 */
export const registeredTypes = () => [..._registry.keys()];

/**
 * Returns count of registered handlers per event type.
 */
export const registeredSummary = () => {
  const summary = {};
  for (const [type, handlers] of _registry.entries()) {
    summary[type] = handlers.size;
  }
  return summary;
};

/**
 * Returns handler execution statistics.
 */
export const getHandlerStats = (handlerId) => {
  return _handlerStats.get(handlerId) || null;
};

/**
 * Returns all handler statistics.
 */
export const getAllHandlerStats = () => {
  const stats = {};
  for (const [id, data] of _handlerStats.entries()) {
    stats[id] = {
      ...data,
      errorRate: data.runs > 0 ? ((data.errors / data.runs) * 100).toFixed(2) + '%' : '0%',
    };
  }
  return stats;
};

/**
 * Clear all registered handlers (useful for testing).
 */
export const clearAll = () => {
  _registry.clear();
  _handlerStats.clear();
  logger.info('[event.consumer] All handlers cleared');
};

/**
 * Get total handler count across all event types.
 */
export const totalHandlerCount = () => {
  let total = 0;
  for (const handlers of _registry.values()) {
    total += handlers.size;
  }
  return total;
};
