// =============================================================================
// orchestrator/services/idempotency.service.js — RESQID
//
// Prevents duplicate job processing. Used by:
//   - Attendance bulk sync (device retries same batch)
//   - Emergency alerts (prevent double-notification)
//   - Notification dispatch
// =============================================================================

import { middlewareRedis as redis } from '#config/redis.js';
import { logger } from '#config/logger.js';
import {
  REDIS_KEYS,
  IDEMPOTENCY_TTL_SECONDS,
  DISTRIBUTED_LOCK_TTL_MS,
} from '../orchestrator.constants.js';

// ─── Idempotency ──────────────────────────────────────────────────────────────

/**
 * Claim execution of a job. Returns false if already claimed.
 * Used to prevent duplicate processing of the same batch.
 *
 * @param {string} jobId - Unique job identifier (e.g., deviceId + timestamp)
 * @param {string} step - Processing step name
 * @param {number} ttlSeconds - How long to remember this claim
 * @returns {Promise<{ claimed: boolean, existing?: string }>}
 */
export const claimExecution = async (jobId, step, ttlSeconds = IDEMPOTENCY_TTL_SECONDS) => {
  const key = REDIS_KEYS.IDEMPOTENCY(jobId, step);
  const claimed = await redis.set(key, 'running', 'EX', ttlSeconds, 'NX');

  if (!claimed) {
    const existing = await redis.get(key);
    logger.info({ jobId, step, existing }, '[idempotency] Already claimed');
    return { claimed: false, existing };
  }

  logger.info({ jobId, step }, '[idempotency] Claimed');
  return { claimed: true };
};

/**
 * Mark a job step as completed with result data.
 */
export const markCompleted = async (
  jobId,
  step,
  result = {},
  ttlSeconds = IDEMPOTENCY_TTL_SECONDS
) => {
  const key = REDIS_KEYS.IDEMPOTENCY(jobId, step);
  const value = `completed:${JSON.stringify(result)}`;
  await redis.set(key, value, 'EX', ttlSeconds);
  logger.info({ jobId, step }, '[idempotency] Marked completed');
};

/**
 * Release a claim (e.g., on error so it can be retried).
 */
export const releaseClaim = async (jobId, step) => {
  const key = REDIS_KEYS.IDEMPOTENCY(jobId, step);
  await redis.del(key);
  logger.info({ jobId, step }, '[idempotency] Claim released');
};

/**
 * Check the status of a job step.
 * @returns {'unclaimed' | 'running' | 'completed' | 'unknown'}
 */
export const checkStatus = async (jobId, step) => {
  const key = REDIS_KEYS.IDEMPOTENCY(jobId, step);
  const value = await redis.get(key);

  if (!value) return 'unclaimed';
  if (value === 'running') return 'running';
  if (value.startsWith('completed')) return 'completed';
  return 'unknown';
};

// ─── Distributed Lock ─────────────────────────────────────────────────────────

/**
 * Acquire a distributed lock for a job step.
 * Prevents concurrent processing across worker instances.
 */
export const acquireLock = async (jobId, step) => {
  const key = REDIS_KEYS.LOCK(jobId, step);
  const ttlSec = Math.ceil(DISTRIBUTED_LOCK_TTL_MS / 1000);
  const result = await redis.set(key, '1', 'EX', ttlSec, 'NX');
  return result === 'OK';
};

/**
 * Release a distributed lock.
 */
export const releaseLock = async (jobId, step) => {
  const key = REDIS_KEYS.LOCK(jobId, step);
  await redis.del(key);
};

// ─── Convenience: Execute with idempotency ────────────────────────────────────

/**
 * Execute a function with idempotency guarantee.
 * If the job+step was already completed, returns the cached result.
 * If running elsewhere, skips.
 * Otherwise, claims, executes, and marks completed.
 *
 * @param {string} jobId
 * @param {string} step
 * @param {Function} fn - Async function to execute
 * @returns {Promise<{ executed: boolean, result?: any, cached?: boolean }>}
 */
export const executeOnce = async (jobId, step, fn) => {
  // Check if already completed
  const status = await checkStatus(jobId, step);
  if (status === 'completed') {
    const key = REDIS_KEYS.IDEMPOTENCY(jobId, step);
    const value = await redis.get(key);
    const result = value?.replace('completed:', '') || '{}';
    logger.info({ jobId, step }, '[idempotency] Already completed — returning cached');
    return { executed: false, result: JSON.parse(result), cached: true };
  }

  // Try to claim
  const { claimed } = await claimExecution(jobId, step);
  if (!claimed) {
    logger.info({ jobId, step }, '[idempotency] Running elsewhere — skipping');
    return { executed: false };
  }

  // Execute
  try {
    const result = await fn();
    await markCompleted(jobId, step, result);
    return { executed: true, result };
  } catch (err) {
    await releaseClaim(jobId, step);
    throw err;
  }
};
