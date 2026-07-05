// =============================================================================
// app.js — RESQID
// =============================================================================

import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { ENV } from '#config/env.js';

import {
  buildGlobalPipeline,
  buildAuthRoutesPipeline,
  globalErrorHandler,
  notFoundHandler,
  handleCorsError,
} from '#middleware/middleware.index.js';

// Routes
import indexRoutes from '#routes/index.js';
import healthRoutes from '#monitoring/monitoring.routes.js';

const app = express();

// Trust Proxy

app.set('trust proxy', ENV.TRUST_PROXY || 1);

// Body Parsing
// app.use(compression());
app.use(express.json({ limit: ENV.MAX_REQUEST_SIZE || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Global Middleware Pipeline
app.use(buildGlobalPipeline());
app.use(handleCorsError);

// Routes
// Health + Metrics (no auth, no rate limit)
app.use('/monitoring', healthRoutes);

// API Routes (mounted under /api)
// Auth routes use buildAuthRoutesPipeline (rate limiting, no JWT)
// Other routes will use their own middleware pipelines
app.use('/api', indexRoutes);

// Error Handling (LAST)
// app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
