// =============================================================================
// dateTime.js — RESQID
//
// All RESQID dates are stored in UTC in DB.
// All display dates are IST (UTC+5:30).
//
// Used by:
//   - middleware (rate limit headers, token expiry checks)
//   - services (attendance, timetable, subscriptions)
//   - audit logging (timestamps)
// =============================================================================

const IST_TIMEZONE = 'Asia/Kolkata';

// ─── Current Time ────────────────────────────────────────────────────────────

/**
 * Get current UTC time as ISO string (for DB storage)
 */
export const nowUTC = () => new Date().toISOString();

/**
 * Get current Date object (UTC internally, format with timezone for display)
 */
export const now = () => new Date();

/**
 * Get current Unix timestamp in seconds (for JWT iat/exp claims)
 */
export const nowUnix = () => Math.floor(Date.now() / 1000);

/**
 * Get current Unix timestamp in milliseconds (for rate limiting)
 */
export const nowMs = () => Date.now();

// ─── IST Display ─────────────────────────────────────────────────────────────

/**
 * Format date to readable IST string
 * → "26 May 2026, 10:30 AM"
 */
export const formatIST = (date, options = {}) => {
  return new Date(date).toLocaleString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options,
  });
};

/**
 * Format to date only → "26 May 2026"
 */
export const formatDateIST = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format to time only → "10:30 AM"
 */
export const formatTimeIST = (date) => {
  return new Date(date).toLocaleTimeString('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format to ISO string in IST (for display, not DB)
 */
export const toISOIST = (date) => {
  return new Date(date)
    .toLocaleString('en-CA', {
      timeZone: IST_TIMEZONE,
      hour12: false,
    })
    .replace(', ', 'T');
};

// ─── Date Ranges (for DB Queries) ────────────────────────────────────────────

/**
 * Get start and end of today in IST (as UTC Date objects for DB queries)
 * → { start: Date, end: Date }
 */
export const todayRangeUTC = () => {
  const istDate = new Date().toLocaleDateString('en-CA', { timeZone: IST_TIMEZONE });
  const start = new Date(`${istDate}T00:00:00+05:30`);
  const end = new Date(`${istDate}T23:59:59.999+05:30`);
  return { start, end };
};

/**
 * Get start and end of a specific date in IST
 */
export const dateRangeUTC = (date) => {
  const istDate = new Date(date).toLocaleDateString('en-CA', { timeZone: IST_TIMEZONE });
  const start = new Date(`${istDate}T00:00:00+05:30`);
  const end = new Date(`${istDate}T23:59:59.999+05:30`);
  return { start, end };
};

// ─── Date Math ───────────────────────────────────────────────────────────────

/**
 * Add days to a date
 */
export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Add hours to a date
 */
export const addHours = (date, hours) => {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
};

/**
 * Add minutes to a date
 */
export const addMinutes = (date, minutes) => {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
};

/**
 * Add seconds to a date
 */
export const addSeconds = (date, seconds) => {
  const result = new Date(date);
  result.setSeconds(result.getSeconds() + seconds);
  return result;
};

/**
 * Add months to a date
 */
export const addMonths = (date, months) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

/**
 * Add years to a date — for subscription renewals
 */
export const addYears = (date, years) => {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
};

// ─── Date Comparison ─────────────────────────────────────────────────────────

/**
 * Check if a date is expired
 */
export const isExpired = (date) => {
  return new Date(date) < new Date();
};

/**
 * Check if a date is in the future
 */
export const isFuture = (date) => {
  return new Date(date) > new Date();
};

/**
 * Days between two dates
 */
export const daysBetween = (date1, date2) => {
  const diff = new Date(date2) - new Date(date1);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

/**
 * Days remaining until a date
 */
export const daysUntil = (date) => {
  return daysBetween(new Date(), date);
};

/**
 * Days since a date
 */
export const daysSince = (date) => {
  return daysBetween(date, new Date());
};

/**
 * Hours between two dates
 */
export const hoursBetween = (date1, date2) => {
  const diff = new Date(date2) - new Date(date1);
  return Math.ceil(diff / (1000 * 60 * 60));
};

// ─── Middleware Helpers ──────────────────────────────────────────────────────

/**
 * Get seconds from now until a future date.
 * Used for rate limit Retry-After headers.
 */
export const secondsFromNow = (date) => {
  const diff = new Date(date).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 1000));
};

/**
 * Create a date from now + seconds.
 * Used for setting rate limit reset times.
 */
export const fromNowSeconds = (seconds) => {
  return new Date(Date.now() + seconds * 1000);
};

/**
 * Human-readable duration from milliseconds.
 * → "2h 30m" or "45s" or "3d 12h"
 */
export const formatDuration = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

/**
 * ISO timestamp for audit logging (UTC)
 */
export const auditTimestamp = () => new Date().toISOString();

/**
 * Check if a timestamp is within a window (in seconds)
 * Used by rate limiting and anomaly detection.
 */
export const isWithinWindow = (timestamp, windowSeconds) => {
  const now = Date.now();
  const time = new Date(timestamp).getTime();
  return now - time <= windowSeconds * 1000;
};

/**
 * Get school hours status
 * Used by behavioral security to detect off-hours activity.
 */
export const getSchoolHoursStatus = (date = new Date(), startHour = 6, endHour = 20) => {
  const hour = new Date(date).toLocaleString('en-US', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    hour12: false,
  });
  const hourNum = parseInt(hour);
  return {
    hour: hourNum,
    isSchoolHours: hourNum >= startHour && hourNum < endHour,
    isOffHours: hourNum < startHour || hourNum >= endHour,
  };
};
