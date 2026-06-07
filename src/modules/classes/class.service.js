// src/modules/classes/class.service.js
import { classRepository } from './class.repository.js';
import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';
import { nanoid } from 'nanoid';
import { enqueueBulkUpload } from '#orchestrator/queues/queue.config.js';
import { prisma } from '#config/prisma.js';

export const classService = {
  async getStats(schoolId) {
    return classRepository.getStats(schoolId);
  },

  async list(schoolId, query) {
    const { classes, total, limit, offset } = await classRepository.findAll(schoolId, query);
    return {
      classes,
      pagination: { total, limit, offset },
    };
  },

  async getOne(id, schoolId) {
    const classGroup = await classRepository.findById(id, schoolId);
    if (!classGroup) throw ApiError.notFound('Class not found');
    return classGroup;
  },

  async create(schoolId, data) {
    // Check for duplicate class (same grade + section)
    const { prisma: db } = await import('#config/prisma.js');
    const existing = await db.classGroup.findFirst({
      where: { schoolId, grade: data.grade, section: data.section },
    });

    if (existing) {
      throw ApiError.conflict(`Class ${data.grade}-${data.section} already exists`);
    }

    const result = await classRepository.create(schoolId, data);
    logger.info({ schoolId, grade: data.grade, section: data.section }, '[class] Created');
    return result;
  },

  async update(id, schoolId, data) {
    const existing = await classRepository.findById(id, schoolId);
    if (!existing) throw ApiError.notFound('Class not found');

    // Check for duplicate if grade/section changed
    if (data.grade || data.section) {
      const newGrade = data.grade || existing.grade;
      const newSection = data.section || existing.section;

      if (newGrade !== existing.grade || newSection !== existing.section) {
        const { prisma: db } = await import('#config/prisma.js');
        const duplicate = await db.classGroup.findFirst({
          where: {
            schoolId,
            grade: newGrade,
            section: newSection,
            id: { not: id },
          },
        });

        if (duplicate) {
          throw ApiError.conflict(`Class ${newGrade}-${newSection} already exists`);
        }
      }
    }

    const result = await classRepository.update(id, schoolId, data);
    logger.info({ classId: id }, '[class] Updated');
    return result;
  },

  async remove(id, schoolId) {
    const existing = await classRepository.findById(id, schoolId);
    if (!existing) throw ApiError.notFound('Class not found');

    try {
      await classRepository.remove(id, schoolId);
      logger.info({ classId: id }, '[class] Deleted');
    } catch (err) {
      throw ApiError.badRequest(err.message);
    }
  },

  async getFilterOptions() {
    return classRepository.getFilterOptions();
  },

  async exportClasses(schoolId, query) {
    return classRepository.findAllForExport(schoolId, query);
  },

  // ─── Bulk Upload (Queue-based) ──────────────────────────────────────────

  async startBulkUpload(schoolId, filePath, fileName, uploadedBy) {
    // Create bulk upload record
    const upload = await prisma.bulkUpload.create({
      data: {
        schoolId,
        uploadType: 'CLASSES',
        fileName,
        status: 'PENDING',
        uploadedBy,
        uploadedAt: new Date(),
      },
    });

    // Enqueue to BullMQ
    const jobId = nanoid();
    await enqueueBulkUpload({
      jobId,
      schoolId,
      uploadType: 'CLASSES',
      filePath,
      uploadId: upload.id,
    });

    logger.info({ schoolId, jobId, fileName }, '[class] Bulk upload queued');

    return {
      jobId,
      uploadId: upload.id,
      message: 'Class bulk upload queued',
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
