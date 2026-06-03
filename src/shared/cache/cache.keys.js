// =============================================================================
// cache.keys.js — RESQID
//
// Centralized cache key builders. Every cache key in the system is built here.
// Uses CACHE_KEYS from constants — no magic strings anywhere else.
// =============================================================================

import { CACHE_KEYS } from '#shared/constants/cache.js';

export const cacheKeys = {
  // ─── School ──────────────────────────────────────────────────────────────
  school: {
    profile: (id) => CACHE_KEYS.SCHOOL(id),
    settings: (id) => CACHE_KEYS.SCHOOL_SETTINGS(id),
    students: (schoolId) => CACHE_KEYS.SCHOOL_STUDENTS(schoolId),
    teachers: (schoolId) => CACHE_KEYS.SCHOOL_TEACHERS(schoolId),
    modules: (schoolId) => CACHE_KEYS.SCHOOL_MODULES(schoolId),
  },

  // ─── Subscription ────────────────────────────────────────────────────────
  subscription: {
    details: (schoolId) => CACHE_KEYS.SUBSCRIPTION(schoolId),
  },

  // ─── Student ─────────────────────────────────────────────────────────────
  student: {
    profile: (id) => CACHE_KEYS.STUDENT(id),
    fullProfile: (id) => CACHE_KEYS.STUDENT_PROFILE(id),
    emergency: (id) => CACHE_KEYS.STUDENT_EMERGENCY(id),
  },

  // ─── Token / Card / QR ───────────────────────────────────────────────────
  token: {
    byId: (id) => CACHE_KEYS.TOKEN(id),
    byCode: (code) => CACHE_KEYS.TOKEN_BY_CODE(code),
    scanCode: (code) => CACHE_KEYS.SCAN_CODE(code),
    qr: (studentId) => CACHE_KEYS.QR_CACHE(studentId),
  },

  // ─── Session ─────────────────────────────────────────────────────────────
  session: {
    byId: (id) => CACHE_KEYS.SESSION(id),
    byUser: (userId) => CACHE_KEYS.USER_SESSIONS(userId),
    byDevice: (userId) => CACHE_KEYS.DEVICE_SESSIONS(userId),
    refreshToken: (hash) => CACHE_KEYS.REFRESH_TOKEN(hash),
  },

  // ─── OTP ─────────────────────────────────────────────────────────────────
  otp: {
    code: (phone) => CACHE_KEYS.OTP(phone),
    attempts: (phone) => CACHE_KEYS.OTP_ATTEMPTS(phone),
    cooldown: (phone) => CACHE_KEYS.OTP_COOLDOWN(phone),
  },

  // ─── Timetable ───────────────────────────────────────────────────────────
  timetable: {
    school: (schoolId) => CACHE_KEYS.TIMETABLE(schoolId),
    class: (schoolId, classId) => CACHE_KEYS.TIMETABLE_CLASS(schoolId, classId),
    substitution: (id) => CACHE_KEYS.SUBSTITUTION(id),
    // 🔧 ADDED:
    generation: (jobId) => `timetable:generation:${jobId}`,
    validation: (timetableId) => `timetable:validation:${timetableId}`,
    export: (timetableId) => `timetable:export:${timetableId}`,
    crisis: (schoolId) => `timetable:crisis:${schoolId}`,
    template: (templateId) => `timetable:template:${templateId}`,
    constraintPreset: (schoolId) => `timetable:constraints:${schoolId}`,
    gradeConfig: (schoolId) => `timetable:grade-config:${schoolId}`,
  },

  // ─── Teacher ─────────────────────────────────────────────────────────────
  teacher: {
    profile: (id) => CACHE_KEYS.TEACHER(id),
    schedule: (teacherId) => CACHE_KEYS.TEACHER_SCHEDULE(teacherId),
    // 🔧 ADDED:
    wellness: (teacherId) => `teacher:wellness:${teacherId}`,
    substitution: (teacherId) => `teacher:substitution:${teacherId}`,
  },

  // ─── Room ────────────────────────────────────────────────────────────────
  room: {
    list: (schoolId) => `rooms:${schoolId}`,
    schedule: (roomId) => `room:schedule:${roomId}`,
  },

  // ─── Class ───────────────────────────────────────────────────────────────
  class: {
    list: (schoolId) => `classes:${schoolId}`,
    schedule: (classId) => `class:schedule:${classId}`,
  },

  // ─── Emergency ───────────────────────────────────────────────────────────
  emergency: {
    profile: (studentId) => CACHE_KEYS.EMERGENCY_PROFILE(studentId),
    contacts: (studentId) => CACHE_KEYS.EMERGENCY_CONTACTS(studentId),
    scanLog: (studentId) => CACHE_KEYS.EMERGENCY_SCAN_LOG(studentId),
  },

  // ─── Attendance ──────────────────────────────────────────────────────────
  attendance: {
    session: (schoolId) => CACHE_KEYS.ACTIVE_SESSION(schoolId),
    record: (studentId, date) => CACHE_KEYS.ATTENDANCE_RECORD(studentId, date),
    device: (deviceId) => CACHE_KEYS.ATTENDANCE_DEVICE(deviceId),
  },

  // ─── Rate Limiting ───────────────────────────────────────────────────────
  rateLimit: {
    global: (ip) => CACHE_KEYS.RATE_LIMIT_GLOBAL(ip),
    auth: (ip) => CACHE_KEYS.RATE_LIMIT_AUTH(ip),
    login: (identifier) => CACHE_KEYS.RATE_LIMIT_LOGIN(identifier),
    otp: (phone) => CACHE_KEYS.RATE_LIMIT_OTP(phone),
    scan: (ip) => CACHE_KEYS.RATE_LIMIT_SCAN(ip),
    attendance: (deviceId) => CACHE_KEYS.RATE_LIMIT_ATTENDANCE(deviceId),
    api: (ip) => CACHE_KEYS.RATE_LIMIT_API(ip),
  },

  // ─── Slow Down ───────────────────────────────────────────────────────────
  slowDown: {
    counter: (ip) => CACHE_KEYS.SLOW_DOWN(ip),
    count: (ip) => CACHE_KEYS.SLOW_DOWN_COUNT(ip),
  },

  // ─── IP Security ─────────────────────────────────────────────────────────
  ip: {
    reputation: (ip) => CACHE_KEYS.IP_REPUTATION(ip),
    failures: (ip) => CACHE_KEYS.IP_FAILURES(ip),
    successes: (ip) => CACHE_KEYS.IP_SUCCESSES(ip),
    whitelist: (ip) => CACHE_KEYS.IP_WHITELIST(ip),
    blacklist: (ip) => CACHE_KEYS.IP_BLACKLIST(ip),
    block: (ip) => CACHE_KEYS.IP_BLOCK(ip),
    blockReason: (ip) => CACHE_KEYS.IP_BLOCK_REASON(ip),
    blockHistory: (ip) => CACHE_KEYS.IP_BLOCK_HISTORY(ip),
    geo: (ip) => CACHE_KEYS.IP_GEO(ip),
  },

  // ─── Device ──────────────────────────────────────────────────────────────
  device: {
    fingerprint: (deviceId) => CACHE_KEYS.DEVICE_FINGERPRINT(deviceId),
    trust: (deviceId) => CACHE_KEYS.DEVICE_TRUST(deviceId),
    block: (deviceId) => CACHE_KEYS.DEVICE_BLOCK(deviceId),
    user: (deviceId) => CACHE_KEYS.DEVICE_USER(deviceId),
    sessions: (deviceId) => CACHE_KEYS.DEVICE_SESSIONS(deviceId),
    history: (userId) => CACHE_KEYS.DEVICE_HISTORY(userId),
    lastSeen: (deviceId) => CACHE_KEYS.DEVICE_LAST_SEEN(deviceId),
  },

  // ─── CSRF ────────────────────────────────────────────────────────────────
  csrf: {
    token: (token) => CACHE_KEYS.CSRF_TOKEN(token),
    userToken: (userId) => CACHE_KEYS.CSRF_TOKEN_USER(userId),
    sessionToken: (sessionId) => CACHE_KEYS.CSRF_TOKEN_SESSION(sessionId),
  },

  // ─── Behavioral Security ─────────────────────────────────────────────────
  behavior: {
    userScore: (userId) => CACHE_KEYS.BEHAVIOR_SCORE(userId),
    userPattern: (userId) => CACHE_KEYS.BEHAVIOR_PATTERN(userId),
    deviceScore: (deviceId) => CACHE_KEYS.BEHAVIOR_DEVICE(deviceId),
    location: (userId) => CACHE_KEYS.BEHAVIOR_LOCATION(userId),
    scanPattern: (studentId) => CACHE_KEYS.SCAN_PATTERN(studentId),
    scanVelocity: (ip) => CACHE_KEYS.SCAN_VELOCITY(ip),
    attendancePattern: (studentId) => CACHE_KEYS.ATTENDANCE_PATTERN(studentId),
  },

  // ─── Attack Detection ────────────────────────────────────────────────────
  attack: {
    window: (ip) => CACHE_KEYS.ATTACK_WINDOW(ip),
    count: (ip) => CACHE_KEYS.ATTACK_COUNT(ip),
    type: (ip) => CACHE_KEYS.ATTACK_TYPE(ip),
    history: (ip) => CACHE_KEYS.ATTACK_HISTORY(ip),
    blocked: (ip) => CACHE_KEYS.ATTACK_BLOCKED(ip),
  },

  // ─── System ──────────────────────────────────────────────────────────────
  system: {
    maintenance: () => CACHE_KEYS.MAINTENANCE_MODE,
    maintenanceWhitelist: () => CACHE_KEYS.MAINTENANCE_WHITELIST,
    deprecatedVersion: (version) => CACHE_KEYS.API_VERSION_DEPRECATED(version),
    featureFlag: (flag) => CACHE_KEYS.FEATURE_FLAG(flag),
    circuitBreaker: (service) => CACHE_KEYS.CIRCUIT_BREAKER(service),
  },

  // ─── Scan Tracking ───────────────────────────────────────────────────────
  scan: {
    recent: (studentId) => `scan:recent:${studentId}`,
    rateByIp: (ip) => `scanrate:${ip}`,
    rateByStudent: (studentId) => `scanrate:student:${studentId}`,
    emergencyProfile: (studentId) => `scan:emergency-profile:${studentId}`,
  },
};
