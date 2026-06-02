// orchestrator/workers/swap.worker.js — RESQID
// Handles manual slot swaps and reassignments.

import { Worker } from 'bullmq';
import { getQueueConnection } from '../queues/queue.connection.js';
import { QUEUE_NAMES } from '../queues/queue.names.js';
import { timetableRepository } from '#modules/m1-timetable-main/timetable.repository.js';
import * as hardConstraints from '#modules/m1-timetable-main/constraints/hard.js';
import { ENV } from '#config/env.js';
import { logger } from '#config/logger.js';

/**
 * Start the swap worker.
 */
export const startSwapWorker = () => {
  const worker = new Worker(
    QUEUE_NAMES.TIMETABLE_SWAP,
    async (job) => {
      const { schoolId, timetableId, swaps } = job.data;
      const jobId = job.id;

      logger.info({ jobId, swapCount: swaps?.length }, '[swap.worker] Processing swaps');

      await timetableRepository.updateJobStatus(jobId, 'PROCESSING', {
        statusMessage: `Processing ${swaps?.length || 0} swap(s)...`,
        progressPercent: 0,
      });

      try {
        const results = [];
        const errors = [];

        for (let i = 0; i < swaps.length; i++) {
          const swap = swaps[i];

          // Validate the swap against hard constraints
          const validation = await validateSwap(swap, timetableId, schoolId);

          if (!validation.ok) {
            errors.push({ slotId: swap.slotId, reason: validation.reason });
            continue;
          }

          // Apply the swap
          await timetableRepository.moveSlot(swap.slotId, swap.newDay, swap.newPeriod);

          results.push({
            slotId: swap.slotId,
            oldDay: validation.oldDay,
            oldPeriod: validation.oldPeriod,
            newDay: swap.newDay,
            newPeriod: swap.newPeriod,
            moved: true,
          });

          // Update progress
          await timetableRepository.updateJobStatus(jobId, 'PROCESSING', {
            progressPercent: Math.round(((i + 1) / swaps.length) * 100),
            statusMessage: `Processed ${i + 1}/${swaps.length} swaps`,
          });
        }

        const summary = {
          total: swaps.length,
          succeeded: results.length,
          failed: errors.length,
          results,
          errors,
        };

        await timetableRepository.updateJobStatus(jobId, 'COMPLETED', {
          statusMessage: `${results.length}/${swaps.length} swaps completed`,
          progressPercent: 100,
          output: summary,
        });

        logger.info(
          { jobId, succeeded: results.length, failed: errors.length },
          '[swap.worker] Swaps processed'
        );

        return summary;
      } catch (error) {
        logger.error(
          { jobId, error: error.message, stack: error.stack },
          '[swap.worker] Swap failed'
        );

        await timetableRepository.updateJobStatus(jobId, 'FAILED', {
          statusMessage: `Swap failed: ${error.message}`,
          error: error.message,
        });

        throw error;
      }
    },
    {
      connection: getQueueConnection(),
      concurrency: ENV.TIMETABLE_SWAP_CONCURRENCY || 3,
      lockDuration: 30000,
      stalledInterval: 15000,
    }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, '[swap.worker] Job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, '[swap.worker] Job failed');
  });

  logger.info('[swap.worker] Worker started');
  return worker;
};

/**
 * Stop the swap worker.
 */
export const stopSwapWorker = async (worker) => {
  if (worker) {
    await worker.close();
    logger.info('[swap.worker] Worker stopped');
  }
};

/**
 * Validate a swap against hard constraints.
 */
async function validateSwap(swap, timetableId, schoolId) {
  const context = await timetableRepository.loadTimetableContext(timetableId, schoolId);

  const assignment = context.assignments.find((a) => a.id === swap.slotId);
  if (!assignment) {
    return { ok: false, reason: 'Slot not found' };
  }

  const existing = context.assignments.filter((a) => a.id !== swap.slotId);

  const proposed = {
    ...assignment,
    dayOfWeek: swap.newDay,
    periodNumber: swap.newPeriod,
    day: swap.newDay,
    period: swap.newPeriod,
  };

  const teacherConfig = context.resolvers.getTeacherConfig(proposed.teacherId) || {};

  const result = hardConstraints.checkAll(proposed, existing, context.schoolConfig, teacherConfig);

  return {
    ...result,
    oldDay: assignment.dayOfWeek || assignment.day,
    oldPeriod: assignment.periodNumber || assignment.period,
  };
}
