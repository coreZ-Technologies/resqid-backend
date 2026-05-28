// =============================================================================
// env.js — RESQID
// Single source of truth for all environment variables
// Validates all required values at startup — fails fast if anything is missing
// =============================================================================

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
  const envPath = path.resolve(__dirname, '../../.env');
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    dotenv.config();
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const IS_PROD = process.env.NODE_ENV === 'production';
const errors = [];

function required(key, options = {}) {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    if (IS_PROD || !options.prodOnly) {
      errors.push(`  ✗ ${key} — required but not set`);
    }
    return options.default ?? '';
  }
  const trimmed = value.trim();
  if (options.minLength && trimmed.length < options.minLength) {
    errors.push(`  ✗ ${key} — too short (min ${options.minLength} chars)`);
  }
  if (options.oneOf && !options.oneOf.includes(trimmed)) {
    errors.push(`  ✗ ${key} — invalid value '${trimmed}'`);
  }
  return trimmed;
}

function optional(key, defaultValue = '') {
  const value = process.env[key];
  if (!value || value.trim() === '') return defaultValue;
  return value.trim();
}

function optionalInt(key, defaultValue) {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  const parsed = parseInt(raw.trim(), 10);
  if (isNaN(parsed)) {
    errors.push(`  ✗ ${key} — must be an integer`);
    return defaultValue;
  }
  return parsed;
}

function optionalBool(key, defaultValue = false) {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  return raw.trim().toLowerCase() === 'true';
}

function optionalList(key, defaultValue = []) {
  const raw = process.env[key];
  if (!raw || raw.trim() === '') return defaultValue;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// ─── Parse All Variables ──────────────────────────────────────────────────────

const _env = {
  // ─── Server ────────────────────────────────────────────────────────────────
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: optionalInt('PORT', 3000),
  API_URL: optional('API_URL', 'http://localhost:3000'),
  TRUST_PROXY: optionalInt('TRUST_PROXY', 1),

  // ─── Database ──────────────────────────────────────────────────────────────
  DATABASE_URL: required('DATABASE_URL', { minLength: 20 }),

  // ─── Redis ─────────────────────────────────────────────────────────────────
  REDIS_URL: required('REDIS_URL', { minLength: 10 }),
  REDIS_PASSWORD: optional('REDIS_PASSWORD'),
  REDIS_TLS: optionalBool('REDIS_TLS', false),
  REDIS_KEY_PREFIX: optional('REDIS_KEY_PREFIX', 'resqid:'),
  REDIS_MAX_RETRIES_PER_REQUEST: optionalInt('REDIS_MAX_RETRIES_PER_REQUEST', 1),
  REDIS_CONNECT_TIMEOUT: optionalInt('REDIS_CONNECT_TIMEOUT', 10000),
  REDIS_COMMAND_TIMEOUT: optionalInt('REDIS_COMMAND_TIMEOUT', 5000),
  REDIS_KEEP_ALIVE: optionalInt('REDIS_KEEP_ALIVE', 30000),

  // ─── JWT ───────────────────────────────────────────────────────────────────
  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET', { minLength: 32 }),
  JWT_ACCESS_EXPIRY: optional('JWT_ACCESS_EXPIRY', '15m'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET', { minLength: 32 }),
  JWT_REFRESH_EXPIRY: optional('JWT_REFRESH_EXPIRY', '30d'),
  JWT_DEVICE_SECRET: optional('JWT_DEVICE_SECRET', process.env.JWT_ACCESS_SECRET || ''),
  JWT_DEVICE_EXPIRY: optional('JWT_DEVICE_EXPIRY', '30d'),
  JWT_SCAN_SECRET: optional('JWT_SCAN_SECRET', process.env.JWT_ACCESS_SECRET || ''),
  JWT_SCAN_EXPIRY: optional('JWT_SCAN_EXPIRY', '5m'),

  // ─── CSRF ──────────────────────────────────────────────────────────────────
  CSRF_SECRET: required('CSRF_SECRET', { minLength: 32 }),
  CSRF_ENABLED: optionalBool('CSRF_ENABLED', true),
  CSRF_COOKIE_NAME: optional('CSRF_COOKIE_NAME', 'csrf_token'),
  CSRF_HEADER_NAME: optional('CSRF_HEADER_NAME', 'x-csrf-token'),
  CSRF_COOKIE_HTTP_ONLY: optionalBool('CSRF_COOKIE_HTTP_ONLY', false),
  CSRF_COOKIE_SAME_SITE: optional('CSRF_COOKIE_SAME_SITE', 'strict'),

  // ─── URLs ──────────────────────────────────────────────────────────────────
  SUPER_ADMIN_URL: required('SUPER_ADMIN_URL'),
  SCHOOL_ADMIN_URL: required('SCHOOL_ADMIN_URL'),
  SCAN_BASE_URL: optional('SCAN_BASE_URL', 'http://localhost:3000/s'),
  COOKIE_DOMAIN: optional('COOKIE_DOMAIN'),

  // ─── Storage (Cloudflare R2 / S3) ──────────────────────────────────────────
  AWS_ACCESS_KEY_ID: required('AWS_ACCESS_KEY_ID', { prodOnly: true }),
  AWS_SECRET_ACCESS_KEY: required('AWS_SECRET_ACCESS_KEY', { prodOnly: true, minLength: 20 }),
  AWS_REGION: optional('AWS_REGION', 'auto'),
  AWS_S3_BUCKET: required('AWS_S3_BUCKET', { prodOnly: true }),
  AWS_S3_ENDPOINT: required('AWS_S3_ENDPOINT', { prodOnly: true }),
  AWS_CDN_DOMAIN: optional('AWS_CDN_DOMAIN'),

  // ─── SMS (MSG91) ───────────────────────────────────────────────────────────
  MSG91_AUTH_KEY: required('MSG91_AUTH_KEY', { prodOnly: true }),
  MSG91_OTP_TEMPLATE_ID: required('MSG91_OTP_TEMPLATE_ID', { prodOnly: true }),
  MSG91_SENDER_ID: optional('MSG91_SENDER_ID', 'RESQID'),

  // ─── Email (Resend) ────────────────────────────────────────────────────────
  RESEND_API_KEY: required('RESEND_API_KEY', { prodOnly: true }),
  RESEND_FROM_EMAIL: optional('RESEND_FROM_EMAIL', 'noreply@mail.getresqid.in'),

  // ─── Push Notifications (Expo) ─────────────────────────────────────────────
  EXPO_ACCESS_TOKEN: optional('EXPO_ACCESS_TOKEN'),

  // ─── Encryption ────────────────────────────────────────────────────────────
  ENCRYPTION_KEY: required('ENCRYPTION_KEY', { minLength: 64 }),
  LOOKUP_HASH_SECRET: required('LOOKUP_HASH_SECRET', { minLength: 32 }),
  TOKEN_HASH_SECRET: required('TOKEN_HASH_SECRET', { minLength: 32 }),
  SCAN_CODE_SECRET: required('SCAN_CODE_SECRET', { minLength: 64 }),
  QR_ENCRYPTION_ALGORITHM: optional('QR_ENCRYPTION_ALGORITHM', 'aes-256-gcm'),
  QR_DATA_EXPIRY_SECONDS: optionalInt('QR_DATA_EXPIRY_SECONDS', 300),

  // ─── Logging ───────────────────────────────────────────────────────────────
  LOG_LEVEL: optional('LOG_LEVEL', IS_PROD ? 'info' : 'debug'),
  LOG_FORMAT: optional('LOG_FORMAT', IS_PROD ? 'json' : 'pretty'),
  LOG_FILE_PATH: optional('LOG_FILE_PATH'),

  // ─── Sentry ────────────────────────────────────────────────────────────────
  SENTRY_DSN: optional('SENTRY_DSN'),
  SENTRY_ENVIRONMENT: optional('SENTRY_ENVIRONMENT', 'development'),
  SENTRY_TRACES_SAMPLE_RATE: parseFloat(optional('SENTRY_TRACES_SAMPLE_RATE', '0.1')),

  // ─── Rate Limiting (Global) ────────────────────────────────────────────────
  ENABLE_RATE_LIMIT: optionalBool('ENABLE_RATE_LIMIT', true),
  RATE_LIMIT_WINDOW_MS: optionalInt('RATE_LIMIT_WINDOW_MS', 60000),
  RATE_LIMIT_MAX_REQUESTS: optionalInt('RATE_LIMIT_MAX_REQUESTS', 100),

  // ─── Rate Limiting (Module-Specific) ───────────────────────────────────────
  SCAN_RATE_LIMIT_WINDOW_MS: optionalInt('SCAN_RATE_LIMIT_WINDOW_MS', 60000),
  SCAN_RATE_LIMIT_MAX: optionalInt('SCAN_RATE_LIMIT_MAX', 30),
  ATTENDANCE_RATE_LIMIT_WINDOW_MS: optionalInt('ATTENDANCE_RATE_LIMIT_WINDOW_MS', 1000),
  ATTENDANCE_RATE_LIMIT_MAX: optionalInt('ATTENDANCE_RATE_LIMIT_MAX', 10),
  AUTH_RATE_LIMIT_WINDOW_MS: optionalInt('AUTH_RATE_LIMIT_WINDOW_MS', 900000),
  AUTH_RATE_LIMIT_MAX: optionalInt('AUTH_RATE_LIMIT_MAX', 20),
  OTP_RATE_LIMIT_WINDOW_MS: optionalInt('OTP_RATE_LIMIT_WINDOW_MS', 600000),
  OTP_RATE_LIMIT_MAX: optionalInt('OTP_RATE_LIMIT_MAX', 5),

  // ─── Slow Down ─────────────────────────────────────────────────────────────
  SLOW_DOWN_ENABLED: optionalBool('SLOW_DOWN_ENABLED', true),
  SLOW_DOWN_WINDOW_MS: optionalInt('SLOW_DOWN_WINDOW_MS', 900000),
  SLOW_DOWN_DELAY_AFTER: optionalInt('SLOW_DOWN_DELAY_AFTER', 50),
  SLOW_DOWN_DELAY_MS: optionalInt('SLOW_DOWN_DELAY_MS', 500),

  // ─── Device Fingerprinting ─────────────────────────────────────────────────
  DEVICE_FINGERPRINT_SECRET: optional('DEVICE_FINGERPRINT_SECRET', process.env.CSRF_SECRET || ''),
  DEVICE_TRUST_THRESHOLD_DAYS: optionalInt('DEVICE_TRUST_THRESHOLD_DAYS', 30),
  MAX_DEVICES_PER_USER: optionalInt('MAX_DEVICES_PER_USER', 5),
  DEVICE_FINGERPRINT_ENABLED: optionalBool('DEVICE_FINGERPRINT_ENABLED', true),

  // ─── IP Reputation ─────────────────────────────────────────────────────────
  IP_REPUTATION_ENABLED: optionalBool('IP_REPUTATION_ENABLED', true),
  IP_REPUTATION_THRESHOLD: optionalInt('IP_REPUTATION_THRESHOLD', -50),
  IP_BLOCK_DURATION_HOURS: optionalInt('IP_BLOCK_DURATION_HOURS', 24),
  IP_FAILURE_WINDOW_MINUTES: optionalInt('IP_FAILURE_WINDOW_MINUTES', 15),
  IP_MAX_FAILURES: optionalInt('IP_MAX_FAILURES', 10),

  // ─── Geo Blocking ──────────────────────────────────────────────────────────
  GEO_BLOCK_ENABLED: optionalBool('GEO_BLOCK_ENABLED', false),
  GEO_BLOCK_MODE: optional('GEO_BLOCK_MODE', 'blocklist'),
  GEO_BLOCKED_COUNTRIES: optionalList('GEO_BLOCKED_COUNTRIES'),
  GEO_ALLOWED_COUNTRIES: optionalList('GEO_ALLOWED_COUNTRIES', ['IN']),

  // ─── Behavioral Security ───────────────────────────────────────────────────
  BEHAVIORAL_ANALYSIS_ENABLED: optionalBool('BEHAVIORAL_ANALYSIS_ENABLED', true),
  IMPOSSIBLE_TRAVEL_THRESHOLD_KM: optionalInt('IMPOSSIBLE_TRAVEL_THRESHOLD_KM', 500),
  RAPID_SCAN_THRESHOLD: optionalInt('RAPID_SCAN_THRESHOLD', 10),
  UNUSUAL_HOURS_START: optionalInt('UNUSUAL_HOURS_START', 22),
  UNUSUAL_HOURS_END: optionalInt('UNUSUAL_HOURS_END', 6),

  // ─── Attack Detection ──────────────────────────────────────────────────────
  ATTACK_DETECTION_ENABLED: optionalBool('ATTACK_DETECTION_ENABLED', true),
  ATTACK_WINDOW_SECONDS: optionalInt('ATTACK_WINDOW_SECONDS', 300),
  ATTACK_THRESHOLD: optionalInt('ATTACK_THRESHOLD', 50),
  BRUTE_FORCE_THRESHOLD: optionalInt('BRUTE_FORCE_THRESHOLD', 10),

  // ─── Cloudflare ────────────────────────────────────────────────────────────
  BEHIND_CLOUDFLARE: optionalBool('BEHIND_CLOUDFLARE', false),
  CLOUDFLARE_IP_HEADER: optional('CLOUDFLARE_IP_HEADER', 'cf-connecting-ip'),
  CLOUDFLARE_COUNTRY_HEADER: optional('CLOUDFLARE_COUNTRY_HEADER', 'cf-ipcountry'),

  // ─── API Versioning ────────────────────────────────────────────────────────
  API_VERSION_HEADER: optional('API_VERSION_HEADER', 'x-api-version'),
  API_DEFAULT_VERSION: optional('API_DEFAULT_VERSION', '1'),
  API_DEPRECATED_VERSIONS: optionalList('API_DEPRECATED_VERSIONS'),

  // ─── Maintenance Mode ──────────────────────────────────────────────────────
  MAINTENANCE_MODE_ENABLED: optionalBool('MAINTENANCE_MODE_ENABLED', false),
  MAINTENANCE_BYPASS_SECRET: required('MAINTENANCE_BYPASS_SECRET', { minLength: 16 }),
  MAINTENANCE_WHITELIST_IPS: optionalList('MAINTENANCE_WHITELIST_IPS'),
  MAINTENANCE_WHITELIST_ROLES: optionalList('MAINTENANCE_WHITELIST_ROLES', ['SUPER_ADMIN']),

  // ─── CORS ──────────────────────────────────────────────────────────────────
  CORS_ORIGINS: optional('CORS_ORIGINS', 'http://localhost:3000'),
  CORS_METHODS: optional('CORS_METHODS', 'GET,POST,PUT,PATCH,DELETE,OPTIONS'),
  CORS_ALLOWED_HEADERS: optional(
    'CORS_ALLOWED_HEADERS',
    'Content-Type,Authorization,X-CSRF-Token,X-API-Key,X-Device-Id'
  ),
  CORS_CREDENTIALS: optionalBool('CORS_CREDENTIALS', true),
  CORS_MAX_AGE: optionalInt('CORS_MAX_AGE', 86400),

  // ─── Request Size Limits ───────────────────────────────────────────────────
  MAX_REQUEST_SIZE: optional('MAX_REQUEST_SIZE', '10mb'),
  MAX_FILE_SIZE: optional('MAX_FILE_SIZE', '5mb'),

  // ─── Content Security ──────────────────────────────────────────────────────
  XSS_PROTECTION_ENABLED: optionalBool('XSS_PROTECTION_ENABLED', true),
  NOSQL_INJECTION_PROTECTION_ENABLED: optionalBool('NOSQL_INJECTION_PROTECTION_ENABLED', true),
  HPP_PROTECTION_ENABLED: optionalBool('HPP_PROTECTION_ENABLED', true),

  // ─── Worker Configuration ──────────────────────────────────────────────────
  WORKER_ROLE: optional('WORKER_ROLE', 'all'),
  ENABLE_PIPELINE_QUEUE: optionalBool('ENABLE_PIPELINE_QUEUE', false),
  SLACK_ALERTS_WEBHOOK: optional('SLACK_ALERTS_WEBHOOK'),
  ENABLE_STEP_METRICS: optionalBool('ENABLE_STEP_METRICS', false),

  // ─── Token / QR ────────────────────────────────────────────────────────────
  TOKEN_VALIDITY_MONTHS: optionalInt('TOKEN_VALIDITY_MONTHS', 12),
};

// ─── Derived Values ───────────────────────────────────────────────────────────

_env.IS_PROD = _env.NODE_ENV === 'production';
_env.IS_DEV = _env.NODE_ENV === 'development';

// ─── Validation ───────────────────────────────────────────────────────────────

// JWT secrets must be different
if (_env.JWT_ACCESS_SECRET && _env.JWT_ACCESS_SECRET === _env.JWT_REFRESH_SECRET) {
  errors.push('  ✗ JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
}

// Encryption key must be 64 hex characters
if (_env.ENCRYPTION_KEY && !/^[0-9a-fA-F]{64}$/.test(_env.ENCRYPTION_KEY)) {
  errors.push('  ✗ ENCRYPTION_KEY must be 64 hex characters');
}

// Geo block mode validation
if (_env.GEO_BLOCK_ENABLED && !['allowlist', 'blocklist'].includes(_env.GEO_BLOCK_MODE)) {
  errors.push("  ✗ GEO_BLOCK_MODE must be 'allowlist' or 'blocklist'");
}

// Device fingerprint secret fallback warning
if (!process.env.DEVICE_FINGERPRINT_SECRET && IS_PROD) {
  console.warn('  ⚠ DEVICE_FINGERPRINT_SECRET not set — falling back to CSRF_SECRET');
}

// ─── Report & Exit ────────────────────────────────────────────────────────────

if (errors.length > 0) {
  console.error('\n╔══════════════════════════════════════════════════╗');
  console.error('║        RESQID — ENVIRONMENT VARIABLE ERROR       ║');
  console.error('╚══════════════════════════════════════════════════╝\n');
  errors.forEach((e) => console.error(e));
  console.error('\nCopy .env.example to .env and fill in required values.\n');
  process.exit(1);
}

export const ENV = Object.freeze(_env);
