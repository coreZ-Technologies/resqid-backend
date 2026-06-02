// =============================================================================
// orchestrator/workers/swap.worker.js — RESQID
// Handles manual slot swaps and reassignments.
// =============================================================================

import { Worker } from 'bullmq';
import { getQueueConnection } from '../queues/queue.connection.js';
import { QUEUE_NAMES } from '../queues/queue.names.js';
import { timetableRepository } from '#modules/m1-timetable-main/timetable.repository.js';
import * as hardConstraints from '#modules/m1-timetable-main/constraints/hard.js';
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

      logger.info({ jobId, swaps: swaps?.length }, '[swap.worker] Processing swaps');

      await timetableRepository.updateJobStatus(jobId, 'PROCESSING', {
        statusMessage: `Processing ${swaps?.length || 0} swap(s)...`,
        progressPercent: 0,
      });

      try {
        const results = [];
        const errors = [];

        for (let i = 0; i < swaps.length; i++) {
          const swap = swaps[i];

          // Validate the swap
          const validation = await validateSwap(swap, timetableId, schoolId);

          if (!validation.ok) {
            errors.push({ slotId: swap.slotId, reason: validation.reason });
            continue;
          }

          // Apply the swap
          await timetableRepository.moveSlot(swap.slotId, swap.newDay, swap.newPeriod);

          results.push({ slotId: swap.slotId, moved: true });

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

        return summary;
      } catch (error) {
        logger.error({ jobId, error: error.message }, '[swap.worker] Swap failed');

        await timetableRepository.updateJobStatus(jobId, 'FAILED', {
          error: error.message,
        });

        throw error;
      }
    },
    {
      connection: getQueueConnection(),
      concurrency: 3,
      lockDuration: 30000,
    }
  );

  return worker;
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

  return hardConstraints.checkAll(proposed, existing, context.schoolConfig, teacherConfig);
}
