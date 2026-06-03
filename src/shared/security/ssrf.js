/**
 * ssrf.js — RESQID
 *
 * Prevents Server‑Side Request Forgery by validating that a URL
 * points to a safe external resource, not internal infrastructure.
 *
 * Used by:
 *   - webhook.service.js         (when triggering outbound webhooks)
 *   - scan.redirect.controller.js (if redirecting after a public QR scan)
 *   - any module that downloads files or fetches remote content
 */

import { URL } from 'node:url';
import { isIP } from 'node:net';
import dns from 'node:dns/promises';

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

// Additional blocked hostnames (cloud metadata endpoints)
const BLOCKED_HOSTNAMES = [
  'metadata.google.internal', // GCP metadata
  '169.254.169.254', // AWS/cloud metadata IP
  'metadata.azure.com', // Azure metadata
  '169.254.170.2', // AWS ECS metadata
];

/**
 * Convert an IP range string (CIDR) to a range of numeric values.
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
  }
  // IPv6 — block entirely for safety
  return { start: 0, end: 0, family: 6, cidr };
}

function ipv4ToNumber(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

/**
 * Check if a given IPv4 address falls within any blocked range.
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
 */
async function resolvesToBlockedIP(hostname) {
  // Check blocked hostnames first (cloud metadata)
  if (BLOCKED_HOSTNAMES.includes(hostname.toLowerCase())) {
    return true;
  }

  // If host is already an IP address
  const ipFamily = isIP(hostname);
  if (ipFamily === 4) return isBlockedIPv4(hostname);
  if (ipFamily === 6) return true;

  // Resolve hostname to IPs
  try {
    const addresses = await dns.resolve4(hostname);
    for (const addr of addresses) {
      if (isBlockedIPv4(addr)) return true;
    }

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
    return true; // DNS failure → block for safety
  }
  return false;
}

// ------------------------------------------------------------------
// PUBLIC API
// ------------------------------------------------------------------

/**
 * Validate that a URL is safe to fetch.
 * Throws an error if the URL is internal or uses a blocked protocol.
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

  // Prevent username / password in URL
  if (parsed.username || parsed.password) {
    throw new Error('URL must not contain credentials');
  }

  // Optional domain whitelist
  if (options.allowedDomains?.length > 0) {
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
 * Validate a URL for browser redirect.
 */
export async function validateRedirectUrl(urlString) {
  return validateUrl(urlString);
}

/**
 * Quick synchronous check for protocol only.
 */
export function isSafeProtocol(urlString) {
  try {
    const parsed = new URL(urlString);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
