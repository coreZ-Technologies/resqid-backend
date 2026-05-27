// src/shared/constants/publicPaths.js

/**
 * Public path registry — routes that bypass authentication.
 *
 * THREE types of public paths:
 *   EXACT  → path must match exactly
 *   PREFIX → path or anything under it is public
 *   REGEX  → dynamic segments (e.g. /s/:code)
 *
 * Rule: if in doubt, keep it protected.
 * Fewer public paths = smaller attack surface.
 */

// ─── Exact matches only ────────────────────────────────────────────────────────
// Path must match character-for-character

const EXACT_PUBLIC_PATHS = new Set([
  '/health',
  '/api/auth/super-admin', // super admin login
  '/api/auth/school', // school user login
  '/api/auth/send-otp', // parent OTP request
  '/api/auth/verify-otp', // parent OTP verify
  '/api/auth/register/init', // parent registration step 1
  '/api/auth/register/verify', // parent registration step 2
  '/api/auth/refresh', // token refresh — no auth header needed
]);

// ─── Prefix matches ────────────────────────────────────────────────────────────
// Path OR anything nested under it is public
// Keep this list as short as possible

const PREFIX_PUBLIC_PATHS = [
  // intentionally empty — add only when truly needed
  // example: '/api/public' would allow /api/public/anything
];

// ─── Regex matches — for dynamic segments ────────────────────────────────────
// /s/:scanCode — QR/NFC scan redirect (public — scanned by anyone)
// Tightly scoped regex — won't accidentally match other routes

const REGEX_PUBLIC_PATHS = [
  /^\/s\/[a-zA-Z0-9_-]+$/, // /s/:scanCode
];

// ─── Protected paths that look public but are NOT ─────────────────────────────
// BullMQ dashboard — super admin only, handled by requireSuperAdmin middleware
// DO NOT add /api/admin/queues here

// ─── Core checker ─────────────────────────────────────────────────────────────

/**
 * isPublicPath(path)
 *
 * Returns true if the path should bypass authentication.
 * Checks exact → prefix → regex in order (fastest first).
 *
 * @param {string} path — req.path (no query string)
 * @returns {boolean}
 */
export const isPublicPath = (path) => {
  if (!path) return false;

  // 1. Exact match — O(1) Set lookup
  if (EXACT_PUBLIC_PATHS.has(path)) return true;

  // 2. Prefix match
  for (const prefix of PREFIX_PUBLIC_PATHS) {
    if (path === prefix || path.startsWith(prefix + '/')) return true;
  }

  // 3. Regex match — dynamic segments
  for (const pattern of REGEX_PUBLIC_PATHS) {
    if (pattern.test(path)) return true;
  }

  return false;
};

// ─── Exports ──────────────────────────────────────────────────────────────────
// Export sets/arrays too so middleware can inspect them if needed

export const PUBLIC_PATHS = {
  exact: EXACT_PUBLIC_PATHS,
  prefix: PREFIX_PUBLIC_PATHS,
  regex: REGEX_PUBLIC_PATHS,
};
