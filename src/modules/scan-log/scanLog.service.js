// =============================================================================
// modules/scan/scan.service.js — RESQID
// Scan Service — Business logic for scan logs and analytics
// =============================================================================

import scanRepository from './scan.repository.js';
import { scanValidation } from './scan.validation.js';
import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';

// ─── Service Class ────────────────────────────────────────────────────────────

class ScanService {
  // ===========================================================================
  // QUERY OPERATIONS
  // ===========================================================================

  /**
   * Get scan logs with filters
   */
  async getScans(schoolId, query = {}) {
    const validatedQuery = scanValidation.queryScans.parse(query);
    return scanRepository.findScans(schoolId, validatedQuery);
  }

  /**
   * Get scan by ID
   */
  async getScanById(scanId, schoolId = null) {
    const scan = await scanRepository.findScanById(scanId, schoolId);

    if (!scan) {
      throw ApiError.notFound('Scan log not found', 'SCAN_NOT_FOUND');
    }

    return scan;
  }

  /**
   * Get scans by token
   */
  async getScansByToken(tokenId, page = 1, limit = 20) {
    return scanRepository.findScansByToken(tokenId, page, limit);
  }

  /**
   * Get scans by student
   */
  async getScansByStudent(studentId, page = 1, limit = 20) {
    return scanRepository.findScansByStudent(studentId, page, limit);
  }

  // ===========================================================================
  // CREATE OPERATIONS
  // ===========================================================================

  /**
   * Create a scan log (called when QR is scanned)
   */
  async createScanLog(data) {
    const validated = scanValidation.createScanLog.parse(data);

    // Auto-detect location from IP if not provided
    if (validated.ipAddress && !validated.city) {
      try {
        const location = await this.getLocationFromIp(validated.ipAddress);
        if (location) {
          validated.city = location.city;
          validated.country = location.country;
          validated.latitude = location.latitude;
          validated.longitude = location.longitude;
        }
      } catch (error) {
        // Location lookup failed, continue without it
      }
    }

    // Detect if bot
    if (validated.userAgent) {
      validated.isBot = this.isBotUserAgent(validated.userAgent);
    }

    // Calculate risk score
    validated.riskScore = this.calculateRiskScore(validated);

    const scan = await scanRepository.createScanLog(validated);

    // Log suspicious scans
    if (scan.isSuspicious || scan.riskScore > 70) {
      logger.warn(`Suspicious scan detected: ${scan.id}`, {
        tokenId: scan.tokenId,
        ipAddress: scan.ipAddress,
        riskScore: scan.riskScore,
      });
    }

    return scan;
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * Get scan statistics
   */
  async getScanStats(schoolId, options = {}) {
    const validated = scanValidation.scanStats.parse(options);

    const [stats, realtime] = await Promise.all([
      scanRepository.getScanStats(schoolId, validated),
      scanRepository.getRealtimeStats(schoolId),
    ]);

    return { ...stats, ...realtime };
  }

  /**
   * Get dashboard summary
   */
  async getDashboardSummary(schoolId) {
    const today = await scanRepository.getScanStats(schoolId, { period: 'TODAY' });
    const yesterday = await scanRepository.getScanStats(schoolId, { period: 'YESTERDAY' });
    const last7Days = await scanRepository.getScanStats(schoolId, { period: 'LAST_7_DAYS' });
    const realtime = await scanRepository.getRealtimeStats(schoolId);

    return {
      today: {
        total: today.total,
        success: today.success,
        failed: today.failed,
        successRate: today.successRate,
        avgResponseMs: today.avgResponseMs,
      },
      yesterday: {
        total: yesterday.total,
        success: yesterday.success,
        failed: yesterday.failed,
      },
      last7Days: {
        total: last7Days.total,
        avgPerDay: Math.round(last7Days.total / 7),
        successRate: last7Days.successRate,
      },
      realtime: realtime.last5Minutes,
      suspiciousToday: today.suspiciousCount,
      topScanners: today.byScanner.slice(0, 5),
      topCities: today.byCity.slice(0, 5),
    };
  }

  // ===========================================================================
  // EXPORT
  // ===========================================================================

  /**
   * Export scan logs
   */
  async exportScans(schoolId, filters = {}) {
    const scans = await scanRepository.exportScans(schoolId, filters);

    return scans.map((scan) => ({
      'Scan ID': scan.id,
      'Date/Time': scan.scannedAt,
      Result: scan.result,
      'Student Name': scan.studentName || 'Unknown',
      'Student Class': scan.studentClass || '',
      Token: scan.token?.qrCode || '',
      Scanner: scan.scannerName || '',
      'IP Address': scan.ipAddress || '',
      City: scan.city || '',
      Country: scan.country || '',
      Device: scan.device || '',
      Browser: scan.browser || '',
      OS: scan.os || '',
      'Response Time (ms)': scan.responseTimeMs || '',
      'Risk Score': scan.riskScore || '',
      Suspicious: scan.isSuspicious ? 'Yes' : 'No',
      Bot: scan.isBot ? 'Yes' : 'No',
    }));
  }

  // ===========================================================================
  // DELETE OPERATIONS
  // ===========================================================================

  /**
   * Delete scan log
   */
  async deleteScan(scanId) {
    const scan = await scanRepository.findScanById(scanId);
    if (!scan) {
      throw ApiError.notFound('Scan log not found', 'SCAN_NOT_FOUND');
    }

    await scanRepository.deleteScan(scanId);
    logger.info(`Scan log deleted: ${scanId}`);

    return { success: true };
  }

  /**
   * Bulk delete scans
   */
  async bulkDeleteScans(scanIds) {
    const validated = scanValidation.bulkDelete.parse({ scanIds });
    const result = await scanRepository.bulkDeleteScans(validated.scanIds);

    logger.info(`Bulk deleted ${result.count} scan logs`);

    return { deleted: result.count };
  }

  /**
   * Cleanup old scans
   */
  async cleanupOldScans(schoolId, beforeDate) {
    const result = await scanRepository.deleteOldScans(schoolId, beforeDate);
    logger.info(`Cleaned up ${result.count} old scan logs before ${beforeDate}`);
    return { deleted: result.count };
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  /**
   * Get location from IP address
   */
  async getLocationFromIp(ipAddress) {
    // In production, use a GeoIP service like MaxMind or ipstack
    // This is a mock implementation
    const privateIp =
      ipAddress.startsWith('192.168.') ||
      ipAddress.startsWith('10.') ||
      ipAddress.startsWith('172.');

    if (privateIp) return null;

    // Mock location data
    const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Chennai', 'Hyderabad'];
    return {
      city: cities[Math.floor(Math.random() * cities.length)],
      country: 'India',
      latitude: 19.076 + (Math.random() - 0.5) * 5,
      longitude: 72.8777 + (Math.random() - 0.5) * 5,
    };
  }

  /**
   * Check if user agent is a bot
   */
  isBotUserAgent(userAgent) {
    if (!userAgent) return false;

    const botPatterns = [
      'bot',
      'crawler',
      'spider',
      'scraper',
      'curl',
      'wget',
      'python-requests',
      'go-http-client',
      'java',
      'libwww',
    ];

    const ua = userAgent.toLowerCase();
    return botPatterns.some((pattern) => ua.includes(pattern));
  }

  /**
   * Calculate risk score for a scan
   */
  calculateRiskScore(data) {
    let score = 0;

    // Bot detection
    if (data.isBot) score += 50;

    // Suspicious patterns
    if (data.ipAddress) {
      // Check for known VPN/proxy IPs (mock)
      if (data.ipAddress.startsWith('103.')) score += 10;
    }

    // Unusual hours (midnight to 5 AM)
    const hour = new Date().getHours();
    if (hour >= 0 && hour <= 5) score += 15;

    // Invalid or suspicious results
    if (['INVALID', 'BLOCKED', 'SUSPICIOUS'].includes(data.result)) score += 25;

    // High response time (possible attack)
    if (data.responseTimeMs && data.responseTimeMs > 1000) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Detect scan anomalies
   */
  async detectAnomalies(schoolId) {
    const recentScans = await scanRepository.findScans(schoolId, {
      limit: 100,
      sortBy: 'scannedAt',
      sortOrder: 'desc',
    });

    const anomalies = [];

    // Group by IP
    const ipCounts = {};
    recentScans.scans.forEach((scan) => {
      if (scan.ipAddress) {
        ipCounts[scan.ipAddress] = (ipCounts[scan.ipAddress] || 0) + 1;
      }
    });

    // Detect IPs with too many scans
    Object.entries(ipCounts).forEach(([ip, count]) => {
      if (count > 20) {
        anomalies.push({
          type: 'HIGH_SCAN_VOLUME',
          ip,
          count,
          severity: count > 50 ? 'HIGH' : 'MEDIUM',
        });
      }
    });

    return anomalies;
  }
}

// ─── Export Singleton ─────────────────────────────────────────────────────────

export const scanService = new ScanService();
export default scanService;
