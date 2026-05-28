// TODO: Add implementation
// =============================================================================
// attendance.repository.js — RESQID
// All Prisma queries for attendance module
// No business logic here — only DB access
// =============================================================================

import { prisma } from '#config/prisma.js';

// ─── Session Repository ───────────────────────────────────────────────────────

/**
 * Create a new attendance session
 */
export const createSession = ({ schoolId, teacherId, grade, section, subject }) => {
  return prisma.attendanceSession.create({
    data: { schoolId, teacherId, grade, section, subject },
    include: { _count: { select: { records: true, taps: true } } },
  });
};

/**
 * Find a session by ID (optionally scoped to school)
 */
export const findSessionById = (sessionId, schoolId) => {
  return prisma.attendanceSession.findFirst({
    where: {
      id: sessionId,
      ...(schoolId ? { schoolId } : {}),
    },
    include: { _count: { select: { records: true, taps: true } } },
  });
};

/**
 * Find the active open session for a teacher (school-scoped)
 */
export const findActiveSessionByTeacher = (teacherId, schoolId) => {
  return prisma.attendanceSession.findFirst({
    where: { teacherId, schoolId, isActive: true },
    include: { _count: { select: { records: true, taps: true } } },
  });
};

/**
 * Find existing active session for the same class (prevents duplicates)
 */
export const findActiveSessionByClass = (schoolId, grade, section) => {
  return prisma.attendanceSession.findFirst({
    where: { schoolId, grade, section, isActive: true },
  });
};

/**
 * Close a session (set isActive = false, record endedAt)
 */
export const closeSession = (sessionId) => {
  return prisma.attendanceSession.update({
    where: { id: sessionId },
    data: { isActive: false, endedAt: new Date() },
    include: { _count: { select: { records: true } } },
  });
};

/**
 * List sessions with filters and pagination
 */
export const listSessions = ({ schoolId, filters = {}, page = 1, limit = 20 }) => {
  const where = {
    schoolId,
    ...(filters.grade ? { grade: filters.grade } : {}),
    ...(filters.section ? { section: filters.section } : {}),
    ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
    ...(filters.teacherId ? { teacherId: filters.teacherId } : {}),
    ...(filters.from || filters.to
      ? {
          startedAt: {
            ...(filters.from ? { gte: new Date(filters.from) } : {}),
            ...(filters.to ? { lte: new Date(filters.to) } : {}),
          },
        }
      : {}),
  };

  return Promise.all([
    prisma.attendanceSession.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { startedAt: 'desc' },
      include: { _count: { select: { records: true, taps: true } } },
    }),
    prisma.attendanceSession.count({ where }),
  ]);
};

// ─── Tap Repository ───────────────────────────────────────────────────────────

/**
 * Find a student's token by uidHash (for RFID tap lookup)
 */
export const findTokenByUidHash = (uidHash, schoolId) => {
  return prisma.token.findFirst({
    where: { schoolId, status: 'ACTIVE' },
    include: { student: true },
  });
};

/**
 * Find student by rfidUid directly (hashed lookup done in service)
 */
export const findStudentByUidHash = async (uidHash, schoolId) => {
  // The uidHash corresponds to a token's stored hash
  return prisma.token.findFirst({
    where: {
      schoolId,
      scanCodeHash: uidHash,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      studentId: true,
      status: true,
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          grade: true,
          section: true,
          isActive: true,
        },
      },
    },
  });
};

/**
 * Create an attendance tap record
 */
export const createTap = ({ sessionId, studentId, schoolId, uidHash, deviceId, tappedAt }) => {
  return prisma.attendanceTap.create({
    data: {
      sessionId,
      studentId,
      schoolId,
      uidHash,
      deviceId,
      tappedAt: tappedAt ? new Date(tappedAt) : new Date(),
    },
  });
};

/**
 * Check if a tap was already processed for this session+student
 */
export const findExistingTap = (sessionId, studentId) => {
  return prisma.attendanceTap.findFirst({
    where: { sessionId, studentId },
    orderBy: { tappedAt: 'desc' },
  });
};

/**
 * Mark a tap as processed
 */
export const markTapProcessed = (tapId) => {
  return prisma.attendanceTap.update({
    where: { id: tapId },
    data: { processed: true },
  });
};

// ─── Attendance Record Repository ─────────────────────────────────────────────

const STUDENT_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  grade: true,
  section: true,
  photoUrl: true,
};

/**
 * Find an existing attendance record for a session+student
 */
export const findRecord = (sessionId, studentId) => {
  return prisma.attendanceRecord.findUnique({
    where: { sessionId_studentId: { sessionId, studentId } },
  });
};

/**
 * Upsert a single attendance record
 */
export const upsertRecord = ({ sessionId, studentId, schoolId, status, markedBy }) => {
  return prisma.attendanceRecord.upsert({
    where: { sessionId_studentId: { sessionId, studentId } },
    create: { sessionId, studentId, schoolId, status, markedBy },
    update: { status, markedBy, markedAt: new Date() },
    include: { student: { select: STUDENT_SELECT } },
  });
};

/**
 * Bulk upsert records — uses a transaction for atomicity
 */
export const bulkUpsertRecords = (records) => {
  return prisma.$transaction(
    records.map(({ sessionId, studentId, schoolId, status, markedBy }) =>
      prisma.attendanceRecord.upsert({
        where: { sessionId_studentId: { sessionId, studentId } },
        create: { sessionId, studentId, schoolId, status, markedBy },
        update: { status, markedBy, markedAt: new Date() },
      })
    )
  );
};

/**
 * Delete a single attendance record
 */
export const deleteRecord = (sessionId, studentId) => {
  return prisma.attendanceRecord.delete({
    where: { sessionId_studentId: { sessionId, studentId } },
  });
};

/**
 * List all records in a session with pagination
 */
export const listSessionRecords = (sessionId, { page = 1, limit = 20 }) => {
  const where = { sessionId };
  return Promise.all([
    prisma.attendanceRecord.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { markedAt: 'asc' },
      include: { student: { select: STUDENT_SELECT } },
    }),
    prisma.attendanceRecord.count({ where }),
  ]);
};

/**
 * List all attendance records for a student (across sessions), with date range
 */
export const listStudentRecords = (studentId, { page = 1, limit = 20, from, to }) => {
  const where = {
    studentId,
    ...(from || to
      ? {
          markedAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  return Promise.all([
    prisma.attendanceRecord.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { markedAt: 'desc' },
      include: {
        session: {
          select: { id: true, grade: true, section: true, subject: true, startedAt: true },
        },
      },
    }),
    prisma.attendanceRecord.count({ where }),
  ]);
};

/**
 * Get attendance summary for a student
 * Returns counts per status
 */
export const getStudentAttendanceSummary = (studentId, schoolId) => {
  return prisma.attendanceRecord.groupBy({
    by: ['status'],
    where: { studentId, schoolId },
    _count: { status: true },
  });
};

/**
 * List records for a class (grade + section) with optional date filter
 */
export const listClassRecords = (schoolId, { grade, section, from, to }) => {
  const sessionWhere = {
    schoolId,
    grade,
    section,
    ...(from || to
      ? {
          startedAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  return prisma.attendanceRecord.findMany({
    where: {
      schoolId,
      session: sessionWhere,
    },
    orderBy: { markedAt: 'desc' },
    include: {
      student: { select: STUDENT_SELECT },
      session: {
        select: { id: true, grade: true, section: true, subject: true, startedAt: true },
      },
    },
  });
};

// ─── Device Repository ────────────────────────────────────────────────────────

/**
 * Find a device by its identifier within a school
 */
export const findDeviceByIdentifier = (deviceIdentifier, schoolId) => {
  return prisma.attendanceDevice.findFirst({
    where: { deviceIdentifier, schoolId },
  });
};

/**
 * Find a device by its ID within a school
 */
export const findDeviceById = (deviceId, schoolId) => {
  return prisma.attendanceDevice.findFirst({
    where: { id: deviceId, schoolId },
  });
};

/**
 * Register a new attendance device
 */
export const registerDevice = ({ schoolId, deviceName, deviceIdentifier, location }) => {
  return prisma.attendanceDevice.create({
    data: { schoolId, deviceName, deviceIdentifier, location, isOnline: false },
  });
};

/**
 * Remove a device from school
 */
export const removeDevice = (deviceId) => {
  return prisma.attendanceDevice.delete({ where: { id: deviceId } });
};

/**
 * List all devices for a school
 */
export const listDevices = (schoolId) => {
  return prisma.attendanceDevice.findMany({
    where: { schoolId },
    orderBy: { createdAt: 'asc' },
  });
};

/**
 * Update device online status (heartbeat)
 */
export const updateDeviceHeartbeat = (deviceId, isOnline = true) => {
  return prisma.attendanceDevice.update({
    where: { id: deviceId },
    data: { isOnline, lastSeen: new Date() },
  });
};