// =============================================================================
// orchestrator/workers/generate.worker.js — RESQID
// Handles timetable generation jobs from timetable_generate_queue.
// =============================================================================

import { Worker } from 'bullmq';
import { getQueueConnection } from '../queues/queue.connection.js';
import { QUEUE_NAMES } from '../queues/queue.names.js';
import { generate } from '#modules/m1-timetable-main/solver/scheduler.js';
import { timetableRepository } from '#modules/m1-timetable-main/timetable.repository.js';
import { publishTimetableGenerate } from '../events/event.publisher.js';
import { logger } from '#config/logger.js';

/**
 * Start the timetable generation worker.
 */
export const startGenerateWorker = () => {
  const worker = new Worker(
    QUEUE_NAMES.TIMETABLE_GENERATE,
    async (job) => {
      const { templateId, schoolId, opts = {} } = job.data;
      const jobId = job.id;

      logger.info(
        { jobId, schoolId, templateId },
        '[generate.worker] Starting timetable generation'
      );

      // Update job status
      await timetableRepository.updateJobStatus(jobId, 'PROCESSING', {
        statusMessage: 'Loading template context...',
        progressPercent: 0,
      });

      await publishTimetableGenerate({
        status: 'started',
        schoolId,
        templateId,
      });

      try {
        // Load template context
        const context = await timetableRepository.loadTemplateContext(templateId, schoolId);

        if (!context) {
          throw new Error('Template context not found');
        }

        await timetableRepository.updateJobStatus(jobId, 'PROCESSING', {
          statusMessage: 'Running feasibility checks...',
          progressPercent: 5,
        });

        // Generate timetable
        const result = await generate(context.template, context.schoolConfig, context.resolvers, {
          ...opts,
          mode: opts.mode || 'class-by-class',
          timeoutMs: opts.timeoutMs || 300000,
          onProgress: async (progress) => {
            // Update progress
            const percent = Math.round(progress.progress * 100);
            await timetableRepository.updateJobStatus(jobId, 'PROCESSING', {
              statusMessage: progress.phase || `Generating... ${percent}%`,
              progressPercent: percent,
            });

            await publishTimetableGenerate({
              status: 'progress',
              schoolId,
              templateId,
              progress: progress.progress,
            });
          },
        });

        if (!result.success) {
          throw new Error(result.error || 'Generation failed');
        }

        // Save timetable to database
        const timetable = await timetableRepository.saveTimetable({
          schoolId,
          templateId,
          assignments: result.timetable,
          validation: result.validation,
          meta: result.meta,
          generationType: opts.mode === 'incremental' ? 'INCREMENTAL' : 'FRESH',
        });

        // Update job as completed
        await timetableRepository.updateJobStatus(jobId, 'COMPLETED', {
          statusMessage: 'Timetable generated successfully',
          progressPercent: 100,
          output: {
            timetableId: timetable.id,
            totalSlots: result.timetable.length,
            qualityScore: result.meta?.qualityScore,
            wellnessScore: result.meta?.wellnessScore,
            durationMs: result.meta?.durationMs,
          },
        });

        await publishTimetableGenerate({
          status: 'completed',
          schoolId,
          templateId,
          timetableId: timetable.id,
          progress: 1,
        });

        logger.info(
          { jobId, timetableId: timetable.id, slots: result.timetable.length },
          '[generate.worker] Timetable generated successfully'
        );

        return { success: true, timetableId: timetable.id };
      } catch (error) {
        logger.error(
          { jobId, error: error.message, stack: error.stack },
          '[generate.worker] Generation failed'
        );

        await timetableRepository.updateJobStatus(jobId, 'FAILED', {
          statusMessage: `Generation failed: ${error.message}`,
          error: error.message,
          errorDetails: error.stack,
        });

        await publishTimetableGenerate({
          status: 'failed',
          schoolId,
          templateId,
          progress: 0,
        });

        throw error;
      }
    },
    {
      connection: getQueueConnection(),
      concurrency: 2, // Max 2 concurrent generations
      lockDuration: 300000, // 5 minutes
      stalledInterval: 30000,
    }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, '[generate.worker] Job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, '[generate.worker] Job failed');
  });

  logger.info('[generate.worker] Worker started');
  return worker;
};
