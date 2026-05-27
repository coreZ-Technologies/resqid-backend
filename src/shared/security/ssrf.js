/**
 * ssrf.js
 *
 * Prevents Server‑Side Request Forgery by validating that a URL
 * points to a safe external resource, not internal infrastructure.
 *
 * Used by:
 *   - webhook.service.js         (when triggering outbound webhooks)
 *   - scan.redirect.controller.js (if redirecting after a public QR scan)
 *   - any module that downloads files or fetches remote content
 */

import { URL } from 'url';
import { isIP } from 'net';
import dns from 'dns/promises';

// ------------------------------------------------------------------
// BLOCKLIST – IP ranges that must NEVER be accessed from the backend
// ------------------------------------------------------------------
const BLOCKED_RANGES = [
  // IPv4 loopback & private
  '127.0.0.0/8', // loopback
  '10.0.0.0/8', // private
  '172.16.0.0/12', // private
  '192.168.0.0/16', // private
  '169.254.0.0/16', // link‑local (AWS metadata, etc.)
  '0.0.0.0/8', // current network
  '100.64.0.0/10', // carrier‑grade NAT

  // IPv6 loopback & private
  '::1/128', // loopback
  'fc00::/7', // unique local
  'fe80::/10', // link‑local
];

/**
 * Convert an IP range string (CIDR) to a range of numeric values.
 * @param {string} cidr - e.g. "192.168.0.0/16"
 * @returns {{ start: number, end: number, family: 4|6 }}
 */
function parseCidr(cidr) {
  const [addr, bits] = cidr.split('/');
  const family = isIP(addr);
  if (!family) throw new Error(`Invalid IP in CIDR: ${cidr}`);

  const subnetBits = parseInt(bits, 10);
  if (family === 4) {
    const ipNum = ipv4ToNumber(addr);
    const mask = ~(2 ** (32 - subnetBits) - 1);
    const start = ipNum & mask;
    const end = ipNum | (~mask >>> 0);
    return { start, end, family: 4 };
  } else {
    // IPv6 – simplified: block entire /64 block
    // For a full implementation you'd use BigInt, but this is safe enough.
    return { start: 0, end: 0, family: 6, cidr }; // treated as blocked entirely
  }
}

function ipv4ToNumber(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

/**
 * Check if a given IPv4 address falls within any blocked range.
 * @param {string} ip - IPv4 dotted string
 * @returns {boolean}
 */
function isBlockedIPv4(ip) {
  const num = ipv4ToNumber(ip);
  for (const cidr of BLOCKED_RANGES) {
    if (cidr.includes('/')) {
      const range = parseCidr(cidr);
      if (range.family !== 4) continue;
      if (num >= range.start && num <= range.end) return true;
    }
  }
  return false;
}

/**
 * Check if the hostname resolves to an internal/blocked IP.
 * Also blocks if the IP itself is passed as host.
 * @param {string} hostname
 * @returns {Promise<boolean>} true if blocked
 */
async function resolvesToBlockedIP(hostname) {
  // If host is already an IP address
  const ipFamily = isIP(hostname);
  if (ipFamily === 4) return isBlockedIPv4(hostname);
  if (ipFamily === 6) return true; // block all IPv6 for simplicity

  // Resolve hostname to IPs
  try {
    const addresses = await dns.resolve4(hostname);
    for (const addr of addresses) {
      if (isBlockedIPv4(addr)) return true;
    }
    // Also check IPv6 if resolved
    const addresses6 = await dns.resolve6(hostname).catch(() => []);
    for (const addr of addresses6) {
      if (
        addr.startsWith('fc') ||
        addr.startsWith('fd') ||
        addr === '::1' ||
        addr.startsWith('fe80')
      ) {
        return true;
      }
    }
  } catch {
    // DNS resolution failure – safe to block
    return true;
  }
  return false;
}

// ------------------------------------------------------------------
// PUBLIC API
// ------------------------------------------------------------------

/**
 * Validate that a URL is safe to fetch.
 * Throws an error if the URL is internal or uses a blocked protocol.
 *
 * @param {string} urlString - The URL to validate.
 * @param {object} [options]
 * @param {string[]} [options.allowedDomains] - If set, only these domains are allowed.
 * @returns {Promise<string>} The validated URL (normalised).
 */
export async function validateUrl(urlString, options = {}) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error(`Invalid URL: ${urlString}`);
  }

  // Only allow HTTP(S)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Blocked protocol: ${parsed.protocol}`);
  }

  // Prevent username / password in URL (bypass attempts)
  if (parsed.username || parsed.password) {
    throw new Error('URL must not contain credentials');
  }

  // Optional domain whitelist
  if (options.allowedDomains && options.allowedDomains.length > 0) {
    const hostname = parsed.hostname.toLowerCase();
    const allowed = options.allowedDomains.some(
      (d) => hostname === d || hostname.endsWith(`.${d}`)
    );
    if (!allowed) {
      throw new Error(`Domain ${hostname} is not in the allowed list`);
    }
  }

  // Check if the hostname resolves to a blocked IP
  const blocked = await resolvesToBlockedIP(parsed.hostname);
  if (blocked) {
    throw new Error(`Blocked internal host: ${parsed.hostname}`);
  }

  return parsed.href;
}

/**
 * Validate a URL that is intended for redirecting a user's browser.
 * Slightly less strict – allows the redirect to happen, but still blocks
 * internal destinations and non‑HTTP protocols.
 *
 * @param {string} urlString
 * @returns {Promise<string>}
 */
export async function validateRedirectUrl(urlString) {
  // For redirects, we might allow only HTTP(S) and no internal IPs.
  return validateUrl(urlString);
}

/**
 * Quick synchronous check for protocol only (used in simple cases).
 * Does NOT perform DNS resolution – use validateUrl for full protection.
 *
 * @param {string} urlString
 * @returns {boolean}
 */
export function isSafeProtocol(urlString) {
  try {
    const parsed = new URL(urlString);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
