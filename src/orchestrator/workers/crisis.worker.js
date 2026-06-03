// orchestrator/workers/crisis.worker.js — RESQID
// Handles crisis management: teacher substitution, room reassignment.

import { Worker } from 'bullmq';
import { getQueueConnection } from '../queues/queue.connection.js';
import { QUEUE_NAMES } from '../queues/queue.names.js';
import { handleCrisis } from '#modules/m1-timetable-main/crisis/crisis.service.js';
import { crisisRepository } from '#modules/m1-timetable-main/crisis/crisis.repository.js';
import { timetableRepository } from '#modules/m1-timetable-main/timetable.repository.js';
import { publishCrisis } from '../events/event.publisher.js';
import { EVENTS } from '../events/event.types.js';
import { ENV } from '#config/env.js';
import { logger } from '#config/logger.js';

/**
 * Start the crisis handling worker.
 */
export const startCrisisWorker = () => {
  const worker = new Worker(
    QUEUE_NAMES.CRISIS_HANDLING,
    async (job) => {
      const { schoolId, type, payload, crisisEventId } = job.data;
      const jobId = job.id;

      logger.info({ jobId, schoolId, type, crisisEventId }, '[crisis.worker] Handling crisis');

      // Update job status
      await timetableRepository.updateJobStatus(jobId, 'PROCESSING', {
        statusMessage: `Processing ${type}...`,
        progressPercent: 10,
      });

      try {
        // Handle the crisis
        const result = await handleCrisis(schoolId, type, payload);

        // Update crisis event
        if (crisisEventId) {
          await crisisRepository.updateCrisisStatus(
            crisisEventId,
            result.success ? 'RESOLVED' : 'PARTIALLY_RESOLVED',
            {
              resolvedAt: new Date(),
              resolution: result,
              unresolvedSlots: result.unresolved?.length || 0,
              substitutionsCreated: result.substitutionsCreated || result.replaced?.length || 0,
            }
          );
        }

        // Update job status
        await timetableRepository.updateJobStatus(jobId, 'COMPLETED', {
          statusMessage: result.message,
          progressPercent: 100,
          output: result,
        });

        // Publish event
        await publishCrisis({
          type: result.success ? EVENTS.CRISIS_RESOLVED : EVENTS.CRISIS_FAILED,
          schoolId,
          teacherId: payload.teacherId,
          roomId: payload.roomId,
          timetableId: payload.timetableId,
        });

        logger.info(
          {
            jobId,
            success: result.success,
            replaced: result.replaced?.length || 0,
            unresolved: result.unresolved?.length || 0,
          },
          '[crisis.worker] Crisis handled'
        );

        return result;
      } catch (error) {
        logger.error(
          { jobId, type, error: error.message, stack: error.stack },
          '[crisis.worker] Crisis handling failed'
        );

        // Update crisis event as failed
        if (crisisEventId) {
          await crisisRepository.updateCrisisStatus(crisisEventId, 'UNRESOLVED', {
            resolution: { error: error.message },
          });
        }

        await timetableRepository.updateJobStatus(jobId, 'FAILED', {
          statusMessage: `Crisis handling failed: ${error.message}`,
          error: error.message,
        });

        await publishCrisis({
          type: EVENTS.CRISIS_FAILED,
          schoolId,
        });

        throw error;
      }
    },
    {
      connection: getQueueConnection(),
      concurrency: ENV.TIMETABLE_CRISIS_CONCURRENCY || 5,
      lockDuration: 120000,
      stalledInterval: 15000,
    }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, '[crisis.worker] Crisis resolved');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, '[crisis.worker] Crisis failed');
  });

  logger.info('[crisis.worker] Worker started');
  return worker;
};

/**
 * Stop the crisis worker.
 */
export const stopCrisisWorker = async (worker) => {
  if (worker) {
    await worker.close();
    logger.info('[crisis.worker] Worker stopped');
  }
};
