// src/modules/scan/scan.service.js
import { ScanRepository } from './scan.repository.js';
import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';
import { extractIp } from '#shared/network/extractIp.js';
import { parseUserAgent } from '#shared/network/userAgent.js';
import { extractLocation } from '#shared/network/extractLocation.js';
import { SCAN_PURPOSE, SCAN_TYPES } from './scan.constants.js'; // SCAN_RESULTS removed
import {
  maskTokenHash,
  formatRelativeTime,
  humanizeEnum,
  calculateRiskScore,
  isUnusualScanTime,
} from './scan.helper.js';

const repo = new ScanRepository();

export class ScanService {
  // ===========================================================================
  // EXISTING SCAN LOGIC
  // ===========================================================================

  async processScan(scanCode, req) {
    const startTime = Date.now();
    const ip = extractIp(req);
    const userAgent = parseUserAgent(req);
    
    // Safely get location (fallback if geo‑IP fails)
    let location = { lat: null, lon: null, city: null, country: null };
    try {
      location = await extractLocation(req);
    } catch (err) {
      logger.warn({ err: err.message, ip }, 'Geo‑IP lookup failed, using fallback');
    }

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

    const riskScore = calculateRiskScore({
      isSuspiciousUA: userAgent.isBot,
      isNewDevice: false,
      unusualLocation: location.country !== 'IN',
      unusualTime: isUnusualScanTime(),
      rapidScanCount: req.scanCount || 1,
    });

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
        riskScore,
        userAgentParsed: userAgent,
      },
      createdAt: new Date(),
    });

    logger.info({
      scanId: scan.id,
      result,
      studentId: student?.id,
      schoolId: token?.schoolId,
      riskScore,
      responseTimeMs,
    }, 'Scan processed');

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
      riskScore,
    };
  }

  // ===========================================================================
  // SCAN LOGS METHODS (unchanged – correct)
  // ===========================================================================

  async listScanLogs(query, schoolId) {
    const { scans, total } = await repo.listScanLogs({ ...query, schoolId });

    const transformedScans = scans.map(scan => ({
      id: scan.id,
      token_hash: maskTokenHash(scan.token?.qrCode || scan.token?.rfidUid || 'Unknown'),
      result: scan.result,
      result_label: humanizeEnum(scan.result),
      student_name: scan.student
        ? `${scan.student.firstName} ${scan.student.lastName}`
        : null,
      student_id: scan.student?.id || null,
      student_class: scan.student?.grade || null,
      student_section: scan.student?.section || null,
      ip_address: scan.deviceIp,
      ip_city: scan.metadata?.city || null,
      device: scan.metadata?.device || 'Unknown',
      scan_purpose: scan.metadata?.scanPurpose || 'UNKNOWN',
      scan_purpose_label: humanizeEnum(scan.metadata?.scanPurpose || 'UNKNOWN'),
      response_time_ms: scan.metadata?.responseTimeMs || null,
      relative_time: formatRelativeTime(scan.createdAt),
      created_at: scan.createdAt,
      risk_score: scan.metadata?.riskScore || 0,
    }));

    const totalPages = Math.ceil(total / query.limit);

    return {
      data: transformedScans,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1,
      },
    };
  }

  async getTodayStats(schoolId) {
    const stats = await repo.getTodayStats(schoolId);
    
    return {
      ...stats,
      successRate: stats.total ? Math.round((stats.success / stats.total) * 100) : 0,
      failureRate: stats.total ? Math.round((stats.failed / stats.total) * 100) : 0,
    };
  }

  async getScanLogById(id, schoolId) {
    const scan = await repo.getScanLogById(id, schoolId);
    if (!scan) {
      throw ApiError.notFound('Scan log not found');
    }
    
    return {
      ...scan,
      relative_time: formatRelativeTime(scan.createdAt),
      result_label: humanizeEnum(scan.result),
      scan_purpose_label: humanizeEnum(scan.metadata?.scanPurpose || 'UNKNOWN'),
      token_masked: maskTokenHash(scan.token?.qrCode || scan.token?.rfidUid),
    };
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
      'Country': scan.metadata?.country || 'N/A',
      'Device': scan.metadata?.device || 'Unknown',
      'Browser': scan.metadata?.browser || 'Unknown',
      'OS': scan.metadata?.os || 'Unknown',
      'Scan Purpose': scan.metadata?.scanPurpose || 'UNKNOWN',
      'Response Time (ms)': scan.metadata?.responseTimeMs || 'N/A',
      'Risk Score': scan.metadata?.riskScore || 0,
      'Scanned At': scan.createdAt,
    }));

    return exportData;
  }

  // ===========================================================================
  // ADDITIONAL STATISTICS METHODS (unchanged)
  // ===========================================================================

  async getScanSummary(startDate, schoolId) {
    return repo.getScanSummary(startDate, schoolId);
  }

  async getDailyScanStats(days, schoolId) {
    return repo.getDailyScanStats(days, schoolId);
  }

  async getResultDistribution(schoolId) {
    return repo.getResultDistribution(schoolId);
  }

  async getPeakScanHours(schoolId, days = 7) {
    return repo.getPeakScanHours(schoolId, days);
  }

  async getRecentScans(limit = 10, schoolId) {
    const scans = await repo.getRecentScans(limit, schoolId);
    
    return scans.map(scan => ({
      id: scan.id,
      result: scan.result,
      student_name: scan.student
        ? `${scan.student.firstName} ${scan.student.lastName}`
        : 'Unknown',
      token_masked: maskTokenHash(scan.token?.qrCode),
      relative_time: formatRelativeTime(scan.createdAt),
    }));
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  async validateScanCode(scanCode) {
    const token = await repo.findTokenByCodeLight(scanCode); // Use lightweight method
    
    if (!token) {
      return { valid: false, reason: 'INVALID_CODE' };
    }
    
    if (token.status === 'REVOKED') {
      return { valid: false, reason: 'TOKEN_REVOKED' };
    }
    
    if (token.status === 'EXPIRED') {
      return { valid: false, reason: 'TOKEN_EXPIRED' };
    }
    
    if (token.status === 'INACTIVE') {
      return { valid: false, reason: 'TOKEN_INACTIVE' };
    }
    
    return {
      valid: true,
      studentId: token.studentId,
      studentName: null, // We don't have student name in lightweight query – optional
    };
  }

  async getScanCountByDateRange(startDate, endDate, schoolId) {
    return repo.getScanCountByDateRange(startDate, endDate, schoolId);
  }

  async cleanupOldScans(daysOld = 90) {
    const result = await repo.deleteOldScans(daysOld);
    logger.info({ deletedCount: result.count, daysOld }, 'Old scans cleaned up');
    return result;
  }
}