// =============================================================================
// RESQID Redis Key Patterns & TTL Registry
//
// Convention:
//   entity:id         → single record
//   entity:id:sub     → sub-record
//   list:entity:scope → list cache
//   rl:type:scope     → rate limit keys
//   security:type:id  → security-related keys
//
// Used by:
//   - cache.provider.js     → generic cache operations
//   - rateLimit.middleware  → rate limit key generation
//   - ipReputation.middleware → IP scoring keys
//   - deviceFingerprint     → device trust keys
//   - behavioralSecurity    → behavior tracking keys
//   - csrf.middleware       → CSRF token storage
// =============================================================================

// ─── Core Entity Keys ────────────────────────────────────────────────────────

export const CACHE_KEYS = Object.freeze({
  // School
  SCHOOL: (id) => `school:${id}`,
  SCHOOL_SETTINGS: (id) => `school:${id}:settings`,
  SCHOOL_STUDENTS: (schoolId) => `list:students:${schoolId}`,
  SCHOOL_TEACHERS: (schoolId) => `list:teachers:${schoolId}`,

  // Subscription / Modules
  SUBSCRIPTION: (schoolId) => `subscription:${schoolId}`,
  SCHOOL_MODULES: (schoolId) => `modules:${schoolId}`,
  PLAN_DETAILS: (planId) => `plan:${planId}`,

  // Student
  STUDENT: (id) => `student:${id}`,
  STUDENT_PROFILE: (id) => `student:${id}:profile`,
  STUDENT_EMERGENCY: (id) => `student:${id}:emergency`,

  // Token / Card / QR
  TOKEN: (id) => `token:${id}`,
  TOKEN_BY_CODE: (code) => `token:code:${code}`,
  SCAN_CODE: (code) => `scan:${code}`,
  QR_CACHE: (studentId) => `qr:${studentId}`,

  // User sessions
  SESSION: (id) => `session:${id}`,
  USER_SESSIONS: (userId) => `sessions:user:${userId}`,
  REFRESH_TOKEN: (hash) => `refresh:${hash}`,
  DEVICE_SESSIONS: (userId) => `sessions:device:${userId}`,

  // OTP
  OTP: (phone) => `otp:${phone}`,
  OTP_ATTEMPTS: (phone) => `otp:attempts:${phone}`,
  OTP_COOLDOWN: (phone) => `otp:cooldown:${phone}`,

  // Timetable
  TIMETABLE: (schoolId) => `timetable:${schoolId}`,
  TIMETABLE_CLASS: (schoolId, classId) => `timetable:${schoolId}:class:${classId}`,
  TEACHER: (id) => `teacher:${id}`,
  TEACHER_SCHEDULE: (teacherId) => `teacher:${teacherId}:schedule`,
  SUBSTITUTION: (id) => `substitution:${id}`,

  // Emergency
  EMERGENCY_PROFILE: (studentId) => `emergency:${studentId}`,
  EMERGENCY_CONTACTS: (studentId) => `emergency:contacts:${studentId}`,
  EMERGENCY_SCAN_LOG: (studentId) => `emergency:scans:${studentId}`,

  // Attendance
  ACTIVE_SESSION: (schoolId) => `attendance:session:${schoolId}`,
  ATTENDANCE_RECORD: (studentId, date) => `attendance:${studentId}:${date}`,
  ATTENDANCE_DEVICE: (deviceId) => `attendance:device:${deviceId}`,

  // ─── Rate Limiting Keys ────────────────────────────────────────────────────

  // Global rate limit (all requests from an IP)
  RATE_LIMIT_GLOBAL: (ip) => `rl:global:${ip}`,

  // Auth-specific rate limits
  RATE_LIMIT_AUTH: (ip) => `rl:auth:${ip}`,
  RATE_LIMIT_LOGIN: (identifier) => `rl:login:${identifier}`, // email/phone
  RATE_LIMIT_OTP: (phone) => `rl:otp:${phone}`,

  // Module-specific rate limits
  RATE_LIMIT_SCAN: (ip) => `rl:scan:${ip}`, // QR emergency scans
  RATE_LIMIT_ATTENDANCE: (deviceId) => `rl:attendance:${deviceId}`, // RFID taps
  RATE_LIMIT_API: (ip) => `rl:api:${ip}`, // General API calls

  // Slow down tracking
  SLOW_DOWN: (ip) => `slowdown:${ip}`,
  SLOW_DOWN_COUNT: (ip) => `slowdown:count:${ip}`,

  // ─── IP Security Keys ──────────────────────────────────────────────────────

  // IP Reputation system
  IP_REPUTATION: (ip) => `iprep:${ip}`,
  IP_FAILURES: (ip) => `ipfail:${ip}`,
  IP_SUCCESSES: (ip) => `ipsuccess:${ip}`,
  IP_WHITELIST: (ip) => `ipwl:${ip}`,
  IP_BLACKLIST: (ip) => `ipbl:${ip}`,

  // IP Block tracking
  IP_BLOCK: (ip) => `ipblock:${ip}`,
  IP_BLOCK_REASON: (ip) => `ipblock:reason:${ip}`,
  IP_BLOCK_HISTORY: (ip) => `ipblock:history:${ip}`,

  // Geo location cache
  IP_GEO: (ip) => `geo:${ip}`,
  GEO_COUNTRY_STATS: (country) => `geo:stats:${country}`,

  // ─── Device Security Keys ──────────────────────────────────────────────────

  // Device fingerprinting
  DEVICE_FINGERPRINT: (deviceId) => `device:${deviceId}`,
  DEVICE_TRUST: (deviceId) => `device:trust:${deviceId}`,
  DEVICE_BLOCK: (deviceId) => `device:block:${deviceId}`,
  DEVICE_USER: (deviceId) => `device:user:${deviceId}`,
  DEVICE_SESSIONS: (deviceId) => `device:sessions:${deviceId}`,

  // Device history
  DEVICE_HISTORY: (userId) => `device:history:${userId}`,
  DEVICE_LAST_SEEN: (deviceId) => `device:lastseen:${deviceId}`,

  // ─── CSRF Protection Keys ──────────────────────────────────────────────────

  CSRF_TOKEN: (token) => `csrf:${token}`,
  CSRF_TOKEN_USER: (userId) => `csrf:user:${userId}`,
  CSRF_TOKEN_SESSION: (sessionId) => `csrf:session:${sessionId}`,

  // ─── Behavioral Security Keys ──────────────────────────────────────────────

  // User behavior tracking
  BEHAVIOR_SCORE: (userId) => `behavior:user:${userId}`,
  BEHAVIOR_PATTERN: (userId) => `behavior:pattern:${userId}`,
  BEHAVIOR_DEVICE: (deviceId) => `behavior:device:${deviceId}`,
  BEHAVIOR_LOCATION: (userId) => `behavior:location:${userId}`,

  // Scan anomaly tracking
  SCAN_PATTERN: (studentId) => `behavior:scan:${studentId}`,
  SCAN_VELOCITY: (ip) => `behavior:scan_velocity:${ip}`,

  // Attendance anomaly tracking
  ATTENDANCE_PATTERN: (studentId) => `behavior:attendance:${studentId}`,

  // ─── Attack Detection Keys ─────────────────────────────────────────────────

  // Attack windows (rolling windows for attack detection)
  ATTACK_WINDOW: (ip) => `attack:window:${ip}`,
  ATTACK_COUNT: (ip) => `attack:count:${ip}`,
  ATTACK_TYPE: (ip) => `attack:type:${ip}`,

  // Attack history
  ATTACK_HISTORY: (ip) => `attack:history:${ip}`,
  ATTACK_BLOCKED: (ip) => `attack:blocked:${ip}`,

  // ─── System & Maintenance Keys ─────────────────────────────────────────────

  // Maintenance mode
  MAINTENANCE_MODE: 'system:maintenance',
  MAINTENANCE_WHITELIST: 'system:maintenance:whitelist',
  MAINTENANCE_SCHEDULE: 'system:maintenance:schedule',
  MAINTENANCE_ETA: 'system:maintenance:eta',

  // API versioning
  API_VERSION_DEPRECATED: (version) => `api:deprecated:${version}`,
  API_VERSION_LATEST: 'api:version:latest',

  // Circuit breaker
  CIRCUIT_BREAKER: (service) => `circuit:${service}`,
  CIRCUIT_BREAKER_FAILURES: (service) => `circuit:failures:${service}`,

  // Feature flags
  FEATURE_FLAG: (flag) => `feature:${flag}`,
  FEATURE_FLAGS_ALL: 'feature:all',

  // ─── Rate Limiting Counters ────────────────────────────────────────────────
  RATE_LIMIT_COUNTER: (key) => `counter:rl:${key}`,
  SCAN_RATE: (ip) => `scanrate:${ip}`,
  SCAN_RATE_STUDENT: (studentId) => `scanrate:student:${studentId}`,
});

// ─── TTL Constants (in seconds) ──────────────────────────────────────────────

export const CACHE_TTL = Object.freeze({
  // Core entities
  SCHOOL: 5 * 60, // 5 minutes
  STUDENT: 5 * 60, // 5 minutes
  TEACHER: 10 * 60, // 10 minutes
  TOKEN: 60, // 1 minute — scan critical path
  QR_CACHE: 5 * 60, // 5 minutes

  // Auth & Sessions
  SESSION: 30 * 24 * 60 * 60, // 30 days
  REFRESH_TOKEN: 7 * 24 * 60 * 60, // 7 days
  OTP: 10 * 60, // 10 minutes
  OTP_COOLDOWN: 60, // 1 minute cooldown

  // Subscriptions & Plans
  SUBSCRIPTION: 10 * 60, // 10 minutes
  PLAN_DETAILS: 30 * 60, // 30 minutes

  // Timetable
  TIMETABLE: 30 * 60, // 30 minutes
  TEACHER_SCHEDULE: 15 * 60, // 15 minutes
  SUBSTITUTION: 5 * 60, // 5 minutes

  // Emergency
  EMERGENCY_PROFILE: 5 * 60, // 5 minutes
  EMERGENCY_CONTACTS: 2 * 60, // 2 minutes

  // Attendance
  ACTIVE_SESSION: 60 * 60, // 1 hour
  ATTENDANCE_RECORD: 10 * 60, // 10 minutes

  // ─── Rate Limiting TTLs ────────────────────────────────────────────────────

  // Standard rate limit windows
  RATE_LIMIT_GLOBAL: 15 * 60, // 15 minute window
  RATE_LIMIT_AUTH: 15 * 60, // 15 minute window
  RATE_LIMIT_LOGIN: 30 * 60, // 30 minute window (brute force protection)
  RATE_LIMIT_OTP: 10 * 60, // 10 minute window

  // Module-specific rate limits
  RATE_LIMIT_SCAN: 60, // 1 minute window
  RATE_LIMIT_ATTENDANCE: 1, // 1 second window (real-time)
  RATE_LIMIT_API: 60, // 1 minute window

  // Slow down tracking
  SLOW_DOWN: 15 * 60, // 15 minute window

  // ─── IP Security TTLs ──────────────────────────────────────────────────────

  IP_REPUTATION: 7 * 24 * 60 * 60, // 7 days
  IP_FAILURES: 24 * 60 * 60, // 24 hours
  IP_WHITELIST: 30 * 24 * 60 * 60, // 30 days
  IP_BLACKLIST: 90 * 24 * 60 * 60, // 90 days
  IP_BLOCK: 24 * 60 * 60, // 24 hours
  IP_BLOCK_HISTORY: 30 * 24 * 60 * 60, // 30 days
  GEO_LOOKUP: 30 * 24 * 60 * 60, // 30 days (IP geo data rarely changes)

  // ─── Device Security TTLs ──────────────────────────────────────────────────

  DEVICE_FINGERPRINT: 30 * 24 * 60 * 60, // 30 days
  DEVICE_TRUST: 7 * 24 * 60 * 60, // 7 days
  DEVICE_BLOCK: 90 * 24 * 60 * 60, // 90 days
  DEVICE_HISTORY: 90 * 24 * 60 * 60, // 90 days
  DEVICE_LAST_SEEN: 24 * 60 * 60, // 24 hours

  // ─── CSRF TTLs ─────────────────────────────────────────────────────────────

  CSRF_TOKEN: 60 * 60, // 1 hour
  CSRF_TOKEN_SESSION: 30 * 60, // 30 minutes

  // ─── Behavioral Security TTLs ──────────────────────────────────────────────

  BEHAVIOR_SCORE: 24 * 60 * 60, // 24 hours
  BEHAVIOR_PATTERN: 7 * 24 * 60 * 60, // 7 days
  SCAN_PATTERN: 24 * 60 * 60, // 24 hours
  SCAN_VELOCITY: 60, // 1 minute

  // ─── Attack Detection TTLs ─────────────────────────────────────────────────

  ATTACK_WINDOW: 5 * 60, // 5 minute rolling window
  ATTACK_HISTORY: 7 * 24 * 60 * 60, // 7 days

  // ─── System TTLs ───────────────────────────────────────────────────────────

  MAINTENANCE_MODE: 0, // No expiry (manual clear)
  FEATURE_FLAG: 5 * 60, // 5 minutes
  API_VERSION: 60 * 60, // 1 hour
  CIRCUIT_BREAKER: 5 * 60, // 5 minutes (half-open state)
});

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Get TTL for a specific key type
 * Falls back to default TTL if not found
 */
export const getTTL = (keyType, defaultValue = 300) => {
  return CACHE_TTL[keyType] || defaultValue;
};

/**
 * Generate a namespaced rate limit key
 */
export const getRateLimitKey = (type, identifier) => {
  const keyMap = {
    global: CACHE_KEYS.RATE_LIMIT_GLOBAL,
    auth: CACHE_KEYS.RATE_LIMIT_AUTH,
    login: CACHE_KEYS.RATE_LIMIT_LOGIN,
    otp: CACHE_KEYS.RATE_LIMIT_OTP,
    scan: CACHE_KEYS.RATE_LIMIT_SCAN,
    attendance: CACHE_KEYS.RATE_LIMIT_ATTENDANCE,
    api: CACHE_KEYS.RATE_LIMIT_API,
  };

  const keyGenerator = keyMap[type];
  return keyGenerator ? keyGenerator(identifier) : `rl:custom:${type}:${identifier}`;
};

/**
 * Get TTL for a rate limit type
 */
export const getRateLimitTTL = (type) => {
  const ttlMap = {
    global: CACHE_TTL.RATE_LIMIT_GLOBAL,
    auth: CACHE_TTL.RATE_LIMIT_AUTH,
    login: CACHE_TTL.RATE_LIMIT_LOGIN,
    otp: CACHE_TTL.RATE_LIMIT_OTP,
    scan: CACHE_TTL.RATE_LIMIT_SCAN,
    attendance: CACHE_TTL.RATE_LIMIT_ATTENDANCE,
    api: CACHE_TTL.RATE_LIMIT_API,
  };

  return ttlMap[type] || CACHE_TTL.RATE_LIMIT_GLOBAL;
};
