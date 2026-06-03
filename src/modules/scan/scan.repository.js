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
          street: true,
          city: true,
          state: true,
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
            where: { isActive: true, isEmergency: true },
            select: {
              parent: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  email: true,
                  devices: {
                    where: { isActive: true, expoPushToken: { not: null } },
                    take: 3,
                    orderBy: { lastSeenAt: 'desc' },
                    select: { expoPushToken: true, platform: true },
                  },
                },
              },
            },
          },

          cardVisibility: {
            select: { visibility: true },
          },
        },
      },
    },
  });
};

/**
 * Find student with parent contact info for emergency notifications.
 */
export const findStudentWithParents = async (studentId) => {
  if (!studentId) return null;

  return prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      grade: true,
      section: true,
      photoUrl: true,
      parentLinks: {
        where: { isActive: true, isEmergency: true },
        select: {
          parent: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              devices: {
                where: { isActive: true, expoPushToken: { not: null } },
                take: 5,
                orderBy: { lastSeenAt: 'desc' },
                select: { expoPushToken: true, platform: true },
              },
            },
          },
        },
      },
    },
  });
};

/**
 * Bulk insert scan records (called by scan worker).
 * 🔧 Uses 'Scan' model (check your Prisma schema for the exact model name).
 */
export const bulkWriteScans = async (entries) => {
  if (!Array.isArray(entries) || entries.length === 0) return;

  const valid = entries.filter((e) => e && e.tokenId && e.schoolId && e.result);

  if (valid.length === 0) return;

  try {
    // 🔧 If your model is 'Scan' use prisma.scan, if 'ScanLog' use prisma.scanLog
    await prisma.scan.createMany({
      data: valid.map((e) => ({
        tokenId: e.tokenId,
        schoolId: e.schoolId,
        result: e.result,
        scannedAt: e.scannedAt || new Date(),
        ipAddress: e.ipAddress || null,
        device: e.device || null,
        latitude: e.latitude || null,
        longitude: e.longitude || null,
      })),
      skipDuplicates: true,
    });
  } catch (err) {
    logger.error({ err: err.message, count: valid.length }, '[scan.repo] Bulk write failed');
    throw err;
  }
};

/**
 * Create a single scan record (fire-and-forget).
 */
export const createScanRecord = async (data) => {
  try {
    return await prisma.scan.create({ data }); // 🔧 or prisma.scanLog
  } catch (err) {
    logger.error({ err: err.message }, '[scan.repo] Failed to create scan record');
    return null;
  }
};

/**
 * Check if token exists (lightweight check).
 */
export const tokenExists = async (tokenId) => {
  const count = await prisma.token.count({ where: { id: tokenId } });
  return count > 0;
};

/**
 * Find token status only (lightweight).
 */
export const findTokenStatus = async (tokenId) => {
  return prisma.token.findUnique({
    where: { id: tokenId },
    select: { id: true, status: true, expiresAt: true },
  });
};
