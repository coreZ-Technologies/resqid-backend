// orchestrator/registry/system.registry.js — RESQID
//
// System event types for onboarding, auth, and account management.

export const SYSTEM_EVENTS = {
  SCHOOL_ONBOARDED: {
    event: 'system.school_onboarded',
    notificationType: 'system.welcome',
    description: 'New school created — send welcome email',
  },
  ADMIN_CREATED: {
    event: 'system.admin_created',
    notificationType: 'system.welcome',
    description: 'New admin account created',
  },
  PASSWORD_RESET_REQUESTED: {
    event: 'system.password_reset_requested',
    notificationType: 'system.password_reset',
    description: 'User requested password reset',
  },
  OTP_REQUESTED: {
    event: 'system.otp_requested',
    notificationType: 'system.otp',
    description: 'OTP requested for login',
  },
  ACCOUNT_LOCKED: {
    event: 'system.account_locked',
    notificationType: 'system.account_locked',
    description: 'Account locked due to failed attempts',
  },
  CARD_DEACTIVATED: {
    event: 'system.card_deactivated',
    notificationType: 'system.card_deactivated',
    description: 'Student RFID/QR card deactivated',
  },
  CARD_REPLACED: {
    event: 'system.card_replaced',
    notificationType: 'system.card_deactivated',
    description: 'Student card replaced with new one',
  },
};
