/**
 * timetable.service.js
 * Orchestrates timetable operations.
 * All heavy work goes to the queue — no blocking HTTP.
 */

import { nanoid } from 'nanoid';
import { enqueueGenerate, enqueueValidate, getJobState } from './queue';
import { getWellnessMap } from './wellness/wellness.service';
import timetableRepository from './timetable.repository';
import * as templateService from './templates/template.service';

/**
 * Start a generate job. Returns jobId immediately.
 */
export async function startGenerate(schoolId, templateId, opts = {}) {
  const template = await templateService.getTemplate(templateId, schoolId);
  if (!template) throw Object.assign(new Error('Template not found'), { status: 404 });

  const jobId = nanoid();
  await timetableRepository.createJobRecord(jobId, 'generate', schoolId);
  await enqueueGenerate({ jobId, templateId, schoolId, opts });

  return { jobId };
}

/**
 * Start a validate job on an existing timetable. Returns jobId.
 */
export async function startValidate(schoolId, timetableId) {
  const exists = await timetableRepository.findTimetable(timetableId, schoolId);
  if (!exists) throw Object.assign(new Error('Timetable not found'), { status: 404 });

  const jobId = nanoid();
  await timetableRepository.createJobRecord(jobId, 'validate', schoolId);
  await enqueueValidate({ jobId, timetableId, schoolId });

  return { jobId };
}

/**
 * Get job status (polling endpoint).
 */
export async function getJobStatus(jobId, queueName, schoolId) {
  const record = await timetableRepository.getJobRecord(jobId);
  if (!record || record.schoolId !== schoolId) {
    throw Object.assign(new Error('Job not found'), { status: 404 });
  }
  return record;
}

/**
 * Load a completed timetable.
 */
export async function getTimetable(timetableId, schoolId) {
  const tt = await timetableRepository.findTimetable(timetableId, schoolId);
  if (!tt) throw Object.assign(new Error('Timetable not found'), { status: 404 });
  return tt;
}

/**
 * List all timetables for a school.
 */
export async function listTimetables(schoolId) {
  return timetableRepository.findAllBySchool(schoolId);
}

/**
 * Delete a timetable.
 */
export async function deleteTimetable(timetableId, schoolId) {
  await getTimetable(timetableId, schoolId);
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
      }
    } catch (err) {
      send('error', { message: err.message });
      clearInterval(interval);
      res.end();
    }
  }, 2000);

  res.on('close', () => clearInterval(interval));
}
