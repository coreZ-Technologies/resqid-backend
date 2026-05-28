// =============================================================================
// orchestrator/workers/maintenance.worker.js — RESQID
//
// No BullMQ — plain setInterval every 24h.
// Tasks: expire tokens, clean old sessions, clean old notifications.
// =============================================================================

import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';

const MAINTENANCE_INTERVAL_MS = 24 * 60 * 60 * 1000;

let _maintenanceInterval = null;

// ─── Tasks ────────────────────────────────────────────────────────────────────

const cleanupExpiredTokens = async () => {
  const expired = await prisma.token.updateMany({
    where: {
      expiresAt: { lt: new Date() },
      status: { in: ['ACTIVE', 'ISSUED'] },
    },
    data: { status: 'EXPIRED' },
  });
  logger.info({ count: expired.count }, '[maintenance] Expired tokens cleaned');
  return { expired: expired.count };
};

const cleanupExpiredSessions = async () => {
  const deleted = await prisma.userSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  logger.info({ count: deleted.count }, '[maintenance] Expired sessions cleaned');
  return { sessions: deleted.count };
};

const cleanupOldNotifications = async (olderThanDays = 30) => {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  const deleted = await prisma.notification.deleteMany({
    where: {
      createdAt: { lt: cutoff },
      status: { in: ['SENT', 'FAILED', 'CANCELLED', 'DELIVERED'] },
    },
  });
  logger.info({ count: deleted.count, olderThanDays }, '[maintenance] Old notifications cleaned');
  return { notifications: deleted.count };
};

// ─── Full Maintenance Run ─────────────────────────────────────────────────────

export const runMaintenanceNow = async () => {
  logger.info('[maintenance] Running full cycle');

  const results = await Promise.allSettled([
    cleanupExpiredTokens(),
    cleanupExpiredSessions(),
    cleanupOldNotifications(),
  ]);

  const summary = {
    tokens:
      results[0].status === 'fulfilled' ? results[0].value : { error: results[0].reason?.message },
    sessions:
      results[1].status === 'fulfilled' ? results[1].value : { error: results[1].reason?.message },
    notifications:
      results[2].status === 'fulfilled' ? results[2].value : { error: results[2].reason?.message },
    ranAt: new Date().toISOString(),
  };

  logger.info(summary, '[maintenance] Complete');
  return summary;
};

// ─── Lifecycle ────────────────────────────────────────────────────────────────

export const startMaintenanceWorker = () => {
  setTimeout(runMaintenanceNow, 2 * 60 * 1000);

  _maintenanceInterval = setInterval(runMaintenanceNow, MAINTENANCE_INTERVAL_MS);
  if (_maintenanceInterval.unref) _maintenanceInterval.unref();

  logger.info('[maintenance] Started (24h interval)');
};

export const stopMaintenanceWorker = async () => {
  if (_maintenanceInterval) {
    clearInterval(_maintenanceInterval);
    _maintenanceInterval = null;
  }
  logger.info('[maintenance] Stopped');
};
