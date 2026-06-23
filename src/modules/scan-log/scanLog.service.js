<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> c52277545acdf32472792738285dea3300df0ace
=======
// src/modules/scan-log/scanLog.service.js
import { ScanLogRepository } from './scanLog.repository.js';
=======
=======
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
>>>>>>> a989dfa23342d0ba3fdc249932bb5a39fd301af6
// =============================================================================
// modules/scan-log/scanLog.service.js — RESQID
// =============================================================================

<<<<<<< HEAD
<<<<<<< HEAD
=======
// src/modules/scan-log/scanLog.service.js
import { ScanLogRepository } from './scanLog.repository.js';
>>>>>>> 8077b3074a48cb1da7a7cf9128d6f67564a49aa0
=======
>>>>>>> c52277545acdf32472792738285dea3300df0ace
=======
>>>>>>> 2306bae69da370bc7bfb048c15cfd0f99e474bff
=======
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
>>>>>>> a989dfa23342d0ba3fdc249932bb5a39fd301af6
import { ApiError } from '#shared/response/ApiError.js';
import * as repo from './scanLog.repository.js';
import { prisma } from '#config/prisma.js';

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> c52277545acdf32472792738285dea3300df0ace
=======
const repo = new ScanLogRepository();

export class ScanLogService {
  async listScanLogs(query, schoolId) {
    const { scans, total } = await repo.listScanLogs({ ...query, schoolId });

    // Transform data to match frontend expectations
    const transformedScans = scans.map(scan => ({
      id: scan.id,
      token_hash: scan.token?.qrCode || scan.token?.rfidUid || 'Unknown',
      result: scan.result,
      student_name: scan.student
        ? `${scan.student.firstName} ${scan.student.lastName}`
        : null,
      student_id: scan.student?.id || null,
      ip_address: scan.ipAddress,
      ip_city: scan.city,
      device: scan.device,
      scan_purpose: scan.scanPurpose || 'UNKNOWN',
      response_time_ms: scan.response_time_ms,
      created_at: scan.created_at,
    }));

    const totalPages = Math.ceil(total / query.limit);

    return {
      data: transformedScans,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  }

  async getTodayStats(schoolId) {
    return repo.getTodayStats(schoolId);
  }

  async getScanLogById(id, schoolId) {
    const scan = await repo.getScanLogById(id, schoolId);
    if (!scan) {
      throw ApiError.notFound('Scan log not found');
    }
    return scan;
  }

  async exportScanLogs(query, schoolId) {
    const scans = await repo.exportScanLogs({ ...query, schoolId });

    // Transform for export
    const exportData = scans.map(scan => ({
      'Scan ID': scan.id,
      'Student Name': scan.student
        ? `${scan.student.firstName} ${scan.student.lastName}`
        : 'Unknown',
      'Class': scan.student?.grade || 'N/A',
      'Section': scan.student?.section || 'N/A',
      'Token': scan.token?.qrCode || scan.token?.rfidUid || 'Unknown',
      'Token Type': scan.token?.type || 'Unknown',
      'Result': scan.result,
      'IP Address': scan.ipAddress,
      'City': scan.city,
      'Device': scan.device,
      'Scan Purpose': scan.scanPurpose || 'UNKNOWN',
      'Response Time (ms)': scan.response_time_ms || 'N/A',
      'Scanned At': scan.created_at,
    }));

    return exportData;
  }
}
=======
=======
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
>>>>>>> a989dfa23342d0ba3fdc249932bb5a39fd301af6
// ─── List (Role-based) ────────────────────────────────────────────────────────

export const list = async (req) => {
  const { role, schoolId, id: userId } = req.user;
  const query = req.query;

  if (role === 'SUPER_ADMIN') {
    if (req.params.schoolId) {
      return repo.findBySchool(req.params.schoolId, query);
    }
    return repo.findAll(query);
  }

  if (role === 'PARENT') {
    return repo.findByParent(userId, query);
  }

  // TEACHER, SCHOOL_ADMIN — their school
  if (!schoolId) throw ApiError.tenantRequired();
  return repo.findBySchool(schoolId, query);
};

// ─── Get One ──────────────────────────────────────────────────────────────────

export const getOne = async (id, req) => {
  const scan = await repo.findById(id);
  if (!scan) throw ApiError.notFound('Scan log not found');

  // Role-based access check
  const { role, schoolId, id: userId } = req.user;
  if (role === 'SUPER_ADMIN') return scan;
  if (role === 'PARENT') {
    const studentId = scan.token?.studentId;
    if (!studentId) throw ApiError.forbidden('Access denied');
    const link = await prisma.parentStudent.findFirst({
      where: { parentId: userId, studentId, isActive: true },
    });
    if (!link) throw ApiError.forbidden('Not your child');
    return scan;
  }
  // School-scoped
  if (scan.token?.schoolId !== schoolId) throw ApiError.forbidden('Access denied');
  return scan;
};

// ─── Delete (Super Admin only) ────────────────────────────────────────────────

export const remove = async (id) => {
  const scan = await repo.findById(id);
  if (!scan) throw ApiError.notFound('Scan log not found');
  return repo.remove(id);
};

export const bulkDelete = async (ids) => {
  return repo.bulkDelete(ids);
};

export const cleanupOld = async (beforeDate) => {
  return repo.cleanupOld(beforeDate);
};

// ─── Stats ─────────────────────────────────────────────────────────────────────

export const getStats = async (schoolId) => {
  return repo.getStats(schoolId);
};
<<<<<<< HEAD
<<<<<<< HEAD
=======
const repo = new ScanLogRepository();

export class ScanLogService {
  async listScanLogs(query, schoolId) {
    const { scans, total } = await repo.listScanLogs({ ...query, schoolId });

    // Transform data to match frontend expectations
    const transformedScans = scans.map(scan => ({
      id: scan.id,
      token_hash: scan.token?.qrCode || scan.token?.rfidUid || 'Unknown',
      result: scan.result,
      student_name: scan.student
        ? `${scan.student.firstName} ${scan.student.lastName}`
        : null,
      student_id: scan.student?.id || null,
      ip_address: scan.ipAddress,
      ip_city: scan.city,
      device: scan.device,
      scan_purpose: scan.scanPurpose || 'UNKNOWN',
      response_time_ms: scan.response_time_ms,
      created_at: scan.created_at,
    }));

    const totalPages = Math.ceil(total / query.limit);

    return {
      data: transformedScans,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  }

  async getTodayStats(schoolId) {
    return repo.getTodayStats(schoolId);
  }

  async getScanLogById(id, schoolId) {
    const scan = await repo.getScanLogById(id, schoolId);
    if (!scan) {
      throw ApiError.notFound('Scan log not found');
    }
    return scan;
  }

  async exportScanLogs(query, schoolId) {
    const scans = await repo.exportScanLogs({ ...query, schoolId });

    // Transform for export
    const exportData = scans.map(scan => ({
      'Scan ID': scan.id,
      'Student Name': scan.student
        ? `${scan.student.firstName} ${scan.student.lastName}`
        : 'Unknown',
      'Class': scan.student?.grade || 'N/A',
      'Section': scan.student?.section || 'N/A',
      'Token': scan.token?.qrCode || scan.token?.rfidUid || 'Unknown',
      'Token Type': scan.token?.type || 'Unknown',
      'Result': scan.result,
      'IP Address': scan.ipAddress,
      'City': scan.city,
      'Device': scan.device,
      'Scan Purpose': scan.scanPurpose || 'UNKNOWN',
      'Response Time (ms)': scan.response_time_ms || 'N/A',
      'Scanned At': scan.created_at,
    }));

    return exportData;
  }
}
>>>>>>> 8077b3074a48cb1da7a7cf9128d6f67564a49aa0
=======
>>>>>>> c52277545acdf32472792738285dea3300df0ace
=======
>>>>>>> 2306bae69da370bc7bfb048c15cfd0f99e474bff
=======
>>>>>>> fc2f457f3fe5f95777ea9ced16e959883f9d995e
>>>>>>> a989dfa23342d0ba3fdc249932bb5a39fd301af6
