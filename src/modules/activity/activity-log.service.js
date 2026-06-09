// src/modules/activity-logs/activity-log.service.js
import { activityLogRepository } from './activity-log.repository.js';

export const activityLogService = {
  async list(schoolId, query) {
    const { data, total, page, limit } = await activityLogRepository.findAll(schoolId, query);

    return {
      logs: data,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    };
  },

  async getStats(schoolId) {
    return activityLogRepository.getStats(schoolId);
  },

  async getFilterOptions() {
    return activityLogRepository.getFilterOptions();
  },

  async exportCsv(schoolId, query) {
    const logs = await activityLogRepository.findAllForExport(schoolId, query);

    const headers = [
      'id',
      'actor',
      'role',
      'action',
      'module',
      'type',
      'severity',
      'ip',
      'device',
      'time',
      'status',
    ];

    const rows = logs.map((l) => [
      l.id,
      `"${l.actor}"`,
      l.role,
      `"${l.action}"`,
      l.module,
      l.type,
      l.severity,
      l.ip,
      l.device,
      l.time,
      l.status,
    ]);

    return { headers, rows };
  },
};
