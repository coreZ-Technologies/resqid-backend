// src/modules/scan/scan.controller.js
import { ScanService } from './scan.service.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { logger } from '#config/logger.js';
import {
  scanCodeParamsSchema,
  listScanLogsQuerySchema,
  exportScanLogsQuerySchema,
  getScanLogParamsSchema,
  scanSummaryQuerySchema,
  dailyScanStatsQuerySchema,
  peakHoursQuerySchema,
  recentScansQuerySchema,
  validateScanCodeQuerySchema,
} from './scan.validation.js';
import { Parser } from 'json2csv';
import ExcelJS from 'exceljs';
import { formatScanLogForResponse, formatStatsResponse } from './scan.helper.js';

const service = new ScanService();

// =============================================================================
// EXISTING SCAN ENDPOINTS
// =============================================================================

/**
 * GET /s/:code
 * Process a QR code scan
 */
export const handleScan = asyncHandler(async (req, res) => {
  const { code } = scanCodeParamsSchema.parse(req.params);
  const result = await service.processScan(code, req);
  
  // Log scan result
  logger.info({
    scanId: result.scanId,
    result: result.result,
    studentId: result.student?.id,
    responseTimeMs: result.responseTimeMs,
    riskScore: result.riskScore,
  }, 'Scan processed');
  
  // Check if client expects JSON (API) or HTML (browser)
  const acceptHeader = req.headers.accept || '';
  const expectsHtml = acceptHeader.includes('text/html');
  
  // Redirect to emergency profile page on success (for browser requests)
  if (expectsHtml && result.success && result.student) {
    return res.redirect(`/emergency/profile/${result.student.id}`);
  }
  
  // Return JSON response for API clients
  const statusCode = result.result === 'SUCCESS' ? 200 : 400;
  res.status(statusCode).json(ApiResponse.success('Scan processed', result));
});

/**
 * GET /s/validate
 * Validate scan code without creating a scan log
 */
export const validateScanCode = asyncHandler(async (req, res) => {
  const { code } = validateScanCodeQuerySchema.parse(req.query);
  const result = await service.validateScanCode(code);
  res.json(ApiResponse.success('Code validation', result));
});

// =============================================================================
// SCAN LOGS ENDPOINTS (School Admin Only)
// =============================================================================

/**
 * GET /api/scan/logs
 * List scan logs with filters and pagination
 */
export const listScanLogs = asyncHandler(async (req, res) => {
  const query = listScanLogsQuerySchema.parse(req.query);
  const result = await service.listScanLogs(query, req.schoolId);
  
  // Transform scans for frontend
  const transformedData = result.data.map(formatScanLogForResponse);
  
  res.json(ApiResponse.paginated(
    res,
    transformedData,
    {
      page: result.pagination.page,
      limit: result.pagination.limit,
      total: result.pagination.total,
    },
    'Scan logs fetched'
  ));
});

/**
 * GET /api/scan/logs/stats/today
 * Get today's scan statistics
 */
export const getTodayStats = asyncHandler(async (req, res) => {
  const stats = await service.getTodayStats(req.schoolId);
  const formattedStats = formatStatsResponse(stats);
  res.json(ApiResponse.success('Today\'s stats', formattedStats));
});

/**
 * GET /api/scan/logs/:id
 * Get single scan log details
 */
export const getScanLogById = asyncHandler(async (req, res) => {
  const { id } = getScanLogParamsSchema.parse(req.params);
  const scan = await service.getScanLogById(id, req.schoolId);
  
  if (!scan) {
    throw ApiError.notFound('Scan log not found');
  }
  
  const formattedScan = formatScanLogForResponse(scan);
  res.json(ApiResponse.success('Scan log details', formattedScan));
});

/**
 * GET /api/scan/logs/export
 * Export scan logs in various formats
 */
export const exportScanLogs = asyncHandler(async (req, res) => {
  const query = exportScanLogsQuerySchema.parse(req.query);
  const exportData = await service.exportScanLogs(query, req.schoolId);

  if (!exportData || exportData.length === 0) {
    throw ApiError.notFound('No scan logs found for export');
  }

  const fileName = `scan-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;

  switch (query.format) {
    case 'csv':
      return exportAsCSV(res, exportData, fileName);
    case 'json':
      return exportAsJSON(res, exportData, fileName);
    case 'xlsx':
      return exportAsExcel(res, exportData, fileName);
    default:
      return exportAsJSON(res, exportData, fileName);
  }
});

// =============================================================================
// STATISTICS ENDPOINTS (School Admin Only)
// =============================================================================

/**
 * GET /api/scan/stats/summary
 * Get comprehensive scan statistics (for dashboard)
 */
export const getScanSummary = asyncHandler(async (req, res) => {
  const { period, startDate, endDate } = scanSummaryQuerySchema.parse(req.query);
  let start;
  
  if (startDate) {
    start = new Date(startDate);
  } else {
    start = new Date();
    switch (period) {
      case 'day':
        start.setDate(start.getDate() - 1);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start.setDate(start.getDate() - 7);
    }
  }
  
  const stats = await service.getScanSummary(start, req.schoolId);
  res.json(ApiResponse.success('Scan summary', stats));
});

/**
 * GET /api/scan/stats/daily
 * Get daily scan statistics for charts
 */
export const getDailyScanStats = asyncHandler(async (req, res) => {
  const { days } = dailyScanStatsQuerySchema.parse(req.query);
  const stats = await service.getDailyScanStats(days, req.schoolId);
  res.json(ApiResponse.success('Daily scan stats', stats));
});

/**
 * GET /api/scan/stats/distribution
 * Get scan result distribution for pie chart
 */
export const getResultDistribution = asyncHandler(async (req, res) => {
  const distribution = await service.getResultDistribution(req.schoolId);
  res.json(ApiResponse.success('Result distribution', distribution));
});

/**
 * GET /api/scan/stats/peak-hours
 * Get peak scan hours analysis
 */
export const getPeakScanHours = asyncHandler(async (req, res) => {
  const { days } = peakHoursQuerySchema.parse(req.query);
  const stats = await service.getPeakScanHours(req.schoolId, days);
  res.json(ApiResponse.success('Peak hours', stats));
});

/**
 * GET /api/scan/stats/recent
 * Get recent scans for activity feed
 */
export const getRecentScans = asyncHandler(async (req, res) => {
  const { limit } = recentScansQuerySchema.parse(req.query);
  const scans = await service.getRecentScans(limit, req.schoolId);
  res.json(ApiResponse.success('Recent scans', scans));
});

// =============================================================================
// EXPORT HELPERS
// =============================================================================

/**
 * Export data as CSV
 */
const exportAsCSV = (res, data, fileName) => {
  try {
    const parser = new Parser({
      transforms: [
        (row) => {
          const cleaned = {};
          for (const [key, value] of Object.entries(row)) {
            cleaned[key] = value !== null && value !== undefined ? String(value) : '';
          }
          return cleaned;
        },
      ],
    });
    const csv = parser.parse(data);
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.csv"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.send(csv);
  } catch (err) {
    logger.error({ err: err.message }, 'CSV export failed');
    throw ApiError.internal('Failed to generate CSV export');
  }
};

/**
 * Export data as JSON
 */
const exportAsJSON = (res, data, fileName) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.json"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.json({
      exportedAt: new Date().toISOString(),
      totalRecords: data.length,
      data,
    });
  } catch (err) {
    logger.error({ err: err.message }, 'JSON export failed');
    throw ApiError.internal('Failed to generate JSON export');
  }
};

/**
 * Export data as Excel (XLSX)
 */
const exportAsExcel = async (res, data, fileName) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Scan Logs');

    // Add metadata rows
    worksheet.addRow(['Export Date:', new Date().toISOString()]);
    worksheet.addRow(['Total Records:', data.length]);
    worksheet.addRow([]); // Empty row

    if (data.length > 0) {
      // Define columns from first row keys
      const columns = Object.keys(data[0]).map(key => ({
        header: key,
        key: key,
        width: Math.min(25, key.length + 5),
        style: { font: { bold: true } },
      }));
      worksheet.columns = columns;

      // Add data rows
      data.forEach(row => {
        const rowData = {};
        columns.forEach(col => {
          let value = row[col.key];
          if (value === null || value === undefined) value = '';
          if (typeof value === 'object') value = JSON.stringify(value);
          rowData[col.key] = value;
        });
        worksheet.addRow(rowData);
      });

      // Style the header row (row 3 after metadata)
      const headerRow = worksheet.getRow(3);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2563EB' },
        };
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      // Auto-filter
      worksheet.autoFilter = {
        from: { row: 3, column: 1 },
        to: { row: 3, column: columns.length },
      };
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.xlsx"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    logger.error({ err: err.message }, 'Excel export failed');
    throw ApiError.internal('Failed to generate Excel export');
  }
};
