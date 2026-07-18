// =============================================================================
// modules/auth/parent_user_auth/parent-user.repository.js — RESQID
// Parent user data access layer
// =============================================================================

import { prisma } from '#config/prisma.js';
import { BaseRepository } from '#shared/base/base.repository.js';
import crypto from 'crypto';

class ParentUserRepository extends BaseRepository {
  constructor() {
    super(prisma.parentUser);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INHERITED FROM BaseRepository:
  //   findById(id), create(data), update(id, data), delete(id),
  //   findMany({ where, skip, take, orderBy, include }), count(where)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Find parent by phone number (full profile with students).
   */
  async findByPhone(phone) {
    return this.model.findUnique({
      where: { phone },
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        photoUrl: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        occupation: true,
        isActive: true,
        isPhoneVerified: true,
        lastLoginAt: true,
        students: {
          where: { isActive: true },
          select: {
            relation: true,
            isPrimary: true,
            isEmergency: true,
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                grade: true,
                section: true,
                photoUrl: true,
                schoolId: true,
                school: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    logoUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Find parent profile by ID (with students).
   */
  async findProfileById(id) {
    return this.model.findUnique({
      where: { id },
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        photoUrl: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        occupation: true,
        canCall: true,
        canWhatsapp: true,
        canEmail: true,
        canSMS: true,
        isActive: true,
        isPhoneVerified: true,
        isEmergencyContact: true,
        emergencyPriority: true,
        lastLoginAt: true,
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true,
        students: {
          where: { isActive: true },
          select: {
            relation: true,
            isPrimary: true,
            isEmergency: true,
            priority: true,
            canPickup: true,
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                grade: true,
                section: true,
                photoUrl: true,
                schoolId: true,
                school: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    logoUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Find parent by email.
   */
  async findByEmail(email) {
    return this.model.findFirst({
      where: { email: email?.toLowerCase() },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        isActive: true,
      },
    });
  }

  /**
   * Check if phone is already registered.
   */
  async phoneExists(phone) {
    const result = await this.model.findUnique({
      where: { phone },
      select: { id: true },
    });
    return !!result;
  }

  /**
   * Create new parent user.
   */
  async createParent(data) {
    return this.model.create({
      data: {
        phone: data.phone,
        firstName: data.firstName,
        lastName: data.lastName || null,
        name: data.name,
        email: data.email?.toLowerCase() || null,
        photoUrl: data.photoUrl || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        pincode: data.pincode || null,
        occupation: data.occupation || null,
        isPhoneVerified: data.isPhoneVerified ?? false,
        isActive: data.isActive ?? true,
      },
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        isActive: true,
      },
    });
  }

  /**
   * Update parent profile.
   */
  async updateProfile(id, data) {
    return this.model.update({
      where: { id },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email?.toLowerCase() }),
        ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.state !== undefined && { state: data.state }),
        ...(data.pincode !== undefined && { pincode: data.pincode }),
        ...(data.occupation !== undefined && { occupation: data.occupation }),
      },
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        photoUrl: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        occupation: true,
      },
    });
  }

  /**
   * Update parent last login timestamp.
   */
  async updateLastLogin(id) {
    return this.model.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
        lastSeenAt: new Date(),
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CARD / TOKEN QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Find card/token by number (for registration validation).
   */
  async findCardByNumber(cardNumber) {
    return prisma.token.findFirst({
      where: {
        OR: [{ rfidTagNumber: cardNumber }, { scanCode: cardNumber }],
        status: { in: ['UNREGISTERED', 'ISSUED', 'ACTIVE'] },
      },
      select: {
        id: true,
        studentId: true,
        schoolId: true,
        status: true,
        isActive: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            grade: true,
            section: true,
            schoolId: true,
            school: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
  }

  /**
   * Link card to student after parent registration.
   */
  async linkCardToParentStudent(cardId, studentId, parentId) {
    return Promise.all([
      prisma.token.update({
        where: { id: cardId },
        data: {
          studentId,
          status: 'ACTIVE',
          issuedAt: new Date(),
        },
      }),
      prisma.parentStudent.upsert({
        where: {
          parentId_studentId: { parentId, studentId },
        },
        create: {
          parentId,
          studentId,
          relation: 'GUARDIAN',
          isPrimary: true,
          isEmergency: true,
        },
        update: {
          isPrimary: true,
          isEmergency: true,
        },
      }),
    ]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SESSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new session for parent.
   */
  async createSession(parentId, sessionId, refreshToken) {
    return prisma.userSession.create({
      data: {
        id: sessionId,
        parentUserId: parentId,
        refreshTokenHash: crypto.createHash('sha256').update(refreshToken).digest('hex'),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      select: { id: true },
    });
  }

  /**
   * Find session by refresh token.
   */
  async findSessionByToken(refreshToken) {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    return prisma.userSession.findUnique({
      where: { refreshTokenHash: hash },
      select: {
        id: true,
        parentUserId: true,
        expiresAt: true,
        revokedAt: true,
      },
    });
  }

  /**
   * Revoke a session.
   */
  async revokeSession(sessionId) {
    return prisma.userSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Revoke all sessions for a parent.
   */
  async revokeAllSessions(parentId) {
    return prisma.userSession.updateMany({
      where: {
        parentUserId: parentId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DEVICE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Upsert parent device (for push notifications).
   */
  async upsertDevice({ parentId, deviceFingerprint, platform, expoPushToken }) {
    return prisma.parentDevice.upsert({
      where: { deviceFingerprint },
      create: {
        parentId,
        deviceFingerprint,
        platform: platform || 'unknown',
        expoPushToken,
        isActive: true,
        lastSeenAt: new Date(),
      },
      update: {
        isActive: true,
        loggedOutAt: null,
        logoutReason: null,
        lastSeenAt: new Date(),
        expoPushToken: expoPushToken || undefined,
      },
    });
  }

  /**
   * Logout device.
   */
  async logoutDevice(deviceFingerprint, reason = 'USER_LOGOUT') {
    return prisma.parentDevice.update({
      where: { deviceFingerprint },
      data: {
        isActive: false,
        loggedOutAt: new Date(),
        logoutReason: reason,
      },
    });
  }
}

// Singleton export
export const parentUserRepo = new ParentUserRepository();
