// =============================================================================
// extractLocation.js — RESQID
//
// Extracts geolocation from IP for geo-blocking and behavioral security.
// Uses Cloudflare header first (fastest), falls back to ip-api.com with Redis caching.
// =============================================================================

import { extractIp, isPrivateIp } from './extractIp.js';
import { middlewareRedis } from '#config/redis.js';
import { ENV } from '#config/env.js';
import { logger } from '#config/logger.js';

// ─── Cloudflare First (fastest, no API call) ─────────────────────────────────

/**
 * Try to get country from Cloudflare header first (instant, no rate limit).
 * Only available when BEHIND_CLOUDFLARE is true.
 */
const getCloudflareLocation = (req) => {
  if (!ENV.BEHIND_CLOUDFLARE) return null;

  const countryCode = req.headers[ENV.CLOUDFLARE_COUNTRY_HEADER || 'cf-ipcountry'];
  if (!countryCode || countryCode === 'XX') return null;

  return {
    ip: extractIp(req),
    city: 'Unknown',
    region: 'Unknown',
    country: countryCode,
    countryCode: countryCode,
    lat: null,
    lon: null,
    isp: 'Unknown',
    source: 'cloudflare',
  };
};

// ─── IP-API Fallback (with Redis Cache) ──────────────────────────────────────

const IPAPI_URL = 'http://ip-api.com/json';
const CACHE_TTL = 30 * 24 * 60 * 60; // 30 days — IP geo rarely changes

const FALLBACK_LOCATION = {
  ip: 'unknown',
  city: 'Unknown',
  region: 'Unknown',
  country: 'Unknown',
  countryCode: 'IN',
  lat: null,
  lon: null,
  isp: 'Unknown',
  source: 'fallback',
};

/**
 * Get location from ip-api.com with Redis caching.
 * ip-api.com free tier: 45 requests/minute.
 */
const getIpApiLocation = async (ip) => {
  // Check cache first
  const cacheKey = `geo:${ip}`;
  try {
    const cached = await middlewareRedis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      parsed.source = 'cache';
      return parsed;
    }
  } catch (err) {
    // Cache miss — continue to API
  }

  // Call ip-api.com
  try {
    const res = await fetch(
      `${IPAPI_URL}/${ip}?fields=status,city,regionName,country,countryCode,lat,lon,isp`
    );

    if (!res.ok) {
      logger.warn({ ip, status: res.status }, 'IP-API request failed');
      return { ...FALLBACK_LOCATION, ip, source: 'api_error' };
    }

    const data = await res.json();

    if (data.status !== 'success') {
      return { ...FALLBACK_LOCATION, ip, source: 'api_failed' };
    }

    const location = {
      ip,
      city: data.city || 'Unknown',
      region: data.regionName || 'Unknown',
      country: data.country || 'Unknown',
      countryCode: data.countryCode || 'IN',
      lat: data.lat || null,
      lon: data.lon || null,
      isp: data.isp || 'Unknown',
      source: 'ip-api',
    };

    // Cache for 30 days
    try {
      await middlewareRedis.set(cacheKey, JSON.stringify(location), 'EX', CACHE_TTL);
    } catch (err) {
      // Non-critical
    }

    return location;
  } catch (err) {
    logger.error({ ip, err: err.message }, 'IP geolocation failed');
    return { ...FALLBACK_LOCATION, ip, source: 'fetch_error' };
  }
};

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Extract location from request.
 * Priority: Cloudflare header → Redis cache → ip-api.com → fallback
 *
 * @param {Object} req - Express request
 * @returns {Promise<Object>} Location object
 */
export const extractLocation = async (req) => {
  const ip = extractIp(req);

  // Skip geolocation for private IPs
  if (isPrivateIp(ip)) {
    return { ...FALLBACK_LOCATION, ip, source: 'private_ip' };
  }

  // 1. Try Cloudflare header (instant, no API call)
  const cfLocation = getCloudflareLocation(req);
  if (cfLocation) return cfLocation;

  // 2. Fall back to ip-api.com (with Redis cache)
  return await getIpApiLocation(ip);
};

/**
 * Synchronous version — only checks Cloudflare header (for non-blocking middleware)
 * Does NOT call external API. Returns null if not behind Cloudflare.
 */
export const getLocationSync = (req) => {
  const ip = extractIp(req);
  if (isPrivateIp(ip)) return { ...FALLBACK_LOCATION, ip, source: 'private_ip' };
  return getCloudflareLocation(req);
};
