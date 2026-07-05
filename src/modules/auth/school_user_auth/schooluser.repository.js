// modules/auth/school_user_auth/school-user.repository.js — RESQID
// School user data access layer

import { prisma } from '#config/prisma.js';
import { BaseRepository } from '#shared/base/base.repository.js';

class SchoolUserRepository extends BaseRepository {
  constructor() {
    super(prisma.schoolUser);
  }

  /**
   * Find user by email (for login).
   */
  async findByEmail(email) {
    return this.model.findUnique({
      where: { email },
      select: {
        id: true,
        schoolId: true,
        name: true,
        email: true,
        phone: true,
        passwordHash: true,
        role: true,
        isPasswordDefault: true,
        passwordChangedAt: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        school: {
          select: {
            id: true,
            name: true,
            code: true,
            logoUrl: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Find user by ID (profile, excludes password).
   */
  async findProfileById(id) {
    return this.model.findUnique({
      where: { id },
      select: {
        id: true,
        schoolId: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isPasswordDefault: true,
        passwordChangedAt: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        school: {
          select: {
            id: true,
            name: true,
            code: true,
            logoUrl: true,
            status: true,
          },
        },
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
   * Check if user is active and school is not suspended.
   */
  async canLogin(id) {
    const user = await this.model.findUnique({
      where: { id },
      select: {
        isActive: true,
        school: {
          select: { status: true },
        },
      },
    });

    if (!user?.isActive) return false;
    if (user.school?.status === 'SUSPENDED' || user.school?.status === 'INACTIVE') return false;
    return true;
  }
}

export const schoolUserRepo = new SchoolUserRepository();
