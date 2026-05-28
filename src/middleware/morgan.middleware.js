// =============================================================================
// morgan.middleware.js — RESQID (LEGACY — use httpLogger.middleware.js instead)
//
// File-only access logging via Morgan + rotating-file-stream.
// Pino/httpLogger handles structured logging. This is for plain-text
// access logs on disk for ops/debugging.
// =============================================================================

import morgan from 'morgan';
import { createStream } from 'rotating-file-stream';
import path from 'path';
import { fileURLToPath } from 'url';
import { ENV } from '#config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Only create file stream if explicitly enabled
const fileStream = ENV.LOG_FILE_PATH
  ? createStream('access.log', {
      interval: '1d',
      path: path.resolve(__dirname, '../../logs/access'),
      maxFiles: 14,
      compress: true,
    })
  : null;

// Skip health checks and static assets
const skipHealth = (req) =>
  req.path === '/health' || req.path === '/api/health' || req.path.startsWith('/assets');

// Use 'tiny' in production, 'dev' in development
const format = ENV.IS_PROD ? 'tiny' : 'dev';

// Only enable if file logging is configured, otherwise pass-through
export const accessLogger = fileStream
  ? morgan(format, { stream: fileStream, skip: skipHealth })
  : (req, res, next) => next();
