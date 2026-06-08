// orchestrator/registry/communication.registry.js — RESQID
//
// Communication event types for announcements, messages, and reminders.

export const COMMUNICATION_EVENTS = {
  ANNOUNCEMENT_PUBLISHED: {
    event: 'communication.announcement_published',
    notificationType: 'communication.announcement',
    description: 'School-wide announcement published',
  },
  DIRECT_MESSAGE_SENT: {
    event: 'communication.direct_message_sent',
    notificationType: 'communication.direct_message',
    description: 'Direct message sent to parent',
  },
  FEE_REMINDER: {
    event: 'communication.fee_reminder',
    notificationType: 'communication.fee_reminder',
    description: 'Fee payment reminder triggered',
  },
  PTM_REMINDER: {
    event: 'communication.ptm_reminder',
    notificationType: 'communication.ptm_reminder',
    description: 'Parent-Teacher Meeting reminder',
  },
};
