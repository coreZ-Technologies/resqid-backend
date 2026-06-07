// src/modules/rfid-devices/rfid-device.controller.js
import { rfidDeviceService } from './rfid-device.service.js';
import {
  deviceIdParamsSchema,
  deviceQuerySchema,
  firmwareUpdateSchema,
  recentActivityQuerySchema,
  exportQuerySchema,
} from './rfid-device.validation.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';

export const getStats = asyncHandler(async (req, res) => {
  const stats = await rfidDeviceService.getStats(req.schoolId);
  ApiResponse.ok(res, stats);
});

export const list = asyncHandler(async (req, res) => {
  const query = deviceQuerySchema.parse(req.query);
  const result = await rfidDeviceService.list(req.schoolId, query);
  ApiResponse.ok(res, result);
});

export const getOne = asyncHandler(async (req, res) => {
  const { id } = deviceIdParamsSchema.parse(req.params);
  const device = await rfidDeviceService.getOne(id, req.schoolId);
  ApiResponse.ok(res, device);
});

export const updateFirmware = asyncHandler(async (req, res) => {
  const { id } = deviceIdParamsSchema.parse(req.params);
  const { firmwareVersion } = firmwareUpdateSchema.parse(req.body);
  const result = await rfidDeviceService.updateFirmware(id, req.schoolId, firmwareVersion);
  ApiResponse.ok(res, result, 'Firmware update queued');
});

export const restartDevice = asyncHandler(async (req, res) => {
  const { id } = deviceIdParamsSchema.parse(req.params);
  const result = await rfidDeviceService.restart(id, req.schoolId);
  ApiResponse.ok(res, result);
});

export const removeDevice = asyncHandler(async (req, res) => {
  const { id } = deviceIdParamsSchema.parse(req.params);
  await rfidDeviceService.remove(id, req.schoolId);
  ApiResponse.ok(res, null, 'Device removed successfully');
});

export const getFilterOptions = asyncHandler(async (req, res) => {
  const options = await rfidDeviceService.getFilterOptions();
  ApiResponse.ok(res, options);
});

export const exportDevices = asyncHandler(async (req, res) => {
  const query = exportQuerySchema.parse(req.query);
  const data = await rfidDeviceService.exportDevices(req.schoolId, query);

  const headers = [
    'id',
    'name',
    'location',
    'zone',
    'status',
    'ipAddress',
    'macAddress',
    'firmware',
    'battery',
    'signal',
    'todayScans',
    'totalScans',
    'lastSeen',
    'installedOn',
    'type',
    'model',
  ];

  const csv = [
    headers.join(','),
    ...data.map((row) => headers.map((h) => `"${row[h] ?? ''}"`).join(',')),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="rfid-devices.csv"');
  res.send(csv);
});

export const getRecentActivity = asyncHandler(async (req, res) => {
  const query = recentActivityQuerySchema.parse(req.query);
  const activities = await rfidDeviceService.getRecentActivity(req.schoolId, query.limit);
  ApiResponse.ok(res, activities);
});
