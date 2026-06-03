// =============================================================================
// ApiResponse.js — RESQID Standard API Response Wrapper
//
// Ensures consistent response format across all endpoints.
//
// Response format:
// {
//   success: true/false,
//   statusCode: number,
//   message: string,
//   data: any,
//   meta: object (optional - pagination, etc),
//   requestId: string (correlation ID)
// }
// =============================================================================

export class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {*} data - Response data payload
   * @param {string} message - Human-readable message
   * @param {object} meta - Additional metadata (pagination, etc)
   */
  constructor(statusCode, data, message = 'Success', meta = {}) {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();

    // Add meta if provided
    if (meta && Object.keys(meta).length > 0) {
      this.meta = meta;
    }
  }

  /**
   * Send response directly to client
   */
  static send(res, statusCode, data, message = 'Success', meta = {}) {
    const response = new ApiResponse(statusCode, data, message, meta);

    // Attach request ID if available
    if (res.req?.requestId) {
      response.requestId = res.req.requestId;
    }

    return res.status(statusCode).json(response);
  }

  // ─── 2xx Success ──────────────────────────────────────────────────────────

  static ok(res, data, message = 'Success', meta = {}) {
    return this.send(res, 200, data, message, meta);
  }

  static created(res, data, message = 'Created successfully') {
    return this.send(res, 201, data, message);
  }

  static accepted(res, data, message = 'Request accepted') {
    return this.send(res, 202, data, message);
  }

  static noContent(res) {
    return res.status(204).send();
  }

  // ─── 3xx Redirection ──────────────────────────────────────────────────────

  static redirect(res, url, statusCode = 302) {
    return res.redirect(statusCode, url);
  }

  static notModified(res) {
    return res.status(304).send();
  }

  // ─── Paginated Response ───────────────────────────────────────────────────

  /**
   * Send paginated response with metadata
   */
  static paginated(res, data, pagination, message = 'Success') {
    const { page = 1, limit = 20, total = 0 } = pagination;
    const totalPages = Math.ceil(total / limit);

    const meta = {
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };

    return this.send(res, 200, data, message, meta);
  }

  // ─── List Response ────────────────────────────────────────────────────────

  /**
   * Send list response with count
   */
  static list(res, data, count, message = 'Success') {
    const meta = { count, total: count };
    return this.send(res, 200, data, message, meta);
  }

  // ─── File Response ────────────────────────────────────────────────────────

  /**
   * Send file download response
   */
  static file(res, filePath, fileName, mimeType = 'application/octet-stream') {
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    return res.download(filePath, fileName);
  }

  // ─── Stream Response ──────────────────────────────────────────────────────

  /**
   * Send streaming response
   */
  static stream(res, stream, contentType = 'application/octet-stream') {
    res.setHeader('Content-Type', contentType);
    stream.pipe(res);
  }

  // ─── SSE Response ─────────────────────────────────────────────────────────

  /**
   * Send Server-Sent Events response
   */
  static sse(res, event, data) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  // ─── Cached Response ──────────────────────────────────────────────────────

  /**
   * Send response with cache headers
   */
  static cached(res, data, maxAgeSeconds = 300, message = 'Success') {
    res.setHeader('Cache-Control', `public, max-age=${maxAgeSeconds}`);
    return this.send(res, 200, data, message);
  }

  // ─── Error Response (for error handler middleware) ─────────────────────────

  /**
   * Send error response (used by error handler middleware)
   */
  static error(res, statusCode, message, errors = [], errorCode = '') {
    const response = {
      success: false,
      statusCode,
      message,
      timestamp: new Date().toISOString(),
    };

    if (errors.length > 0) response.errors = errors;
    if (errorCode) response.errorCode = errorCode;
    if (res.req?.requestId) response.requestId = res.req.requestId;

    // Include stack trace only in development
    if (process.env.NODE_ENV === 'development' && res.req?.error?.stack) {
      response.stack = res.req.error.stack;
    }

    return res.status(statusCode).json(response);
  }
}
