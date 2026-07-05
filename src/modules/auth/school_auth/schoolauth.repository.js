// =============================================================================
// modules/auth/school-auth.repository.js — RESQID
// School authentication data access layer
// =============================================================================

import { prisma } from '#config/prisma.js';
import { BaseRepository } from '#shared/base/base.repository.js';

class SchoolAuthRepository extends BaseRepository {
  constructor() {
    super(prisma.school);
  }

  /**
   * Find school by code (for login).
   */
  async findByCode(code) {
    return this.model.findUnique({
      where: { code },
      select: {
        id: true,
        name: true,
        code: true,
        password: true,
        email: true,
        phone: true,
        logoUrl: true,
        board: true,
        type: true,
        affiliation: true,
        city: true,
        state: true,
        country: true,
        status: true,
        timezone: true,
        features: true,
        planId: true,
        createdAt: true,
      },
    });
  }

  /**
   * Find school by email.
   */
  async findByEmail(email) {
    return this.model.findFirst({
      where: { email },
      select: {
        id: true,
        name: true,
        code: true,
        email: true,
        status: true,
      },
    });
  }

  /**
   * Update school password.
   */
  async updatePassword(id, hashedPassword) {
    return this.model.update({
      where: { id },
      data: { password: hashedPassword },
      select: { id: true, name: true, code: true },
    });
  }

  /**
   * Check if school is active (can login).
   */
  async isActive(id) {
    const school = await this.model.findUnique({
      where: { id },
      select: { status: true },
    });
    return school?.status === 'ACTIVE' || school?.status === 'TRIAL';
  }

  /**
   * Find school for profile (excludes password).
   */
  async findProfileById(id) {
    return this.model.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        email: true,
        phone: true,
        website: true,
        logoUrl: true,
        board: true,
        type: true,
        affiliation: true,
        estYear: true,
        street: true,
        city: true,
        state: true,
        country: true,
        postalCode: true,
        timezone: true,
        status: true,
        features: true,
        planId: true,
        academicYearStart: true,
        academicYearEnd: true,
        schoolStartTime: true,
        schoolEndTime: true,
        workingDays: true,
        currentTerm: true,
        createdAt: true,
      },
    });
  }
}

export const schoolAuthRepo = new SchoolAuthRepository();
