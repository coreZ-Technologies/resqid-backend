// src/shared/constants/cache.js

/**
 * RESQID Redis Key Patterns
 * All cache keys in one place — no magic strings in services.
 *
 * Convention:
 *   entity:id         → single record
 *   entity:id:sub     → sub-record
 *   list:entity:scope → list cache
 */

export const CACHE_KEYS = Object.freeze({
  // School
  SCHOOL: (id) => `school:${id}`,
  SCHOOL_SETTINGS: (id) => `school:${id}:settings`,

  // Subscription / Modules
  SUBSCRIPTION: (schoolId) => `subscription:${schoolId}`,
  SCHOOL_MODULES: (schoolId) => `modules:${schoolId}`,

  // Student
  STUDENT: (id) => `student:${id}`,
  SCHOOL_STUDENTS: (schoolId) => `list:students:${schoolId}`,

  // Token / Card
  TOKEN: (id) => `token:${id}`,
  SCAN_CODE: (code) => `scan:${code}`,

  // User sessions
  SESSION: (id) => `session:${id}`,
  USER_SESSIONS: (userId) => `sessions:user:${userId}`,
  REFRESH_TOKEN: (hash) => `refresh:${hash}`,

  // OTP
  OTP: (phone) => `otp:${phone}`,
  OTP_ATTEMPTS: (phone) => `otp:attempts:${phone}`,

  // Rate limiting
  RATE_LIMIT: (ip) => `rl:${ip}`,
  IP_BLOCK: (ip) => `ipblock:${ip}`,
  SCAN_RATE: (ip) => `scanrate:${ip}`,

  // Timetable
  TIMETABLE: (schoolId) => `timetable:${schoolId}`,
  TEACHER: (id) => `teacher:${id}`,

  // Emergency
  EMERGENCY_PROFILE: (studentId) => `emergency:${studentId}`,

  // Attendance
  ACTIVE_SESSION: (schoolId) => `attendance:session:${schoolId}`,
});

// TTL constants in seconds
export const CACHE_TTL = Object.freeze({
  SCHOOL: 5 * 60, // 5 min
  SUBSCRIPTION: 10 * 60, // 10 min
  STUDENT: 5 * 60, // 5 min
  TOKEN: 60, // 1 min — scan critical path
  OTP: 10 * 60, // 10 min
  SESSION: 30 * 24 * 60 * 60, // 30 days
  TIMETABLE: 30 * 60, // 30 min
  EMERGENCY_PROFILE: 5 * 60, // 5 min
  ACTIVE_SESSION: 60 * 60, // 1 hour
  RATE_LIMIT: 15 * 60, // 15 min window
  IP_BLOCK: 24 * 60 * 60, // 24 hours
});
