<<<<<<< HEAD
// src/modules/scan-log/scanLog.controller.js
import { ScanLogService } from './scanLog.service.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import {
  listScanLogsQuerySchema,
  exportScanLogsQuerySchema,
  getScanLogParamsSchema,
} from './scanLog.validation.js';
import { Parser } from 'json2csv';
import ExcelJS from 'exceljs';

const service = new ScanLogService();

export const listScanLogs = asyncHandler(async (req, res) => {
  const query = listScanLogsQuerySchema.parse(req.query);
  const result = await service.listScanLogs(query, req.schoolId);
  
  return ApiResponse.paginated(
    res,
    result.data,
    {
      page: result.pagination.page,
      limit: result.pagination.limit,
      total: result.pagination.total,
    },
    'Scan logs fetched'
  );
});

export const getTodayStats = asyncHandler(async (req, res) => {
  const stats = await service.getTodayStats(req.schoolId);
  return ApiResponse.ok(res, stats, "Today's stats");
});

export const getScanLogById = asyncHandler(async (req, res) => {
  const { id } = getScanLogParamsSchema.parse(req.params);
  const scan = await service.getScanLogById(id, req.schoolId);
  return ApiResponse.ok(res, scan, 'Scan log details');
});

export const exportScanLogs = asyncHandler(async (req, res) => {
  const query = exportScanLogsQuerySchema.parse(req.query);
  const exportData = await service.exportScanLogs(query, req.schoolId);

  const fileName = `scan-logs-${Date.now()}`;

  switch (query.format) {
    case 'csv': {
      const parser = new Parser();
      const csv = parser.parse(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}.csv`);
      return res.send(csv);
    }

    case 'json': {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}.json`);
      return res.json(exportData);
    }

    case 'xlsx': {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Scan Logs');

      if (exportData.length > 0) {
        const columns = Object.keys(exportData[0]).map(key => ({
          header: key,
          key: key,
          width: 20,
        }));
        worksheet.columns = columns;
        worksheet.addRows(exportData);
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}.xlsx`);
      await workbook.xlsx.write(res);
      return res.end();
    }

    default: {
      res.setHeader('Content-Type', 'application/json');
      return res.json(exportData);
    }
  }
});
=======
// =============================================================================
// modules/scan-log/scanLog.controller.js — RESQID
// =============================================================================

import { ApiResponse } from '#shared/response/ApiResponse.js';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import * as service from './scanLog.service.js';
import { scanLogQuerySchema, scanLogIdParamsSchema, cleanupSchema } from './scanLog.validation.js';

export const list = asyncHandler(async (req, res) => {
  const query = scanLogQuerySchema.parse(req.query);
  req.query = query;
  const { scans, total } = await service.list(req);
  const page = query.page,
    limit = query.limit;
  ApiResponse.paginated(res, scans, { page, limit, total });
});

export const getOne = asyncHandler(async (req, res) => {
  const { id } = scanLogIdParamsSchema.parse(req.params);
  const scan = await service.getOne(id, req);
  ApiResponse.ok(res, scan);
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = scanLogIdParamsSchema.parse(req.params);
  await service.remove(id);
  ApiResponse.ok(res, null, 'Scan log deleted');
});

export const bulkDelete = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!ids?.length) throw ApiError.badRequest('ids required');
  const result = await service.bulkDelete(ids);
  ApiResponse.ok(res, result, `${result.count} scan logs deleted`);
});

export const cleanup = asyncHandler(async (req, res) => {
  const { beforeDate } = cleanupSchema.parse(req.body);
  const result = await service.cleanupOld(beforeDate);
  ApiResponse.ok(res, result, `${result.count} old scan logs cleaned up`);
});

<<<<<<< HEAD
// ─── Helper ───────────────────────────────────────────────────────────────────

function convertToCSV(data) {
  if (!data?.length) return '';
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map((header) => {
      const val = String(row[header] ?? '').replace(/"/g, '""');
      return val.includes(',') || val.includes('"') || val.includes('\n') ? `"${val}"` : val;
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
}
>>>>>>> f769c34b07b38ef93f84fb7ec946cdc6fdb91efd
=======
export const stats = asyncHandler(async (req, res) => {
  const result = await service.getStats(req.schoolId);
  ApiResponse.ok(res, result);
});
>>>>>>> 29c3ec21ee207f590fb533e851f49fc2e7b35588
