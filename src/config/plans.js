export const PLAN_MODULES = {
  module_emergency: ['emergency'],
  module_attendance: ['attendance'],
  module_timetable: ['timetable'],
  module_parent_communication: ['parent_communication'],
  bundle_safety: ['emergency', 'attendance'],
  bundle_ops: ['attendance', 'timetable'],
  bundle_connect: ['attendance', 'parent_communication'],
  resqid_complete: ['emergency', 'attendance', 'timetable', 'parent_communication'],
};

// for validation - use this to check if a planId or module is valid
export const VALID_PLAN_IDS = Object.keys(PLAN_MODULES);

export const VALID_MODULES = ['emergency', 'attendance', 'timetable', 'parent_communication'];
