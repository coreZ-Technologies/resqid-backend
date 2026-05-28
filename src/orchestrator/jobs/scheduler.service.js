// =============================================================================
// orchestrator/jobs/scheduler.service.js — RESQID
// Registers all cron jobs on startup.
// =============================================================================

import cron from 'node-cron';
import { logger } from '#config/logger.js';
import { runBehavioralCleanup } from './behavioralCleanup.job.js';
import { flushDlqSlackBatch } from '../dlq/dlq.handler.js';
import { cleanupExpoTokens } from './cleanupExpoTokens.job.js';
import { executeDlqMonitor } from './dlqMonitor.job.js';

// ── Cron schedules ─────────────────────────────────────────────────────────────

const SCHEDULES = Object.freeze({
  // 2 AM IST daily — behavioral cleanup
  BEHAVIORAL_CLEANUP: {
    cron: '30 20 * * *',
    timezone: 'Asia/Kolkata',
    display: '2:00 AM IST daily',
  },

  // 3 AM IST daily — Expo token cleanup
  EXPO_TOKEN_CLEANUP: {
    cron: '30 21 * * *',
    timezone: 'Asia/Kolkata',
    display: '3:00 AM IST daily',
  },

  // Every hour — DLQ Slack batch flush
  DLQ_SLACK_FLUSH: {
    cron: '0 * * * *',
    timezone: 'Asia/Kolkata',
    display: 'Every hour',
  },

  // Every 30 minutes — DLQ monitor
  DLQ_MONITOR: {
    cron: '*/30 * * * *',
    timezone: 'Asia/Kolkata',
    display: 'Every 30 minutes',
  },
});

// ── Safe job wrapper ──────────────────────────────────────────────────────────

const safeRun = (name, fn) => async () => {
  try {
    logger.info(`[scheduler] Running: ${name}`);
    await fn();
  } catch (err) {
    logger.error({ err: err.message, job: name }, `[scheduler] ${name} failed`);
  }
};

// ── Scheduler Manager ─────────────────────────────────────────────────────────

let _jobs = [];

export const startScheduler = () => {
  if (_jobs.length > 0) {
    logger.warn('[scheduler] Already started');
    return;
  }

  logger.info('[scheduler] Starting cron scheduler');

  _jobs = [
    cron.schedule(
      SCHEDULES.BEHAVIORAL_CLEANUP.cron,
      safeRun('behavioral_cleanup', runBehavioralCleanup),
      { timezone: SCHEDULES.BEHAVIORAL_CLEANUP.timezone }
    ),

    cron.schedule(
      SCHEDULES.EXPO_TOKEN_CLEANUP.cron,
      safeRun('expo_token_cleanup', cleanupExpoTokens),
      { timezone: SCHEDULES.EXPO_TOKEN_CLEANUP.timezone }
    ),

    cron.schedule(SCHEDULES.DLQ_SLACK_FLUSH.cron, safeRun('dlq_slack_flush', flushDlqSlackBatch), {
      timezone: SCHEDULES.DLQ_SLACK_FLUSH.timezone,
    }),

    cron.schedule(SCHEDULES.DLQ_MONITOR.cron, safeRun('dlq_monitor', executeDlqMonitor), {
      timezone: SCHEDULES.DLQ_MONITOR.timezone,
    }),
  ];

  logger.info(
    {
      jobs: [
        { name: 'behavioral_cleanup', schedule: SCHEDULES.BEHAVIORAL_CLEANUP.display },
        { name: 'expo_token_cleanup', schedule: SCHEDULES.EXPO_TOKEN_CLEANUP.display },
        { name: 'dlq_slack_flush', schedule: SCHEDULES.DLQ_SLACK_FLUSH.display },
        { name: 'dlq_monitor', schedule: SCHEDULES.DLQ_MONITOR.display },
      ],
    },
    '[scheduler] All crons registered'
  );
};

export const stopScheduler = () => {
  for (const job of _jobs) job.stop();
  _jobs = [];
  logger.info('[scheduler] All crons stopped');
};

export const triggerJob = async (name) => {
  switch (name) {
    case 'behavioral_cleanup':
      return runBehavioralCleanup();
    case 'expo_token_cleanup':
      return cleanupExpoTokens();
    case 'dlq_slack_flush':
      return flushDlqSlackBatch();
    case 'dlq_monitor':
      return executeDlqMonitor();
    default:
      throw new Error(`[scheduler] Unknown job: "${name}"`);
  }
};
