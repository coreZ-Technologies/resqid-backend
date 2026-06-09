// orchestrator/registry/notification.registry.js — RESQID
//
// Base notification types + shared channel/priority configs.
// Domain-specific notifications are in their own registry files.

const PRIORITY_WEIGHTS = {
  critical: 1,
  high: 2,
  normal: 3,
  low: 4,
};

const CHANNEL_CONFIG = {
  push: {
    name: 'Push Notification',
    provider: 'expo',
    maxRetries: 3,
    rateLimit: { perSecond: 50, perMinute: 1000 },
  },
  sms: {
    name: 'SMS',
    provider: 'msg91',
    maxRetries: 2,
    rateLimit: { perSecond: 10, perMinute: 100 },
  },
  email: {
    name: 'Email',
    provider: 'sendgrid',
    maxRetries: 2,
    rateLimit: { perSecond: 20, perMinute: 500 },
  },
  whatsapp: {
    name: 'WhatsApp',
    provider: 'interakt',
    maxRetries: 3,
    rateLimit: { perSecond: 5, perMinute: 50 },
  },
};

// Base notification types shared across domains
const NOTIFICATION_TYPES = {};

function getNotificationConfig(typeId) {
  // This will be overridden in index.js with the merged map
  const { ALL_NOTIFICATIONS } = require('./index.js');
  const entry = ALL_NOTIFICATIONS[typeId];
  if (!entry) throw new Error(`[registry] Unknown notification type: ${typeId}`);
  return entry;
}

export { NOTIFICATION_TYPES, PRIORITY_WEIGHTS, CHANNEL_CONFIG, getNotificationConfig };
