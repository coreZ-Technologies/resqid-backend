// =============================================================================
// orchestrator/workers/swap.worker.js — RESQID
// BullMQ worker: handles long-term teacher SWAP assignments.
// Auto-reverts on end_date.
// =============================================================================

import { Worker } from 'bullmq';
import { getQueueConnection } from '../queues/queue.connection.js';
import { logger } from '#config/logger.js';
import { prisma } from '#config/prisma.js';

const QUEUE_NAME = 'timetable_swap_queue';

let _worker = null;

/**
 * Process a SWAP job.
 *
 * Job data: { swapId, action: 'APPLY' | 'REVERT' }
 */
const processSwapJob = async (job) => {
  const { swapId, action } = job.data;

  const swap = await prisma.swapAssignment.findUnique({
    where: { id: swapId },
    include: {
      originalTeacher: { select: { name: true } },
      replacementTeacher: { select: { name: true } },
    },
  });

  if (!swap) {
    throw new Error(`Swap ${swapId} not found`);
  }

  if (action === 'APPLY') {
    // Apply the swap
    const slots = swap.timetableSlotIds || [];

    for (const slotId of slots) {
      await prisma.period.update({
        where: { id: slotId },
        data: { teacherId: swap.replacementTeacherId },
      });
    }

    await prisma.swapAssignment.update({
      where: { id: swapId },
      data: { status: 'ACTIVE' },
    });

    logger.info(
      {
        swapId,
        originalTeacher: swap.originalTeacher?.name,
        replacement: swap.replacementTeacher?.name,
        slots,
      },
      '[swap.worker] SWAP applied'
    );
  }

  if (action === 'REVERT') {
    // Revert the swap
    const slots = swap.timetableSlotIds || [];

    for (const slotId of slots) {
      await prisma.period.update({
        where: { id: slotId },
        data: { teacherId: swap.originalTeacherId },
      });
    }

    await prisma.swapAssignment.update({
      where: { id: swapId },
      data: { status: 'REVERTED', revertedAt: new Date() },
    });

    logger.info(
      { swapId, originalTeacher: swap.originalTeacher?.name },
      '[swap.worker] SWAP reverted'
    );
  }

  return { swapId, action, status: 'DONE' };
};

export const startSwapWorker = () => {
  if (_worker) return _worker;

  _worker = new Worker(QUEUE_NAME, processSwapJob, {
    connection: getQueueConnection(),
    concurrency: 3,
    stalledInterval: 60_000,
    maxStalledCount: 1,
    lockDuration: 30_000,
  });

  _worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, '[swap.worker] Completed');
  });

  _worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, err: error.message }, '[swap.worker] Failed');
  });

  logger.info({ queue: QUEUE_NAME, concurrency: 3 }, '[swap.worker] Started');
  return _worker;
};

export const stopSwapWorker = async () => {
  if (_worker) {
    await _worker.close();
    _worker = null;
    logger.info('[swap.worker] Stopped');
  }
};
