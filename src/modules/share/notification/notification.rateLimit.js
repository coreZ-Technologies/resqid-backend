// src/modules/share/notification/notification.rateLimit.js
import { redis } from '#config/redis.js';
import { logger } from '#config/logger.js';

const RATE_LIMIT_PREFIX = 'rate_limit:';
const DEFAULT_WINDOW = 60; // seconds
const DEFAULT_MAX = 10; // per window

export class RateLimiter {
  constructor(resource, max = DEFAULT_MAX, windowSec = DEFAULT_WINDOW) {
    this.resource = resource;
    this.max = max;
    this.windowSec = windowSec;
  }

  getKey(identifier) {
    return `${RATE_LIMIT_PREFIX}${this.resource}:${identifier}`;
  }

  async check(identifier) {
    const key = this.getKey(identifier);
    const now = Date.now();
    const windowStart = now - this.windowSec * 1000;

    // Remove old entries
    await redis.zremrangebyscore(key, 0, windowStart);
    const count = await redis.zcard(key);
    if (count >= this.max) {
      return { allowed: false, retryAfter: this.windowSec };
    }
    // Add current timestamp
    await redis.zadd(key, now, `${now}-${Math.random()}`);
    await redis.expire(key, this.windowSec);
    return { allowed: true, remaining: this.max - count - 1 };
  }
}

export const channelRateLimits = {
  email: new RateLimiter('email', 20, 60),
  sms: new RateLimiter('sms', 5, 60),
  push: new RateLimiter('push', 30, 60),
  inapp: new RateLimiter('inapp', 100, 60),
};