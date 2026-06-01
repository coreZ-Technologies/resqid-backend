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
  res.json(ApiResponse.success('Scan logs fetched', result.data, result.pagination));
});

export const getTodayStats = asyncHandler(async (req, res) => {
  const stats = await service.getTodayStats(req.schoolId);
  res.json(ApiResponse.success('Today\'s stats', stats));
});

export const getScanLogById = asyncHandler(async (req, res) => {
  const { id } = getScanLogParamsSchema.parse(req.params);
  const scan = await service.getScanLogById(id, req.schoolId);
  res.json(ApiResponse.success('Scan log details', scan));
});

export const exportScanLogs = asyncHandler(async (req, res) => {
  const query = exportScanLogsQuerySchema.parse(req.query);
  const exportData = await service.exportScanLogs(query, req.schoolId);

  switch (query.format) {
    case 'csv':
      const parser = new Parser();
      const csv = parser.parse(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=scan-logs-${Date.now()}.csv`);
      return res.send(csv);

    case 'json':
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=scan-logs-${Date.now()}.json`);
      return res.json(exportData);

    case 'xlsx':
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
      res.setHeader('Content-Disposition', `attachment; filename=scan-logs-${Date.now()}.xlsx`);
      await workbook.xlsx.write(res);
      return res.end();

    default:
      res.setHeader('Content-Type', 'application/json');
      return res.json(exportData);
  }
});