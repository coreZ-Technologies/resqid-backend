// src/modules/subjects/subject.service.js
import { subjectRepository } from './subject.repository.js';
import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';
import { nanoid } from 'nanoid';
import { enqueueBulkUpload } from '#orchestrator/queues/queue.config.js';
import { prisma } from '#config/prisma.js';

export const subjectService = {
  async getStats(schoolId) {
    return subjectRepository.getStats(schoolId);
  },

  async list(schoolId, query) {
    const { subjects, total, page, limit } = await subjectRepository.findAll(schoolId, query);

    return {
      subjects,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    };
  },

  async getOne(id, schoolId) {
    const subject = await subjectRepository.findById(id, schoolId);
    if (!subject) throw ApiError.notFound('Subject not found');
    return subject;
  },

  async create(schoolId, data) {
    // Check for duplicates
    const duplicate = await subjectRepository.findDuplicate(schoolId, data.name, data.code);
    if (duplicate) {
      if (duplicate.code.toUpperCase() === data.code.toUpperCase()) {
        throw ApiError.conflict(`Subject code "${data.code}" already exists`);
      }
      throw ApiError.conflict(`Subject name "${data.name}" already exists`);
    }

    const result = await subjectRepository.create(schoolId, data);
    logger.info({ schoolId, name: data.name, code: data.code }, '[subject] Created');
    return result;
  },

  async update(id, schoolId, data) {
    const existing = await subjectRepository.findById(id, schoolId);
    if (!existing) throw ApiError.notFound('Subject not found');

    // Check for duplicates if name/code changed
    if (data.name || data.code) {
      const duplicate = await subjectRepository.findDuplicate(
        schoolId,
        data.name || existing.name,
        data.code || existing.code,
        id
      );
      if (duplicate) {
        if (data.code && duplicate.code.toUpperCase() === data.code.toUpperCase()) {
          throw ApiError.conflict(`Subject code "${data.code}" already exists`);
        }
        throw ApiError.conflict(`Subject name "${data.name}" already exists`);
      }
    }

    const result = await subjectRepository.update(id, schoolId, data);
    logger.info({ subjectId: id }, '[subject] Updated');
    return result;
  },

  async remove(id, schoolId) {
    const existing = await subjectRepository.findById(id, schoolId);
    if (!existing) throw ApiError.notFound('Subject not found');

    try {
      await subjectRepository.remove(id, schoolId);
      logger.info({ subjectId: id }, '[subject] Deleted');
    } catch (err) {
      throw ApiError.conflict(err.message);
    }
  },

  async getFilterOptions() {
    return subjectRepository.getFilterOptions();
  },

  async exportSubjects(schoolId, query) {
    return subjectRepository.findAllForExport(schoolId, query);
  },

  // ─── Bulk Upload (Queue-based) ──────────────────────────────────────────

  async startBulkUpload(schoolId, filePath, fileName, uploadedBy) {
    const upload = await prisma.bulkUpload.create({
      data: {
        schoolId,
        uploadType: 'SUBJECTS',
        fileName,
        status: 'PENDING',
        uploadedBy,
        uploadedAt: new Date(),
      },
    });

    const jobId = nanoid();
    await enqueueBulkUpload({
      jobId,
      schoolId,
      uploadType: 'SUBJECTS',
      filePath,
      uploadId: upload.id,
    });

    logger.info({ schoolId, jobId, fileName }, '[subject] Bulk upload queued');

    return {
      jobId,
      uploadId: upload.id,
      message: 'Subject bulk upload queued',
      estimatedTime: '10-30 seconds depending on file size',
    };
  },

  async getBulkUploadStatus(jobId) {
    const job = await prisma.timetableJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
        progressPercent: true,
        statusMessage: true,
        output: true,
        error: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!job) throw ApiError.notFound('Job not found');

    return {
      jobId: job.id,
      status: job.status,
      progress: job.progressPercent || 0,
      message: job.statusMessage || '',
      result: job.output || null,
      error: job.error || null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  },
};
