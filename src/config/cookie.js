// src/config/cookieConfig.js

import { ENV } from './env.js';

// ─── Cookie Name Constants ────────────────────────────────────────────────────
// Single source of truth — import these wherever you read/clear cookies

export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  CSRF_TOKEN: '__Host-csrf', // must match CSRF_COOKIE_NAME in csrfToken.js
};

// ─── Base domain config ───────────────────────────────────────────────────────
// Only applied to non-__Host- prefixed cookies.
// __Host- cookies must NOT have a domain attribute — browser will reject them.

const COOKIE_DOMAIN = ENV.COOKIE_DOMAIN || undefined;

// ─── Cookie Configs ───────────────────────────────────────────────────────────

export const cookieConfig = {
  accessToken: {
    httpOnly: true,
    secure: ENV.IS_PROD,
    sameSite: ENV.IS_PROD ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes in ms
    path: '/',
    domain: COOKIE_DOMAIN,
  },

  refreshToken: {
    httpOnly: true,
    secure: ENV.IS_PROD,
    sameSite: ENV.IS_PROD ? 'strict' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
    path: '/',
    domain: COOKIE_DOMAIN,
  },

  // __Host- prefix rules (enforced by browser):
  //   ✅ secure must always be true
  //   ✅ path must be '/'
  //   ❌ domain must NOT be set
  //   ❌ will silently fail/be ignored if above rules are broken
  csrfToken: {
    httpOnly: false, // JS must read this to send as header
    secure: true, // always true — __Host- requires it, even in dev
    sameSite: 'strict', // consistent with csrfToken.js
    maxAge: 24 * 60 * 60 * 1000, // 24 hours in ms
    path: '/',
    // domain intentionally omitted — __Host- prefix forbids it
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, cookieConfig.accessToken);
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, cookieConfig.refreshToken);
};

export const clearAuthCookies = (res) => {
  const base = { path: '/', domain: COOKIE_DOMAIN };
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, base);
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, base);
};

export const setCsrfCookie = (res, csrfToken) => {
  res.cookie(COOKIE_NAMES.CSRF_TOKEN, csrfToken, cookieConfig.csrfToken);
};

export const clearCsrfCookie = (res) => {
  // Must match exactly what was set — secure + path, no domain
  res.clearCookie(COOKIE_NAMES.CSRF_TOKEN, {
    secure: true,
    sameSite: 'strict',
    path: '/',
  });
};
