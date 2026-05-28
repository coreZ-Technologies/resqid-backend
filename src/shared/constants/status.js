// =============================================================================
// RESQID Status Enums — All status values used across DB models
//
// These must match your Prisma enum definitions exactly.
//
// Used by:
//   - Prisma models           → enum fields
//   - validation schemas      → Zod enums
//   - middleware              → status checks
//   - frontend                → UI state management
// =============================================================================

// ─── Token / Card Status ─────────────────────────────────────────────────────

export const TOKEN_STATUS = Object.freeze({
  UNREGISTERED: 'UNREGISTERED',
  ISSUED: 'ISSUED',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  REVOKED: 'REVOKED',
  LOST: 'LOST',
  EXPIRED: 'EXPIRED',
});

// ─── Order Status ────────────────────────────────────────────────────────────

export const ORDER_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  PRINTED: 'PRINTED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
  FAILED: 'FAILED',
});

// ─── Attendance Status ───────────────────────────────────────────────────────

export const ATTENDANCE_STATUS = Object.freeze({
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  EXCUSED: 'EXCUSED',
  HALF_DAY: 'HALF_DAY',
});

// ─── Scan Result Status ──────────────────────────────────────────────────────

export const SCAN_RESULT = Object.freeze({
  INVALID: 'INVALID',
  UNREGISTERED: 'UNREGISTERED',
  ISSUED: 'ISSUED',
  INACTIVE: 'INACTIVE',
  REVOKED: 'REVOKED',
  EXPIRED: 'EXPIRED',
  ACTIVE: 'ACTIVE',
  BLOCKED: 'BLOCKED',
  SUSPICIOUS: 'SUSPICIOUS',
});

// ─── Anomaly Status ──────────────────────────────────────────────────────────

export const ANOMALY_STATUS = Object.freeze({
  OPEN: 'OPEN',
  REVIEWED: 'REVIEWED',
  RESOLVED: 'RESOLVED',
  IGNORED: 'IGNORED',
  ESCALATED: 'ESCALATED',
});

// ─── Notification Status ─────────────────────────────────────────────────────

export const NOTIFICATION_STATUS = Object.freeze({
  PENDING: 'PENDING',
  QUEUED: 'QUEUED',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  READ: 'READ',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  RETRYING: 'RETRYING',
});

// ─── Subscription Status ─────────────────────────────────────────────────────

export const SUBSCRIPTION_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  TRIAL: 'TRIAL',
  GRACE_PERIOD: 'GRACE_PERIOD',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
});

// ─── School Status ───────────────────────────────────────────────────────────

export const SCHOOL_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  DELETED: 'DELETED',
  PENDING_ACTIVATION: 'PENDING_ACTIVATION',
});

// ─── Payment Status ──────────────────────────────────────────────────────────

export const PAYMENT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
});

// ─── Device Status (RFID Attendance Machines) ────────────────────────────────

export const DEVICE_STATUS = Object.freeze({
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  MAINTENANCE: 'MAINTENANCE',
  BLOCKED: 'BLOCKED',
  UNREGISTERED: 'UNREGISTERED',
  CONFIGURING: 'CONFIGURING',
  ERROR: 'ERROR',
});

// ─── Device Trust Level ──────────────────────────────────────────────────────

export const DEVICE_TRUST = Object.freeze({
  TRUSTED: 'TRUSTED',
  KNOWN: 'KNOWN',
  UNKNOWN: 'UNKNOWN',
  SUSPICIOUS: 'SUSPICIOUS',
  BLOCKED: 'BLOCKED',
});

// ─── IP Reputation Status ────────────────────────────────────────────────────

export const IP_REPUTATION = Object.freeze({
  TRUSTED: 'TRUSTED',
  NEUTRAL: 'NEUTRAL',
  SUSPICIOUS: 'SUSPICIOUS',
  BLOCKED: 'BLOCKED',
  UNKNOWN: 'UNKNOWN',
});

// ─── Session Status ──────────────────────────────────────────────────────────

export const SESSION_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
  SUSPICIOUS: 'SUSPICIOUS',
  TERMINATED: 'TERMINATED',
});

// ─── Security Event Severity ─────────────────────────────────────────────────

export const SECURITY_SEVERITY = Object.freeze({
  INFO: 'INFO',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
});

// ─── Maintenance Mode Status ─────────────────────────────────────────────────

export const MAINTENANCE_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  EXTENDED: 'EXTENDED',
});

// ─── Behavioral Anomaly Types ────────────────────────────────────────────────

export const ANOMALY_TYPE = Object.freeze({
  RAPID_SCANS: 'RAPID_SCANS',
  IMPOSSIBLE_TRAVEL: 'IMPOSSIBLE_TRAVEL',
  UNUSUAL_HOURS: 'UNUSUAL_HOURS',
  DEVICE_HOPPING: 'DEVICE_HOPPING',
  CREDENTIAL_STUFFING: 'CREDENTIAL_STUFFING',
  PATTERN_DEVIATION: 'PATTERN_DEVIATION',
  LOCATION_ANOMALY: 'LOCATION_ANOMALY',
  VOLUME_ANOMALY: 'VOLUME_ANOMALY',
  FREQUENCY_ANOMALY: 'FREQUENCY_ANOMALY',
});

// ─── Rate Limit Types ────────────────────────────────────────────────────────

export const RATE_LIMIT_TYPE = Object.freeze({
  GLOBAL: 'GLOBAL',
  AUTH: 'AUTH',
  API: 'API',
  SCAN: 'SCAN',
  ATTENDANCE: 'ATTENDANCE',
  LOGIN: 'LOGIN',
  OTP: 'OTP',
});

// ─── CSRF Token Status ───────────────────────────────────────────────────────

export const CSRF_TOKEN_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  USED: 'USED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
});

// ─── Geo Block Mode ──────────────────────────────────────────────────────────

export const GEO_BLOCK_MODE = Object.freeze({
  ALLOWLIST: 'ALLOWLIST', // Only listed countries allowed
  BLOCKLIST: 'BLOCKLIST', // Listed countries blocked
  DISABLED: 'DISABLED', // Geo-blocking turned off
});

// ─── Webhook Status ──────────────────────────────────────────────────────────

export const WEBHOOK_STATUS = Object.freeze({
  RECEIVED: 'RECEIVED',
  PROCESSING: 'PROCESSING',
  PROCESSED: 'PROCESSED',
  FAILED: 'FAILED',
  RETRYING: 'RETRYING',
  MAX_RETRIES_EXCEEDED: 'MAX_RETRIES_EXCEEDED',
});

// ─── Circuit Breaker States ──────────────────────────────────────────────────

export const CIRCUIT_BREAKER_STATE = Object.freeze({
  CLOSED: 'CLOSED', // Normal operation
  OPEN: 'OPEN', // Failing, rejecting requests
  HALF_OPEN: 'HALF_OPEN', // Testing if service recovered
});

// ─── Worker Status ───────────────────────────────────────────────────────────

export const WORKER_STATUS = Object.freeze({
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
  STALLED: 'STALLED',
  FAILED: 'FAILED',
  STOPPED: 'STOPPED',
});

// ─── Job Status (BullMQ) ─────────────────────────────────────────────────────

export const JOB_STATUS = Object.freeze({
  WAITING: 'WAITING',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  DELAYED: 'DELAYED',
  PAUSED: 'PAUSED',
});

// ─── Status Transitions ──────────────────────────────────────────────────────
// Define valid status transitions for state machines

export const VALID_TRANSITIONS = Object.freeze({
  // Token transitions
  [TOKEN_STATUS.UNREGISTERED]: [TOKEN_STATUS.ISSUED],
  [TOKEN_STATUS.ISSUED]: [TOKEN_STATUS.ACTIVE, TOKEN_STATUS.REVOKED],
  [TOKEN_STATUS.ACTIVE]: [
    TOKEN_STATUS.INACTIVE,
    TOKEN_STATUS.LOST,
    TOKEN_STATUS.REVOKED,
    TOKEN_STATUS.EXPIRED,
  ],
  [TOKEN_STATUS.INACTIVE]: [TOKEN_STATUS.ACTIVE, TOKEN_STATUS.REVOKED],
  [TOKEN_STATUS.LOST]: [TOKEN_STATUS.ACTIVE, TOKEN_STATUS.REVOKED],

  // Order transitions
  [ORDER_STATUS.DRAFT]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.PRINTED, ORDER_STATUS.FAILED],
  [ORDER_STATUS.PRINTED]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.FAILED],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FAILED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: [ORDER_STATUS.REFUNDED],

  // Anomaly transitions
  [ANOMALY_STATUS.OPEN]: [
    ANOMALY_STATUS.REVIEWED,
    ANOMALY_STATUS.RESOLVED,
    ANOMALY_STATUS.IGNORED,
    ANOMALY_STATUS.ESCALATED,
  ],
  [ANOMALY_STATUS.REVIEWED]: [
    ANOMALY_STATUS.RESOLVED,
    ANOMALY_STATUS.IGNORED,
    ANOMALY_STATUS.ESCALATED,
  ],
  [ANOMALY_STATUS.ESCALATED]: [ANOMALY_STATUS.REVIEWED, ANOMALY_STATUS.RESOLVED],

  // Device transitions
  [DEVICE_STATUS.UNREGISTERED]: [DEVICE_STATUS.CONFIGURING],
  [DEVICE_STATUS.CONFIGURING]: [DEVICE_STATUS.ONLINE, DEVICE_STATUS.ERROR],
  [DEVICE_STATUS.ONLINE]: [
    DEVICE_STATUS.OFFLINE,
    DEVICE_STATUS.MAINTENANCE,
    DEVICE_STATUS.BLOCKED,
    DEVICE_STATUS.ERROR,
  ],
  [DEVICE_STATUS.OFFLINE]: [DEVICE_STATUS.ONLINE, DEVICE_STATUS.MAINTENANCE, DEVICE_STATUS.ERROR],
  [DEVICE_STATUS.MAINTENANCE]: [DEVICE_STATUS.ONLINE, DEVICE_STATUS.OFFLINE],
  [DEVICE_STATUS.ERROR]: [DEVICE_STATUS.ONLINE, DEVICE_STATUS.OFFLINE, DEVICE_STATUS.MAINTENANCE],
});

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Check if a transition is valid
 */
export const isValidTransition = (currentStatus, newStatus, statusType = 'TOKEN') => {
  const transitions = VALID_TRANSITIONS[currentStatus];
  return transitions ? transitions.includes(newStatus) : false;
};

/**
 * Check if status is terminal (no more transitions)
 */
export const isTerminalStatus = (status, statusType = 'TOKEN') => {
  const transitions = VALID_TRANSITIONS[status];
  return transitions ? transitions.length === 0 : true;
};

/**
 * Get all valid next statuses
 */
export const getNextStatuses = (currentStatus) => {
  return VALID_TRANSITIONS[currentStatus] || [];
};

/**
 * Check if device is operational
 */
export const isDeviceOperational = (status) => {
  return [DEVICE_STATUS.ONLINE, DEVICE_STATUS.CONFIGURING].includes(status);
};

/**
 * Check if token is scannable
 */
export const isTokenScannable = (status) => {
  return [TOKEN_STATUS.ACTIVE, TOKEN_STATUS.ISSUED].includes(status);
};
