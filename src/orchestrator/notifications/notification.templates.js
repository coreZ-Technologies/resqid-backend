// orchestrator/notifications/notification.templates.js — RESQID
// Single source of truth for all notification templates across all channels.
// Email, SMS, Push — import from here, nowhere else.

import { logger } from '#config/logger.js';

// Email component imports
import OtpParentEmail from '#templates/email/otp-parent.jsx';
import WelcomeSchoolEmail from '#templates/email/welcome-school.jsx';
import WelcomeParentEmail from '#templates/email/welcome-parent.jsx';
import DeviceLoginEmail from '#templates/email/device-login.jsx';
import EmailChangedEmail from '#templates/email/email-changed.jsx';
import CardLockedEmail from '#templates/email/card-locked.jsx';
import OrderConfirmedEmail from '#templates/email/order-confirmed.jsx';
import OrderDeliveredEmail from '#templates/email/order-delivered.jsx';
import OrderRefundedEmail from '#templates/email/order-refunded.jsx';
import SchoolRenewalEmail from '#templates/email/school-renewal.jsx';
import AnomalyDetectedEmail from '#templates/email/anomaly-detected.jsx';
import EmergencyLogEmail from '#templates/email/emergency-log.jsx';
import CardRenewalRequestedEmail from '#templates/email/card-renewal-requested.jsx';
import InternalAlertEmail from '#templates/email/internal-alert.jsx';

// SMS + Push — re-exported from canonical source files
export { smsTemplates } from '#templates/sms/sms.templates.js';
export { pushTemplates } from '#templates/push/push.templates.js';

// Email Templates

export const emailTemplates = Object.freeze({
  // OTP
  OTP_PARENT: ({ userName, otpCode, expiryMinutes = 5 }) => ({
    subject: `Your RESQID Verification Code`,
    Component: OtpParentEmail,
    props: { userName: userName ?? 'Parent', otpCode, expiryMinutes },
  }),

  // Onboarding
  SCHOOL_ONBOARDED: ({
    schoolName,
    adminName,
    adminEmail,
    tempPassword,
    dashboardUrl,
    planName,
    planExpiry,
    cardCount,
  }) => ({
    subject: `Welcome to RESQID — ${schoolName}`,
    Component: WelcomeSchoolEmail,
    props: {
      schoolName,
      adminName,
      adminEmail,
      tempPassword,
      dashboardUrl,
      planName,
      planExpiry,
      cardCount,
    },
  }),

  PARENT_ONBOARDED: ({
    parentName,
    phone,
    studentName,
    studentClass,
    schoolName,
    cardId,
    appStoreUrl,
    playStoreUrl,
  }) => ({
    subject: `Welcome to RESQID — ${studentName}'s emergency ID is ready`,
    Component: WelcomeParentEmail,
    props: {
      parentName,
      phone,
      studentName,
      studentClass,
      schoolName,
      cardId,
      appStoreUrl,
      playStoreUrl,
    },
  }),

  // Security
  USER_DEVICE_LOGIN_NEW: ({ name, device, location, time }) => ({
    subject: 'New Login Detected — RESQID',
    Component: DeviceLoginEmail,
    props: { name, device, location, time },
  }),

  PARENT_EMAIL_CHANGED: ({ parentName, oldEmail, newEmail }) => ({
    subject: 'Your RESQID email address was changed',
    Component: EmailChangedEmail,
    props: { parentName, oldEmail, newEmail },
  }),

  PARENT_CARD_LOCKED: ({ parentName, studentName }) => ({
    subject: `Safety Profile Locked — ${studentName}`,
    Component: CardLockedEmail,
    props: { parentName: parentName ?? 'Parent', studentName },
  }),

  // Order Lifecycle
  ORDER_CONFIRMED: ({ schoolName, orderNumber, cardCount, amount }) => ({
    subject: `Order Confirmed — #${orderNumber}`,
    Component: OrderConfirmedEmail,
    props: { schoolName, orderNumber, cardCount, amount },
  }),

  ORDER_DELIVERED: ({ schoolName, orderNumber }) => ({
    subject: `Order Delivered — #${orderNumber}`,
    Component: OrderDeliveredEmail,
    props: { schoolName, orderNumber },
  }),

  ORDER_REFUNDED: ({ schoolName, orderNumber, amount }) => ({
    subject: `Order Refunded — #${orderNumber}`,
    Component: OrderRefundedEmail,
    props: { schoolName, orderNumber, amount },
  }),

  // School / Admin
  SCHOOL_RENEWAL_DUE: ({ schoolName, expiryDate, renewUrl }) => ({
    subject: `Subscription Renewal Due — ${schoolName}`,
    Component: SchoolRenewalEmail,
    props: { schoolName, expiryDate, renewUrl },
  }),

  // Safety / Alerts
  ANOMALY_DETECTED: ({ studentName, anomalyType, location, detectedAt }) => ({
    subject: `⚠️ Unusual Activity — ${studentName}`,
    Component: AnomalyDetectedEmail,
    props: { studentName, anomalyType, location, detectedAt },
  }),

  EMERGENCY_ALERT_LOG: ({ studentName, schoolName, location, scannedAt, dispatchResults }) => ({
    subject: `[RESQID] Emergency Alert — ${studentName}`,
    Component: EmergencyLogEmail,
    props: { studentName, schoolName, location, scannedAt, dispatchResults },
  }),

  // Parent Actions
  PARENT_CARD_RENEWAL_REQUESTED: ({ studentName, schoolName, parentPhone }) => ({
    subject: `Card Renewal Requested — ${studentName}`,
    Component: CardRenewalRequestedEmail,
    props: { studentName, schoolName, parentPhone },
  }),

  // Internal
  INTERNAL_ALERT: ({ alertType, message, data }) => ({
    subject: `[RESQID Internal] ${alertType}`,
    Component: InternalAlertEmail,
    props: { alertType, message, data },
  }),
});

// SMS Templates (Fallback — if sms.templates.js doesn't exist yet)

// Try importing, fall back to empty if file doesn't exist
let smsTemplates = {};
let pushTemplates = {};

try {
  const smsModule = await import('#templates/sms/sms.templates.js');
  smsTemplates = smsModule.smsTemplates || {};
} catch {
  logger.debug('[templates] SMS templates file not found — using empty defaults');
}

try {
  const pushModule = await import('#templates/push/push.templates.js');
  pushTemplates = pushModule.pushTemplates || {};
} catch {
  logger.debug('[templates] Push templates file not found — using empty defaults');
}

// Re-export with fallback
export { smsTemplates, pushTemplates };

// Helper: Get template by key

/**
 * Get an email template by key.
 * Returns null if template doesn't exist.
 */
export function getEmailTemplate(key, params = {}) {
  const template = emailTemplates[key];
  if (!template) {
    logger.warn({ key }, '[templates] Email template not found');
    return null;
  }
  return template(params);
}

/**
 * Get an SMS template by key.
 */
export function getSmsTemplate(key, params = {}) {
  if (!smsTemplates[key]) {
    logger.warn({ key }, '[templates] SMS template not found');
    return null;
  }
  return typeof smsTemplates[key] === 'function' ? smsTemplates[key](params) : smsTemplates[key];
}

/**
 * Get a push notification template by key.
 */
export function getPushTemplate(key, params = {}) {
  if (!pushTemplates[key]) {
    logger.warn({ key }, '[templates] Push template not found');
    return null;
  }
  return typeof pushTemplates[key] === 'function' ? pushTemplates[key](params) : pushTemplates[key];
}
