// =============================================================================
// orchestrator/workers/validate.worker.js — RESQID
// Validates existing timetables and generates reports.
// =============================================================================

import { Worker } from 'bullmq';
import { getQueueConnection } from '../queues/queue.connection.js';
import { QUEUE_NAMES } from '../queues/queue.names.js';
import { validateAndSuggest } from '#modules/m1-timetable-main/solver/scheduler.js';
import { timetableRepository } from '#modules/m1-timetable-main/timetable.repository.js';
import { publishTimetableValidate } from '../events/event.publisher.js';
import { logger } from '#config/logger.js';

/**
 * Start the timetable validation worker.
 */
export const startValidateWorker = () => {
  const worker = new Worker(
    QUEUE_NAMES.TIMETABLE_VALIDATE,
    async (job) => {
      const { timetableId, schoolId } = job.data;
      const jobId = job.id;

      logger.info({ jobId, timetableId, schoolId }, '[validate.worker] Starting validation');

      await timetableRepository.updateJobStatus(jobId, 'PROCESSING', {
        statusMessage: 'Loading timetable...',
        progressPercent: 0,
      });

      await publishTimetableValidate({ status: 'started', schoolId, timetableId });

      try {
        // Load timetable with context
        const context = await timetableRepository.loadTimetableContext(timetableId, schoolId);

        if (!context) {
          throw new Error('Timetable not found');
        }

        await timetableRepository.updateJobStatus(jobId, 'PROCESSING', {
          statusMessage: 'Validating assignments...',
          progressPercent: 30,
        });

        // Run validation
        const validationResult = await validateAndSuggest(
          context.assignments,
          context.template,
          context.schoolConfig,
          context.resolvers
        );

        await timetableRepository.updateJobStatus(jobId, 'PROCESSING', {
          statusMessage: 'Saving validation report...',
          progressPercent: 80,
        });

        // Save validation report
        await timetableRepository.saveValidationReport(timetableId, validationResult);

        // Update job status
        await timetableRepository.updateJobStatus(jobId, 'COMPLETED', {
          statusMessage: 'Validation complete',
          progressPercent: 100,
          output: {
            score: validationResult.score,
            violations: validationResult.violations?.length || 0,
            warnings: validationResult.warnings?.length || 0,
            suggestions: validationResult.suggestions?.length || 0,
          },
        });

        await publishTimetableValidate({
          status: 'completed',
          schoolId,
          timetableId,
          score: validationResult.score,
        });

        logger.info(
          { jobId, score: validationResult.score },
          '[validate.worker] Validation complete'
        );

        return validationResult;
      } catch (error) {
        logger.error({ jobId, error: error.message }, '[validate.worker] Validation failed');

        await timetableRepository.updateJobStatus(jobId, 'FAILED', {
          statusMessage: `Validation failed: ${error.message}`,
          error: error.message,
        });

        await publishTimetableValidate({ status: 'failed', schoolId, timetableId });

        throw error;
      }
    },
    {
      connection: getQueueConnection(),
      concurrency: 3,
      lockDuration: 60000,
      stalledInterval: 15000,
    }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, '[validate.worker] Validation job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, '[validate.worker] Validation job failed');
  });

  logger.info('[validate.worker] Worker started');
  return worker;
};
