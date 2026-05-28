// =============================================================================
// orchestrator/jobs/cleanupExpoTokens.job.js — RESQID
// Daily cleanup of invalid/expired Expo push tokens.
// =============================================================================

import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';
import { Expo } from 'expo-server-sdk';

export const cleanupExpoTokens = async () => {
  const start = Date.now();
  logger.info('[cleanupExpoTokens] Starting');

  try {
    // 1. Find tokens that failed with DeviceNotRegistered in last 7 days
    const failedNotifications = await prisma.notification.findMany({
      where: {
        channel: 'PUSH',
        status: 'FAILED',
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        failReason: { contains: 'DeviceNotRegistered', mode: 'insensitive' },
      },
      select: { data: true },
      take: 1000,
    });

    const failedTokens = new Set();
    for (const notif of failedNotifications) {
      const token = notif.data?.token || notif.data?.deviceToken;
      if (token) failedTokens.add(token);
    }

    logger.info({ count: failedTokens.size }, '[cleanupExpoTokens] Failed tokens found');

    // 2. Find all active devices with push tokens
    const allDevices = await prisma.parentDevice.findMany({
      where: {
        isActive: true,
        expoPushToken: { not: null },
      },
      select: {
        id: true,
        expoPushToken: true,
      },
    });

    const tokensToDeactivate = [];
    const tokensToClear = [];

    for (const device of allDevices) {
      const token = device.expoPushToken;

      // Invalid syntax — clear token
      if (!Expo.isExpoPushToken(token)) {
        tokensToClear.push(device.id);
        continue;
      }

      // Recent failures — deactivate
      if (failedTokens.has(token)) {
        tokensToDeactivate.push(device.id);
      }
    }

    // 3. Find stale tokens (not seen in 60+ days)
    const staleDevices = await prisma.parentDevice.findMany({
      where: {
        isActive: true,
        expoPushToken: { not: null },
        lastSeenAt: { lt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
      },
      select: { id: true },
    });

    const staleIds = staleDevices.map((d) => d.id);
    const allDeactivateIds = [...new Set([...tokensToDeactivate, ...staleIds])];

    // 4. Update deactivated devices
    if (allDeactivateIds.length > 0) {
      await prisma.parentDevice.updateMany({
        where: { id: { in: allDeactivateIds } },
        data: {
          isActive: false,
          loggedOutAt: new Date(),
          logoutReason: 'TOKEN_CLEANUP',
        },
      });
      logger.info({ count: allDeactivateIds.length }, '[cleanupExpoTokens] Deactivated');
    }

    // 5. Clear invalid tokens
    if (tokensToClear.length > 0) {
      await prisma.parentDevice.updateMany({
        where: { id: { in: tokensToClear } },
        data: { expoPushToken: null },
      });
      logger.info({ count: tokensToClear.length }, '[cleanupExpoTokens] Cleared invalid tokens');
    }

    const duration = Date.now() - start;
    logger.info(
      { deactivated: allDeactivateIds.length, cleared: tokensToClear.length, durationMs: duration },
      '[cleanupExpoTokens] Complete'
    );

    return { deactivated: allDeactivateIds.length, cleared: tokensToClear.length };
  } catch (err) {
    logger.error({ err: err.message }, '[cleanupExpoTokens] Failed');
    throw err;
  }
};

export default cleanupExpoTokens;
