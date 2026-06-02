// src/config/cookieConfig.js

import { ENV } from './env.js';

// COOKIE NAME
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  CSRF_TOKEN: '__Host-csrf',
};

// COOKIE DOMAIN
const COOKIE_DOMAIN = ENV.COOKIE_DOMAIN || undefined;

export const cookieConfig = {
  accessToken: {
    httpOnly: true,
    secure: ENV.IS_PROD,
    sameSite: ENV.IS_PROD ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
    domain: COOKIE_DOMAIN,
  },

  refreshToken: {
    httpOnly: true,
    secure: ENV.IS_PROD,
    sameSite: ENV.IS_PROD ? 'strict' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
    domain: COOKIE_DOMAIN,
  },

  csrfToken: {
    httpOnly: false, // JS must read this to send as header
    secure: true, // __Host- prefix requires secure
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
    // domain intentionally omitted — __Host- prefix forbids it
  },
};

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
  res.clearCookie(COOKIE_NAMES.CSRF_TOKEN, {
    secure: true,
    sameSite: 'strict',
    path: '/',
  });
};
