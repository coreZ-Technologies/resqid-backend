// =============================================================================
// orchestrator/policies/rate-limit.policy.js — RESQID
// Rate limiting using Redis sorted sets (sliding window).
// Protects against notification spam at school, channel, and user level.
// Emergency notifications bypass ALL rate limits.
// =============================================================================

import { Redis } from 'ioredis';
import { ENV } from '#config/env.js';
import { logger } from '#config/logger.js';

const redis = new Redis(ENV.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  family: 4,
  ...(ENV.REDIS_TLS === 'true' && { tls: { rejectUnauthorized: false } }),
});

// ─── Rate Limit Definitions ──────────────────────────────────────────────────

const LIMITS = {
  // Per School (aggregate all channels)
  SCHOOL_PER_HOUR: 500,
  SCHOOL_PER_DAY: 10000,

  // Per Channel (per school)
  SMS_PER_HOUR: 100,
  SMS_PER_DAY: 500,

  PUSH_PER_MINUTE: 100,
  PUSH_PER_HOUR: 2000,

  EMAIL_PER_HOUR: 200,
  EMAIL_PER_DAY: 2000,

  WHATSAPP_PER_HOUR: 50,
  WHATSAPP_PER_DAY: 200,

  // Per User (parent)
  USER_SMS_PER_HOUR: 10,
  USER_PUSH_PER_HOUR: 30,
  USER_EMAIL_PER_HOUR: 10,

  // Bulk Send
  BULK_PER_HOUR: 5,
  BULK_MAX_RECIPIENTS: 1000,

  // OTP
  OTP_PER_PHONE_PER_5MIN: 3,
  OTP_COOLDOWN_SECONDS: 60,
};

const WINDOWS = {
  MINUTE: 60,
  HOUR: 3600,
  DAY: 86400,
  FIVE_MINUTES: 300,
};

// ─── Redis Key Builders ──────────────────────────────────────────────────────

const KEY = {
  schoolHour: (schoolId) => `rate:school:${schoolId}:hour`,
  schoolDay: (schoolId) => `rate:school:${schoolId}:day`,

  channel: (schoolId, channel, window) => `rate:${channel}:${schoolId}:${window}`,

  user: (userId, channel) => `rate:user:${userId}:${channel}:hour`,

  bulk: (schoolId) => `rate:bulk:${schoolId}:hour`,

  otp: (phone) => `rate:otp:${phone}:count`,
  otpCooldown: (phone) => `rate:otp:${phone}:cooldown`,
};

// ─── Core Rate Check ─────────────────────────────────────────────────────────

/**
 * Sliding window rate check using Redis sorted set.
 *
 * @param {string} key      - Redis key
 * @param {number} limit    - Max allowed in window
 * @param {number} windowSec - Window size in seconds
 * @param {number} [cost=1] - How many tokens this request consumes
 * @returns {Promise<{allowed: boolean, remaining: number, resetIn: number}>}
 */
async function checkRateLimit(key, limit, windowSec, cost = 1) {
  const now = Date.now();
  const windowStart = now - windowSec * 1000;

  try {
    // Remove expired entries (atomic)
    await redis.zremrangebyscore(key, 0, windowStart);

    // Count current entries in window
    const current = await redis.zcard(key);

    if (current + cost > limit) {
      // Get oldest entry for reset time
      const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetIn =
        oldest.length > 0
          ? Math.ceil((parseInt(oldest[1]) + windowSec * 1000 - now) / 1000)
          : windowSec;

      return { allowed: false, remaining: 0, resetIn, current };
    }

    // Add entry(ies)
    const members = [];
    for (let i = 0; i < cost; i++) {
      members.push(now + i, `${now + i}-${Math.random().toString(36).slice(2, 8)}`);
    }
    await redis.zadd(key, ...members);
    await redis.expire(key, windowSec);

    return {
      allowed: true,
      remaining: limit - current - cost,
      resetIn: windowSec,
      current: current + cost,
    };
  } catch (err) {
    logger.error({ err: err.message, key }, '[rate-limit] Redis error — allowing request');
    return { allowed: true, remaining: limit, resetIn: windowSec, current: 0, error: true };
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Check school-level rate limits.
 * Called before sending any notification from school admin.
 *
 * @param {string} schoolId
 * @param {number} recipientCount - How many recipients
 * @returns {Promise<{allowed: boolean, reason?: string, details?: object}>}
 */
export const checkSchoolRateLimit = async (schoolId, recipientCount = 1) => {
  // Hourly
  const hourCheck = await checkRateLimit(
    KEY.schoolHour(schoolId),
    LIMITS.SCHOOL_PER_HOUR,
    WINDOWS.HOUR,
    recipientCount
  );
  if (!hourCheck.allowed) {
    return {
      allowed: false,
      reason: `School hourly limit reached (${LIMITS.SCHOOL_PER_HOUR}/hour). Resets in ${hourCheck.resetIn}s.`,
      details: hourCheck,
    };
  }

  // Daily
  const dayCheck = await checkRateLimit(
    KEY.schoolDay(schoolId),
    LIMITS.SCHOOL_PER_DAY,
    WINDOWS.DAY,
    recipientCount
  );
  if (!dayCheck.allowed) {
    return {
      allowed: false,
      reason: `School daily limit reached (${LIMITS.SCHOOL_PER_DAY}/day). Resets in ${dayCheck.resetIn}s.`,
      details: dayCheck,
    };
  }

  return { allowed: true, details: { hour: hourCheck, day: dayCheck } };
};

/**
 * Check per-channel rate limits.
 *
 * @param {string} schoolId
 * @param {string} channel  - 'sms' | 'push' | 'email' | 'whatsapp'
 * @param {number} count    - How many messages
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
export const checkChannelRateLimit = async (schoolId, channel, count = 1) => {
  const limits = {
    sms: { perHour: LIMITS.SMS_PER_HOUR, perDay: LIMITS.SMS_PER_DAY },
    push: { perMinute: LIMITS.PUSH_PER_MINUTE, perHour: LIMITS.PUSH_PER_HOUR },
    email: { perHour: LIMITS.EMAIL_PER_HOUR, perDay: LIMITS.EMAIL_PER_DAY },
    whatsapp: { perHour: LIMITS.WHATSAPP_PER_HOUR, perDay: LIMITS.WHATSAPP_PER_DAY },
  };

  const channelLimits = limits[channel];
  if (!channelLimits) return { allowed: true }; // Unknown channel, allow

  // Minute window (push only)
  if (channelLimits.perMinute) {
    const check = await checkRateLimit(
      KEY.channel(schoolId, channel, 'minute'),
      channelLimits.perMinute,
      WINDOWS.MINUTE,
      count
    );
    if (!check.allowed) {
      return {
        allowed: false,
        reason: `${channel} minute limit reached. Resets in ${check.resetIn}s.`,
      };
    }
  }

  // Hour window
  if (channelLimits.perHour) {
    const check = await checkRateLimit(
      KEY.channel(schoolId, channel, 'hour'),
      channelLimits.perHour,
      WINDOWS.HOUR,
      count
    );
    if (!check.allowed) {
      return {
        allowed: false,
        reason: `${channel} hourly limit reached. Resets in ${check.resetIn}s.`,
      };
    }
  }

  // Day window
  if (channelLimits.perDay) {
    const check = await checkRateLimit(
      KEY.channel(schoolId, channel, 'day'),
      channelLimits.perDay,
      WINDOWS.DAY,
      count
    );
    if (!check.allowed) {
      return {
        allowed: false,
        reason: `${channel} daily limit reached. Resets in ${check.resetIn}s.`,
      };
    }
  }

  return { allowed: true };
};

/**
 * Check per-user rate limits (prevents spamming individual parent).
 *
 * @param {string} parentId
 * @param {string} channel
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
export const checkUserRateLimit = async (parentId, channel) => {
  const limits = {
    sms: LIMITS.USER_SMS_PER_HOUR,
    push: LIMITS.USER_PUSH_PER_HOUR,
    email: LIMITS.USER_EMAIL_PER_HOUR,
  };

  const limit = limits[channel];
  if (!limit) return { allowed: true };

  const check = await checkRateLimit(KEY.user(parentId, channel), limit, WINDOWS.HOUR);
  if (!check.allowed) {
    return { allowed: false, reason: `User ${channel} limit reached.` };
  }

  return { allowed: true };
};

/**
 * Check bulk send rate limits.
 *
 * @param {string} schoolId
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
export const checkBulkRateLimit = async (schoolId) => {
  const check = await checkRateLimit(KEY.bulk(schoolId), LIMITS.BULK_PER_HOUR, WINDOWS.HOUR);
  if (!check.allowed) {
    return { allowed: false, reason: `Bulk send limit reached (${LIMITS.BULK_PER_HOUR}/hour).` };
  }
  return { allowed: true };
};

/**
 * Check OTP rate limits per phone number.
 *
 * @param {string} phone
 * @returns {Promise<{allowed: boolean, reason?: string, cooldownRemaining?: number}>}
 */
export const checkOtpRateLimit = async (phone) => {
  const key = KEY.otp(phone);
  const cooldownKey = KEY.otpCooldown(phone);

  // Cooldown check
  const cooldown = await redis.get(cooldownKey);
  if (cooldown) {
    const ttl = await redis.ttl(cooldownKey);
    return {
      allowed: false,
      reason: 'Please wait before requesting another OTP.',
      cooldownRemaining: ttl,
    };
  }

  // Count check (5-minute window)
  const count = await checkRateLimit(key, LIMITS.OTP_PER_PHONE_PER_5MIN, WINDOWS.FIVE_MINUTES);
  if (!count.allowed) {
    return { allowed: false, reason: `Too many OTP requests. Try again in ${count.resetIn}s.` };
  }

  // Set cooldown
  await redis.setex(cooldownKey, LIMITS.OTP_COOLDOWN_SECONDS, '1');

  return { allowed: true };
};

/**
 * Check all rate limits for a notification send.
 * Aggregates school, channel, and user limits.
 *
 * @param {object} opts
 * @param {string} opts.schoolId
 * @param {string[]} opts.channels
 * @param {number} opts.recipientCount
 * @param {boolean} [opts.isEmergency] - Bypass all limits
 * @returns {Promise<{allowed: boolean, violations?: string[]}>}
 */
export const checkAllRateLimits = async ({
  schoolId,
  channels,
  recipientCount,
  isEmergency = false,
}) => {
  // Emergency bypasses everything
  if (isEmergency) {
    return { allowed: true };
  }

  const violations = [];

  // School-level
  const schoolCheck = await checkSchoolRateLimit(schoolId, recipientCount);
  if (!schoolCheck.allowed) {
    violations.push(schoolCheck.reason);
  }

  // Per-channel
  for (const channel of channels) {
    const channelCheck = await checkChannelRateLimit(
      schoolId,
      channel.toLowerCase(),
      recipientCount
    );
    if (!channelCheck.allowed) {
      violations.push(channelCheck.reason);
    }
  }

  return {
    allowed: violations.length === 0,
    violations: violations.length > 0 ? violations : undefined,
  };
};

/**
 * Get current rate limit status for a school (for admin dashboard).
 *
 * @param {string} schoolId
 * @returns {Promise<object>}
 */
export const getRateLimitStatus = async (schoolId) => {
  const now = Date.now();
  const hourAgo = now - WINDOWS.HOUR * 1000;
  const dayAgo = now - WINDOWS.DAY * 1000;

  try {
    const [hourCount, dayCount] = await Promise.all([
      redis.zcount(KEY.schoolHour(schoolId), hourAgo, now),
      redis.zcount(KEY.schoolDay(schoolId), dayAgo, now),
    ]);

    return {
      schoolId,
      hourly: {
        used: hourCount,
        limit: LIMITS.SCHOOL_PER_HOUR,
        remaining: Math.max(0, LIMITS.SCHOOL_PER_HOUR - hourCount),
      },
      daily: {
        used: dayCount,
        limit: LIMITS.SCHOOL_PER_DAY,
        remaining: Math.max(0, LIMITS.SCHOOL_PER_DAY - dayCount),
      },
      channels: {
        sms: { limit: LIMITS.SMS_PER_HOUR },
        push: { limit: LIMITS.PUSH_PER_HOUR },
        email: { limit: LIMITS.EMAIL_PER_HOUR },
        whatsapp: { limit: LIMITS.WHATSAPP_PER_HOUR },
      },
      bulkRemaining: LIMITS.BULK_PER_HOUR,
    };
  } catch (err) {
    logger.error({ err: err.message }, '[rate-limit] Failed to get status');
    return { schoolId, error: 'Failed to fetch rate limit status' };
  }
};

/**
 * Reset all rate limits for a school (admin action).
 *
 * @param {string} schoolId
 */
export const resetRateLimits = async (schoolId) => {
  const keys = [
    KEY.schoolHour(schoolId),
    KEY.schoolDay(schoolId),
    KEY.bulk(schoolId),
    ...['sms', 'push', 'email', 'whatsapp'].flatMap((ch) => [
      KEY.channel(schoolId, ch, 'minute'),
      KEY.channel(schoolId, ch, 'hour'),
      KEY.channel(schoolId, ch, 'day'),
    ]),
  ];

  await redis.del(...keys);
  logger.info({ schoolId }, '[rate-limit] Rate limits reset');
};

// ─── Exports ─────────────────────────────────────────────────────────────────

export { LIMITS, WINDOWS, checkRateLimit };
export default {
  checkSchoolRateLimit,
  checkChannelRateLimit,
  checkUserRateLimit,
  checkBulkRateLimit,
  checkOtpRateLimit,
  checkAllRateLimits,
  getRateLimitStatus,
  resetRateLimits,
};
