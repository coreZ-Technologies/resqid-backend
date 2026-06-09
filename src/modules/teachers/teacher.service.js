// src/modules/teachers/teacher.service.js
import { teacherRepository } from './teacher.repository.js';
import { ApiError } from '#shared/response/ApiError.js';
import { hashPassword } from '#shared/security/hashUtil.js';
import { logger } from '#config/logger.js';
import { nanoid } from 'nanoid';
import { enqueueBulkUpload } from '#orchestrator/queues/queue.config.js';
import { prisma } from '#config/prisma.js';

export const teacherService = {
  // ─── Dropdown Options ──────────────────────────────────────────────────

  async getDropdownOptions(schoolId) {
    return teacherRepository.getDropdownOptions(schoolId);
  },

  // ─── Email / Phone Check ───────────────────────────────────────────────

  async checkEmailAvailability(schoolId, email) {
    const available = await teacherRepository.isEmailAvailable(email, schoolId);
    return { available };
  },

  async checkPhoneAvailability(schoolId, phone) {
    const available = await teacherRepository.isPhoneAvailable(phone, schoolId);
    return { available };
  },

  // ─── Create ─────────────────────────────────────────────────────────────

  async create(schoolId, data) {
    // Check email availability
    const emailAvailable = await teacherRepository.isEmailAvailable(data.email, schoolId);
    if (!emailAvailable) {
      throw ApiError.conflict('Email address is already registered');
    }

    // Check phone availability
    const phoneAvailable = await teacherRepository.isPhoneAvailable(data.phone, schoolId);
    if (!phoneAvailable) {
      throw ApiError.conflict('Phone number is already registered');
    }

    // Check employeeId uniqueness if provided
    if (data.employeeId) {
      const existingEmp = await prisma.teacher.findFirst({
        where: { schoolId, employeeId: data.employeeId },
        select: { id: true },
      });
      if (existingEmp) {
        throw ApiError.conflict('Employee ID already exists');
      }
    }

    // Validate assigned classes exist
    const classGroups = await prisma.classGroup.findMany({
      where: { schoolId, isActive: true },
      select: { grade: true, section: true },
    });

    const validClassNames = new Set(classGroups.map((c) => `Class ${c.grade}-${c.section}`));
    const invalidClasses = data.assignedClasses.filter((name) => !validClassNames.has(name));

    if (invalidClasses.length > 0) {
      throw ApiError.notFound(`Classes not found: ${invalidClasses.join(', ')}`);
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create teacher with hashed password
    const result = await teacherRepository.create(schoolId, {
      ...data,
      password: hashedPassword,
    });

    logger.info({ schoolId, teacherId: result.id, email: data.email }, '[teacher] Created');

    return {
      id: result.id,
      message: 'Teacher created successfully',
    };
  },

  // ─── List ───────────────────────────────────────────────────────────────

  async list(schoolId, query) {
    const { teachers, total, page, limit } = await teacherRepository.findAll(schoolId, query);

    return {
      teachers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    };
  },

  // ─── Single ─────────────────────────────────────────────────────────────

  async getOne(id, schoolId) {
    const teacher = await teacherRepository.findById(id, schoolId);
    if (!teacher) throw ApiError.notFound('Teacher not found');
    return teacher;
  },

  // ─── Update ─────────────────────────────────────────────────────────────

  async update(id, schoolId, data) {
    const existing = await teacherRepository.findById(id, schoolId);
    if (!existing) throw ApiError.notFound('Teacher not found');

    // Check email uniqueness if changed
    if (data.email && data.email !== existing.email) {
      const available = await teacherRepository.isEmailAvailable(data.email, schoolId, id);
      if (!available) throw ApiError.conflict('Email address is already registered');
    }

    // Check phone uniqueness if changed
    if (data.phone && data.phone !== existing.phone) {
      const available = await teacherRepository.isPhoneAvailable(data.phone, schoolId, id);
      if (!available) throw ApiError.conflict('Phone number is already registered');
    }

    // Check employeeId uniqueness if changed
    if (data.employeeId && data.employeeId !== existing.employeeId) {
      const existingEmp = await prisma.teacher.findFirst({
        where: { schoolId, employeeId: data.employeeId, id: { not: id } },
        select: { id: true },
      });
      if (existingEmp) throw ApiError.conflict('Employee ID already exists');
    }

    const result = await teacherRepository.update(id, schoolId, data);
    logger.info({ teacherId: id }, '[teacher] Updated');
    return result;
  },

  // ─── Delete ─────────────────────────────────────────────────────────────

  async remove(id, schoolId) {
    const existing = await teacherRepository.findById(id, schoolId);
    if (!existing) throw ApiError.notFound('Teacher not found');

    try {
      await teacherRepository.remove(id, schoolId);
      logger.info({ teacherId: id }, '[teacher] Deactivated');
    } catch (err) {
      throw ApiError.conflict(err.message);
    }
  },

  // ─── Export ─────────────────────────────────────────────────────────────

  async exportTeachers(schoolId, query) {
    return teacherRepository.findAllForExport(schoolId, query);
  },

  // ─── Bulk Upload ────────────────────────────────────────────────────────

  async startBulkUpload(schoolId, filePath, fileName, uploadedBy) {
    const upload = await prisma.bulkUpload.create({
      data: {
        schoolId,
        uploadType: 'TEACHERS',
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
      uploadType: 'TEACHERS',
      filePath,
      uploadId: upload.id,
    });

    logger.info({ schoolId, jobId, fileName }, '[teacher] Bulk upload queued');

    return {
      jobId,
      uploadId: upload.id,
      message: 'Teacher bulk upload queued',
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
