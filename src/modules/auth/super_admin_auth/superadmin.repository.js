// modules/auth/super_admin_auth/superadmin.repository.js — RESQID
// Super admin data access layer

import { prisma } from '#config/prisma.js';
import { BaseRepository } from '#shared/base/base.repository.js';

class SuperAdminRepository extends BaseRepository {
  constructor() {
    super(prisma.superAdmin);
  }

  /**
   * Find super admin by email (for login).
   */
  async findByEmail(email) {
    return this.model.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        isPasswordDefault: true,
        passwordChangedAt: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  /**
   * Find super admin by ID (profile, excludes password).
   */
  async findProfileById(id) {
    return this.model.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        isPasswordDefault: true,
        passwordChangedAt: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Update password hash.
   */
  async updatePassword(id, hashedPassword) {
    return this.model.update({
      where: { id },
      data: {
        passwordHash: hashedPassword,
        isPasswordDefault: false,
        passwordChangedAt: new Date(),
      },
    });
  }

  /**
   * Update last login timestamp.
   */
  async updateLastLogin(id) {
    return this.model.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Check if super admin is active.
   */
  async isActive(id) {
    const admin = await this.model.findUnique({
      where: { id },
      select: { isActive: true },
    });
    return admin?.isActive === true;
  }
}

export const superAdminRepo = new SuperAdminRepository();
