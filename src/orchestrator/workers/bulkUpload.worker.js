// orchestrator/workers/bulkUpload.worker.js — RESQID
//
// Processes bulk CSV/Excel uploads after admin preview & confirm.
// Flow: Upload → Preview → Confirm → Queue → This Worker → DB
//
// Supports: TEACHERS, STUDENTS, CLASSES, SUBJECTS, ROOMS, TIMETABLE

import { Worker } from 'bullmq';
import { getQueueConnection } from '../queues/queue.connection.js';
import { QUEUE_NAMES } from '../queues/queue.names.js';
import { handleDeadJob } from '../dlq/dlq.handler.js';
import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';
import { ENV } from '#config/env.js';

const QUEUE = QUEUE_NAMES.BULK_UPLOAD;

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PROCESSOR
// ═══════════════════════════════════════════════════════════════════════════════

export const processBulkUpload = async (job) => {
  const { schoolId, uploadType, uploadId, rows } = job.data;

  if (!schoolId || !uploadType || !rows?.length) {
    throw new Error('[bulkUpload.worker] Missing schoolId, uploadType, or rows');
  }

  logger.info(
    {
      jobId: job.id,
      uploadId,
      uploadType,
      schoolId,
      rowCount: rows.length,
    },
    '[bulkUpload.worker] Starting processing'
  );

  // Update status to PROCESSING
  await updateUploadStatus(uploadId, 'PROCESSING', 0, rows.length);

  let result;
  const startTime = Date.now();

  switch (uploadType) {
    case 'TEACHERS':
      result = await processTeachers(schoolId, rows, uploadId);
      break;
    case 'STUDENTS':
      result = await processStudents(schoolId, rows, uploadId);
      break;
    case 'CLASSES':
      result = await processClasses(schoolId, rows, uploadId);
      break;
    case 'SUBJECTS':
      result = await processSubjects(schoolId, rows, uploadId);
      break;
    case 'ROOMS':
      result = await processRooms(schoolId, rows, uploadId);
      break;
    default:
      throw new Error(`Unknown upload type: ${uploadType}`);
  }

  const duration = Date.now() - startTime;

  // Final status update
  await updateUploadStatus(uploadId, 'COMPLETED', rows.length, rows.length, {
    ...result,
    durationMs: duration,
  });

  logger.info(
    {
      uploadId,
      uploadType,
      ...result,
      durationMs: duration,
    },
    '[bulkUpload.worker] Complete'
  );

  return result;
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEACHERS
// ═══════════════════════════════════════════════════════════════════════════════

async function processTeachers(schoolId, rows, uploadId) {
  let created = 0,
    updated = 0,
    skipped = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    try {
      // Validate
      if (!row.firstName?.trim() || !row.email?.trim()) {
        errors.push({
          row: rowNum,
          field: 'firstName/email',
          message: 'Name and email are required',
        });
        skipped++;
        continue;
      }

      const teacherData = {
        name: `${row.firstName} ${row.lastName || ''}`.trim(),
        email: row.email.toLowerCase().trim(),
        phone: row.phone || null,
        subjects: parseList(row.subjects),
        qualification: row.qualification || null,
        experience: row.experience || null,
        employeeId: row.employeeId || null,
        joiningDate: row.joiningDate ? new Date(row.joiningDate) : null,
      };

      // Upsert
      const existing = await prisma.teacher.findFirst({
        where: { schoolId, email: teacherData.email },
      });

      if (existing) {
        await prisma.teacher.update({
          where: { id: existing.id },
          data: teacherData,
        });
        updated++;
      } else {
        await prisma.teacher.create({
          data: { ...teacherData, schoolId },
        });
        created++;
      }

      // Progress update every 50 rows
      if (rowNum % 50 === 0) {
        await updateUploadStatus(uploadId, 'PROCESSING', rowNum, rows.length);
      }
    } catch (err) {
      errors.push({ row: rowNum, message: err.message });
      skipped++;
    }
  }

  return { total: rows.length, created, updated, skipped, errors };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENTS
// ═══════════════════════════════════════════════════════════════════════════════

async function processStudents(schoolId, rows, uploadId) {
  let created = 0,
    updated = 0,
    skipped = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    try {
      if (!row.firstName?.trim() || !row.class || !row.section) {
        errors.push({
          row: rowNum,
          field: 'firstName/class/section',
          message: 'Required fields missing',
        });
        skipped++;
        continue;
      }

      const studentData = {
        name: `${row.firstName} ${row.lastName || ''}`.trim(),
        class: row.class,
        section: row.section,
        rollNo: row.rollNo || null,
        gender: row.gender || null,
        dob: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
        bloodGroup: row.bloodGroup || null,
        email: row.email || null,
        phone: row.phone || null,
        address: row.address || null,
        parent1Name: row.parent1Name || null,
        parent1Phone: row.parent1Phone || null,
        parent1Email: row.parent1Email || null,
        parent2Name: row.parent2Name || null,
        parent2Phone: row.parent2Phone || null,
        emergencyContact: row.emergencyContact || null,
        medicalConditions: parseList(row.medicalConditions),
        allergies: parseList(row.allergies),
      };

      // Check existing by name + class + section
      const existing = await prisma.student.findFirst({
        where: {
          schoolId,
          name: studentData.name,
          class: studentData.class,
          section: studentData.section,
        },
      });

      if (existing) {
        await prisma.student.update({
          where: { id: existing.id },
          data: studentData,
        });
        updated++;
      } else {
        await prisma.student.create({
          data: { ...studentData, schoolId, status: 'ACTIVE' },
        });
        created++;
      }

      if (rowNum % 100 === 0) {
        await updateUploadStatus(uploadId, 'PROCESSING', rowNum, rows.length);
      }
    } catch (err) {
      errors.push({ row: rowNum, message: err.message });
      skipped++;
    }
  }

  return { total: rows.length, created, updated, skipped, errors };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSES
// ═══════════════════════════════════════════════════════════════════════════════

async function processClasses(schoolId, rows, uploadId) {
  let created = 0,
    updated = 0,
    skipped = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    try {
      if (!row.grade || !row.section) {
        errors.push({ row: rowNum, field: 'grade/section', message: 'Grade and section required' });
        skipped++;
        continue;
      }

      const classData = {
        grade: row.grade,
        section: row.section,
        classTeacher: row.classTeacher || null,
        room: row.room || null,
        capacity: row.capacity ? parseInt(row.capacity) : null,
        academicYear: row.academicYear || new Date().getFullYear().toString(),
      };

      const existing = await prisma.class.findFirst({
        where: { schoolId, grade: row.grade, section: row.section },
      });

      if (existing) {
        await prisma.class.update({ where: { id: existing.id }, data: classData });
        updated++;
      } else {
        await prisma.class.create({ data: { ...classData, schoolId } });
        created++;
      }

      if (rowNum % 50 === 0) {
        await updateUploadStatus(uploadId, 'PROCESSING', rowNum, rows.length);
      }
    } catch (err) {
      errors.push({ row: rowNum, message: err.message });
      skipped++;
    }
  }

  return { total: rows.length, created, updated, skipped, errors };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBJECTS
// ═══════════════════════════════════════════════════════════════════════════════

async function processSubjects(schoolId, rows, uploadId) {
  let created = 0,
    updated = 0,
    skipped = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    try {
      if (!row.subjectName?.trim() || !row.code?.trim()) {
        errors.push({
          row: rowNum,
          field: 'subjectName/code',
          message: 'Subject name and code required',
        });
        skipped++;
        continue;
      }

      const subjectData = {
        name: row.subjectName.trim(),
        code: row.code.trim(),
        category: row.category || 'CORE',
        periodsPerWeek: row.periodsPerWeek ? parseInt(row.periodsPerWeek) : null,
        description: row.description || null,
      };

      const existing = await prisma.subject.findFirst({
        where: { schoolId, code: row.code },
      });

      if (existing) {
        await prisma.subject.update({ where: { id: existing.id }, data: subjectData });
        updated++;
      } else {
        await prisma.subject.create({ data: { ...subjectData, schoolId } });
        created++;
      }
    } catch (err) {
      errors.push({ row: rowNum, message: err.message });
      skipped++;
    }
  }

  return { total: rows.length, created, updated, skipped, errors };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOMS
// ═══════════════════════════════════════════════════════════════════════════════

async function processRooms(schoolId, rows, uploadId) {
  let created = 0,
    updated = 0,
    skipped = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    try {
      if (!row.roomNumber?.trim()) {
        errors.push({ row: rowNum, message: 'Room number required' });
        skipped++;
        continue;
      }

      const roomData = {
        roomNumber: row.roomNumber.trim(),
        building: row.building || null,
        floor: row.floor ? parseInt(row.floor) : null,
        capacity: row.capacity ? parseInt(row.capacity) : null,
        type: row.type || 'CLASSROOM',
      };

      const existing = await prisma.room.findFirst({
        where: { schoolId, roomNumber: row.roomNumber },
      });

      if (existing) {
        await prisma.room.update({ where: { id: existing.id }, data: roomData });
        updated++;
      } else {
        await prisma.room.create({ data: { ...roomData, schoolId } });
        created++;
      }
    } catch (err) {
      errors.push({ row: rowNum, message: err.message });
      skipped++;
    }
  }

  return { total: rows.length, created, updated, skipped, errors };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function parseList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function updateUploadStatus(uploadId, status, processedRows, totalRows, extra = {}) {
  try {
    await prisma.bulkUpload.update({
      where: { id: uploadId },
      data: {
        status,
        processedRows,
        totalRows,
        progressPercent: totalRows > 0 ? Math.round((processedRows / totalRows) * 100) : 0,
        ...(status === 'COMPLETED'
          ? {
              created: extra.created || 0,
              updated: extra.updated || 0,
              skipped: extra.skipped || 0,
              errorRows: extra.errors?.length || 0,
              errors: extra.errors || [],
              completedAt: new Date(),
            }
          : {}),
      },
    });
  } catch (err) {
    logger.error({ uploadId, err: err.message }, '[bulkUpload.worker] Status update failed');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKER SETUP
// ═══════════════════════════════════════════════════════════════════════════════

let _worker = null;

export const startBulkUploadWorker = () => {
  if (_worker) return _worker;

  _worker = new Worker(QUEUE, processBulkUpload, {
    connection: getQueueConnection(),
    concurrency: ENV.BULK_UPLOAD_CONCURRENCY || 2,
    limiter: {
      max: 5,
      duration: 1000,
    },
    lockDuration: 300000, // 5 minutes (large uploads)
    stalledInterval: 30000,
    maxStalledCount: 2,
  });

  _worker.on('completed', (job) => {
    logger.info({ jobId: job.id, uploadId: job.data?.uploadId }, '[bulkUpload.worker] Completed');
  });

  _worker.on('failed', async (job, error) => {
    logger.error({ jobId: job?.id, err: error.message }, '[bulkUpload.worker] Failed');

    // Update upload status to FAILED
    if (job?.data?.uploadId) {
      await updateUploadStatus(job.data.uploadId, 'FAILED', 0, 0, {
        errors: [{ message: error.message }],
      });
    }

    if (job && job.attemptsMade >= (job.opts?.attempts ?? 2)) {
      await handleDeadJob({ job, error, queueName: QUEUE });
    }
  });

  logger.info({ queue: QUEUE }, '[bulkUpload.worker] Started');
  return _worker;
};

export const stopBulkUploadWorker = async () => {
  if (_worker) {
    await _worker.close();
    _worker = null;
    logger.info('[bulkUpload.worker] Stopped');
  }
};
