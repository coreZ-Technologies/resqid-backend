// orchestrator/registry/index.js — RESQID
//
// Central registry — import all notification types from one place.

import {
  NOTIFICATION_TYPES,
  PRIORITY_WEIGHTS,
  CHANNEL_CONFIG,
  getNotificationConfig,
} from './notification.registry.js';
import { ATTENDANCE_NOTIFICATIONS } from './attendance.registry.js';
import { EMERGENCY_NOTIFICATIONS } from './emergency.registry.js';
import { COMMUNICATION_NOTIFICATIONS } from './communication.registry.js';
import { TIMETABLE_NOTIFICATIONS } from './timetable.registry.js';
import { SYSTEM_NOTIFICATIONS } from './system.registry.js';
import { CARD_NOTIFICATIONS } from './cards.registry.js';

// Merge all into one lookup table
const ALL_NOTIFICATIONS = {
  ...ATTENDANCE_NOTIFICATIONS,
  ...EMERGENCY_NOTIFICATIONS,
  ...COMMUNICATION_NOTIFICATIONS,
  ...TIMETABLE_NOTIFICATIONS,
  ...SYSTEM_NOTIFICATIONS,
  ...CARD_NOTIFICATIONS,
};

// Validate no duplicate IDs
const ids = Object.values(ALL_NOTIFICATIONS).map((n) => n.id);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length > 0) {
  throw new Error(`[registry] Duplicate notification IDs: ${duplicates.join(', ')}`);
}

export {
  ALL_NOTIFICATIONS,
  PRIORITY_WEIGHTS,
  CHANNEL_CONFIG,
  getNotificationConfig,

  // Individual registries for direct access
  ATTENDANCE_NOTIFICATIONS,
  EMERGENCY_NOTIFICATIONS,
  COMMUNICATION_NOTIFICATIONS,
  TIMETABLE_NOTIFICATIONS,
  SYSTEM_NOTIFICATIONS,
  CARD_NOTIFICATIONS,
};
