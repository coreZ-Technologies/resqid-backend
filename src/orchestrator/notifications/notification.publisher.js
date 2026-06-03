// orchestrator/notifications/notification.publisher.js — RESQID
//
// Data-driven notification publisher.
// Event definitions in JSON-like structure — no repetitive code.

import { publish } from '../events/event.publisher.js';
import { EVENTS } from '../events/event.types.js';

// EVENT DEFINITIONS (Data, not Code)

const EVENT_DEFS = {
  // ── Emergency ──────────────────────────────────────────────────────────
  emergencyAlertTriggered: {
    type: EVENTS.EMERGENCY_ALERT_TRIGGERED,
    actorType: 'SYSTEM',
    payloadKeys: ['studentName', 'schoolName', 'scannedAt', 'parentContacts', 'parentExpoTokens'],
    metaKeys: ['alertId', 'studentId'],
  },

  emergencyAlertEscalated: {
    type: EVENTS.EMERGENCY_ALERT_ESCALATED,
    actorType: 'SYSTEM',
  },

  // ── OTP ────────────────────────────────────────────────────────────────
  otpRequested: {
    type: EVENTS.USER_OTP_REQUESTED,
    actorType: 'USER',
    payloadKeys: ['phone', 'otp', 'namespace', 'expiryMinutes'],
  },

  // ─── Timetable ─────────────────────────────────────────────────────────
  timetableGenerateStarted: {
    type: EVENTS.TIMETABLE_GENERATE_STARTED,
    actorType: 'WORKER',
    payloadKeys: ['templateId', 'schoolId'],
  },

  timetableGenerateCompleted: {
    type: EVENTS.TIMETABLE_GENERATE_COMPLETED,
    actorType: 'WORKER',
    payloadKeys: ['timetableId', 'totalSlots', 'qualityScore'],
    metaKeys: ['timetableId'],
  },

  timetableGenerateFailed: {
    type: EVENTS.TIMETABLE_GENERATE_FAILED,
    actorType: 'WORKER',
    payloadKeys: ['error', 'templateId'],
  },

  // ─── Crisis ────────────────────────────────────────────────────────────
  crisisTriggered: {
    type: EVENTS.CRISIS_TRIGGERED,
    actorType: 'SYSTEM',
    payloadKeys: ['teacherId', 'roomId', 'date', 'timetableId'],
    metaKeys: ['crisisEventId'],
  },

  crisisResolved: {
    type: EVENTS.CRISIS_RESOLVED,
    actorType: 'WORKER',
    payloadKeys: ['replaced', 'unresolved'],
    metaKeys: ['crisisEventId'],
  },

  substitutionCreated: {
    type: EVENTS.SUBSTITUTION_CREATED,
    actorType: 'WORKER',
    payloadKeys: ['substituteId', 'originalTeacherId', 'date', 'periods'],
  },

  // ─── Wellness ──────────────────────────────────────────────────────────
  teacherBurnoutDetected: {
    type: EVENTS.TEACHER_BURNOUT_RISK_DETECTED,
    actorType: 'SYSTEM',
    payloadKeys: ['teacherId', 'burnoutScore'],
  },

  accessibilityViolation: {
    type: EVENTS.TEACHER_ACCESSIBILITY_VIOLATION,
    actorType: 'SYSTEM',
    payloadKeys: ['teacherId', 'roomId', 'reason'],
  },

  // ── Order Lifecycle ────────────────────────────────────────────────────
  orderConfirmed: {
    type: EVENTS.ORDER_CONFIRMED,
    actorType: 'USER',
    payloadKeys: ['orderNumber', 'cardCount', 'amount'],
    metaKeys: ['orderId'],
  },

  orderShipped: {
    type: EVENTS.ORDER_SHIPPED,
    actorType: 'SYSTEM',
    payloadKeys: ['orderNumber', 'trackingId', 'trackingUrl', 'schoolPhone'],
    metaKeys: ['orderId'],
  },

  orderDelivered: {
    type: EVENTS.ORDER_DELIVERED,
    actorType: 'SYSTEM',
    payloadKeys: ['orderNumber'],
    metaKeys: ['orderId'],
  },

  orderCompleted: {
    type: EVENTS.ORDER_COMPLETED,
    actorType: 'SYSTEM',
    payloadKeys: ['orderNumber'],
    metaKeys: ['orderId'],
  },

  orderRefunded: {
    type: EVENTS.ORDER_REFUNDED,
    actorType: 'SYSTEM',
    payloadKeys: ['orderNumber', 'amount'],
    metaKeys: ['orderId'],
  },

  // ── School ─────────────────────────────────────────────────────────────
  schoolOnboarded: {
    type: EVENTS.SCHOOL_ONBOARDED,
    actorType: 'SYSTEM',
    payloadKeys: ['schoolName', 'adminName', 'adminEmail', 'dashboardUrl'],
  },

  schoolRenewalDue: {
    type: EVENTS.SCHOOL_RENEWAL_DUE,
    actorType: 'SYSTEM',
    payloadKeys: ['schoolName', 'adminEmail', 'schoolPhone', 'expiryDate', 'renewUrl'],
  },

  // ── Student ────────────────────────────────────────────────────────────
  studentQrScanned: {
    type: EVENTS.STUDENT_QR_SCANNED,
    actorType: 'SYSTEM',
    payloadKeys: ['studentName', 'location', 'parentExpoTokens', 'notifyEnabled'],
    metaKeys: ['studentId'],
  },

  anomalyDetected: {
    type: EVENTS.ANOMALY_DETECTED,
    actorType: 'SYSTEM',
    payloadKeys: [
      'studentName',
      'anomalyType',
      'location',
      'detectedAt',
      'parentExpoTokens',
      'parentEmail',
    ],
    metaKeys: ['studentId'],
  },

  // ── Parent ─────────────────────────────────────────────────────────────
  parentRegistered: {
    type: EVENTS.PARENT_REGISTERED,
    actorType: 'PARENT_USER',
    payloadKeys: ['parentName', 'phone'],
  },

  parentCardLinked: {
    type: EVENTS.PARENT_CARD_LINKED,
    actorType: 'PARENT_USER',
    payloadKeys: ['parentName', 'studentName', 'cardNumber', 'parentExpoTokens'],
    metaKeys: ['studentId'],
  },

  parentCardLocked: {
    type: EVENTS.PARENT_CARD_LOCKED,
    actorType: 'PARENT_USER',
    payloadKeys: ['parentName', 'studentName', 'parentEmail', 'parentPhone', 'parentExpoTokens'],
    metaKeys: ['studentId'],
  },

  parentEmailChanged: {
    type: EVENTS.PARENT_EMAIL_CHANGED,
    actorType: 'PARENT_USER',
    payloadKeys: ['parentName', 'oldEmail', 'newEmail'],
  },

  parentPhoneChanged: {
    type: EVENTS.PARENT_PHONE_CHANGED,
    actorType: 'PARENT_USER',
    payloadKeys: ['parentName', 'oldPhone', 'newPhone', 'parentEmail'],
  },

  // ── Internal ───────────────────────────────────────────────────────────
  internalAlert: {
    type: EVENTS.INTERNAL_ALERT,
    actorType: 'SYSTEM',
    payloadKeys: ['alertType', 'message', 'data'],
  },
};

// PUBLISHER FACTORY (Single function, no repetition)

/**
 * Create a publisher function from event definition.
 * Eliminates repetitive wrapper functions.
 */
function createPublisher(def) {
  return ({ schoolId = null, actorId, actorType = def.actorType, payload = {}, meta = {} }) => {
    // Pick only defined keys from payload
    const filteredPayload = {};
    if (def.payloadKeys) {
      for (const key of def.payloadKeys) {
        if (payload[key] !== undefined) {
          filteredPayload[key] = payload[key];
        } else if (key === 'parentExpoTokens') {
          filteredPayload[key] = []; // Default for Expo tokens
        } else if (key === 'notifyEnabled') {
          filteredPayload[key] = true;
        } else if (key === 'expiryMinutes') {
          filteredPayload[key] = 5;
        }
      }
    } else {
      // No payload keys defined — pass through all
      Object.assign(filteredPayload, payload);
    }

    // Pick only defined meta keys
    const filteredMeta = {};
    if (def.metaKeys) {
      for (const key of def.metaKeys) {
        if (meta[key] !== undefined) {
          filteredMeta[key] = meta[key];
        }
      }
    }
    Object.assign(filteredMeta, meta); // Also include any extra meta

    return publish({
      type: def.type,
      schoolId,
      actorId: actorId || 'system',
      actorType,
      payload: filteredPayload,
      meta: filteredMeta,
    });
  };
}

// BUILD PUBLISHER OBJECT (Auto-generated from EVENT_DEFS)

export const publishNotification = {};

for (const [name, def] of Object.entries(EVENT_DEFS)) {
  publishNotification[name] = createPublisher(def);
}

// ADDITIONAL PUBLISHERS (Legacy — kept for backward compatibility)

// These are aliases or special cases that don't fit the pattern
Object.assign(publishNotification, {
  // Alias for emergency alert
  emergencyAlertEscalated: createPublisher(EVENT_DEFS.emergencyAlertEscalated),

  // Additional order publishers
  advancePaymentReceived: createPublisher({
    type: EVENTS.ORDER_ADVANCE_PAYMENT_RECEIVED,
    actorType: 'SYSTEM',
    payloadKeys: ['orderNumber', 'amount'],
    metaKeys: ['orderId'],
  }),

  partialPaymentConfirmed: createPublisher({
    type: EVENTS.PARTIAL_PAYMENT_CONFIRMED,
    actorType: 'SYSTEM',
    payloadKeys: ['orderNumber', 'amount'],
    metaKeys: ['orderId'],
  }),

  partialInvoiceGenerated: createPublisher({
    type: EVENTS.PARTIAL_INVOICE_GENERATED,
    actorType: 'WORKER',
    payloadKeys: ['orderNumber', 'amount', 'invoiceUrl'],
    metaKeys: ['orderId'],
  }),

  tokenGenerationComplete: createPublisher({
    type: EVENTS.ORDER_TOKEN_GENERATION_COMPLETE,
    actorType: 'WORKER',
    payloadKeys: ['orderNumber'],
    metaKeys: ['orderId'],
  }),

  cardDesignComplete: createPublisher({
    type: EVENTS.ORDER_CARD_DESIGN_COMPLETE,
    actorType: 'WORKER',
    payloadKeys: ['orderNumber', 'reviewUrl'],
    metaKeys: ['orderId'],
  }),

  designApproved: createPublisher({
    type: EVENTS.DESIGN_APPROVED,
    actorType: 'USER',
    payloadKeys: ['orderNumber'],
    metaKeys: ['orderId'],
  }),

  balanceInvoiceIssued: createPublisher({
    type: EVENTS.ORDER_BALANCE_INVOICE_ISSUED,
    actorType: 'WORKER',
    payloadKeys: ['orderNumber', 'amount', 'dueDate', 'invoiceUrl', 'schoolPhone'],
    metaKeys: ['orderId'],
  }),
});
