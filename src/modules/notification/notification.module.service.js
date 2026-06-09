// =============================================================================
// notification.module.service.js — RESQID
// Business logic for the notification module.
// Coordinates repository, channel dispatch, preferences, and direct module calls.
// No event system — modules call these functions directly.
// =============================================================================

import { logger } from '#config/logger.js';
import { ApiError } from '#shared/response/ApiError.js';
import { prisma } from '#config/prisma.js';
import { enqueueNotification } from '#orchestrator/queues/queue.config.js';
import { sendPushNotificationChannel } from '#orchestrator/notifications/channel/push.js';
import { sendSmsNotification } from '#orchestrator/notifications/channel/sms.js';
import {
  sendEmailNotification,
  sendEmailWithTemplate,
} from '#orchestrator/notifications/channel/email.js';

import {
  createNotification,
  createManyNotifications,
  findNotificationById,
  findNotificationsByParent,
  findNotificationsBySchool,
  countUnreadInApp,
  markAsRead,
  markAllReadForParent,
  markAsFailed,
  markAsDelivered,
  upsertPreferences,
  findPreferencesByParent,
  deletePreferences,
} from './notification.repository.js';

import {
  NOTIFICATION_CHANNEL,
  NOTIFICATION_STATUS,
  NOTIFICATION_TYPE,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from './notification.constants.js';

import {
  isTerminalStatus,
  resolveEnabledChannels,
  isEventEnabled,
  parsePagination,
  paginatedResponse,
  formatNotification,
  buildNotificationData,
} from './notification.utils.js';

import { checkAllRateLimits } from '#orchestrator/policies/rate-limit.policy.js';

// ═══════════════════════════════════════════════════════════════════════════
// IN-APP PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Persist an IN_APP notification directly.
 * Used by all handlers to write the in-app record for the inbox feed.
 */
export const saveInAppNotification = async ({
  parentId,
  schoolUserId,
  schoolId,
  title,
  body,
  type,
  data = null,
}) => {
  return createNotification({
    parentId,
    schoolUserId,
    schoolId,
    title,
    body,
    type,
    data: buildNotificationData(type, data ?? {}),
    channel: NOTIFICATION_CHANNEL.IN_APP,
    status: NOTIFICATION_STATUS.SENT,
  });
};

// ═══════════════════════════════════════════════════════════════════════════
// FAN-OUT (Multi-Channel Dispatch)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fan-out a notification to multiple channels, respecting parent preferences.
 * Enqueues to notification worker for async delivery.
 */
export const fanOutNotification = async ({
  parentId,
  schoolUserId,
  schoolId,
  title,
  body,
  type,
  data = {},
  channels,
  eventSlug = null,
}) => {
  let activeChannels = channels;

  // Check parent preferences
  if (parentId) {
    const prefs = await findPreferencesByParent(parentId);

    if (eventSlug && !isEventEnabled(prefs, eventSlug)) {
      logger.debug({ parentId, eventSlug }, 'Notification suppressed by parent preference');
      return { count: 0 };
    }

    activeChannels = resolveEnabledChannels(prefs, channels);
  }

  if (!activeChannels.length) return { count: 0 };

  const jsonData = buildNotificationData(type, data);

  const rows = activeChannels.map((channel) => ({
    parentId: parentId ?? null,
    schoolUserId: schoolUserId ?? null,
    schoolId: schoolId ?? null,
    title,
    body,
    type,
    data: jsonData,
    channel,
    status: NOTIFICATION_STATUS.PENDING,
  }));

  const result = await createManyNotifications(rows);

  logger.info(
    { parentId, schoolUserId, type, channels: activeChannels, count: result.count },
    'Notifications fanned out'
  );

  return result;
};

// ═══════════════════════════════════════════════════════════════════════════
// PARENT INBOX
// ═══════════════════════════════════════════════════════════════════════════

export const getInbox = async (parentId, query = {}) => {
  const { skip, take, page } = parsePagination(query);

  const [rows, total] = await findNotificationsByParent(parentId, {
    skip,
    take,
    channels: [NOTIFICATION_CHANNEL.IN_APP],
  });

  return paginatedResponse(rows.map(formatNotification), total, page, take);
};

export const getUnreadCount = async (parentId) => {
  const unread = await countUnreadInApp(parentId);
  return { unread };
};

export const readNotification = async (notificationId, parentId) => {
  const notification = await findNotificationById(notificationId);

  if (!notification) throw ApiError.notFound('Notification not found');
  if (notification.parentId !== parentId) throw ApiError.forbidden('Access denied');
  if (isTerminalStatus(notification.status) && notification.status === NOTIFICATION_STATUS.READ) {
    return formatNotification(notification);
  }

  const updated = await markAsRead(notificationId);
  return formatNotification(updated);
};

export const readAllNotifications = async (parentId) => {
  const result = await markAllReadForParent(parentId);
  return { updated: result.count };
};

// ═══════════════════════════════════════════════════════════════════════════
// SCHOOL ADMIN
// ═══════════════════════════════════════════════════════════════════════════

export const getSchoolNotifications = async (schoolId, query = {}) => {
  const { skip, take, page } = parsePagination(query);

  const channels = query.channels ? query.channels.split(',') : undefined;
  const statuses = query.statuses ? query.statuses.split(',') : undefined;

  const [rows, total] = await findNotificationsBySchool(schoolId, {
    skip,
    take,
    channels,
    statuses,
  });

  return paginatedResponse(rows.map(formatNotification), total, page, take);
};

// ═══════════════════════════════════════════════════════════════════════════
// PREFERENCES
// ═══════════════════════════════════════════════════════════════════════════

export const getPreferences = async (parentId) => {
  const prefs = await findPreferencesByParent(parentId);
  if (!prefs) return { parentId, ...DEFAULT_NOTIFICATION_PREFERENCES };
  return prefs;
};

export const updatePreferences = async (parentId, updates) => {
  const allowed = [
    'smsEnabled',
    'emailEnabled',
    'pushEnabled',
    'inAppEnabled',
    'whatsappEnabled',
    'onScan',
    'onAttendance',
    'onAbsent',
    'onLate',
    'onFee',
    'onExam',
    'onEvent',
    'onEmergency',
    'onAnnouncement',
    'onHomework',
    'onReportCard',
    'quietHoursEnabled',
    'quietHoursStart',
    'quietHoursEnd',
    'quietHoursTimezone',
    'language',
    'digestMode',
    'maxPerHour',
  ];
  const safe = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));

  if (!Object.keys(safe).length) throw ApiError.badRequest('No valid preference fields provided');

  return upsertPreferences(parentId, safe);
};

export const resetPreferences = async (parentId) => {
  await deletePreferences(parentId);
  return null;
};

// ═══════════════════════════════════════════════════════════════════════════
// DELIVERY TRACKING
// ═══════════════════════════════════════════════════════════════════════════

export const recordDeliveryFailure = async (notificationId, reason) => {
  const notification = await findNotificationById(notificationId);
  if (!notification) throw ApiError.notFound('Notification not found');

  if (isTerminalStatus(notification.status)) {
    logger.warn(
      { notificationId, status: notification.status },
      'Ignoring failure — already terminal'
    );
    return formatNotification(notification);
  }

  const updated = await markAsFailed(notificationId, reason ?? null);
  logger.warn({ notificationId, reason }, 'Notification delivery failed');
  return formatNotification(updated);
};

// ═══════════════════════════════════════════════════════════════════════════
// RESOLVE RECIPIENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resolve recipients for a notification based on type.
 * Returns array of { parentId, phone, email, pushTokens }
 */
export const resolveRecipients = async (schoolId, recipients) => {
  const { type, ids } = recipients;

  const baseWhere = {
    isActive: true,
    parent: { isActive: true },
  };

  let where = { student: { schoolId }, ...baseWhere };

  switch (type) {
    case 'all':
      break;
    case 'class':
      where = { ...where, student: { ...where.student, classId: { in: ids } } };
      break;
    case 'section':
      where = { ...where, student: { ...where.student, sectionId: { in: ids } } };
      break;
    case 'individual':
      where = { studentId: { in: ids }, ...baseWhere };
      break;
    default:
      return [];
  }

  const links = await prisma.parentStudent.findMany({
    where,
    select: {
      parent: {
        select: {
          id: true,
          phone: true,
          email: true,
          devices: {
            where: { isActive: true, expoPushToken: { not: null } },
            select: { expoPushToken: true },
          },
        },
      },
    },
  });

  const parentMap = new Map();
  for (const link of links) {
    if (link.parent && !parentMap.has(link.parent.id)) {
      parentMap.set(link.parent.id, {
        parentId: link.parent.id,
        phone: link.parent.phone,
        email: link.parent.email,
        pushTokens: link.parent.devices.map((d) => d.expoPushToken),
      });
    }
  }

  return Array.from(parentMap.values());
};

// ═══════════════════════════════════════════════════════════════════════════
// AUTH NOTIFICATIONS — Called directly by auth module
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parent registered — SMS welcome + In-app + Push welcome
 */
export const notifyParentRegistered = async ({ parentId, parentName, phone, schoolId }) => {
  const title = 'Welcome to RESQID';
  const body = `Welcome ${parentName}! Your account is ready. Download the app to manage your child's safety.`;

  // In-app
  await saveInAppNotification({
    parentId,
    schoolId,
    title,
    body,
    type: NOTIFICATION_TYPE.PARENT_REGISTERED,
    data: { parentName },
  });

  // SMS welcome
  if (phone) {
    try {
      await sendSmsNotification({
        to: phone,
        body: `Welcome to RESQID, ${parentName}! Your account is active. Download the app to manage your child's safety.`,
        meta: { type: 'WELCOME' },
      });
    } catch (err) {
      logger.error({ err: err.message, parentId }, '[service] Welcome SMS failed');
    }
  }

  logger.info({ parentId, parentName }, '[service] Parent registered notification sent');
};

/**
 * OTP requested — SMS only
 */
export const notifyOtpRequested = async ({ phone, otp }) => {
  await sendSmsNotification({
    to: phone,
    body: otp,
    templateId: process.env.MSG91_OTP_TEMPLATE_ID,
    meta: { type: 'OTP' },
  });

  logger.info({ phone: phone.slice(0, 6) + '...' }, '[service] OTP sent');
};

/**
 * New device login detected — Push + Email security alert + In-app
 */
export const notifyNewDeviceLogin = async ({
  userId,
  userType,
  userName,
  device,
  location,
  time,
  email,
  pushTokens,
}) => {
  const title = 'New Login Detected';
  const body = `New login from ${device}${location ? ` in ${location}` : ''} on ${time}.`;

  // In-app for parent
  if (userType === 'PARENT') {
    await saveInAppNotification({
      parentId: userId,
      schoolId: null,
      title,
      body,
      type: NOTIFICATION_TYPE.NEW_DEVICE_LOGIN,
      data: { device, location, time },
    });
  }

  // Push
  if (pushTokens?.length) {
    try {
      await sendPushNotificationChannel({
        tokens: pushTokens,
        title: '🔐 Security Alert',
        body,
        data: { type: 'NEW_LOGIN', device, location },
        priority: 'high',
      });
    } catch (err) {
      logger.error({ err: err.message, userId }, '[service] Login push failed');
    }
  }

  // Email
  if (email) {
    try {
      await sendEmailNotification({
        to: email,
        subject: 'New Login Detected — RESQID',
        html: `
          <h2>Security Alert</h2>
          <p>Hi ${userName},</p>
          <p>A new login was detected on your RESQID account:</p>
          <ul>
            <li><strong>Device:</strong> ${device}</li>
            <li><strong>Location:</strong> ${location || 'Unknown'}</li>
            <li><strong>Time:</strong> ${time}</li>
          </ul>
          <p style="color:red;">If this wasn't you, change your password immediately.</p>
        `,
      });
    } catch (err) {
      logger.error({ err: err.message, userId }, '[service] Login email failed');
    }
  }

  logger.info({ userId, device }, '[service] New device login notification sent');
};

/**
 * Password changed — Email confirmation
 */
export const notifyPasswordChanged = async ({ userName, email }) => {
  if (!email) return;

  try {
    await sendEmailNotification({
      to: email,
      subject: 'Password Changed — RESQID',
      html: `
        <h2>Password Changed</h2>
        <p>Hi ${userName},</p>
        <p>Your RESQID account password was changed successfully.</p>
        <p>If you didn't make this change, contact support immediately.</p>
      `,
    });
    logger.info({ email }, '[service] Password change notification sent');
  } catch (err) {
    logger.error({ err: err.message }, '[service] Password change email failed');
  }
};

/**
 * Account locked — Email alert
 */
export const notifyAccountLocked = async ({ userName, email }) => {
  if (!email) return;

  try {
    await sendEmailNotification({
      to: email,
      subject: 'Account Locked — RESQID',
      html: `
        <h2>Account Locked</h2>
        <p>Hi ${userName},</p>
        <p>Your RESQID account has been locked due to multiple failed login attempts.</p>
        <p>Contact your school administrator or RESQID support to unlock.</p>
      `,
    });
    logger.info({ email }, '[service] Account locked notification sent');
  } catch (err) {
    logger.error({ err: err.message }, '[service] Account locked email failed');
  }
};

/**
 * Account deactivated — Email notification
 */
export const notifyAccountDeactivated = async ({ userName, email }) => {
  if (!email) return;

  try {
    await sendEmailNotification({
      to: email,
      subject: 'Account Deactivated — RESQID',
      html: `
        <h2>Account Deactivated</h2>
        <p>Hi ${userName},</p>
        <p>Your RESQID account has been deactivated.</p>
        <p>Contact your school administrator for more information.</p>
      `,
    });
  } catch (err) {
    logger.error({ err: err.message }, '[service] Account deactivated email failed');
  }
};

/**
 * School onboarded — Welcome email to admin
 */
export const notifySchoolOnboarded = async ({
  schoolName,
  adminName,
  adminEmail,
  tempPassword,
  dashboardUrl,
  planName,
  cardCount,
}) => {
  if (!adminEmail) return;

  try {
    // Use React Email template if available, fallback to HTML
    const html = `
      <h1>Welcome to RESQID, ${schoolName}!</h1>
      <p>Hi ${adminName},</p>
      <p>Your school has been onboarded to RESQID.</p>
      <p><strong>Dashboard:</strong> <a href="${dashboardUrl}">${dashboardUrl}</a></p>
      ${tempPassword ? `<p><strong>Temporary Password:</strong> ${tempPassword}</p>` : ''}
      ${planName ? `<p><strong>Plan:</strong> ${planName}</p>` : ''}
      ${cardCount ? `<p><strong>Cards:</strong> ${cardCount}</p>` : ''}
      <p>Please log in and change your password.</p>
    `;

    await sendEmailNotification({
      to: adminEmail,
      subject: `Welcome to RESQID — ${schoolName}`,
      html,
    });
    logger.info({ adminEmail, schoolName }, '[service] School onboarded notification sent');
  } catch (err) {
    logger.error({ err: err.message }, '[service] School onboarded email failed');
  }
};

/**
 * Teacher created — Email + Push welcome
 */
export const notifyTeacherCreated = async ({ teacherName, email, phone, schoolId, pushTokens }) => {
  const title = 'Welcome to RESQID';
  const body = `Welcome ${teacherName}! Your teaching schedule is now on RESQID.`;

  if (pushTokens?.length) {
    try {
      await sendPushNotificationChannel({
        tokens: pushTokens,
        title,
        body,
        data: { type: 'WELCOME_TEACHER' },
      });
    } catch (err) {
      logger.error({ err: err.message }, '[service] Teacher welcome push failed');
    }
  }

  if (email) {
    try {
      await sendEmailNotification({
        to: email,
        subject: 'Welcome to RESQID — Teacher Account Ready',
        html: `
          <h2>Welcome, ${teacherName}!</h2>
          <p>Your RESQID teacher account is ready.</p>
          <p>Download the app to view your class schedule and manage attendance.</p>
        `,
      });
    } catch (err) {
      logger.error({ err: err.message }, '[service] Teacher welcome email failed');
    }
  }

  logger.info({ teacherName }, '[service] Teacher created notification sent');
};

/**
 * Student enrolled — Push + Email to parent
 */
export const notifyStudentEnrolled = async ({
  parentId,
  parentName,
  studentName,
  className,
  schoolId,
  parentEmail,
  pushTokens,
}) => {
  const title = 'Student Enrolled';
  const body = `${studentName} has been enrolled in ${className}.`;

  await saveInAppNotification({
    parentId,
    schoolId,
    title,
    body,
    type: 'STUDENT_ENROLLED',
    data: { studentName, className },
  });

  if (pushTokens?.length) {
    try {
      await sendPushNotificationChannel({
        tokens: pushTokens,
        title,
        body,
        data: { type: 'STUDENT_ENROLLED', studentName },
      });
    } catch (err) {
      logger.error({ err: err.message }, '[service] Student enrolled push failed');
    }
  }

  if (parentEmail) {
    try {
      await sendEmailNotification({
        to: parentEmail,
        subject: `${studentName} Enrolled — RESQID`,
        html: `
          <p>Hi ${parentName},</p>
          <p><strong>${studentName}</strong> has been enrolled in <strong>${className}</strong>.</p>
          <p>Check the RESQID app for attendance updates and safety alerts.</p>
        `,
      });
    } catch (err) {
      logger.error({ err: err.message }, '[service] Student enrolled email failed');
    }
  }
};

/**
 * Contact info changed — Email to old + new
 */
export const notifyContactChanged = async ({
  parentName,
  oldEmail,
  newEmail,
  oldPhone,
  newPhone,
}) => {
  if (oldEmail && newEmail && oldEmail !== newEmail) {
    try {
      await sendEmailNotification({
        to: [oldEmail, newEmail],
        subject: 'Email Address Changed — RESQID',
        html: `
          <p>Hi ${parentName},</p>
          <p>Your RESQID email was changed from <strong>${oldEmail}</strong> to <strong>${newEmail}</strong>.</p>
          <p>If this wasn't you, contact support immediately.</p>
        `,
      });
    } catch (err) {
      logger.error({ err: err.message }, '[service] Email change notification failed');
    }
  }

  if (oldPhone && newPhone && oldPhone !== newPhone) {
    try {
      await sendSmsNotification({
        to: oldPhone,
        body: `Your RESQID phone number has been changed. If this wasn't you, contact support.`,
        meta: { type: 'PHONE_CHANGED' },
      });
    } catch (err) {
      logger.error({ err: err.message }, '[service] Phone change SMS failed');
    }
  }

  logger.info({ parentName }, '[service] Contact change notification sent');
};

/**
 * Email verified — Push + In-app confirmation
 */
export const notifyEmailVerified = async ({ parentId, email, pushTokens }) => {
  const title = 'Email Verified';
  const body = 'Your email address has been verified successfully.';

  await saveInAppNotification({
    parentId,
    schoolId: null,
    title,
    body,
    type: NOTIFICATION_TYPE.PARENT_EMAIL_VERIFIED,
    data: { email },
  });

  if (pushTokens?.length) {
    try {
      await sendPushNotificationChannel({
        tokens: pushTokens,
        title: '✅ Email Verified',
        body,
        data: { type: 'EMAIL_VERIFIED' },
      });
    } catch (err) {
      logger.error({ err: err.message }, '[service] Email verified push failed');
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// ATTENDANCE NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Student absent — Push + SMS to parent
 */
export const notifyStudentAbsent = async ({
  parentId,
  studentName,
  className,
  schoolId,
  phone,
  pushTokens,
}) => {
  const title = 'Student Absent';
  const body = `${studentName} (${className}) was marked absent today.`;

  await saveInAppNotification({
    parentId,
    schoolId,
    title,
    body,
    type: 'ATTENDANCE_ABSENT',
    data: { studentName, className },
  });

  if (pushTokens?.length) {
    await sendPushNotificationChannel({
      tokens: pushTokens,
      title: '📋 Absent',
      body,
      data: { type: 'ATTENDANCE_ABSENT', studentName },
    });
  }

  if (phone) {
    await sendSmsNotification({
      to: phone,
      body: `RESQID: ${studentName} (${className}) was marked absent today.`,
      meta: { type: 'ATTENDANCE' },
    });
  }
};

/**
 * Student tap-in — Push to parent (if enabled)
 */
export const notifyStudentTapIn = async ({
  parentId,
  studentName,
  className,
  schoolId,
  time,
  pushTokens,
}) => {
  const title = 'Tap-In';
  const body = `${studentName} (${className}) arrived at school at ${time}.`;

  await saveInAppNotification({
    parentId,
    schoolId,
    title,
    body,
    type: 'ATTENDANCE_TAP_IN',
    data: { studentName, className, time },
  });

  if (pushTokens?.length) {
    await sendPushNotificationChannel({
      tokens: pushTokens,
      title: '✅ Arrived',
      body,
      data: { type: 'ATTENDANCE_TAP_IN', studentName },
      priority: 'normal',
    });
  }
};

/**
 * Student tap-out — Push to parent
 */
export const notifyStudentTapOut = async ({
  parentId,
  studentName,
  className,
  schoolId,
  time,
  pushTokens,
}) => {
  const title = 'Tap-Out';
  const body = `${studentName} (${className}) left school at ${time}.`;

  await saveInAppNotification({
    parentId,
    schoolId,
    title,
    body,
    type: 'ATTENDANCE_TAP_OUT',
    data: { studentName, className, time },
  });

  if (pushTokens?.length) {
    await sendPushNotificationChannel({
      tokens: pushTokens,
      title: '🏠 Departed',
      body,
      data: { type: 'ATTENDANCE_TAP_OUT', studentName },
      priority: 'normal',
    });
  }
};

/**
 * Student late — Push to parent
 */
export const notifyStudentLate = async ({
  parentId,
  studentName,
  className,
  schoolId,
  time,
  pushTokens,
}) => {
  const title = 'Late Arrival';
  const body = `${studentName} (${className}) arrived late at ${time}.`;

  await saveInAppNotification({
    parentId,
    schoolId,
    title,
    body,
    type: 'ATTENDANCE_LATE',
    data: { studentName, className, time },
  });

  if (pushTokens?.length) {
    await sendPushNotificationChannel({
      tokens: pushTokens,
      title: '⏰ Late',
      body,
      data: { type: 'ATTENDANCE_LATE', studentName },
    });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// CARD NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Card deactivated — Push + SMS to parent
 */
export const notifyCardDeactivated = async ({
  parentId,
  studentName,
  phone,
  pushTokens,
  reason,
}) => {
  const title = 'Card Deactivated';
  const body = `${studentName}'s ID card has been deactivated.${reason ? ` Reason: ${reason}` : ''}`;

  await saveInAppNotification({
    parentId,
    schoolId: null,
    title,
    body,
    type: 'CARD_DEACTIVATED',
    data: { studentName, reason },
  });

  if (pushTokens?.length) {
    await sendPushNotificationChannel({
      tokens: pushTokens,
      title: '🛑 Card Deactivated',
      body,
      data: { type: 'CARD_DEACTIVATED', studentName },
      priority: 'high',
    });
  }

  if (phone) {
    await sendSmsNotification({
      to: phone,
      body: `RESQID: ${studentName}'s ID card has been deactivated.${reason ? ` Reason: ${reason}` : ''}`,
      meta: { type: 'CARD' },
    });
  }
};

/**
 * Card locked by parent — Push + Email
 */
export const notifyCardLocked = async ({
  parentId,
  parentName,
  studentName,
  email,
  pushTokens,
}) => {
  const title = 'Safety Profile Locked';
  const body = `${studentName}'s safety profile has been locked.`;

  await saveInAppNotification({
    parentId,
    schoolId: null,
    title,
    body,
    type: NOTIFICATION_TYPE.PARENT_CARD_LOCKED,
    data: { studentName },
  });

  if (pushTokens?.length) {
    await sendPushNotificationChannel({
      tokens: pushTokens,
      title: '🔒 Card Locked',
      body,
      data: { type: 'CARD_LOCKED', studentName },
    });
  }

  if (email) {
    await sendEmailNotification({
      to: email,
      subject: `Safety Profile Locked — ${studentName}`,
      html: `
        <p>Hi ${parentName},</p>
        <p>You've locked <strong>${studentName}'s</strong> safety profile. No changes can be made until unlocked.</p>
      `,
    });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// EMERGENCY NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * QR emergency scan — Push + SMS + Email to ALL parents + emergency contacts
 * Bypasses all preferences and quiet hours.
 */
export const notifyQrEmergencyScan = async ({
  studentId,
  studentName,
  schoolName,
  location,
  scannedAt,
  schoolId,
}) => {
  // This goes directly to the emergency worker via emergency queue
  // Import dynamically to avoid circular dependency
  const { enqueueEmergency } = await import('#orchestrator/queues/queue.config.js');

  await enqueueEmergency({
    payload: {
      alertId: `emergency-${Date.now()}`,
      studentId,
      schoolId,
      scannedAt: scannedAt || new Date().toISOString(),
      scannerLocation: location,
    },
  });

  logger.info({ studentId, studentName }, '[service] Emergency alert enqueued');
};

/**
 * Anomaly detected — Push + SMS to admins
 */
export const notifyAnomalyDetected = async ({
  studentName,
  anomalyType,
  location,
  detectedAt,
  adminPushTokens,
  adminPhones,
}) => {
  const title = '⚠️ Security Anomaly';
  const body = `${anomalyType} detected for ${studentName}${location ? ` at ${location}` : ''}.`;

  if (adminPushTokens?.length) {
    await sendPushNotificationChannel({
      tokens: adminPushTokens,
      title,
      body,
      data: { type: 'ANOMALY', studentName, anomalyType },
      priority: 'high',
    });
  }

  if (adminPhones?.length) {
    for (const phone of adminPhones) {
      await sendSmsNotification({
        to: phone,
        body: `RESQID SECURITY: ${anomalyType} for ${studentName}${location ? ` at ${location}` : ''}. Check dashboard.`,
        meta: { type: 'ANOMALY' },
      });
    }
  }

  logger.warn({ studentName, anomalyType }, '[service] Anomaly notification sent');
};

// ═══════════════════════════════════════════════════════════════════════════
// TIMETABLE NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Substitution assigned — Push + SMS to substitute teacher
 */
export const notifySubstitutionAssigned = async ({
  teacherId,
  teacherName,
  phone,
  pushTokens,
  date,
  periods,
  originalTeacherName,
}) => {
  const title = '📋 Substitution Alert';
  const body = `You've been assigned to cover ${originalTeacherName}'s classes on ${date}. Check your timetable.`;

  if (pushTokens?.length) {
    await sendPushNotificationChannel({
      tokens: pushTokens,
      title,
      body,
      data: { type: 'SUBSTITUTION', date, periods },
      priority: 'high',
    });
  }

  if (phone) {
    await sendSmsNotification({
      to: phone,
      body: `RESQID: You've been assigned to cover classes on ${date}. Check your timetable in the app.`,
      meta: { type: 'SUBSTITUTION' },
    });
  }

  logger.info({ teacherId, date }, '[service] Substitution notification sent');
};

/**
 * Timetable changed — Push to affected teachers
 */
export const notifyTimetableChanged = async ({ pushTokens, message }) => {
  if (pushTokens?.length) {
    await sendPushNotificationChannel({
      tokens: pushTokens,
      title: '📅 Timetable Updated',
      body: message || 'Your timetable has been updated. Check the app for changes.',
      data: { type: 'TIMETABLE_CHANGED' },
    });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// COMMUNICATION NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Announcement — Push + Email to parents
 */
export const notifyAnnouncement = async ({
  parentId,
  schoolId,
  title,
  body,
  pushTokens,
  email,
}) => {
  await saveInAppNotification({
    parentId,
    schoolId,
    title,
    body,
    type: 'ANNOUNCEMENT',
    data: { title, body },
  });

  if (pushTokens?.length) {
    await sendPushNotificationChannel({
      tokens: pushTokens,
      title,
      body,
      data: { type: 'ANNOUNCEMENT' },
    });
  }

  if (email) {
    await sendEmailNotification({
      to: email,
      subject: title,
      html: `<p>${body}</p>`,
    });
  }
};

/**
 * Fee reminder — Push + SMS + Email to parent
 */
export const notifyFeeReminder = async ({
  parentId,
  parentName,
  studentName,
  amount,
  dueDate,
  schoolId,
  phone,
  email,
  pushTokens,
}) => {
  const title = 'Fee Reminder';
  const body = `Fee of ₹${amount} for ${studentName} is due by ${dueDate}.`;

  await saveInAppNotification({
    parentId,
    schoolId,
    title,
    body,
    type: 'FEE_REMINDER',
    data: { studentName, amount, dueDate },
  });

  if (pushTokens?.length) {
    await sendPushNotificationChannel({
      tokens: pushTokens,
      title: '💰 Fee Reminder',
      body,
      data: { type: 'FEE_REMINDER', studentName },
    });
  }

  if (phone) {
    await sendSmsNotification({
      to: phone,
      body: `RESQID Fee Reminder: ₹${amount} due for ${studentName} by ${dueDate}. Pay via app.`,
      meta: { type: 'FEE' },
    });
  }

  if (email) {
    await sendEmailNotification({
      to: email,
      subject: `Fee Reminder — ${studentName}`,
      html: `
        <p>Hi ${parentName},</p>
        <p>Fee payment of <strong>₹${amount}</strong> for <strong>${studentName}</strong> is due by <strong>${dueDate}</strong>.</p>
        <p>Please make the payment at your earliest convenience.</p>
      `,
    });
  }
};

/**
 * PTM reminder — Push + SMS to parent
 */
export const notifyPtmReminder = async ({
  parentId,
  studentName,
  ptmDate,
  ptmTime,
  schoolId,
  phone,
  pushTokens,
}) => {
  const title = 'PTM Reminder';
  const body = `Parent-Teacher Meeting for ${studentName} on ${ptmDate} at ${ptmTime}.`;

  await saveInAppNotification({
    parentId,
    schoolId,
    title,
    body,
    type: 'PTM_REMINDER',
    data: { studentName, ptmDate, ptmTime },
  });

  if (pushTokens?.length) {
    await sendPushNotificationChannel({
      tokens: pushTokens,
      title: '👨‍🏫 PTM Reminder',
      body,
      data: { type: 'PTM', studentName },
    });
  }

  if (phone) {
    await sendSmsNotification({
      to: phone,
      body: `RESQID PTM Reminder: Meeting for ${studentName} on ${ptmDate} at ${ptmTime}.`,
      meta: { type: 'PTM' },
    });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * School renewal due — Email + SMS to admin
 */
export const notifySchoolRenewalDue = async ({
  schoolName,
  adminEmail,
  adminPhone,
  expiryDate,
  renewUrl,
}) => {
  if (adminEmail) {
    await sendEmailNotification({
      to: adminEmail,
      subject: `Subscription Renewal Due — ${schoolName}`,
      html: `
        <h2>Subscription Renewal Due</h2>
        <p>Your RESQID subscription for <strong>${schoolName}</strong> expires on <strong>${expiryDate}</strong>.</p>
        <p><a href="${renewUrl}">Renew now</a> to avoid service interruption.</p>
      `,
    });
  }

  if (adminPhone) {
    await sendSmsNotification({
      to: adminPhone,
      body: `RESQID: ${schoolName} subscription expires ${expiryDate}. Renew now: ${renewUrl}`,
      meta: { type: 'RENEWAL' },
    });
  }
};

/**
 * Internal alert — Email to RESQID team
 */
export const notifyInternalAlert = async ({ alertType, message, data }) => {
  const internalEmail = process.env.INTERNAL_ALERT_EMAIL;
  if (!internalEmail) return;

  await sendEmailNotification({
    to: internalEmail,
    subject: `[RESQID Internal] ${alertType}`,
    html: `
      <h2>${alertType}</h2>
      <p>${message}</p>
      ${data ? `<pre>${JSON.stringify(data, null, 2)}</pre>` : ''}
    `,
  });
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT ALL
// ═══════════════════════════════════════════════════════════════════════════

export default {
  // In-app
  saveInAppNotification,
  fanOutNotification,

  // Inbox
  getInbox,
  getUnreadCount,
  readNotification,
  readAllNotifications,

  // School admin
  getSchoolNotifications,

  // Preferences
  getPreferences,
  updatePreferences,
  resetPreferences,

  // Delivery
  recordDeliveryFailure,

  // Recipients
  resolveRecipients,

  // Auth
  notifyParentRegistered,
  notifyOtpRequested,
  notifyNewDeviceLogin,
  notifyPasswordChanged,
  notifyAccountLocked,
  notifyAccountDeactivated,
  notifySchoolOnboarded,
  notifyTeacherCreated,
  notifyStudentEnrolled,
  notifyContactChanged,
  notifyEmailVerified,

  // Attendance
  notifyStudentAbsent,
  notifyStudentTapIn,
  notifyStudentTapOut,
  notifyStudentLate,

  // Card
  notifyCardDeactivated,
  notifyCardLocked,

  // Emergency
  notifyQrEmergencyScan,
  notifyAnomalyDetected,

  // Timetable
  notifySubstitutionAssigned,
  notifyTimetableChanged,

  // Communication
  notifyAnnouncement,
  notifyFeeReminder,
  notifyPtmReminder,

  // System
  notifySchoolRenewalDue,
  notifyInternalAlert,
};
