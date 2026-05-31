// =============================================================================
// modules/emergency/emergency.constants.js — RESQID
// =============================================================================

export const INCIDENT_TYPES = [
  'Medical',
  'Injury',
  'Behavioral',
  'Mental Health',
  'Allergic Reaction',
  'Asthma Attack',
  'Accident',
  'Other',
];

export const INCIDENT_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

export const INCIDENT_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export const EMERGENCY_NUMBERS = [
  { label: 'Ambulance', number: '108' },
  { label: 'Police', number: '100' },
  { label: 'Fire', number: '101' },
];