// orchestrator/registry/index.js — RESQID
//
// Central registry — single import for all notification types and configs.

export {
  NOTIFICATION_TYPES,
  PRIORITY_WEIGHTS,
  CHANNEL_CONFIG,
  getNotificationConfig,
  getNotificationsByCategory,
  getCriticalNotifications,
} from './notification.registry.js';

export { ATTENDANCE_EVENTS } from './attendance.registry.js';
export { EMERGENCY_EVENTS } from './emergency.registry.js';
export { COMMUNICATION_EVENTS } from './communication.registry.js';
export { TIMETABLE_EVENTS } from './timetable.registry.js';
export { SYSTEM_EVENTS } from './system.registry.js';
