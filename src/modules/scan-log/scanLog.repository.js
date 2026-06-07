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
