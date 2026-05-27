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
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();

    // Add meta if provided
    if (Object.keys(meta).length > 0) {
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

  // ─── Paginated Response ───────────────────────────────────────────────────

  /**
   * Send paginated response with metadata
   */
  static paginated(res, data, pagination, message = 'Success') {
    const meta = {
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.limit),
        hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
        hasPrev: pagination.page > 1,
      },
    };

    return this.send(res, 200, data, message, meta);
  }

  // ─── List Response ────────────────────────────────────────────────────────

  /**
   * Send list response with count
   */
  static list(res, data, count, message = 'Success') {
    const meta = {
      count,
      total: count,
    };

    return this.send(res, 200, data, message, meta);
  }

  // ─── File Response ────────────────────────────────────────────────────────

  /**
   * Send file download response
   */
  static file(res, filePath, fileName, mimeType = 'application/octet-stream') {
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
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
}
