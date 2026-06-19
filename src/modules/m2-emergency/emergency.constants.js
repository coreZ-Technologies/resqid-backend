// =============================================================================
// modules/m2-emergency/emergency.constants.js — RESQID
// =============================================================================

// ─── Blood Groups ─────────────────────────────────────────────────────────────

export const BLOOD_GROUPS = [
  'A_POSITIVE',
  'A_NEGATIVE',
  'B_POSITIVE',
  'B_NEGATIVE',
  'AB_POSITIVE',
  'AB_NEGATIVE',
  'O_POSITIVE',
  'O_NEGATIVE',
  'UNKNOWN',
];

export const BLOOD_GROUP_LABELS = {
  A_POSITIVE: 'A+',
  A_NEGATIVE: 'A-',
  B_POSITIVE: 'B+',
  B_NEGATIVE: 'B-',
  AB_POSITIVE: 'AB+',
  AB_NEGATIVE: 'AB-',
  O_POSITIVE: 'O+',
  O_NEGATIVE: 'O-',
  UNKNOWN: 'Unknown',
};

// ─── Visibility Levels (for future use / card visibility) ──────────────────

// 🟡 FIX 2: Kept but commented to avoid confusion
// export const VISIBILITY_LEVELS = ['PUBLIC', 'MINIMAL', 'HIDDEN'];

// ─── Severity ──────────────────────────────────────────────────────────────────

// ✅ FIX 1: Keep the object for label mapping
export const EMERGENCY_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

// ✅ FIX 1: Add array for iteration/dropdowns
export const SEVERITY_LEVELS = Object.values(EMERGENCY_SEVERITY);

export const SEVERITY_LABELS = {
  LOW: 'Low (Minor)',
  MEDIUM: 'Medium (Needs attention)',
  HIGH: 'High (Urgent)',
  CRITICAL: 'Critical (Life-threatening)',
};

// ─── Incident Types ────────────────────────────────────────────────────────────

export const INCIDENT_TYPES = [
  'INJURY',
  'ILLNESS',
  'ALLERGIC_REACTION',
  'ASTHMA_ATTACK',
  'ACCIDENT',
  'SEIZURE',
  'FAINTING',
  'BLEEDING',
  'FRACTURE',
  'BURN',
  'POISONING',
  'HEAD_INJURY',
  'BREATHING_DIFFICULTY',
  'DIABETIC_EMERGENCY',
  'OTHER',
];

export const INCIDENT_TYPE_LABELS = {
  INJURY: 'Injury',
  ILLNESS: 'Illness',
  ALLERGIC_REACTION: 'Allergic Reaction',
  ASTHMA_ATTACK: 'Asthma Attack',
  ACCIDENT: 'Accident',
  SEIZURE: 'Seizure',
  FAINTING: 'Fainting',
  BLEEDING: 'Bleeding',
  FRACTURE: 'Fracture',
  BURN: 'Burn',
  POISONING: 'Poisoning',
  HEAD_INJURY: 'Head Injury',
  BREATHING_DIFFICULTY: 'Breathing Difficulty',
  DIABETIC_EMERGENCY: 'Diabetic Emergency',
  OTHER: 'Other',
};

// ─── Incident Status ──────────────────────────────────────────────────────────

// ✅ FIX 3: Added for frontend consistency
export const INCIDENT_STATUS = [
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
  'FOLLOW_UP_NEEDED',
];

export const INCIDENT_STATUS_LABELS = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  FOLLOW_UP_NEEDED: 'Follow-up Needed',
};

// ─── Drill Types ──────────────────────────────────────────────────────────────

// ✅ FIX 3: Added for frontend consistency
export const DRILL_TYPES = [
  'FIRE',
  'EARTHQUAKE',
  'LOCKDOWN',
  'MEDICAL',
  'EVACUATION',
  'CHEMICAL_SPILL',
  'FLOOD',
  'OTHER',
];

export const DRILL_TYPE_LABELS = {
  FIRE: 'Fire Drill',
  EARTHQUAKE: 'Earthquake Drill',
  LOCKDOWN: 'Lockdown Drill',
  MEDICAL: 'Medical Emergency Drill',
  EVACUATION: 'Evacuation Drill',
  CHEMICAL_SPILL: 'Chemical Spill Drill',
  FLOOD: 'Flood Drill',
  OTHER: 'Other',
};

// ─── Drill Status ─────────────────────────────────────────────────────────────

export const DRILL_STATUS = [
  'SCHEDULED',
  'IN_PROGRESS',
  'CONDUCTED',
  'COMPLETED',
  'CANCELLED',
];

export const DRILL_STATUS_LABELS = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  CONDUCTED: 'Conducted',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

// ─── Contact Relations ────────────────────────────────────────────────────────

export const CONTACT_RELATIONS = [
  'FATHER',
  'MOTHER',
  'GUARDIAN',
  'GRANDPARENT',
  'SIBLING',
  'RELATIVE',
  'FAMILY_DOCTOR',
  'NEIGHBOR',
  'OTHER',
];

export const CONTACT_RELATION_LABELS = {
  FATHER: 'Father',
  MOTHER: 'Mother',
  GUARDIAN: 'Guardian',
  GRANDPARENT: 'Grandparent',
  SIBLING: 'Sibling',
  RELATIVE: 'Relative',
  FAMILY_DOCTOR: 'Family Doctor',
  NEIGHBOR: 'Neighbor',
  OTHER: 'Other',
};

// ─── Emergency Helplines ──────────────────────────────────────────────────────

export const EMERGENCY_NUMBERS = {
  POLICE: '100',
  AMBULANCE: '108',
  FIRE: '101',
  WOMEN_HELPLINE: '1091',
  CHILD_HELPLINE: '1098',
  DISASTER: '1078',
  BLOOD_BANK: '104',
};

// ─── Module Configuration ────────────────────────────────────────────────────

export const EMERGENCY_MODULE_CONFIG = {
  MAX_CONTACTS_PER_PROFILE: 10,
  PUBLIC_SCAN_RATE_LIMIT: 10, // seconds between public scans per IP
  MAX_INCIDENT_IMAGES: 5,
  DRILL_REMINDER_DAYS: 7,
};