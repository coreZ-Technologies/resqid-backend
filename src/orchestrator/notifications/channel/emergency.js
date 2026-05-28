// =============================================================================
// orchestrator/notifications/channel/emergency.js — RESQID
// Emergency alert channel — SMS + Push to parents.
// Called by emergency.worker.js
// =============================================================================

import { logger } from '#config/logger.js';
import { prisma } from '#config/prisma.js';
import { getSms } from '#infrastructure/sms/sms.index.js';
import { getPush } from '#infrastructure/push/push.index.js';
import { ENV } from '#config/env.js';

// ─── SMS ──────────────────────────────────────────────────────────────────────

export const sendEmergencySms = async (phone, studentName, location) => {
  if (!ENV.EMERGENCY_SMS_ENABLED) {
    return { success: false, error: 'SMS disabled' };
  }

  try {
    const sms = getSms();
    const body = `RESQID ALERT: ${studentName}'s QR was scanned${location ? ` at ${location}` : ''}. Check the app immediately.`;
    const result = await sms.send(phone, body);
    return { success: result?.success || !!result?.id };
  } catch (err) {
    logger.error({ err: err.message, phone }, '[emergency] SMS failed');
    return { success: false, error: err.message };
  }
};

// ─── Push ─────────────────────────────────────────────────────────────────────

export const sendEmergencyPush = async (studentId, studentName, location) => {
  try {
    // Get parent Expo tokens through ParentStudent → Parent → Devices
    const links = await prisma.parentStudent.findMany({
      where: { studentId },
      select: {
        parent: {
          select: {
            devices: {
              where: { isActive: true, expoPushToken: { not: null } },
              select: { expoPushToken: true },
            },
          },
        },
      },
    });

    const tokens = links
      .flatMap((l) => l.parent?.devices?.map((d) => d.expoPushToken) ?? [])
      .filter(Boolean);

    if (!tokens.length) {
      return { success: false, error: 'No active devices' };
    }

    const push = getPush();
    const result = await push.sendToDevices(tokens, {
      title: '🚨 Emergency Alert',
      body: `${studentName} needs immediate assistance${location ? ` at ${location}` : ''}.`,
      data: { type: 'EMERGENCY', studentId, studentName, location },
    });

    return { success: result?.success || (result?.successCount ?? 0) > 0 };
  } catch (err) {
    logger.error({ err: err.message, studentId }, '[emergency] Push failed');
    return { success: false, error: err.message };
  }
};
