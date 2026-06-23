// src/modules/users/user.service.js
import { prisma } from '#config/prisma.js';
import { userRepository } from './user.repository.js';
import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';
import { comparePassword, hashPassword } from '#shared/security/hashUtil.js';

export const userService = {
  async getStats(schoolId) {
    return userRepository.getStats(schoolId);
  },

  async list(schoolId, query) {
    const { users, total, page, limit } = await userRepository.findAll(schoolId, query);
    return {
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    };
  },

  async getOne(id, schoolId) {
    const user = await userRepository.findById(id, schoolId);
    if (!user) throw ApiError.notFound('User not found');
    return user;
  },

  async create(schoolId, data) {
    // Check email uniqueness
    const emailAvailable = await userRepository.isEmailAvailable(data.email, schoolId);
    if (!emailAvailable) {
      throw ApiError.conflict('Email address is already registered in this school');
    }

    // Check phone uniqueness if provided
    if (data.phone) {
      const phoneAvailable = await userRepository.isPhoneAvailable(data.phone, schoolId);
      if (!phoneAvailable) {
        throw ApiError.conflict('Phone number is already registered in this school');
      }
    }

    const result = await userRepository.create(schoolId, data);
    logger.info({ schoolId, userId: result.id, role: data.role }, '[user] Created');
    return result;
  },

  async update(id, schoolId, data) {
    const existing = await userRepository.findById(id, schoolId);
    if (!existing) throw ApiError.notFound('User not found');

    // Check email uniqueness if changed
    if (data.email && data.email !== existing.email) {
      const available = await userRepository.isEmailAvailable(data.email, schoolId, id);
      if (!available) {
        throw ApiError.conflict('Email address is already registered in this school');
      }
    }

    // Check phone uniqueness if changed
    if (data.phone !== undefined && data.phone !== existing.phone) {
      const available = await userRepository.isPhoneAvailable(data.phone, schoolId, id);
      if (!available) {
        throw ApiError.conflict('Phone number is already registered in this school');
      }
    }

    const result = await userRepository.update(id, schoolId, data);
    logger.info({ userId: id, schoolId }, '[user] Updated');
    return result;
  },

  async changePassword(id, schoolId, currentPassword, newPassword) {
    // Fetch user including password hash
    const user = await prisma.schoolUser.findFirst({
      where: { id, schoolId },
      select: { id: true, passwordHash: true },
    });
    if (!user) throw ApiError.notFound('User not found');

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw ApiError.unauthorized('Current password is incorrect');
    }

    await userRepository.changePassword(id, newPassword);
    logger.info({ userId: id }, '[user] Password changed');
    return { success: true };
  },

  async resetPassword(id, schoolId, newPassword) {
    const existing = await userRepository.findById(id, schoolId);
    if (!existing) throw ApiError.notFound('User not found');

    await userRepository.resetPassword(id, newPassword);
    logger.info({ userId: id }, '[user] Password reset by admin');
    return { success: true };
  },

  async remove(id, schoolId) {
    const existing = await userRepository.findById(id, schoolId);
    if (!existing) throw ApiError.notFound('User not found');

    await userRepository.remove(id, schoolId);
    logger.info({ userId: id, schoolId }, '[user] Deactivated');
    return { success: true };
  },

  async reactivate(id, schoolId) {
    const existing = await userRepository.findById(id, schoolId);
    if (!existing) throw ApiError.notFound('User not found');
    if (existing.status === 'Active') throw ApiError.conflict('User is already active');

    await userRepository.reactivate(id, schoolId);
    logger.info({ userId: id, schoolId }, '[user] Reactivated');
    return { success: true };
  },

  async exportUsers(schoolId, query) {
    return userRepository.findAllForExport(schoolId, query);
  },
};