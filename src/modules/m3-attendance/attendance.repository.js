// =============================================================================
// modules/m3-attendance/attendance.repository.js — RESQID
// All Prisma queries — no business logic.
// =============================================================================

import { prisma } from '#config/prisma.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION
// ═══════════════════════════════════════════════════════════════════════════════

export const createSession = ({ schoolId, teacherId, grade, section, subject }) =>
  prisma.attendanceSession.create({
    data: {
      schoolId,
      createdById: teacherId,
      grade,
      section,
      subject,
      type: 'MORNING',
      mode: 'RFID',
      scheduledStart: new Date(),
      startedAt: new Date(),
      isActive: true,
    },
  });

export const findSessionById = (sessionId, schoolId) =>
  prisma.attendanceSession.findFirst({ where: { id: sessionId, schoolId } });

export const findActiveSessionByClass = (schoolId, grade, section) =>
  prisma.attendanceSession.findFirst({
    where: { schoolId, grade, section, isActive: true },
  });

export const findActiveSession = (schoolId) =>
  prisma.attendanceSession.findFirst({
    where: { schoolId, isActive: true },
    orderBy: { startedAt: 'desc' },
  });

export const closeSession = (sessionId) =>
  prisma.attendanceSession.update({
    where: { id: sessionId },
    data: { isActive: false, endedAt: new Date() },
  });

export const listSessions = ({ schoolId, filters = {}, page = 1, limit = 20 }) => {
  const where = {
    schoolId,
    ...(filters.grade && { grade: filters.grade }),
    ...(filters.section && { section: filters.section }),
    ...(filters.isActive !== undefined && { isActive: filters.isActive }),
  };

  return Promise.all([
    prisma.attendanceSession.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { startedAt: 'desc' },
    }),
    prisma.attendanceSession.count({ where }),
  ]);
};

// ═══════════════════════════════════════════════════════════════════════════════
// USER CONTEXT (for role-based scoping)
// ═══════════════════════════════════════════════════════════════════════════════

export const findUserContext = async (userId, role) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      student: true,        // Single Student record (if role = STUDENT)
      teacher: {
        include: {
          classes: {        // Classes taught by this teacher
            select: { classId: true },
          },
        },
      },
      parent: {
        include: {
          children: {       // Students linked to this parent
            select: { studentId: true },
          },
        },
      },
    },
  });

  if (!user) return null;

  const context = { user };

  if (role === 'STUDENT' && user.student) {
    context.studentProfileId = user.student.id;
  }
  if (role === 'TEACHER' && user.teacher) {
    context.teacherClassIds = user.teacher.classes.map((c) => c.classId);
  }
  if (role === 'PARENT' && user.parent) {
    context.linkedStudentIds = user.parent.children.map((c) => c.studentId);
  }

  return context;
};

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN / STUDENT LOOKUP (for RFID) — ✅ FIXED: joins Token model
// ═══════════════════════════════════════════════════════════════════════════════

export const findStudentByRfid = (uidHash, schoolId) =>
  prisma.token.findFirst({
    where: {
      rfidTagNumber: uidHash,
      student: { schoolId, isActive: true },
    },
    select: {
      student: {
        select: { id: true, firstName: true, lastName: true, grade: true, section: true },
      },
    },
  }).then((token) => token?.student || null);

export const findStudentById = (studentId, schoolId) =>
  prisma.student.findFirst({
    where: { id: studentId, schoolId, isActive: true },
    select: { id: true, classId: true, grade: true, section: true },
  });

// ═══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE TAP (Raw tap from device)
// ═══════════════════════════════════════════════════════════════════════════════

export const createTap = ({ sessionId, schoolId, studentId, uidHash, deviceId, deviceName }) =>
  prisma.attendanceTap.create({
    data: {
      sessionId,
      schoolId,
      studentId,
      uidHash,
      deviceId,
      deviceName,
      tapType: 'RFID_CARD',
      tappedAt: new Date(),
      processed: false,
    },
  });

export const markTapProcessed = (tapId) =>
  prisma.attendanceTap.update({
    where: { id: tapId },
    data: { processed: true, processedAt: new Date() },
  });

// ═══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE RECORD
// ═══════════════════════════════════════════════════════════════════════════════

export const findRecord = (sessionId, studentId) =>
  prisma.studentAttendanceRecord.findFirst({
    where: { sessionId, studentId },
  });

export const upsertRecord = ({ sessionId, studentId, schoolId, status, markedAt, tapId }) =>
  prisma.studentAttendanceRecord.upsert({
    where: {
      sessionId_studentId: { sessionId, studentId },
    },
    create: {
      sessionId,
      studentId,
      schoolId,
      status: status || 'PRESENT',
      mode: 'RFID',
      markedAt: markedAt || new Date(),
      tapId: tapId || null,
    },
    update: {
      status: status || 'PRESENT',
      markedAt: markedAt || new Date(),
    },
    include: {
      student: {
        select: { id: true, firstName: true, lastName: true, grade: true, section: true },
      },
    },
  });

export const listSessionRecords = (sessionId, page = 1, limit = 20) => {
  const where = { sessionId };
  return Promise.all([
    prisma.studentAttendanceRecord.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { markedAt: 'asc' },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            grade: true,
            section: true,
            photoUrl: true,
          },
        },
      },
    }),
    prisma.studentAttendanceRecord.count({ where }),
  ]);
};

export const listStudentRecords = (studentId, { page = 1, limit = 20, from, to }) => {
  const where = {
    studentId,
    ...((from || to) && {
      markedAt: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    }),
  };

  return Promise.all([
    prisma.studentAttendanceRecord.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { markedAt: 'desc' },
      include: {
        session: { select: { id: true, name: true, grade: true, section: true, subject: true } },
      },
    }),
    prisma.studentAttendanceRecord.count({ where }),
  ]);
};

export const listClassRecords = (schoolId, grade, section, from, to) =>
  prisma.studentAttendanceRecord.findMany({
    where: {
      schoolId,
      session: { grade, section },
      ...((from || to) && {
        markedAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    },
    orderBy: { markedAt: 'desc' },
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
    },
  });

// ═══════════════════════════════════════════════════════════════════════════════
// DEVICE
// ═══════════════════════════════════════════════════════════════════════════════

export const createDevice = ({ schoolId, name, location }) =>
  prisma.attendanceDevice.create({
    data: { schoolId, name, status: 'UNREGISTERED' },
  });

export const updateDeviceHeartbeat = (deviceId) =>
  prisma.attendanceDevice.update({
    where: { id: deviceId },
    data: { lastSeenAt: new Date(), status: 'ONLINE' },
  });

export const listDevices = (schoolId) =>
  prisma.attendanceDevice.findMany({
    where: { schoolId },
    orderBy: { createdAt: 'asc' },
  });