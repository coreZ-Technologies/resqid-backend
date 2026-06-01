// src/modules/scan/scan.service.js
import { ScanRepository } from './scan.repository.js';
import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';
import { extractIp } from '#shared/network/extractIp.js';
import { parseUserAgent } from '#shared/network/userAgent.js';
import { extractLocation } from '#shared/network/extractLocation.js';
import { SCAN_RESULTS, SCAN_PURPOSE, SCAN_TYPES } from './scan.constants.js';

const repo = new ScanRepository();

export class ScanService {
  // ─── Existing scan logic ─────────────────────────────────────────────────
  async processScan(scanCode, req) {
    const startTime = Date.now();
    const ip = extractIp(req);
    const userAgent = parseUserAgent(req);
    const location = await extractLocation(req);

    // Find token by scan code
    const token = await repo.findTokenByCode(scanCode);
    
    let result = 'INVALID';
    let student = null;
    let scanPurpose = SCAN_PURPOSE.UNKNOWN;

    if (!token) {
      result = 'INVALID';
    } else if (token.status === 'EXPIRED') {
      result = 'EXPIRED';
    } else if (token.status === 'REVOKED') {
      result = 'REVOKED';
    } else if (token.status === 'ACTIVE' || token.status === 'ISSUED') {
      result = 'SUCCESS';
      student = token.student;
      scanPurpose = SCAN_PURPOSE.EMERGENCY;
    }

    const responseTimeMs = Date.now() - startTime;

    // Create scan log
    const scan = await repo.createScan({
      tokenId: token?.id,
      studentId: student?.id,
      schoolId: token?.schoolId,
      result,
      type: SCAN_TYPES.QR_EMERGENCY,
      status: result === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
      deviceIp: ip,
      userAgent: userAgent.raw,
      locationLat: location.lat,
      locationLng: location.lon,
      initiatedBy: 'public_scan',
      metadata: {
        scanPurpose,
        city: location.city,
        country: location.country,
        device: userAgent.device,
        os: userAgent.os,
        browser: userAgent.browser,
        responseTimeMs,
      },
      createdAt: new Date(),
    });

    return {
      success: result === 'SUCCESS',
      result,
      student: student ? {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        grade: student.grade,
        section: student.section,
        photoUrl: student.photoUrl,
        emergencyProfile: student.emergencyProfile,
      } : null,
      scanId: scan.id,
      responseTimeMs,
    };
  }

  // ─── Scan Logs methods (new) ──────────────────────────────────────────────
  async listScanLogs(query, schoolId) {
    const { scans, total } = await repo.listScanLogs({ ...query, schoolId });

    const transformedScans = scans.map(scan => ({
      id: scan.id,
      token_hash: scan.token?.qrCode || scan.token?.rfidUid || 'Unknown',
      result: scan.result,
      student_name: scan.student
        ? `${scan.student.firstName} ${scan.student.lastName}`
        : null,
      student_id: scan.student?.id || null,
      ip_address: scan.deviceIp,
      ip_city: scan.metadata?.city || null,
      device: scan.metadata?.device || scan.userAgent?.split('/')[0] || 'Unknown',
      scan_purpose: scan.metadata?.scanPurpose || 'UNKNOWN',
      response_time_ms: scan.metadata?.responseTimeMs || null,
      created_at: scan.createdAt,
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
      'IP Address': scan.deviceIp,
      'City': scan.metadata?.city || 'N/A',
      'Device': scan.metadata?.device || 'Unknown',
      'Scan Purpose': scan.metadata?.scanPurpose || 'UNKNOWN',
      'Response Time (ms)': scan.metadata?.responseTimeMs || 'N/A',
      'Scanned At': scan.createdAt,
    }));

    return exportData;
  }
}