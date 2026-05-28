// =============================================================================
// orchestrator/notifications/notification.dispatcher.js — RESQID
//
// Event type → channel routing.
// Emergency → Push + SMS to parents
// OTP → SMS only
// Attendance → Push to parents
// Anomaly → Push + Email to parents
// =============================================================================

import { EVENTS } from '../events/event.types.js';
import { sendSmsNotification } from './channel/sms.js';
import { sendPushNotificationChannel } from './channel/push.js';
import { sendEmailNotification } from './channel/email.js';
import { getSms } from '#infrastructure/sms/sms.index.js';
import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';

// ─── Contact Loaders ──────────────────────────────────────────────────────────

const loadParentContacts = async (studentId) => {
  if (!studentId) return { phones: [], email: null, tokens: [] };

  const links = await prisma.parentStudent.findMany({
    where: { studentId },
    select: {
      parent: {
        select: {
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

  const phones = links.map((l) => l.parent.phone).filter(Boolean);
  const email = links.find((l) => l.parent.email)?.parent.email || null;
  const tokens = links.flatMap((l) => l.parent.devices.map((d) => d.expoPushToken)).filter(Boolean);

  return { phones, email, tokens };
};

// ═══════════════════════════════════════════════════════════════════════════════
// DISPATCH
// ═══════════════════════════════════════════════════════════════════════════════

export const dispatch = async (event) => {
  const { type, payload, schoolId } = event;

  try {
    switch (type) {
      // ── EMERGENCY QR SCANNED → Push + SMS to all parents ─────────────────
      case EVENTS.EMERGENCY_QR_SCANNED:
      case EVENTS.EMERGENCY_ALERT_TRIGGERED:
      case EVENTS.EMERGENCY_ALERT_ESCALATED: {
        const { studentId, studentName, location, scannedAt } = payload;
        const contacts = await loadParentContacts(studentId);

        const formattedTime = scannedAt
          ? new Date(scannedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
          : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

        const locText = location || 'Unknown';

        // Push to all parent devices
        if (contacts.tokens.length > 0) {
          await sendPushNotificationChannel({
            tokens: contacts.tokens,
            title: '🚨 Emergency Alert',
            body: `${studentName || 'Student'}'s QR was scanned at ${locText}.`,
            data: { type: 'EMERGENCY', studentId },
          }).catch((err) => logger.error({ err: err.message }, '[dispatcher] Push failed'));
        }

        // SMS to all parent phones
        for (const phone of contacts.phones) {
          await sendSmsNotification({
            to: phone,
            body: `RESQID ALERT: ${studentName || 'Student'}'s QR was scanned at ${locText} at ${formattedTime}. Check the app immediately.`,
          }).catch((err) => logger.error({ err: err.message }, '[dispatcher] SMS failed'));
        }

        // Email to parent
        if (contacts.email) {
          await sendEmailNotification({
            to: contacts.email,
            subject: '🚨 RESQID Emergency Alert',
            html: `<p><strong>${studentName || 'Student'}'s</strong> QR code was scanned.</p><p><strong>Location:</strong> ${locText}</p><p><strong>Time:</strong> ${formattedTime}</p>`,
          }).catch((err) => logger.error({ err: err.message }, '[dispatcher] Email failed'));
        }

        break;
      }

      // ── OTP REQUESTED → SMS only ──────────────────────────────────────────
      case EVENTS.USER_OTP_REQUESTED: {
        const { phone, otp } = payload;
        const sms = getSms();
        await sms.sendOtp(phone, otp);
        break;
      }

      // ── ATTENDANCE MARKED → Push to parents ──────────────────────────────
      case EVENTS.ATTENDANCE_MARKED: {
        const { studentId, status } = payload;
        const contacts = await loadParentContacts(studentId);

        if (contacts.tokens.length > 0) {
          await sendPushNotificationChannel({
            tokens: contacts.tokens,
            title: 'Attendance Update',
            body: `Your child was marked ${status} today.`,
            data: { type: 'ATTENDANCE', studentId },
          });
        }
        break;
      }

      // ── ANOMALY DETECTED → Push + Email to parents ───────────────────────
      case EVENTS.ANOMALY_DETECTED: {
        const { studentId, studentName, anomalyType, severity } = payload;
        const contacts = await loadParentContacts(studentId);

        if (contacts.tokens.length > 0) {
          await sendPushNotificationChannel({
            tokens: contacts.tokens,
            title: '⚠️ Security Notice',
            body: `Unusual activity detected for ${studentName || 'student'}'s card.`,
            data: { type: 'ANOMALY', studentId, anomalyType },
          });
        }

        if (contacts.email) {
          await sendEmailNotification({
            to: contacts.email,
            subject: '⚠️ RESQID Security Notice',
            html: `<p>Unusual activity detected for <strong>${studentName || 'student'}</strong>.</p><p><strong>Type:</strong> ${anomalyType}</p><p><strong>Severity:</strong> ${severity}</p>`,
          });
        }
        break;
      }

      // ── STUDENT QR SCANNED → Push to parents ─────────────────────────────
      case EVENTS.STUDENT_QR_SCANNED: {
        const { studentId, studentName, location } = payload;
        const contacts = await loadParentContacts(studentId);

        if (contacts.tokens.length > 0) {
          await sendPushNotificationChannel({
            tokens: contacts.tokens,
            title: 'QR Code Scanned',
            body: `${studentName || 'Student'}'s QR was scanned${location ? ` at ${location}` : ''}.`,
            data: { type: 'SCAN', studentId },
          });
        }
        break;
      }

      // ── PARENT REGISTERED → SMS welcome ──────────────────────────────────
      case EVENTS.PARENT_REGISTERED: {
        const { phone, parentName } = payload;
        if (phone) {
          await sendSmsNotification({
            to: phone,
            body: `Welcome to RESQID, ${parentName || 'Parent'}! Your account is active. Download the app to manage your child's safety profile.`,
          });
        }
        break;
      }

      default:
        logger.debug({ type }, '[dispatcher] No handler for event type');
    }
  } catch (err) {
    logger.error({ err: err.message, eventType: type }, '[dispatcher] Error');
  }
};
