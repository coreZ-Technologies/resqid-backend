// =============================================================================
// orchestrator/policies/retry.policy.js — RESQID
// Retry configuration per queue.
// =============================================================================

import { QUEUE_NAMES } from '../queues/queue.names.js';

export const RETRY_POLICIES = Object.freeze({
  [QUEUE_NAMES.EMERGENCY_ALERTS]: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 500 },
    onExhausted: 'DLQ_AND_SLACK',
  },

  [QUEUE_NAMES.NOTIFICATIONS]: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    onExhausted: 'DLQ_ONLY',
  },

  [QUEUE_NAMES.ATTENDANCE_BULK]: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    onExhausted: 'DLQ_ONLY',
  },

  [QUEUE_NAMES.PIPELINE_JOBS]: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    onExhausted: 'DLQ_ONLY',
  },
});

export const getRetryPolicy = (queueName) => {
  return RETRY_POLICIES[queueName] || RETRY_POLICIES[QUEUE_NAMES.PIPELINE_JOBS];
};

export const getDefaultJobOptions = (queueName) => {
  const policy = getRetryPolicy(queueName);
  return {
    attempts: policy.attempts,
    backoff: policy.backoff,
    removeOnComplete: { age: 86400, count: 100 },
    removeOnFail: { age: 604800, count: 500 },
  };
};
