// orchestrator/registry/emergency.registry.js — RESQID
//
// Emergency event types that trigger critical notifications.

export const EMERGENCY_EVENTS = {
  QR_SCANNED: {
    event: 'emergency.qr_scanned',
    notificationType: 'emergency.qr_scan',
    description: 'Student QR code scanned by someone',
    priority: 'critical',
    bypassQuietHours: true,
  },
  ADMIN_ALERT: {
    event: 'emergency.admin_alert',
    notificationType: 'emergency.admin_alert',
    description: 'Admin needs to be notified of emergency',
    priority: 'critical',
    bypassQuietHours: true,
  },
  ANOMALY_DETECTED: {
    event: 'emergency.anomaly_detected',
    notificationType: 'emergency.anomaly',
    description: 'Suspicious scan pattern detected',
    priority: 'high',
  },
  DRILL_SCHEDULED: {
    event: 'emergency.drill_scheduled',
    notificationType: 'emergency.drill',
    description: 'Emergency drill scheduled',
    priority: 'high',
  },
  DRILL_ACTIVATED: {
    event: 'emergency.drill_activated',
    notificationType: 'emergency.drill',
    description: 'Emergency drill activated',
    priority: 'critical',
    bypassQuietHours: true,
  },
};
