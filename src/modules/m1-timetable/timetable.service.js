/**
 * Timetable service — business logic & orchestration.
 */

import { nanoid } from 'nanoid';
import { enqueueGenerate, enqueueValidate } from '#orchestrator/queues/queue.config.js';
import { timetableRepository } from './timetable.repository.js';
import { templateService } from '../templates/template.service.js';
import { ApiError } from '#shared/response/ApiError.js';

export const timetableService = {
  /**
   * Start a generate job. Returns jobId immediately.
   */
  async startGenerate(schoolId, templateId, opts = {}) {
    // Verify template exists
    const template = await templateService.getTemplate(templateId, schoolId);
    if (!template) throw new ApiError(404, 'Template not found');

    const jobId = nanoid();
    await timetableRepository.createJobRecord(jobId, 'GENERATE_TIMETABLE', schoolId);
    await enqueueGenerate({ jobId, templateId, schoolId, opts });

    return {
      jobId,
      message: 'Timetable generation queued',
      estimatedTime: '30-120 seconds depending on school size',
    };
  },

  /**
   * Start a validate job on an existing timetable.
   */
  async startValidate(schoolId, timetableId) {
    const timetable = await timetableRepository.findById(timetableId, schoolId);
    if (!timetable) throw new ApiError(404, 'Timetable not found');

    const jobId = nanoid();
    await timetableRepository.createJobRecord(jobId, 'VALIDATE_TIMETABLE', schoolId);
    await enqueueValidate({ jobId, timetableId, schoolId });

    return {
      jobId,
      message: 'Validation queued',
      estimatedTime: '10-30 seconds',
    };
  },

  /**
   * Upload an existing timetable for validation.
   */
  async uploadExisting(schoolId, templateId, assignments) {
    const template = await templateService.getTemplate(templateId, schoolId);
    if (!template) throw new ApiError(404, 'Template not found');

    // Save as draft timetable
    const timetable = await timetableRepository.saveTimetable({
      schoolId,
      templateId,
      assignments: assignments.map((a) => ({
        day: a.day,
        period: a.period,
        classId: a.classId,
        subjectId: a.subjectId,
        teacherId: a.teacherId,
        roomId: a.roomId,
        periodType: a.periodType || 'REGULAR',
        notes: a.notes,
      })),
      generationType: 'MANUAL',
      meta: { source: 'upload' },
    });

    // Auto-validate the uploaded timetable
    const jobId = nanoid();
    await timetableRepository.createJobRecord(jobId, 'VALIDATE_TIMETABLE', schoolId);
    await enqueueValidate({ jobId, timetableId: timetable.id, schoolId });

    return {
      timetableId: timetable.id,
      jobId,
      message: 'Timetable uploaded and validation queued',
    };
  },

  /**
   * Get job status.
   */
  async getJobStatus(jobId, queueName, schoolId) {
    const record = await timetableRepository.getJobRecord(jobId);
    if (!record || record.schoolId !== schoolId) {
      throw new ApiError(404, 'Job not found');
    }
    return record;
  },

  /**
   * Get a timetable by ID.
   */
  async getTimetable(timetableId, schoolId) {
    const timetable = await timetableRepository.findById(timetableId, schoolId);
    if (!timetable) throw new ApiError(404, 'Timetable not found');
    return timetable;
  },

  /**
   * List timetables for a school.
   */
  async listTimetables(schoolId, filters = {}) {
    return timetableRepository.findAllBySchool(schoolId, filters);
  },

  /**
   * Update timetable status.
   */
  async updateTimetableStatus(timetableId, schoolId, status) {
    await this.getTimetable(timetableId, schoolId);
    return timetableRepository.updateStatus(timetableId, status);
  },

  /**
   * Delete a timetable.
   */
  async deleteTimetable(timetableId, schoolId) {
    await this.getTimetable(timetableId, schoolId);
    return timetableRepository.remove(timetableId);
  },

  /**
   * SSE stream for job progress.
   */
  streamJobProgress(jobId, schoolId, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const send = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    let interval;
    let closed = false;

    const cleanup = () => {
      if (interval) clearInterval(interval);
      if (!closed) {
        closed = true;
        res.end();
      }
    };

    interval = setInterval(async () => {
      try {
        const record = await timetableRepository.getJobRecord(jobId);

        if (!record || record.schoolId !== schoolId) {
          send('error', { message: 'Job not found' });
          cleanup();
          return;
        }

        send('status', {
          jobId: record.id,
          status: record.status,
          progress: record.progressPercent,
          message: record.statusMessage,
        });

        if (record.status === 'COMPLETED' || record.status === 'FAILED') {
          if (record.output) send('result', record.output);
          cleanup();
        }
      } catch (err) {
        send('error', { message: err.message });
        cleanup();
      }
    }, 2000);

    res.on('close', cleanup);
    res.on('error', cleanup);
  },
};
