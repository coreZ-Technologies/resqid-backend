// src/network/extractLocation.js
import { extractIp, isPrivateIp } from './extractIp.js';

/**
 * Uses ip-api.com (free, no key needed, 45 req/min)
 * Returns city, region, country, lat/lon from IP.
 *
 * For production at scale → swap with ipinfo.io or maxmind
 */

const IPAPI_URL = 'http://ip-api.com/json';

const FALLBACK_LOCATION = {
  ip: 'unknown',
  city: 'Unknown',
  region: 'Unknown',
  country: 'Unknown',
  countryCode: 'IN', // default to India since RESQID is India-first
  lat: null,
  lon: null,
  isp: 'Unknown',
  source: 'fallback',
};

export const extractLocation = async (req) => {
  const ip = extractIp(req);

  // Skip geolocation for local/private IPs (dev environment)
  if (isPrivateIp(ip)) {
    return { ...FALLBACK_LOCATION, ip, source: 'private_ip' };
  }

  try {
    const res = await fetch(
      `${IPAPI_URL}/${ip}?fields=status,city,regionName,country,countryCode,lat,lon,isp`
    );

    const data = await res.json();

    if (data.status !== 'success') {
      return { ...FALLBACK_LOCATION, ip, source: 'api_failed' };
    }

    return {
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
  } catch {
    return { ...FALLBACK_LOCATION, ip, source: 'fetch_error' };
  }
};
