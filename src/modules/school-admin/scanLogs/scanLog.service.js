// school-admin/scanLogs/scanLog.service.js
import { ApiError } from '#shared/response/ApiError.js';
import { getPagination, paginateMeta } from '#shared/response/paginate.js';
import { ScanLogRepository } from './scanLog.repository.js';

const repo = new ScanLogRepository();

export class ScanLogService {
  async listScanLogs(query, schoolId) {
    const { page, limit, skip } = getPagination(query);
    const filters = {
      result: query.result,
      search: query.search,
    };
    const { items, total } = await repo.list(schoolId, filters, skip, limit);
    const transformed = items.map(log => ({
      id: log.id,
      token_hash: log.token?.qrCode || log.tokenId || 'unknown',
      result: log.result,
      student_name: log.studentName || null,
      ip_address: log.ipAddress,
      ip_city: log.city,
      device: log.device,
      scan_purpose: log.scanPurpose,
      response_time_ms: log.responseTimeMs,
      created_at: log.scannedAt,
    }));
    const meta = paginateMeta(total, page, limit);
    return { items: transformed, meta };
  }

  async getTodayStats(schoolId) {
    return repo.getTodayStats(schoolId);
  }
}