// TODO: Add implementation
// =============================================================================
// notification.repository.js — RESQID School Admin
//
// All Prisma queries for the school-admin notification module.
// No business logic here — pure data access.
//
// Assumed Prisma schema (add to schema.prisma):
//
//   model Notification {
//     id         String               @id @default(cuid())
//     schoolId   String
//     school     School               @relation(fields: [schoolId], references: [id])
//     type       NotificationType
//     severity   NotificationSeverity @default(INFO)
//     title      String
//     body       String
//     meta       Json?                // arbitrary context (studentId, cardId, etc.)
//     isRead     Boolean              @default(false)
//     readAt     DateTime?
//     createdAt  DateTime             @default(now())
//     updatedAt  DateTime             @updatedAt
//
//     @@index([schoolId, isRead])
//     @@index([schoolId, type])
//     @@index([schoolId, createdAt])
//   }
//
//   model NotificationPreference {
//     id          String               @id @default(cuid())
//     schoolId    String
//     school      School               @relation(fields: [schoolId], references: [id])
//     type        NotificationType
//     inApp       Boolean              @default(true)
//     email       Boolean              @default(true)
//     sms         Boolean              @default(false)
//     pushEnabled Boolean              @default(true)
//     updatedAt   DateTime             @updatedAt
//
//     @@unique([schoolId, type])
//     @@index([schoolId])
//   }
//
//   enum NotificationType {
//     EMERGENCY_ALERT_TRIGGERED
//     EMERGENCY_ALERT_ESCALATED
//     ANOMALY_DETECTED
//     STUDENT_QR_SCANNED
//     STUDENT_CARD_EXPIRING
//     PARENT_CARD_LOCKED
//     PARENT_CARD_REPLACE_REQUESTED
//     PARENT_CARD_RENEWAL_REQUESTED
//   }
//
//   enum NotificationSeverity { INFO  WARNING  CRITICAL }
// =============================================================================

import { prisma } from '#config/prisma.js';

// ─── Notification select shape (consistent across all queries) ────────────────

const NOTIFICATION_SELECT = {
  id:        true,
  schoolId:  true,
  type:      true,
  severity:  true,
  title:     true,
  body:      true,
  meta:      true,
  isRead:    true,
  readAt:    true,
  createdAt: true,
  updatedAt: true,
};

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * Paginated list of notifications for a school.
 * Returns { notifications, total }.
 */
export async function findNotifications({ schoolId, filters, page, limit }) {
  const { isRead, type, severity, from, to } = filters;

  const where = {
    schoolId,
    ...(isRead !== undefined && { isRead }),
    ...(type      && { type }),
    ...(severity  && { severity }),
    ...(from || to
      ? {
          createdAt: {
            ...(from && { gte: new Date(from) }),
            ...(to   && { lte: new Date(to) }),
          },
        }
      : {}),
  };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      select:  NOTIFICATION_SELECT,
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * limit,
      take:    limit,
    }),
    prisma.notification.count({ where }),
  ]);

  return { notifications, total };
}

// ─── Get single ───────────────────────────────────────────────────────────────

export async function findNotificationById({ notificationId, schoolId }) {
  return prisma.notification.findFirst({
    where:  { id: notificationId, schoolId },
    select: NOTIFICATION_SELECT,
  });
}

// ─── Unread count ─────────────────────────────────────────────────────────────

export async function countUnread({ schoolId }) {
  return prisma.notification.count({
    where: { schoolId, isRead: false },
  });
}

// ─── Mark single read / unread ────────────────────────────────────────────────

export async function markNotificationRead({ notificationId, schoolId, isRead }) {
  return prisma.notification.updateMany({
    where: { id: notificationId, schoolId },
    data: {
      isRead,
      readAt: isRead ? new Date() : null,
    },
  });
}

// ─── Bulk mark read ───────────────────────────────────────────────────────────

export async function bulkMarkRead({ schoolId, ids, markAll }) {
  const where = markAll
    ? { schoolId, isRead: false }
    : { schoolId, id: { in: ids }, isRead: false };

  return prisma.notification.updateMany({
    where,
    data: { isRead: true, readAt: new Date() },
  });
}

// ─── Delete single ────────────────────────────────────────────────────────────

export async function deleteNotification({ notificationId, schoolId }) {
  // deleteMany instead of delete — avoids P2025 throw when not found
  return prisma.notification.deleteMany({
    where: { id: notificationId, schoolId },
  });
}

// ─── Bulk delete ──────────────────────────────────────────────────────────────

export async function bulkDeleteNotifications({ schoolId, ids, deleteAll, onlyRead }) {
  let where;

  if (deleteAll) {
    where = { schoolId, ...(onlyRead ? { isRead: true } : {}) };
  } else {
    where = { schoolId, id: { in: ids } };
  }

  return prisma.notification.deleteMany({ where });
}

// ─── Preferences ─────────────────────────────────────────────────────────────

export async function findPreferences({ schoolId }) {
  return prisma.notificationPreference.findMany({
    where:   { schoolId },
    orderBy: { type: 'asc' },
  });
}

/**
 * Upsert multiple preference entries in a single transaction.
 * Returns upserted count.
 */
export async function upsertPreferences({ schoolId, preferences }) {
  const ops = preferences.map(({ type, inApp, email, sms, pushEnabled }) =>
    prisma.notificationPreference.upsert({
      where:  { schoolId_type: { schoolId, type } },
      create: { schoolId, type, inApp, email, sms, pushEnabled },
      update: { inApp, email, sms, pushEnabled },
    })
  );

  return prisma.$transaction(ops);
}

// ─── Internal: create (called by event handlers / workers) ───────────────────

/**
 * Persist a new notification for a school.
 * Not exposed via HTTP routes — called internally.
 */
export async function createNotification({ schoolId, type, severity = 'INFO', title, body, meta = null }) {
  return prisma.notification.create({
    data: { schoolId, type, severity, title, body, meta },
    select: NOTIFICATION_SELECT,
  });
}