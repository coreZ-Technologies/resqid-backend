// =============================================================================
// orchestrator/notifications/notification.templates.js — RESQID
// Single source of truth for all notification templates across all channels.
// Email, SMS, Push — import from here, nowhere else.
// =============================================================================

import { logger } from '#config/logger.js';

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES (React Email Components)
// ═══════════════════════════════════════════════════════════════════════════

import OtpParentEmail from '#templates/email/otp-parent.jsx';
import WelcomeSchoolEmail from '#templates/email/welcome-school.jsx';
import WelcomeParentEmail from '#templates/email/welcome-parent.jsx';
import DeviceLoginEmail from '#templates/email/device-login.jsx';
import EmailChangedEmail from '#templates/email/email-changed.jsx';
import CardLockedEmail from '#templates/email/card-locked.jsx';
import SchoolRenewalEmail from '#templates/email/school-renewal.jsx';
import AnomalyDetectedEmail from '#templates/email/anomaly-detected.jsx';
import EmergencyLogEmail from '#templates/email/emergency-log.jsx';
import CardRenewalRequestedEmail from '#templates/email/card-renewal-requested.jsx';
import InternalAlertEmail from '#templates/email/internal-alert.jsx';

export const emailTemplates = Object.freeze({
  // ── Auth / OTP ──────────────────────────────────────────────────────────
  OTP_PARENT: ({ userName, otpCode, expiryMinutes = 5 }) => ({
    subject: 'Your RESQID Verification Code',
    Component: OtpParentEmail,
    props: { userName: userName ?? 'Parent', otpCode, expiryMinutes },
  }),

  // ── Onboarding ──────────────────────────────────────────────────────────
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

  // ── Security ────────────────────────────────────────────────────────────
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

  // ── Safety / Alerts ─────────────────────────────────────────────────────
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

  // ── Parent Actions ──────────────────────────────────────────────────────
  PARENT_CARD_RENEWAL_REQUESTED: ({ studentName, schoolName, parentPhone }) => ({
    subject: `Card Renewal Requested — ${studentName}`,
    Component: CardRenewalRequestedEmail,
    props: { studentName, schoolName, parentPhone },
  }),

  // ── School / Admin ──────────────────────────────────────────────────────
  SCHOOL_RENEWAL_DUE: ({ schoolName, expiryDate, renewUrl }) => ({
    subject: `Subscription Renewal Due — ${schoolName}`,
    Component: SchoolRenewalEmail,
    props: { schoolName, expiryDate, renewUrl },
  }),

  // ── Internal ────────────────────────────────────────────────────────────
  INTERNAL_ALERT: ({ alertType, message, data }) => ({
    subject: `[RESQID Internal] ${alertType}`,
    Component: InternalAlertEmail,
    props: { alertType, message, data },
  }),
});

// ═══════════════════════════════════════════════════════════════════════════
// SMS TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export const smsTemplates = Object.freeze({
  OTP: ({ otp, expiryMinutes = 5 }) => ({
    body: `${otp} is your RESQID verification code. Valid for ${expiryMinutes} minutes.`,
  }),

  WELCOME_PARENT: ({ parentName }) => ({
    body: `Welcome to RESQID, ${parentName}! Your account is active. Download the app to manage your child's safety.`,
  }),

  EMERGENCY_ALERT: ({ studentName, time, location }) => ({
    body: `RESQID EMERGENCY: ${studentName}'s QR scanned at ${time}. Location: ${location}. Check app immediately.`,
  }),

  ATTENDANCE_ABSENT: ({ studentName, className }) => ({
    body: `RESQID: ${studentName} (${className}) was marked absent today.`,
  }),

  ATTENDANCE_TAP_IN: ({ studentName, time }) => ({
    body: `RESQID: ${studentName} arrived at school at ${time}.`,
  }),

  ATTENDANCE_TAP_OUT: ({ studentName, time }) => ({
    body: `RESQID: ${studentName} left school at ${time}.`,
  }),

  ATTENDANCE_LATE: ({ studentName, time }) => ({
    body: `RESQID: ${studentName} arrived late at ${time}.`,
  }),

  FEE_REMINDER: ({ studentName, amount, dueDate }) => ({
    body: `RESQID Fee Reminder: ₹${amount} due for ${studentName} by ${dueDate}. Pay via app.`,
  }),

  PTM_REMINDER: ({ studentName, ptmDate, ptmTime }) => ({
    body: `RESQID PTM Reminder: Meeting for ${studentName} on ${ptmDate} at ${ptmTime}.`,
  }),

  SUBSTITUTION_ASSIGNED: ({ date }) => ({
    body: `RESQID: You've been assigned to cover classes on ${date}. Check your timetable in the app.`,
  }),

  CARD_DEACTIVATED: ({ studentName, reason }) => ({
    body: `RESQID: ${studentName}'s ID card has been deactivated.${reason ? ` Reason: ${reason}` : ''}`,
  }),

  SCHOOL_RENEWAL: ({ schoolName, expiryDate, renewUrl }) => ({
    body: `RESQID: ${schoolName} subscription expires ${expiryDate}. Renew now: ${renewUrl}`,
  }),

  PHONE_CHANGED: () => ({
    body: "Your RESQID phone number has been changed. If this wasn't you, contact support.",
  }),

  ANOMALY: ({ studentName, anomalyType, location }) => ({
    body: `RESQID SECURITY: ${anomalyType} for ${studentName}${location ? ` at ${location}` : ''}. Check dashboard.`,
  }),
});

// ═══════════════════════════════════════════════════════════════════════════
// PUSH NOTIFICATION TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export const pushTemplates = Object.freeze({
  WELCOME_PARENT: ({ parentName }) => ({
    title: 'Welcome to RESQID',
    body: `Welcome ${parentName}! Your child's safety is now connected.`,
  }),

  WELCOME_TEACHER: ({ teacherName }) => ({
    title: 'Welcome to RESQID',
    body: `Welcome ${teacherName}! Your teaching schedule is now on RESQID.`,
  }),

  NEW_LOGIN: ({ device, location }) => ({
    title: '🔐 Security Alert',
    body: `New login from ${device}${location ? ` in ${location}` : ''}.`,
  }),

  PASSWORD_CHANGED: () => ({
    title: 'Password Changed',
    body: 'Your RESQID password was changed successfully.',
  }),

  EMAIL_VERIFIED: () => ({
    title: '✅ Email Verified',
    body: 'Your email address has been verified successfully.',
  }),

  STUDENT_ENROLLED: ({ studentName, className }) => ({
    title: 'Student Enrolled',
    body: `${studentName} has been enrolled in ${className}.`,
  }),

  QR_SCANNED: ({ studentName, location }) => ({
    title: '📱 QR Code Scanned',
    body: `${studentName}'s card was scanned${location ? ` at ${location}` : ''}.`,
  }),

  ATTENDANCE_TAP_IN: ({ studentName }) => ({
    title: '✅ Arrived',
    body: `${studentName} arrived at school.`,
  }),

  ATTENDANCE_TAP_OUT: ({ studentName }) => ({
    title: '🏠 Departed',
    body: `${studentName} left school.`,
  }),

  ATTENDANCE_ABSENT: ({ studentName }) => ({
    title: '📋 Absent',
    body: `${studentName} was marked absent today.`,
  }),

  ATTENDANCE_LATE: ({ studentName }) => ({
    title: '⏰ Late',
    body: `${studentName} arrived late.`,
  }),

  FEE_REMINDER: ({ studentName, amount, dueDate }) => ({
    title: '💰 Fee Reminder',
    body: `₹${amount} due for ${studentName} by ${dueDate}.`,
  }),

  PTM_REMINDER: ({ studentName, ptmDate, ptmTime }) => ({
    title: '👨‍🏫 PTM Reminder',
    body: `Meeting for ${studentName} on ${ptmDate} at ${ptmTime}.`,
  }),

  SUBSTITUTION: ({ date }) => ({
    title: '📋 Substitution Alert',
    body: `You've been assigned to cover classes on ${date}. Check your timetable.`,
  }),

  TIMETABLE_CHANGED: ({ message }) => ({
    title: '📅 Timetable Updated',
    body: message || 'Your timetable has been updated. Check the app for changes.',
  }),

  CARD_DEACTIVATED: ({ studentName }) => ({
    title: '🛑 Card Deactivated',
    body: `${studentName}'s ID card has been deactivated.`,
  }),

  CARD_LOCKED: ({ studentName }) => ({
    title: '🔒 Card Locked',
    body: `${studentName}'s safety profile has been locked.`,
  }),

  EMERGENCY: ({ studentName, time, location }) => ({
    title: '🚨 Emergency Alert',
    body: `${studentName}'s QR was scanned at ${time} near ${location}. Tap for details.`,
  }),

  ANOMALY: ({ studentName, anomalyType }) => ({
    title: '⚠️ Security Notice',
    body: `Unusual activity detected for ${studentName}'s card.`,
  }),

  ANNOUNCEMENT: ({ title, body }) => ({
    title: title || '📢 Announcement',
    body: body || 'New announcement from school.',
  }),
});

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get an email template by key.
 * Returns { subject, Component, props } or null if not found.
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
 * Returns { body } or null if not found.
 */
export function getSmsTemplate(key, params = {}) {
  const template = smsTemplates[key];
  if (!template) {
    logger.warn({ key }, '[templates] SMS template not found');
    return null;
  }
  return typeof template === 'function' ? template(params) : template;
}

/**
 * Get a push notification template by key.
 * Returns { title, body } or null if not found.
 */
export function getPushTemplate(key, params = {}) {
  const template = pushTemplates[key];
  if (!template) {
    logger.warn({ key }, '[templates] Push template not found');
    return null;
  }
  return typeof template === 'function' ? template(params) : template;
}
