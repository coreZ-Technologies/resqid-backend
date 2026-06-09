// orchestrator/registry/timetable.registry.js — RESQID
//
// Timetable event types for generation, validation, swaps, and substitutions.

export const TIMETABLE_EVENTS = {
  GENERATION_STARTED: {
    event: 'timetable.generation_started',
    description: 'Timetable generation job queued',
  },
  GENERATION_COMPLETED: {
    event: 'timetable.generation_completed',
    notificationType: 'timetable.generated',
    description: 'Timetable generation finished successfully',
  },
  GENERATION_FAILED: {
    event: 'timetable.generation_failed',
    description: 'Timetable generation failed',
  },
  VALIDATION_STARTED: {
    event: 'timetable.validation_started',
    description: 'Timetable CSV validation started',
  },
  VALIDATION_COMPLETED: {
    event: 'timetable.validation_completed',
    notificationType: 'timetable.validation_complete',
    description: 'Timetable CSV validation finished',
  },
  SWAP_REQUESTED: {
    event: 'timetable.swap_requested',
    description: 'Teacher period swap requested',
  },
  SWAP_COMPLETED: {
    event: 'timetable.swap_completed',
    notificationType: 'timetable.changed',
    description: 'Teacher period swap completed',
  },
  SWAP_FAILED: {
    event: 'timetable.swap_failed',
    description: 'Teacher period swap failed validation',
  },
  SUBSTITUTION_ASSIGNED: {
    event: 'timetable.substitution_assigned',
    notificationType: 'timetable.substitution',
    description: 'Substitute teacher assigned',
  },
  CRISIS_RESOLVED: {
    event: 'timetable.crisis_resolved',
    notificationType: 'timetable.changed',
    description: 'Crisis substitution workflow completed',
  },
};
