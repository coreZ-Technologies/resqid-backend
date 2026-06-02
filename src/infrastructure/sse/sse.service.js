<<<<<<< HEAD
// src/infrastructure/sse/sse.service.js
// FIXED: Removed CONNECTION_TIMEOUT_MS. Heartbeat alone keeps connection alive.
// FIXED: Removed lastActivity dead state.
// FIXED: cleanupConnection timer leak resolved.
=======
// src/infrastructure/sse/sse.service.js — RESQID
//
// Server-Sent Events (SSE) service for real-time client updates.
// Used by: timetable generation progress, crisis status, notifications.
>>>>>>> 989f84374cc56136e3a7e027fd44e5110bf99e81

import { logger } from '#config/logger.js';

// Client registry: Map<userId, Set<{ res, heartbeatInterval, userType, createdAt }>>
const clients = new Map();

// Maximum connections per user
const MAX_CONNECTIONS_PER_USER = 5;

// Heartbeat interval (25 seconds - standard, beats most proxy timeouts)
const HEARTBEAT_INTERVAL_MS = 25000;

// CONNECTION MANAGEMENT

/**
 * Register an SSE client connection.
 * @param {string} userId - User ID
 * @param {string} userType - 'school_admin', 'teacher', 'parent'
 * @param {Object} res - Express response object
 * @returns {boolean} true if registered, false if rejected
 */
export const registerClient = (userId, userType, res) => {
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }

  const userConnections = clients.get(userId);

  // Limit connections per user (prevent abuse)
  if (userConnections.size >= MAX_CONNECTIONS_PER_USER) {
    logger.warn({ userId, current: userConnections.size }, '[SSE] Max connections reached');
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Too many connections' }));
    return false;
  }

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);

  // Setup heartbeat
  const heartbeatInterval = setInterval(() => {
    if (!res.writableEnded) {
      res.write(':heartbeat\n\n');
    } else {
      cleanupConnection(userId, heartbeatInterval, res);
    }
  }, HEARTBEAT_INTERVAL_MS);

  // Store connection
  const connection = {
    res,
    heartbeatInterval,
    userType,
    createdAt: Date.now(),
  };

  userConnections.add(connection);

  logger.info(
    {
      userId,
      userType,
      connections: userConnections.size,
      totalClients: getTotalConnections(),
    },
    '[SSE] Client registered'
  );

  // Handle client disconnect
  res.on('close', () => {
    cleanupConnection(userId, heartbeatInterval, res);
  });

  // Handle errors
  res.on('error', (err) => {
    logger.error({ userId, error: err.message }, '[SSE] Connection error');
    cleanupConnection(userId, heartbeatInterval, res);
  });

  return true;
};

/**
 * Clean up a single connection.
 */
const cleanupConnection = (userId, heartbeatInterval, res) => {
  clearInterval(heartbeatInterval);

  const userConnections = clients.get(userId);
  if (userConnections) {
    for (const conn of userConnections) {
      if (conn.res === res) {
        userConnections.delete(conn);
        break;
      }
    }

    if (userConnections.size === 0) {
      clients.delete(userId);
    }
  }

  if (!res.writableEnded) {
    res.end();
  }

  logger.debug({ userId, remaining: clients.get(userId)?.size || 0 }, '[SSE] Connection closed');
};

/**
 * Remove all connections for a user.
 */
export const removeClient = (userId) => {
  const userConnections = clients.get(userId);
  if (userConnections) {
    for (const conn of userConnections) {
      clearInterval(conn.heartbeatInterval);
      if (!conn.res.writableEnded) {
        conn.res.end();
      }
    }
    clients.delete(userId);
    logger.info({ userId }, '[SSE] All connections removed');
  }
};

// EVENT PUSHING

/**
 * Push event to a specific user (all their connections).
 * @param {string} userId
 * @param {Object} event - { type: string, data: any }
 * @returns {boolean} true if at least one connection received the event
 */
export const pushSSE = (userId, event) => {
  const userConnections = clients.get(userId);
  if (!userConnections || userConnections.size === 0) {
    return false;
  }

  let sent = 0;
  const deadConnections = [];

  for (const conn of userConnections) {
    const { res } = conn;

    if (res.writableEnded) {
      deadConnections.push(conn);
      continue;
    }

    try {
      const eventString = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
      res.write(eventString);
      sent++;
    } catch (error) {
      logger.error({ userId, eventType: event.type, error: error.message }, '[SSE] Push failed');
      deadConnections.push(conn);
    }
  }

  // Clean up dead connections
  for (const conn of deadConnections) {
    cleanupConnection(userId, conn.heartbeatInterval, conn.res);
  }

  return sent > 0;
};

/**
 * Push event to multiple users.
 * @param {string[]} userIds
 * @param {Object} event
 * @returns {{ sent: number, failed: number }}
 */
export const pushSSEToAll = (userIds, event) => {
  let sent = 0;
  let failed = 0;

  for (const userId of userIds) {
    const result = pushSSE(userId, event);
    result ? sent++ : failed++;
  }

  logger.debug({ sent, failed, eventType: event.type }, '[SSE] Multicast complete');
  return { sent, failed };
};

/**
 * Broadcast event to all connected clients.
 * @param {Object} event
 * @returns {number} Number of connections that received the event
 */
export const broadcastToAll = (event) => {
  let sent = 0;
  const deadConnections = [];

  for (const [userId, userConnections] of clients.entries()) {
    for (const conn of userConnections) {
      if (conn.res.writableEnded) {
        deadConnections.push({ userId, conn });
        continue;
      }

      try {
        const eventString = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
        conn.res.write(eventString);
        sent++;
      } catch (error) {
        logger.error({ userId, error: error.message }, '[SSE] Broadcast failed');
        deadConnections.push({ userId, conn });
      }
    }
  }

  for (const { userId, conn } of deadConnections) {
    cleanupConnection(userId, conn.heartbeatInterval, conn.res);
  }

  return sent;
};

// STATS & MONITORING

/**
 * Get total number of active connections.
 */
export const getTotalConnections = () => {
  let total = 0;
  for (const connections of clients.values()) {
    total += connections.size;
  }
  return total;
};

/**
 * Get list of all connected clients with metadata.
 */
export const getConnectedClients = () => {
  const result = [];
  for (const [userId, connections] of clients.entries()) {
    for (const conn of connections) {
      result.push({
        userId,
        userType: conn.userType,
        createdAt: conn.createdAt,
        connectionDuration: Date.now() - conn.createdAt,
      });
    }
  }
  return result;
};

<<<<<<< HEAD
=======
/**
 * Check if a user has any active connections.
 */
>>>>>>> 989f84374cc56136e3a7e027fd44e5110bf99e81
export const isUserConnected = (userId) => {
  const connections = clients.get(userId);
  return connections ? connections.size > 0 : false;
};

/**
 * Get number of unique users connected.
 */
export const getConnectedCount = () => clients.size;

/**
 * Get connection stats by user type.
 */
export const getConnectionStats = () => {
  const stats = {};
  for (const [, connections] of clients.entries()) {
    for (const conn of connections) {
      const type = conn.userType || 'unknown';
      stats[type] = (stats[type] || 0) + 1;
    }
  }
  return stats;
};

// SHUTDOWN

/**
 * Close all SSE connections (graceful shutdown).
 */
export const closeAllConnections = () => {
  let closed = 0;
  for (const [userId, connections] of clients.entries()) {
    for (const conn of connections) {
      clearInterval(conn.heartbeatInterval);
      if (!conn.res.writableEnded) {
        conn.res.write('event: shutdown\ndata: {"message":"Server shutting down"}\n\n');
        conn.res.end();
      }
      closed++;
    }
  }
  clients.clear();
  logger.info({ totalClosed: closed }, '[SSE] All connections closed');
  return closed;
};

// TIMETABLE-SPECIFIC HELPERS

/**
 * Push timetable generation progress to a school's admin users.
 */
export const pushTimetableProgress = (schoolId, jobId, progress) => {
  return broadcastToAll({
    type: 'timetable:progress',
    data: { schoolId, jobId, ...progress },
  });
};

/**
 * Push crisis event to a school's admin users.
 */
export const pushCrisisUpdate = (schoolId, crisisEvent) => {
  return broadcastToAll({
    type: 'crisis:update',
    data: { schoolId, ...crisisEvent },
  });
};

export default {
  registerClient,
  removeClient,
  pushSSE,
  pushSSEToAll,
  broadcastToAll,
  getConnectedClients,
  isUserConnected,
  getConnectedCount,
  getTotalConnections,
<<<<<<< HEAD
};
=======
  getConnectionStats,
  closeAllConnections,
  pushTimetableProgress,
  pushCrisisUpdate,
};
>>>>>>> 989f84374cc56136e3a7e027fd44e5110bf99e81
