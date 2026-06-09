// orchestrator/registry/system.registry.js — RESQID
//
// System/auth notification types.

export const SYSTEM_NOTIFICATIONS = {
  // ═══════════════════════════════════════════════════════════════════════
  // ONBOARDING — Welcome emails per role
  // ═══════════════════════════════════════════════════════════════════════
  SYSTEM_WELCOME_ADMIN: {
    id: 'system.welcome.admin',
    label: 'Welcome — School Admin',
    description: 'Sent when a new school admin account is created',
    priority: 'normal',
    channels: ['email'],
    template: 'system-welcome-admin',
    category: 'system',
    target: 'admin',
    oneTime: true,
    retry: { attempts: 2, backoff: 'fixed', delay: 10000 },
    // Admin welcome includes: dashboard URL, credentials, setup guide link
  },
  SYSTEM_WELCOME_TEACHER: {
    id: 'system.welcome.teacher',
    label: 'Welcome — Teacher',
    description: 'Sent when a new teacher account is created',
    priority: 'normal',
    channels: ['email', 'push'],
    template: 'system-welcome-teacher',
    category: 'system',
    target: 'teacher',
    oneTime: true,
    retry: { attempts: 2, backoff: 'fixed', delay: 10000 },
    // Teacher welcome includes: app download link, class schedule, how to mark attendance
  },
  SYSTEM_WELCOME_PARENT: {
    id: 'system.welcome.parent',
    label: 'Welcome — Parent',
    description: 'Sent when a parent registers or is linked to a student',
    priority: 'normal',
    channels: ['email', 'push', 'sms'],
    template: 'system-welcome-parent',
    category: 'system',
    target: 'parent',
    oneTime: true,
    retry: { attempts: 2, backoff: 'fixed', delay: 10000 },
    // Parent welcome includes: app download link, child QR code, how to receive alerts
  },
  SYSTEM_WELCOME_STUDENT: {
    id: 'system.welcome.student',
    label: 'Welcome — Student',
    description: 'Sent to parent when a new student is enrolled',
    priority: 'normal',
    channels: ['push', 'email'],
    template: 'system-welcome-student',
    category: 'system',
    target: 'parent',
    oneTime: true,
    retry: { attempts: 2, backoff: 'fixed', delay: 10000 },
    // Student welcome includes: student details, RFID/QR card info, attendance expectations
  },

  // ═══════════════════════════════════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════════════════════════════════
  SYSTEM_PASSWORD_RESET: {
    id: 'system.password_reset',
    label: 'Password Reset',
    description: 'Password reset link for any user',
    priority: 'high',
    channels: ['email', 'sms'],
    template: 'system-password-reset',
    category: 'system',
    target: 'all',
    oneTime: true,
    retry: { attempts: 3, backoff: 'exponential', delay: 2000 },
  },
  SYSTEM_PASSWORD_CHANGED: {
    id: 'system.password_changed',
    label: 'Password Changed',
    description: 'Confirmation after password is changed',
    priority: 'normal',
    channels: ['email'],
    template: 'system-password-changed',
    category: 'system',
    target: 'all',
    oneTime: true,
    retry: { attempts: 1, backoff: 'fixed', delay: 5000 },
  },
  SYSTEM_OTP: {
    id: 'system.otp',
    label: 'OTP Verification',
    description: 'One-time password for login verification',
    priority: 'high',
    channels: ['sms', 'email'],
    template: 'system-otp',
    category: 'system',
    target: 'all',
    oneTime: true,
    retry: { attempts: 2, backoff: 'fixed', delay: 3000 },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ACCOUNT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════
  SYSTEM_ACCOUNT_LOCKED: {
    id: 'system.account_locked',
    label: 'Account Locked',
    description: 'Account locked due to multiple failed login attempts',
    priority: 'high',
    channels: ['email'],
    template: 'system-account-locked',
    category: 'system',
    target: 'all',
    retry: { attempts: 2, backoff: 'fixed', delay: 5000 },
  },
  SYSTEM_ACCOUNT_DEACTIVATED: {
    id: 'system.account_deactivated',
    label: 'Account Deactivated',
    description: 'Account has been deactivated by admin',
    priority: 'normal',
    channels: ['email'],
    template: 'system-account-deactivated',
    category: 'system',
    target: 'all',
    retry: { attempts: 2, backoff: 'fixed', delay: 5000 },
  },
  SYSTEM_EMAIL_VERIFIED: {
    id: 'system.email_verified',
    label: 'Email Verified',
    description: 'Confirmation after email verification',
    priority: 'normal',
    channels: ['push', 'email'],
    template: 'system-email-verified',
    category: 'system',
    target: 'all',
    oneTime: true,
    retry: { attempts: 1, backoff: 'fixed', delay: 3000 },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SESSION
  // ═══════════════════════════════════════════════════════════════════════
  SYSTEM_NEW_LOGIN: {
    id: 'system.new_login',
    label: 'New Login Detected',
    description: 'Login from new device or location',
    priority: 'high',
    channels: ['push', 'email'],
    template: 'system-new-login',
    category: 'system',
    target: 'all',
    retry: { attempts: 2, backoff: 'fixed', delay: 3000 },
  },
};
