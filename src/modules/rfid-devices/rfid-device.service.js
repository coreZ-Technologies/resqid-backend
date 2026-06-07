// src/modules/rfid-devices/rfid-device.service.js
import { rfidDeviceRepository } from './rfid-device.repository.js';
import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';

export const rfidDeviceService = {
  async getStats(schoolId) {
    return rfidDeviceRepository.getStats(schoolId);
  },

  async list(schoolId, query) {
    const { devices, total, page, limit } = await rfidDeviceRepository.findAll(schoolId, query);

    return {
      devices,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    };
  },

  async getOne(id, schoolId) {
    const device = await rfidDeviceRepository.findById(id, schoolId);
    if (!device) throw ApiError.notFound('Device not found');
    return device;
  },

  async updateFirmware(id, schoolId, firmwareVersion) {
    const device = await rfidDeviceRepository.findById(id, schoolId);
    if (!device) throw ApiError.notFound('Device not found');

    // In production, this would push an OTA update command to the ESP32
    logger.info({ deviceId: id, firmwareVersion }, '[rfid] Firmware update triggered');

    return {
      id,
      firmware: firmwareVersion || 'v3.3.0',
      status: 'pending',
      message: `Firmware update to ${firmwareVersion || 'v3.3.0'} queued for device`,
    };
  },

  async restart(id, schoolId) {
    const device = await rfidDeviceRepository.findById(id, schoolId);
    if (!device) throw ApiError.notFound('Device not found');

    // In production, this would send an MQTT/HTTP command to the ESP32
    logger.info({ deviceId: id }, '[rfid] Restart command sent');

    return {
      id,
      message: 'Restart command sent',
      status: 'pending',
    };
  },

  async remove(id, schoolId) {
    try {
      const result = await rfidDeviceRepository.remove(id, schoolId);
      if (result === null) throw ApiError.notFound('Device not found');
      logger.info({ deviceId: id }, '[rfid] Device removed');
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw ApiError.badRequest(err.message);
    }
  },

  async getFilterOptions() {
    return rfidDeviceRepository.getFilterOptions();
  },

  async exportDevices(schoolId, query) {
    return rfidDeviceRepository.findAllForExport(schoolId, query);
  },

  async getRecentActivity(schoolId, limit) {
    return rfidDeviceRepository.getRecentActivity(schoolId, limit);
  },
};
