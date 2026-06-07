<<<<<<< HEAD
// src/modules/scan-log/scanLog.repository.js
import { prisma } from '#config/prisma.js';

export class ScanLogRepository {
  async listScanLogs({ page, limit, result, search, startDate, endDate, schoolId }) {
    const skip = (page - 1) * limit;
    const where = { schoolId };

    if (result && result !== 'ALL') {
      where.result = result;
    }

    if (search) {
      where.OR = [
        { student: { firstName: { contains: search, mode: 'insensitive' } } },
        { student: { lastName: { contains: search, mode: 'insensitive' } } },
        { city: { contains: search, mode: 'insensitive' } },        // ✅ fixed: ip_city → city
        { token: { qrCode: { contains: search, mode: 'insensitive' } } },
        { token: { rfidUid: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (startDate) {
      where.createdAt = { gte: new Date(startDate) };               // ✅ fixed: created_at → createdAt
    }
    if (endDate) {
      // Set to end of day
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { ...where.createdAt, lte: end };
    }

    const [scans, total] = await Promise.all([
      prisma.scan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },                            // ✅ fixed
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
              grade: true,
              section: true,
            },
          },
          token: {
            select: {
              qrCode: true,
              rfidUid: true,
              type: true,
            },
          },
        },
      }),
      prisma.scan.count({ where }),
    ]);

    return { scans, total };
  }

  async getTodayStats(schoolId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where = {
      schoolId,
      createdAt: { gte: today, lt: tomorrow },                    // ✅ fixed
    };

    const [total, success, avgResponse] = await Promise.all([
      prisma.scan.count({ where }),
      prisma.scan.count({ where: { ...where, result: 'SUCCESS' } }),
      prisma.scan.aggregate({
        where,
        _avg: { responseTimeMs: true },                           // ✅ fixed: response_time_ms → responseTimeMs
      }),
    ]);

    const failed = total - success;

    return {
      total,
      success,
      failed,
      avgResponse: `${Math.round(avgResponse._avg.responseTimeMs || 0)}ms`,
    };
  }

  async getScanLogById(id, schoolId) {
    return prisma.scan.findFirst({
      where: { id, schoolId },
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
        token: {
          select: {
            id: true,
            qrCode: true,
            rfidUid: true,
            type: true,
            status: true,
          },
        },
      },
    });
  }

  async exportScanLogs({ result, startDate, endDate, schoolId }) {
    const where = { schoolId };

    if (result && result !== 'ALL') {
      where.result = result;
    }

    if (startDate) {
      where.createdAt = { gte: new Date(startDate) };             // ✅ fixed
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { ...where.createdAt, lte: end };
    }

    return prisma.scan.findMany({
      where,
      orderBy: { createdAt: 'desc' },                            // ✅ fixed
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            grade: true,
            section: true,
          },
        },
        token: {
          select: {
            qrCode: true,
            rfidUid: true,
            type: true,
          },
        },
      },
    });
  }
}
=======
// =============================================================================
// modules/scan-log/scanLog.repository.js — RESQID
// =============================================================================

import { prisma } from '#config/prisma.js';

// 🔧 Check your Prisma model name: 'scan' or 'scanLog'
const scanModel = prisma.scan; // or prisma.scanLog

const scanSelect = {
  id: true,
  result: true,
  scannedAt: true,
  ipAddress: true,
  city: true,
  country: true,
  device: true,
  responseTimeMs: true,
  latitude: true,
  longitude: true,
  isBot: true,
  isSuspicious: true,
  riskScore: true,
  studentName: true,
  token: {
    select: {
      id: true,
      studentId: true,
      schoolId: true,
      student: {
        select: { id: true, firstName: true, lastName: true, grade: true, section: true },
      },
    },
  },
};

// ─── List by School ───────────────────────────────────────────────────────────

export const findBySchool = async (schoolId, query = {}) => {
  const {
    page = 1,
    limit = 15,
    search,
    result,
    studentId,
    startDate,
    endDate,
    sortBy = 'scannedAt',
    sortOrder = 'desc',
  } = query;

  const where = { schoolId };
  if (result && result !== 'ALL') where.result = result;
  if (studentId) where.token = { studentId };
  if (search) {
    where.OR = [
      { studentName: { contains: search, mode: 'insensitive' } },
      { ipAddress: { contains: search } },
      { city: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (startDate || endDate) {
    where.scannedAt = {};
    if (startDate) where.scannedAt.gte = new Date(startDate);
    if (endDate) where.scannedAt.lte = new Date(endDate);
  }

  const [scans, total] = await Promise.all([
    scanModel.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: scanSelect,
    }),
    scanModel.count({ where }),
  ]);

  return { scans, total };
};

// ─── List by Parent (their children) ──────────────────────────────────────────

export const findByParent = async (parentId, query = {}) => {
  const { page = 1, limit = 15, studentId } = query;

  // Get all children IDs for this parent
  const links = await prisma.parentStudent.findMany({
    where: { parentId, isActive: true },
    select: { studentId: true },
  });
  const childIds = links.map((l) => l.studentId);

  if (childIds.length === 0) return { scans: [], total: 0 };

  const where = {
    token: { studentId: studentId || { in: childIds } },
  };

  const [scans, total] = await Promise.all([
    scanModel.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { scannedAt: 'desc' },
      select: scanSelect,
    }),
    scanModel.count({ where }),
  ]);

  return { scans, total };
};

// ─── List All (Super Admin) ───────────────────────────────────────────────────

export const findAll = async (query = {}) => {
  const {
    page = 1,
    limit = 15,
    search,
    result,
    startDate,
    endDate,
    sortBy = 'scannedAt',
    sortOrder = 'desc',
  } = query;

  const where = {};
  if (result && result !== 'ALL') where.result = result;
  if (search) {
    where.OR = [
      { studentName: { contains: search, mode: 'insensitive' } },
      { ipAddress: { contains: search } },
    ];
  }
  if (startDate || endDate) {
    where.scannedAt = {};
    if (startDate) where.scannedAt.gte = new Date(startDate);
    if (endDate) where.scannedAt.lte = new Date(endDate);
  }

  const [scans, total] = await Promise.all([
    scanModel.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: scanSelect,
    }),
    scanModel.count({ where }),
  ]);

  return { scans, total };
};

// ─── Get One ──────────────────────────────────────────────────────────────────

export const findById = (id) => scanModel.findUnique({ where: { id }, select: scanSelect });

// ─── Delete ────────────────────────────────────────────────────────────────────

export const remove = (id) => scanModel.delete({ where: { id } });

export const bulkDelete = (ids) => scanModel.deleteMany({ where: { id: { in: ids } } });

export const cleanupOld = (beforeDate) =>
  scanModel.deleteMany({
    where: { scannedAt: { lt: new Date(beforeDate) } },
  });

// ─── Stats ─────────────────────────────────────────────────────────────────────

export const getStats = async (schoolId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [total, success, failed] = await Promise.all([
    scanModel.count({ where: { schoolId, scannedAt: { gte: today } } }),
    scanModel.count({ where: { schoolId, scannedAt: { gte: today }, result: 'SUCCESS' } }),
    scanModel.count({ where: { schoolId, scannedAt: { gte: today }, result: { not: 'SUCCESS' } } }),
  ]);

  const avgResponse = await scanModel.aggregate({
    where: { schoolId, scannedAt: { gte: today } },
    _avg: { responseTimeMs: true },
  });

  return {
    total,
    success,
    failed,
    avgResponseMs: Math.round(avgResponse._avg?.responseTimeMs || 0),
  };
};
>>>>>>> 29c3ec21ee207f590fb533e851f49fc2e7b35588
