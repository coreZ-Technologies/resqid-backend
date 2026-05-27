// src/shared/constants/status.js

/**
 * RESQID Status Enums
 * All status values used across DB models.
 * These must match your Prisma enum definitions exactly.
 */

export const TOKEN_STATUS = Object.freeze({
  UNREGISTERED: 'UNREGISTERED',
  ISSUED: 'ISSUED',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  REVOKED: 'REVOKED',
  LOST: 'LOST',
});

export const ORDER_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  PRINTED: 'PRINTED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
});

export const ATTENDANCE_STATUS = Object.freeze({
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  EXCUSED: 'EXCUSED',
});

export const SCAN_RESULT = Object.freeze({
  INVALID: 'INVALID',
  UNREGISTERED: 'UNREGISTERED',
  ISSUED: 'ISSUED',
  INACTIVE: 'INACTIVE',
  REVOKED: 'REVOKED',
  ACTIVE: 'ACTIVE',
});

export const ANOMALY_STATUS = Object.freeze({
  OPEN: 'OPEN',
  REVIEWED: 'REVIEWED',
  RESOLVED: 'RESOLVED',
  IGNORED: 'IGNORED',
});

export const NOTIFICATION_STATUS = Object.freeze({
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
});
