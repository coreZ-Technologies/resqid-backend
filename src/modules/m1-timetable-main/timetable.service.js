/**
 * timetable.service.js
 * Orchestrates timetable operations.
 * All heavy work goes to the queue — no blocking HTTP.
 */

import { nanoid } from 'nanoid';
import { enqueueGenerate, enqueueValidate, getJobState } from './queue.js';
import { getWellnessMap } from './wellness/wellness.service.js';
import * as timetableRepository from './timetable.repository.js';
import * as templateService from './templates/template.service.js';
import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';

/**
 * Start a generate job. Returns jobId immediately.
 */
export async function startGenerate(schoolId, templateId, opts = {}) {
  const template = await templateService.getTemplate(templateId, schoolId);
  if (!template) {
    throw ApiError.notFound('Template not found');
  }

  const jobId = nanoid();
  await timetableRepository.createJobRecord(jobId, 'generate', schoolId);
  await enqueueGenerate({ jobId, templateId, schoolId, opts });

  logger.info({ jobId, templateId, schoolId, opts }, 'Generate job queued');

  return { jobId };
}

/**
 * Start a validate job on an existing timetable. Returns jobId.
 */
export async function startValidate(schoolId, timetableId) {
  const exists = await timetableRepository.findTimetable(timetableId, schoolId);
  if (!exists) {
    throw ApiError.notFound('Timetable not found');
  }

  const jobId = nanoid();
  await timetableRepository.createJobRecord(jobId, 'validate', schoolId);
  await enqueueValidate({ jobId, timetableId, schoolId });

  logger.info({ jobId, timetableId, schoolId }, 'Validate job queued');

  return { jobId };
}

/**
 * Get job status (polling endpoint).
 */
export async function getJobStatus(jobId, queueName, schoolId) {
  const record = await timetableRepository.getJobRecord(jobId);
  
  if (!record || record.schoolId !== schoolId) {
    throw ApiError.notFound('Job not found');
  }
  
  return record;
}

/**
 * Load a completed timetable.
 */
export async function getTimetable(timetableId, schoolId) {
  const tt = await timetableRepository.findTimetable(timetableId, schoolId);
  if (!tt) {
    throw ApiError.notFound('Timetable not found');
  }
  
  return tt;
}

/**
 * List all timetables for a school.
 */
export async function listTimetables(schoolId) {
  logger.debug({ schoolId }, 'Listing timetables');
  return timetableRepository.findAllBySchool(schoolId);
}

/**
 * Delete a timetable.
 */
export async function deleteTimetable(timetableId, schoolId) {
  await getTimetable(timetableId, schoolId);
  
  logger.info({ timetableId, schoolId }, 'Deleting timetable');
  
  return timetableRepository.removeTimetable(timetableId);
}

/**
 * SSE stream for job progress.
 * Polls the job record every 2s and writes events.
 */
export function streamJobProgress(jobId, schoolId, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const interval = setInterval(async () => {
    try {
      const record = await timetableRepository.getJobRecord(jobId);
      
      if (!record || record.schoolId !== schoolId) {
        send('error', { message: 'Job not found' });
        clearInterval(interval);
        res.end();
        return;
      }

      send('status', record);

      if (record.status === 'done' || record.status === 'failed') {
        clearInterval(interval);
        res.end();
        
        // Log completion
        if (record.status === 'done') {
          logger.info({ jobId, schoolId }, 'Job completed successfully');
        } else {
          logger.warn({ jobId, schoolId, error: record.error }, 'Job failed');
        }
      }
    } catch (err) {
      logger.error({ error: err.message, jobId, schoolId }, 'Stream job progress error');
      send('error', { message: err.message });
      clearInterval(interval);
      res.end();
    }
  }, 2000);

  res.on('close', () => {
    clearInterval(interval);
    logger.debug({ jobId, schoolId }, 'SSE stream closed');
  });
}