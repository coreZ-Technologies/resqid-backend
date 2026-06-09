// orchestrator/registry/emergency.registry.js — RESQID
//
// Emergency-related notification types. These bypass quiet hours.

export const EMERGENCY_NOTIFICATIONS = {
  EMERGENCY_QR_SCAN: {
    id: 'emergency.qr_scan',
    label: 'QR Emergency Scan',
    description: 'Student QR code scanned in emergency',
    priority: 'critical',
    channels: ['push', 'sms', 'email', 'whatsapp'],
    template: 'emergency-qr-scan',
    category: 'emergency',
    target: 'parent',
    bypassQuietHours: true,
    retry: { attempts: 5, backoff: 'exponential', delay: 500 },
  },
  EMERGENCY_ADMIN_ALERT: {
    id: 'emergency.admin_alert',
    label: 'Emergency — Admin',
    description: 'Notify school admin of emergency scan',
    priority: 'critical',
    channels: ['push', 'sms'],
    template: 'emergency-admin-alert',
    category: 'emergency',
    target: 'admin',
    bypassQuietHours: true,
    retry: { attempts: 5, backoff: 'exponential', delay: 500 },
  },
  EMERGENCY_DRILL: {
    id: 'emergency.drill',
    label: 'Emergency Drill',
    description: 'Scheduled drill notification',
    priority: 'high',
    channels: ['push', 'sms'],
    template: 'emergency-drill',
    category: 'emergency',
    target: 'parent',
    retry: { attempts: 3, backoff: 'exponential', delay: 1000 },
  },
  EMERGENCY_ANOMALY: {
    id: 'emergency.anomaly',
    label: 'Suspicious Scan',
    description: 'Duplicate/unknown/after-hours scan detected',
    priority: 'high',
    channels: ['push', 'sms'],
    template: 'emergency-anomaly',
    category: 'emergency',
    target: 'admin',
    retry: { attempts: 3, backoff: 'exponential', delay: 1000 },
  },
};
