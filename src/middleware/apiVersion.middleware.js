// =============================================================================
// apiVersion.middleware.js — RESQID
//
// API version enforcement and deprecation management.
// Reads API-Version header or URL prefix — rejects unsupported versions.
//
// Version resolution (priority order):
//   1. URL prefix:      /api/v2/students
//   2. Header:          API-Version: 2
//   3. Default:         v1 (current stable)
//
// Version-free routes (always latest):
//   - /api/emergency/*   — Public QR scans
//   - /health            — Health checks
//   - /api/webhooks/*    — External providers
// =============================================================================

import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { ENV } from '#config/env.js';

// ─── Version Config ───────────────────────────────────────────────────────────

const SUPPORTED_VERSIONS = new Set(['v1']);
const DEPRECATED_VERSIONS = new Set([]);
const DEFAULT_VERSION = ENV.API_DEFAULT_VERSION || 'v1';
const VERSION_HEADER = ENV.API_VERSION_HEADER || 'x-api-version';

// Version-free routes — always served on current implementation
const VERSION_FREE_PREFIXES = [
  '/api/emergency',
  '/api/attendance/tap',
  '/api/attendance/device',
  '/health',
  '/api/health',
  '/api/webhooks',
];

// Sunset dates for deprecated versions
const SUNSET_DATES = {};

// ─── Core Middleware ──────────────────────────────────────────────────────────

export const apiVersion = asyncHandler(async (req, _res, next) => {
  // Skip version-free routes
  if (VERSION_FREE_PREFIXES.some((p) => req.path.startsWith(p))) {
    req.apiVersion = DEFAULT_VERSION;
    return next();
  }

  // Resolve version
  const urlVersion = extractVersionFromUrl(req.path);
  const headerVersion = normalizeVersion(req.headers[VERSION_HEADER]);
  const version = urlVersion || headerVersion || DEFAULT_VERSION;

  // Reject unknown versions
  if (!SUPPORTED_VERSIONS.has(version) && !DEPRECATED_VERSIONS.has(version)) {
    throw ApiError.badRequest(
      `Unsupported API version '${version}'. Supported: [${[...SUPPORTED_VERSIONS].join(', ')}]`,
      [],
      'INVALID_API_VERSION'
    );
  }

  // Reject deprecated versions
  if (DEPRECATED_VERSIONS.has(version)) {
    const sunset = SUNSET_DATES[version];
    const message = sunset
      ? `API version '${version}' was sunset on ${sunset}. Please upgrade to ${getLatestVersion()}.`
      : `API version '${version}' is deprecated. Please upgrade to ${getLatestVersion()}.`;

    throw ApiError.custom(410, message, 'VERSION_DEPRECATED');
  }

  // Attach version to request
  req.apiVersion = version;

  // Set response header so clients know which version they hit
  _res.setHeader('X-API-Version', version);

  next();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractVersionFromUrl(path) {
  const match = path.match(/\/v(\d+)\//i);
  return match ? `v${match[1]}` : null;
}

function normalizeVersion(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim().toLowerCase();
  const match = trimmed.match(/^v?(\d+)/);
  return match ? `v${match[1]}` : null;
}

function getLatestVersion() {
  const versions = [...SUPPORTED_VERSIONS]
    .map((v) => parseInt(v.replace('v', ''), 10))
    .sort((a, b) => b - a);
  return `v${versions[0]}`;
}

// ─── Export config for testing ────────────────────────────────────────────────

export const versionConfig = {
  SUPPORTED_VERSIONS,
  DEPRECATED_VERSIONS,
  DEFAULT_VERSION,
  VERSION_HEADER,
};
