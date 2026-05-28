// =============================================================================
// orchestrator/jobs/dlqMonitor.job.js — RESQID
// DLQ Monitor — checks DeadLetterQueue table for unresolved jobs.
// =============================================================================

import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';

export const executeDlqMonitor = async () => {
  const startTime = Date.now();
  logger.info('[dlqMonitor] Started');

  try {
    const unresolvedCount = await prisma.deadLetterQueue.count({
      where: { resolved: false },
    });

    const recentUnresolved = await prisma.deadLetterQueue.findMany({
      where: { resolved: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        jobType: true,
        queueName: true,
        errorMessage: true,
        createdAt: true,
        retryCount: true,
      },
    });

    logger.info({ unresolvedCount, recentCount: recentUnresolved.length }, '[dlqMonitor] Stats');

    let notificationSent = false;
    if (unresolvedCount > 0) {
      await notifySuperAdmins(unresolvedCount, recentUnresolved);
      notificationSent = true;
    }

    const duration = Date.now() - startTime;
    logger.info({ duration, unresolvedCount, notificationSent }, '[dlqMonitor] Complete');

    return { success: true, dlqCount: unresolvedCount, notificationSent, duration };
  } catch (error) {
    logger.error({ err: error.message }, '[dlqMonitor] Failed');
    throw error;
  }
};

// ─── Notify Super Admins ─────────────────────────────────────────────────────

const notifySuperAdmins = async (count, jobs) => {
  try {
    const superAdmins = await prisma.superAdmin.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    if (superAdmins.length === 0) return;

    // Avoid spam — check for unread notification in last 15 minutes
    const existingNotification = await prisma.notification.findFirst({
      where: {
        type: 'DLQ_NEW_ENTRY',
        status: 'PENDING',
        createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
      },
    });

    if (existingNotification) {
      logger.debug('[dlqMonitor] Skipping — unread alert already exists');
      return;
    }

    // Create in-app notifications for super admins
    const notifications = superAdmins.map((admin) => ({
      schoolUserId: admin.id,
      type: 'DLQ_NEW_ENTRY',
      title: `⚠️ DLQ Alert: ${count} Failed Job${count > 1 ? 's' : ''}`,
      body: `${count} job${count > 1 ? 's have' : ' has'} failed. Review in Dead Letter Queue.`,
      channel: 'IN_APP',
      status: 'PENDING',
      data: {
        dlqCount: count,
        jobs: jobs.map((j) => ({
          id: j.id,
          jobType: j.jobType,
          queue: j.queueName,
          error: j.errorMessage?.substring(0, 200),
        })),
      },
    }));

    await prisma.notification.createMany({ data: notifications });
    logger.info({ count, admins: superAdmins.length }, '[dlqMonitor] Notifications sent');
  } catch (error) {
    logger.error({ err: error.message }, '[dlqMonitor] Notification creation failed');
  }
};

export default { executeDlqMonitor };
