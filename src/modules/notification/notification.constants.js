// src/modules/notification/notification.constants.js

export const NOTIFICATION_TYPES = {
  ANNOUNCEMENT: { label: 'Announcement', color: 'blue' },
  EMERGENCY: { label: 'Emergency', color: 'red' },
  REMINDER: { label: 'Reminder', color: 'amber' },
  EVENT: { label: 'Event', color: 'purple' },
  ATTENDANCE: { label: 'Attendance', color: 'green' },
  GENERAL: { label: 'General', color: 'slate' },
};

export const CHANNELS = ['email', 'sms', 'push', 'inapp', 'whatsapp'];

export const RECIPIENT_TYPES = ['all', 'class', 'section', 'individual'];

export const PRIORITY = ['low', 'normal', 'high', 'urgent'];

// Map frontend type keys to database enum
export const TYPE_TO_CATEGORY = {
  ANNOUNCEMENT: 'ANNOUNCEMENT',
  EMERGENCY: 'EMERGENCY',
  REMINDER: 'REMINDER',
  EVENT: 'EVENT',
  ATTENDANCE: 'ATTENDANCE',
  GENERAL: 'OTHER',
};

export const DEFAULT_PREFERENCE = {
  smsEnabled: true,
  emailEnabled: false,
  pushEnabled: true,
  inAppEnabled: true,
  whatsappEnabled: false,
  onAttendance: true,
  onEmergency: true,
  onAnnouncement: true,
  onReport: false,
};