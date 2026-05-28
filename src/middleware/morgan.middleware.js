import morgan from 'morgan';
import { createStream } from 'rotating-file-stream';
import path from 'path';
import { fileURLToPath } from 'url';
import { ENV } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const accessStream = createStream('access.log', {
  interval: '1d',
  path: path.resolve(__dirname, '../../logs/access'),
  maxFiles: 14,
});

// Custom token for request ID (if you want it in the access log)
morgan.token('request-id', req => req.id ?? req.requestId ?? '-');

const skipHealth = req => req.path === '/health' || req.path === '/api/health';

export const accessLogger = morgan(
  ENV.NODE_ENV === 'production'
    ? ':remote-addr - :method :url :status :response-time ms - :request-id'
    : 'dev',
  {
    stream: accessStream,
    skip: skipHealth,
  }
);