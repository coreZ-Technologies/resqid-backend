// orchestrator/notifications/channel/emergency.js — RESQID
// Emergency alert channel — SMS + Push to parents.
// Called by emergency.worker.js when a student's QR is scanned.

import { logger } from '#config/logger.js';
import { prisma } from '#config/prisma.js';
import { getSms } from '#infrastructure/sms/sms.index.js';
import { getPush } from '#infrastructure/push/push.index.js';
import { getEmail } from '#infrastructure/email/email.index.js';
import { ENV } from '#config/env.js';

// SMS

/**
 * Send emergency SMS to a parent's phone.
 * @param {string} phone - Parent's phone number
 * @param {string} studentName - Student's name
 * @param {string} [location] - Scan location
 * @param {Object} [options] - Additional options
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendEmergencySms = async (phone, studentName, location, options = {}) => {
  if (!ENV.FEATURE_EMERGENCY_ENABLED) {
    return { success: false, error: 'Emergency feature disabled' };
  }

  if (!phone) {
    return { success: false, error: 'Phone number required' };
  }

  try {
    const sms = getSms();
    const locationText = location ? ` at ${location}` : '';
    const body = `🚨 RESQID ALERT: ${studentName}'s emergency QR was scanned${locationText}. Check the app immediately: ${ENV.SCAN_BASE_URL || ''}`;

    const result = await sms.send(phone, body, {
      templateId: options.templateId || ENV.MSG91_EMERGENCY_TEMPLATE_ID,
    });

    logger.info({ phone: phone.slice(0, 6) + '…', studentName, location }, '[emergency] SMS sent');

    return { success: result?.success || !!result?.messageId, messageId: result?.messageId };
  } catch (err) {
    logger.error(
      { err: err.message, phone: phone.slice(0, 6) + '…', studentName },
      '[emergency] SMS failed'
    );
    return { success: false, error: err.message };
  }
};

// PUSH NOTIFICATION

/**
 * Send emergency push notification to all parents of a student.
 * @param {string} studentId - Student ID
 * @param {string} studentName - Student's name
 * @param {string} [location] - Scan location
 * @param {Object} [scanData] - Additional scan data
 * @returns {Promise<{success: boolean, sentCount?: number, error?: string}>}
 */
export const sendEmergencyPush = async (studentId, studentName, location, scanData = {}) => {
  try {
    // Get parent Expo tokens through ParentStudent → Parent → Devices
    const links = await prisma.parentStudent.findMany({
      where: {
        studentId,
        isEmergency: true,
        isActive: true,
        parent: {
          isActive: true,
        },
      },
      select: {
        parent: {
          select: {
            id: true,
            name: true,
            phone: true,
            devices: {
              where: {
                isActive: true,
                expoPushToken: { not: null },
              },
              select: {
                expoPushToken: true,
                platform: true,
              },
            },
          },
        },
      },
    });

    // Collect all unique tokens
    const tokens = [];
    const parentIds = new Set();

    for (const link of links) {
      if (link.parent?.devices) {
        for (const device of link.parent.devices) {
          if (device.expoPushToken) {
            tokens.push(device.expoPushToken);
            parentIds.add(link.parent.id);
          }
        }
      }
    }

    if (tokens.length === 0) {
      logger.warn(
        { studentId, studentName, parentsFound: links.length },
        '[emergency] No active devices for push'
      );
      return { success: false, error: 'No active devices', parentsNotified: 0 };
    }

    // Deduplicate tokens (same parent, multiple devices)
    const uniqueTokens = [...new Set(tokens)];

    const push = getPush();
    const result = await push.sendToDevices(uniqueTokens, {
      title: '🚨 Emergency Alert',
      body: `${studentName} needs immediate assistance${location ? ` at ${location}` : ''}. Tap to view details.`,
      data: {
        type: 'EMERGENCY',
        studentId,
        studentName,
        location,
        timestamp: new Date().toISOString(),
        ...scanData,
      },
      priority: 'high',
      sound: 'default',
      badge: 1,
    });

    logger.info(
      {
        studentId,
        studentName,
        tokensSent: uniqueTokens.length,
        successCount: result?.successCount || 0,
        failureCount: result?.failureCount || 0,
        parentsNotified: parentIds.size,
        deadTokens: result?.deadTokens?.length || 0,
      },
      '[emergency] Push sent'
    );

    // Clean up dead tokens
    if (result?.deadTokens?.length > 0) {
      await cleanupDeadTokens(result.deadTokens);
    }

    return {
      success: (result?.successCount || 0) > 0,
      sentCount: result?.successCount || 0,
      failureCount: result?.failureCount || 0,
      parentsNotified: parentIds.size,
    };
  } catch (err) {
    logger.error({ err: err.message, studentId, studentName }, '[emergency] Push failed');
    return { success: false, error: err.message };
  }
};

// EMAIL (Backup)

/**
 * Send emergency email to parents (backup channel).
 * @param {string[]} emails - Parent email addresses
 * @param {string} studentName - Student's name
 * @param {string} [location] - Scan location
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendEmergencyEmail = async (emails, studentName, location) => {
  if (!emails?.length) {
    return { success: false, error: 'No email addresses' };
  }

  try {
    const email = getEmail();
    const locationText = location ? ` at ${location}` : '';

    const result = await email.send({
      to: emails,
      subject: `🚨 Emergency Alert: ${studentName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <div style="background: #dc2626; color: white; padding: 20px; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; font-size: 20px;">🚨 Emergency Alert</h1>
          </div>
          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #991b1b;"><strong>${studentName}</strong>'s emergency QR was scanned${locationText}.</p>
            <p style="color: #7f1d1d;">Please check the RESQID app immediately for more details.</p>
            <a href="${ENV.SCAN_BASE_URL || '#'}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 10px;">Open RESQID App</a>
          </div>
        </div>
      `,
    });

    return { success: result?.success };
  } catch (err) {
    logger.error({ err: err.message, studentName }, '[emergency] Email failed');
    return { success: false, error: err.message };
  }
};

// ALL CHANNELS

/**
 * Send emergency alert through ALL available channels.
 * Called by emergency.worker.js
 *
 * @param {Object} params
 * @param {string} params.studentId
 * @param {string} params.studentName
 * @param {string} [params.location]
 * @param {Object} [params.scanData]
 * @returns {Promise<Object>}
 */
export const sendEmergencyAlert = async ({ studentId, studentName, location, scanData = {} }) => {
  const results = {
    push: null,
    sms: null,
    email: null,
  };

  // 1. Push notification (fastest, primary)
  results.push = await sendEmergencyPush(studentId, studentName, location, scanData);

  // 2. SMS (if push failed or as backup)
  if (!results.push?.success) {
    const parentPhones = await getParentPhones(studentId);
    if (parentPhones.length > 0) {
      const smsResults = await Promise.allSettled(
        parentPhones.map((phone) => sendEmergencySms(phone, studentName, location))
      );
      results.sms = smsResults.map((r, i) =>
        r.status === 'fulfilled'
          ? r.value
          : { success: false, error: r.reason?.message, phone: parentPhones[i] }
      );
    }
  }

  // 3. Email (backup, sent regardless)
  const parentEmails = await getParentEmails(studentId);
  if (parentEmails.length > 0) {
    results.email = await sendEmergencyEmail(parentEmails, studentName, location);
  }

  logger.info(
    {
      studentId,
      studentName,
      pushSent: results.push?.sentCount || 0,
      smsSent: results.sms?.filter((r) => r.success).length || 0,
      emailSent: results.email?.success || false,
    },
    '[emergency] All channels processed'
  );

  return results;
};

// HELPERS

/**
 * Get parent phone numbers for a student.
 */
async function getParentPhones(studentId) {
  const links = await prisma.parentStudent.findMany({
    where: { studentId, isEmergency: true, isActive: true },
    select: { parent: { select: { phone: true } } },
  });
  return links.map((l) => l.parent?.phone).filter(Boolean);
}

/**
 * Get parent email addresses for a student.
 */
async function getParentEmails(studentId) {
  const links = await prisma.parentStudent.findMany({
    where: { studentId, isEmergency: true, isActive: true },
    select: { parent: { select: { email: true } } },
  });
  return links.map((l) => l.parent?.email).filter(Boolean);
}

/**
 * Clean up dead Expo push tokens.
 */
async function cleanupDeadTokens(tokens) {
  try {
    await prisma.parentDevice.updateMany({
      where: { expoPushToken: { in: tokens } },
      data: { isActive: false, loggedOutAt: new Date(), logoutReason: 'Token invalidated by Expo' },
    });
    logger.info({ count: tokens.length }, '[emergency] Dead tokens cleaned up');
  } catch (err) {
    logger.error({ err: err.message }, '[emergency] Dead token cleanup failed');
  }
}
