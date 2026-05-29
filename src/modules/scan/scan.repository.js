// =============================================================================
// modules/scan/scan.repository.js — RESQID
// All DB reads/writes for the public QR scan flow.
// =============================================================================

import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';

/**
 * Find a token by UUID with all joined data for scan resolution.
 * Single query — no N+1.
 */
export const findTokenForScan = async (tokenId) => {
  return prisma.token.findUnique({
    where: { id: tokenId },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      schoolId: true,
      studentId: true,

      school: {
        select: {
          id: true,
          name: true,
          code: true,
          logoUrl: true,
          phone: true,
          address: true,
        },
      },

      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          photoUrl: true,
          grade: true,
          section: true,
          gender: true,
          isActive: true,

          parentLinks: {
            select: {
              parent: {
                select: {
                  devices: {
                    where: { isActive: true },
                    take: 3,
                    orderBy: { lastSeenAt: 'desc' },
                    select: { expoPushToken: true },
                  },
                },
              },
            },
          },

          cardVisibility: {
            select: { visibility: true },
          },

          emergencyProfile: {
            select: {
              bloodGroup: true,
              allergies: true,
              conditions: true,
              medications: true,
              doctorName: true,
              doctorPhone: true,
              notes: true,
              isComplete: true,
              contacts: {
                where: { isActive: true },
                orderBy: { priority: 'asc' },
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  relation: true,
                  priority: true,
                  callEnabled: true,
                  whatsappEnabled: true,
                },
              },
            },
          },
        },
      },
    },
  });
};

/**
 * Find student with parent contact info for emergency notifications.
 */
export const findStudentWithParent = async (studentId) => {
  if (!studentId) return null;

  return prisma.student.findUnique({
    where: { id: studentId },
    select: {
      firstName: true,
      lastName: true,
      parentLinks: {
        take: 1,
        select: {
          parent: {
            select: {
              email: true,
              name: true,
              phone: true,
              devices: {
                where: { isActive: true },
                take: 3,
                orderBy: { lastSeenAt: 'desc' },
                select: { expoPushToken: true },
              },
            },
          },
        },
      },
    },
  });
};

/**
 * Bulk insert scan logs (called by scan worker).
 */
export const bulkWriteScanLogs = async (entries) => {
  if (!Array.isArray(entries) || entries.length === 0) return;

  const valid = entries.filter((e) => e && e.tokenId && e.schoolId && e.result);

  if (valid.length === 0) return;

  try {
    await prisma.scanLog.createMany({ data: valid, skipDuplicates: true });
  } catch (err) {
    logger.error({ err: err.message, count: valid.length }, '[scan.repo] Bulk write failed');
    throw err;
  }
};
