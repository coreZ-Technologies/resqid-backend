// src/helpers/dateTime.js

/**
 * All RESQID dates are stored in UTC in DB.
 * All display dates are IST (UTC+5:30).
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5h 30m in ms

/**
 * Get current IST time as a Date object
 */
export const nowIST = () => {
  return new Date(Date.now() + IST_OFFSET_MS);
};

/**
 * Convert any UTC date to IST Date object
 */
export const toIST = (date) => {
  return new Date(new Date(date).getTime() + IST_OFFSET_MS);
};

/**
 * Format date to readable IST string
 * → "26 May 2026, 10:30 AM"
 */
export const formatIST = (date, options = {}) => {
  return new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
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
    timeZone: 'Asia/Kolkata',
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
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Get start and end of today in UTC (for DB queries)
 * → { start: Date, end: Date }
 */
export const todayRangeUTC = () => {
  const now = new Date();
  const start = new Date(now);
  start.setUTCHours(0 - 5, 30 - 30, 0, 0); // IST midnight in UTC = 18:30 previous day

  // Easier approach using IST string
  const istDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
  const startIST = new Date(`${istDate}T00:00:00+05:30`);
  const endIST = new Date(`${istDate}T23:59:59+05:30`);

  return { start: startIST, end: endIST };
};

/**
 * Check if a date is expired
 */
export const isExpired = (date) => {
  return new Date(date) < new Date();
};

/**
 * Add days to a date
 */
export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
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

/**
 * Days remaining until a date
 */
export const daysUntil = (date) => {
  const diff = new Date(date) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};
