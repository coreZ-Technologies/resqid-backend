// orchestrator/workers/bulkUpload.worker.js — RESQID
// Processes bulk Excel/CSV uploads for teachers, classes, rooms, timetable.

import { Worker } from 'bullmq';
import { getQueueConnection } from '../queues/queue.connection.js';
import { QUEUE_NAMES } from '../queues/queue.names.js';
import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';
import { ENV } from '#config/env.js';

/**
 * Start the bulk upload worker.
 */
export const startBulkUploadWorker = () => {
  const worker = new Worker(
    QUEUE_NAMES.TIMETABLE_BULK_UPLOAD,
    async (job) => {
      const { schoolId, uploadType, filePath, uploadId } = job.data;
      const jobId = job.id;

      logger.info({ jobId, uploadType, schoolId }, '[bulkUpload.worker] Processing upload');

      try {
        // Update upload status
        await prisma.bulkUpload.update({
          where: { id: uploadId },
          data: { status: 'PROCESSING', processedRows: 0 },
        });

        let result;

        switch (uploadType) {
          case 'TEACHERS':
            result = await processTeacherUpload(schoolId, filePath, uploadId);
            break;
          case 'CLASSES':
            result = await processClassUpload(schoolId, filePath, uploadId);
            break;
          case 'SUBJECTS':
            result = await processSubjectUpload(schoolId, filePath, uploadId);
            break;
          case 'ROOMS':
            result = await processRoomUpload(schoolId, filePath, uploadId);
            break;
          case 'TIMETABLE':
            result = await processTimetableUpload(schoolId, filePath, uploadId);
            break;
          default:
            throw new Error(`Unknown upload type: ${uploadType}`);
        }

        // Update upload as completed
        await prisma.bulkUpload.update({
          where: { id: uploadId },
          data: {
            status: 'COMPLETED',
            processedRows: result.processed || 0,
            errorRows: result.errors?.length || 0,
            errors: result.errors || [],
            warnings: result.warnings || [],
            created: result.created || 0,
            updated: result.updated || 0,
            completedAt: new Date(),
          },
        });

        logger.info(
          { jobId, uploadType, created: result.created, errors: result.errors?.length },
          '[bulkUpload.worker] Upload processed successfully'
        );
        return result;
      } catch (error) {
        logger.error(
          { jobId, uploadType, error: error.message, stack: error.stack },
          '[bulkUpload.worker] Upload failed'
        );

        await prisma.bulkUpload.update({
          where: { id: uploadId },
          data: {
            status: 'FAILED',
            errors: [{ message: error.message }],
          },
        });

        throw error;
      }
    },
    {
      connection: getQueueConnection(),
      concurrency: ENV.TIMETABLE_BULK_CONCURRENCY || 2,
      lockDuration: 300000,
      stalledInterval: 30000,
    }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, '[bulkUpload.worker] Job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, '[bulkUpload.worker] Job failed');
  });

  logger.info('[bulkUpload.worker] Worker started');
  return worker;
};

/**
 * Stop the bulk upload worker.
 */
export const stopBulkUploadWorker = async (worker) => {
  if (worker) {
    await worker.close();
    logger.info('[bulkUpload.worker] Worker stopped');
  }
};

// UPLOAD PROCESSORS

/**
 * Process teacher bulk upload.
 * Expected columns: firstName, lastName, email, phone, subjects, qualification, etc.
 */
async function processTeacherUpload(schoolId, filePath, uploadId) {
  logger.info({ schoolId, filePath }, '[bulkUpload] Processing teacher upload');

  // TODO: Implement Excel parsing
  // const rows = await parseExcelFile(filePath);
  const rows = [];
  const errors = [];
  const warnings = [];
  let created = 0;
  let updated = 0;

  // for (const [index, row] of rows.entries()) {
  //   try {
  //     // Validate row
  //     if (!row.firstName || !row.email) {
  //       errors.push({ row: index + 1, message: 'Missing required fields' });
  //       continue;
  //     }
  //
  //     // Upsert teacher
  //     await prisma.teacher.upsert({
  //       where: { email: row.email },
  //       create: {
  //         schoolId,
  //         name: `${row.firstName} ${row.lastName || ''}`.trim(),
  //         email: row.email,
  //         phone: row.phone,
  //         subjects: row.subjects?.split(',').map(s => s.trim()) || [],
  //         qualifications: row.qualification ? [row.qualification] : [],
  //         maxPeriodsPerDay: row.maxPeriodsPerDay || 6,
  //         maxPeriodsPerWeek: row.maxPeriodsPerWeek || 30,
  //         isPartTime: row.isPartTime === 'true',
  //         employeeId: row.employeeId,
  //       },
  //       update: {
  //         name: `${row.firstName} ${row.lastName || ''}`.trim(),
  //         phone: row.phone,
  //         subjects: row.subjects?.split(',').map(s => s.trim()) || [],
  //       },
  //     });
  //     created++;
  //   } catch (err) {
  //     errors.push({ row: index + 1, message: err.message });
  //   }
  // }

  return {
    processed: rows.length,
    created,
    updated,
    errors,
    warnings,
  };
}

/**
 * Process class bulk upload.
 */
async function processClassUpload(schoolId, filePath, uploadId) {
  logger.info({ schoolId, filePath }, '[bulkUpload] Processing class upload');
  return { processed: 0, created: 0, updated: 0, errors: [] };
}

/**
 * Process subject bulk upload.
 */
async function processSubjectUpload(schoolId, filePath, uploadId) {
  logger.info({ schoolId, filePath }, '[bulkUpload] Processing subject upload');
  return { processed: 0, created: 0, updated: 0, errors: [] };
}

/**
 * Process room bulk upload.
 */
async function processRoomUpload(schoolId, filePath, uploadId) {
  logger.info({ schoolId, filePath }, '[bulkUpload] Processing room upload');
  return { processed: 0, created: 0, updated: 0, errors: [] };
}

/**
 * Process timetable bulk upload (existing timetable import).
 */
async function processTimetableUpload(schoolId, filePath, uploadId) {
  logger.info({ schoolId, filePath }, '[bulkUpload] Processing timetable upload');
  return { processed: 0, created: 0, updated: 0, errors: [] };
}
