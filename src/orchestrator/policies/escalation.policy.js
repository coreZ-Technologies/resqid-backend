// =============================================================================
// orchestrator/policies/escalation.policy.js — RESQID
// Defines when to escalate, who to notify, and how to call Slack.
// =============================================================================

import { ENV } from '#config/env.js';
import { logger } from '#config/logger.js';

const SLACK_WEBHOOK_URL = ENV.SLACK_ALERTS_WEBHOOK;

/**
 * Fire a Slack webhook. Never throws — if Slack is down, log and continue.
 */
export const notifySlack = async ({ title, level = 'warning', fields = {} }) => {
  if (!SLACK_WEBHOOK_URL) {
    logger.warn({ title }, '[escalation] Slack webhook not configured — skipping');
    return;
  }

  const color = level === 'critical' ? '#FF0000' : level === 'warning' ? '#FFA500' : '#36a64f';
  const emoji = level === 'critical' ? '🚨' : level === 'warning' ? '⚠️' : 'ℹ️';

  const payload = {
    attachments: [
      {
        color,
        title: `${emoji} ${title}`,
        fields: Object.entries(fields).map(([key, value]) => ({
          title: key,
          value: String(value),
          short: true,
        })),
        footer: 'RESQID Orchestrator',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);

    const res = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      logger.warn({ status: res.status, title }, '[escalation] Slack returned non-2xx');
    } else {
      logger.info({ title, level }, '[escalation] Slack alert sent');
    }
  } catch (err) {
    logger.error({ err: err.message, title }, '[escalation] Slack send failed');
  }
};

export const ESCALATION_RULES = Object.freeze({
  EMERGENCY_EXHAUSTED: {
    shouldSlack: true,
    immediate: true,
    level: 'critical',
    title: 'Emergency alert pipeline failed — all retries exhausted',
  },
  NORMAL_EXHAUSTED: {
    shouldSlack: true,
    immediate: false,
    level: 'warning',
    title: 'Job exhausted all retries — moved to DLQ',
  },
  PIPELINE_STALLED: {
    shouldSlack: true,
    immediate: true,
    level: 'warning',
    title: 'Order pipeline stalled — worker may be down',
  },
});
