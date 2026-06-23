// src/templates/email/email.index.js

// ─── All Email Templates ──────────────────────────────────────────────────

export { default as AnomalyDetectedEmail } from './anomaly-detected.jsx';
export { default as CardLockedEmail } from './card-locked.jsx';
export { default as CardRenewalRequestedEmail } from './card-renewal-requested.jsx';
export { default as DeviceLoginEmail } from './device-login.jsx';
export { default as EmailChangedEmail } from './email-changed.jsx';
export { default as EmergencyLogEmail } from './emergency-log.jsx';
export { default as InternalAlertEmail } from './internal-alert.jsx';
export { default as OrderConfirmedEmail } from './order-confirmed.jsx';
export { default as OrderDeliveredEmail } from './order-delivered.jsx';
export { default as OrderRefundedEmail } from './order-refunded.jsx';
export { default as OtpParentEmail } from './otp-parent.jsx';
export { default as SchoolRenewalEmail } from './school-renewal.jsx';
export { default as WelcomeParentEmail } from './welcome-parent.jsx';
export { default as WelcomeSchoolEmail } from './welcome-school.jsx';

// ─── Export all templates as an object for dynamic lookups ──────────────

export const emailTemplates = {
  ANOMALY_DETECTED: AnomalyDetectedEmail,
  CARD_LOCKED: CardLockedEmail,
  CARD_RENEWAL_REQUESTED: CardRenewalRequestedEmail,
  DEVICE_LOGIN: DeviceLoginEmail,
  EMAIL_CHANGED: EmailChangedEmail,
  EMERGENCY_LOG: EmergencyLogEmail,
  INTERNAL_ALERT: InternalAlertEmail,
  ORDER_CONFIRMED: OrderConfirmedEmail,
  ORDER_DELIVERED: OrderDeliveredEmail,
  ORDER_REFUNDED: OrderRefundedEmail,
  OTP_PARENT: OtpParentEmail,
  SCHOOL_RENEWAL: SchoolRenewalEmail,
  WELCOME_PARENT: WelcomeParentEmail,
  WELCOME_SCHOOL: WelcomeSchoolEmail,
};

export default emailTemplates;