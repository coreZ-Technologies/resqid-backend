// src/modules/scan-log/scanLog.service.js
import { ScanLogRepository } from './scanLog.repository.js';
import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';

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
      ip_city: scan.city,          // ✅ fixed: matches repository (city field)
      device: scan.device,
      scan_purpose: scan.scanPurpose || 'UNKNOWN',
      response_time_ms: scan.responseTimeMs,   // ✅ fixed: response_time_ms → responseTimeMs
      created_at: scan.createdAt,             // ✅ fixed: created_at → createdAt
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
      'Response Time (ms)': scan.responseTimeMs || 'N/A',
      'Scanned At': scan.createdAt,    // ✅ fixed: created_at → createdAt
    }));

    return exportData;
  }
}