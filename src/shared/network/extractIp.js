// src/network/extractIp.js

/**
 * Extracts the real client IP from request headers.
 *
 * Since RESQID runs behind Cloudflare + Railway proxy,
 * req.ip alone gives you the proxy IP, not the real client.
 *
 * Header priority:
 * 1. CF-Connecting-IP   → set by Cloudflare (most trusted)
 * 2. X-Forwarded-For    → set by proxies (take first IP)
 * 3. X-Real-IP          → set by Nginx
 * 4. req.ip             → Express fallback
 */

export const extractIp = (req) => {
  const cfIp = req.headers['cf-connecting-ip'];
  const xForwarded = req.headers['x-forwarded-for'];
  const xRealIp = req.headers['x-real-ip'];

  if (cfIp) return cfIp.trim();

  if (xForwarded) {
    // x-forwarded-for can be a comma-separated list: client, proxy1, proxy2
    return xForwarded.split(',')[0].trim();
  }

  if (xRealIp) return xRealIp.trim();

  return req.ip || req.socket?.remoteAddress || 'unknown';
};

/**
 * Check if IP is private/local — skip geolocation for these
 */
export const isPrivateIp = (ip) => {
  if (!ip || ip === 'unknown') return true;

  return (
    ip === '::1' || // IPv6 localhost
    ip === '127.0.0.1' || // IPv4 localhost
    ip.startsWith('192.168.') || // private
    ip.startsWith('10.') || // private
    ip.startsWith('172.16.') || // private
    ip.startsWith('::ffff:127.') || // IPv4-mapped localhost
    ip === '::ffff:1' // edge case
  );
};
