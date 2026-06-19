// src/modules/settings/settings.repository.js
import prisma from '#config/prisma.js';

export class SettingsRepository {
  async upsert(schoolId, encryptedConfig, updatedBy = null) {
    return prisma.schoolSettings.upsert({
      where: { schoolId },
      update: {
        configEncrypted: encryptedConfig,
        updatedBy,
        updatedAt: new Date(),
      },
      create: {
        schoolId,
        configEncrypted: encryptedConfig,
        updatedBy,
      },
    });
  }

  async findBySchoolId(schoolId) {
    return prisma.schoolSettings.findUnique({
      where: { schoolId },
    });
  }
}