// orchestrator/notifications/notification.dispatcher.js — RESQID
//
// Event type → channel routing.
// Routes incoming events to the correct notification channels.

import { EVENTS } from '../events/event.types.js';
import { sendSmsNotification } from './channel/sms.js';
import { sendPushNotificationChannel } from './channel/push.js';
import { sendEmailNotification } from './channel/email.js';
import { sendEmergencyAlert } from './channel/emergency.js';
import { prisma } from '#config/prisma.js';
import { logger } from '#config/logger.js';

// CONTACT LOADERS

/**
 * Load parent contacts for a student.
 */
const loadParentContacts = async (studentId) => {
  if (!studentId) return { phones: [], emails: [], tokens: [] };

  const links = await prisma.parentStudent.findMany({
    where: { studentId, isActive: true },
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

  const phones = links.map((l) => l.parent?.phone).filter(Boolean);
  const emails = links.map((l) => l.parent?.email).filter(Boolean);
  const tokens = links
    .flatMap((l) => l.parent?.devices?.map((d) => d.expoPushToken) ?? [])
    .filter(Boolean);

  return { phones, emails, tokens };
};

/**
 * Load teacher contacts.
 */
const loadTeacherContacts = async (teacherId) => {
  if (!teacherId) return { phone: null, email: null, tokens: [] };

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: {
      phone: true,
      email: true,
      schoolUser: {
        select: {
          devices: {
            where: { isActive: true, expoPushToken: { not: null } },
            select: { expoPushToken: true },
          },
        },
      },
    },
  });

  return {
    phone: teacher?.phone || null,
    email: teacher?.email || null,
    tokens: teacher?.schoolUser?.devices?.map((d) => d.expoPushToken) || [],
  };
};

// DISPATCH

export const dispatch = async (event) => {
  const { type, payload, schoolId } = event;

  try {
    switch (type) {
      //  EMERGENCY — Push + SMS + Email to all parents ─
      case EVENTS.EMERGENCY_ALERT_TRIGGERED:
      case EVENTS.EMERGENCY_ALERT_ESCALATED: {
        const { studentId, studentName, location, scannerIp } = payload;
        await sendEmergencyAlert({ studentId, studentName, location, scanData: { scannerIp } });
        break;
      }

      //  CRISIS — Teacher absent / Room unavailable
      case EVENTS.CRISIS_TRIGGERED:
      case EVENTS.TEACHER_ABSENT_DETECTED: {
        const { teacherId, date, timetableId } = payload;
        const contacts = await loadTeacherContacts(teacherId);

        // Notify school admins (push)
        if (contacts.tokens.length > 0) {
          await sendPushNotificationChannel({
            tokens: contacts.tokens,
            title: '🚨 Teacher Absent',
            body: `A teacher is absent today (${date}). Finding replacement...`,
            data: { type: 'CRISIS', teacherId, timetableId },
          });
        }
        break;
      }

      case EVENTS.ROOM_UNAVAILABLE_DETECTED: {
        const { roomId, timetableId } = payload;
        // Notify school admins
        logger.info({ roomId, timetableId }, '[dispatcher] Room unavailable — notification queued');
        break;
      }

      //  SUBSTITUTION — Notify substitute teacher ─
      case EVENTS.SUBSTITUTION_CREATED: {
        const { substituteId, originalTeacherId, date, periods } = payload;
        const contacts = await loadTeacherContacts(substituteId);

        if (contacts.tokens.length > 0) {
          await sendPushNotificationChannel({
            tokens: contacts.tokens,
            title: '📋 Substitution Alert',
            body: `You've been assigned to cover classes on ${date}. Check your timetable.`,
            data: { type: 'SUBSTITUTION', date },
          });
        }

        if (contacts.email) {
          await sendEmailNotification({
            to: contacts.email,
            subject: '📋 Substitution Assignment',
            html: `<p>You have been assigned to cover for a teacher on <strong>${date}</strong>.</p><p>Please check your updated timetable.</p>`,
          });
        }
        break;
      }

      //  TIMETABLE — Generation complete / updated
      case EVENTS.TIMETABLE_GENERATE_COMPLETED: {
        const { schoolId, timetableId } = payload;
        logger.info(
          { schoolId, timetableId },
          '[dispatcher] Timetable generated — notification queued'
        );
        // Could notify all teachers in the school
        break;
      }

      case EVENTS.TIMETABLE_GENERATE_FAILED: {
        const { schoolId, error } = payload;
        logger.warn({ schoolId, error }, '[dispatcher] Timetable generation failed');
        break;
      }

      //  WELLNESS — Burnout risk detected
      case EVENTS.TEACHER_BURNOUT_RISK_DETECTED: {
        const { teacherId, burnoutScore } = payload;
        const contacts = await loadTeacherContacts(teacherId);

        // Notify school HR/Admin
        logger.warn(
          { teacherId, burnoutScore },
          '[dispatcher] Burnout risk detected — admin notification needed'
        );
        break;
      }

      case EVENTS.TEACHER_ACCESSIBILITY_VIOLATION: {
        const { teacherId, roomId, reason } = payload;
        logger.warn(
          { teacherId, roomId, reason },
          '[dispatcher] Accessibility violation — admin notification needed'
        );
        break;
      }

      //  OTP REQUESTED — SMS only
      case EVENTS.USER_OTP_REQUESTED: {
        const { phone, otp } = payload;
        await sendSmsNotification({
          to: phone,
          body: otp,
          templateId: process.env.MSG91_OTP_TEMPLATE_ID,
          meta: { type: 'OTP' },
        });
        break;
      }

      //  STUDENT SCAN — Push to parents
      case EVENTS.STUDENT_QR_SCANNED: {
        const { studentId, studentName, location } = payload;
        const contacts = await loadParentContacts(studentId);

        if (contacts.tokens.length > 0) {
          await sendPushNotificationChannel({
            tokens: contacts.tokens,
            title: '📱 QR Code Scanned',
            body: `${studentName || 'Student'}'s card was scanned${location ? ` at ${location}` : ''}.`,
            data: { type: 'SCAN', studentId, location },
            priority: 'normal',
          });
        }
        break;
      }

      //  ANOMALY DETECTED — Push + Email to parents
      case EVENTS.ANOMALY_DETECTED: {
        const { studentId, studentName, anomalyType } = payload;
        const contacts = await loadParentContacts(studentId);

        if (contacts.tokens.length > 0) {
          await sendPushNotificationChannel({
            tokens: contacts.tokens,
            title: '⚠️ Security Notice',
            body: `Unusual activity detected for ${studentName || 'student'}'s card.`,
            data: { type: 'ANOMALY', studentId, anomalyType },
            priority: 'high',
          });
        }

        if (contacts.emails.length > 0) {
          await sendEmailNotification({
            to: contacts.emails,
            subject: '⚠️ RESQID Security Notice',
            html: `<p>Unusual activity detected for <strong>${studentName || 'student'}</strong>.</p><p><strong>Type:</strong> ${anomalyType}</p><p>Please check the app for details.</p>`,
          });
        }
        break;
      }

      //  PARENT REGISTERED — SMS welcome ─
      case EVENTS.PARENT_REGISTERED: {
        const { phone, parentName } = payload;
        if (phone) {
          await sendSmsNotification({
            to: phone,
            body: `Welcome to RESQID, ${parentName || 'Parent'}! Your account is active. Download the app to manage your child's safety.`,
          });
        }
        break;
      }

      //  NOTIFICATION
      case EVENTS.NOTIFICATION_SENT: {
        // Already processed — just log
        logger.debug({ payload }, '[dispatcher] Notification sent event received');
        break;
      }

      default:
        logger.debug({ type }, '[dispatcher] No handler for event type');
    }
  } catch (err) {
    logger.error({ err: err.message, eventType: type, payload }, '[dispatcher] Dispatch error');
  }
};
